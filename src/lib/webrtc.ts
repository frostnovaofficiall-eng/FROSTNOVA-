import { RoomParticipant, VoiceRoom, AudioSettings } from '../types';
import { audioManager } from './audioManager';

export interface RemotePeerTrack {
  peerId: string;
  stream: MediaStream;
  audioElement: HTMLAudioElement;
  hasVideo: boolean;
}

export type WebRTCEventCallback = {
  onRoomJoined?: (room: VoiceRoom, existingPeers: RoomParticipant[]) => void;
  onPeerJoined?: (peer: RoomParticipant) => void;
  onPeerLeft?: (peerId: string) => void;
  onRemoteTrack?: (peerId: string, stream: MediaStream, isVideo: boolean) => void;
  onRemoteTrackRemoved?: (peerId: string) => void;
  onUserStateUpdated?: (userId: string, updates: Partial<RoomParticipant>) => void;
  onUserSpeaking?: (userId: string, isSpeaking: boolean, volumeLevel: number) => void;
  onRoomsList?: (rooms: VoiceRoom[]) => void;
  onRoomDeleted?: (roomId: string) => void;
  onError?: (err: string) => void;
  onConnectionStatus?: (status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected') => void;
};

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
  ],
};

export class WebRTCService {
  private ws: WebSocket | null = null;
  private currentRoomId: string | null = null;
  private currentUser: RoomParticipant | null = null;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private remoteAudioElements = new Map<string, HTMLAudioElement>();
  private callbacks: WebRTCEventCallback = {};
  private speakingInterval: any = null;
  private wasSpeaking = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isIntentionalDisconnect = false;

  constructor(callbacks: WebRTCEventCallback) {
    this.callbacks = callbacks;
  }

  public updateCallbacks(callbacks: Partial<WebRTCEventCallback>) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public connectSignaling(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isIntentionalDisconnect = false;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      this.callbacks.onConnectionStatus?.('connecting');

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.callbacks.onConnectionStatus?.('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleSignalingMessage(event.data);
        };

        this.ws.onerror = (e) => {
          console.warn('[KEMOR WebRTC] WebSocket error:', e);
          this.callbacks.onError?.('Network connection issue with signaling server.');
        };

        this.ws.onclose = () => {
          this.callbacks.onConnectionStatus?.('disconnected');
          if (!this.isIntentionalDisconnect) {
            this.handleAutoReconnect();
          }
        };
      } catch (err: any) {
        reject(err);
      }
    });
  }

  private handleAutoReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.callbacks.onError?.('Failed to reconnect to voice server. Please refresh.');
      return;
    }
    this.reconnectAttempts++;
    this.callbacks.onConnectionStatus?.('reconnecting');
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 8000);

    setTimeout(async () => {
      try {
        await this.connectSignaling();
        // Re-join room if was in one
        if (this.currentRoomId && this.currentUser) {
          this.joinRoom(this.currentRoomId, this.currentUser);
        }
      } catch {
        // Will retry in onclose
      }
    }, delay);
  }

  public async joinRoom(roomId: string, user: RoomParticipant, audioSettings?: AudioSettings): Promise<void> {
    this.currentRoomId = roomId;
    this.currentUser = user;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connectSignaling();
    }

    // Acquire microphone audio if not already running
    if (!this.localStream) {
      try {
        const stream = await audioManager.acquireMicrophoneStream(audioSettings || {
          inputDeviceId: 'default',
          outputDeviceId: 'default',
          inputVolume: 100,
          outputVolume: 100,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          pushToTalk: false,
          pushToTalkKey: 'Space',
        });
        this.localStream = stream;

        // Apply initial mute state
        if (user.isMuted) {
          this.localStream.getAudioTracks().forEach(t => t.enabled = false);
        }
      } catch (err: any) {
        console.warn('[KEMOR] Mic permission not granted or device unavailable:', err);
        this.callbacks.onError?.(
          err.name === 'NotAllowedError'
            ? 'Microphone permission was denied. Please allow microphone in browser settings to speak in KEMOR.'
            : 'Could not access microphone: ' + (err.message || 'Check audio devices.')
        );
      }
    }

    // Send join-room to signaling server
    this.sendSignaling({
      type: 'join-room',
      roomId,
      user,
    });

    this.startSpeakingDetection(roomId, user.userId);
  }

  private startSpeakingDetection(roomId: string, userId: string) {
    if (this.speakingInterval) clearInterval(this.speakingInterval);

    this.speakingInterval = setInterval(() => {
      if (!this.localStream || this.currentUser?.isMuted) {
        if (this.wasSpeaking) {
          this.wasSpeaking = false;
          this.sendSignaling({
            type: 'user-speaking',
            roomId,
            userId,
            isSpeaking: false,
            volumeLevel: 0,
          });
          this.callbacks.onUserSpeaking?.(userId, false, 0);
        }
        return;
      }

      const level = audioManager.getSpeakingLevel();
      const isSpeaking = level > 12; // threshold for voice activity

      if (isSpeaking !== this.wasSpeaking || (isSpeaking && Math.random() > 0.6)) {
        this.wasSpeaking = isSpeaking;
        this.sendSignaling({
          type: 'user-speaking',
          roomId,
          userId,
          isSpeaking,
          volumeLevel: level,
        });
        this.callbacks.onUserSpeaking?.(userId, isSpeaking, level);
      }
    }, 120);
  }

  public leaveRoom(): void {
    if (this.speakingInterval) {
      clearInterval(this.speakingInterval);
      this.speakingInterval = null;
    }

    if (this.currentRoomId && this.currentUser) {
      this.sendSignaling({
        type: 'leave-room',
        roomId: this.currentRoomId,
        userId: this.currentUser.userId,
      });
    }

    // Stop screen sharing if active
    this.stopScreenShare();

    // Close all peer connections
    for (const [peerId, pc] of this.peerConnections.entries()) {
      pc.close();
      const audioEl = this.remoteAudioElements.get(peerId);
      if (audioEl) {
        audioEl.srcObject = null;
        audioEl.remove();
      }
    }
    this.peerConnections.clear();
    this.remoteAudioElements.clear();

    // Stop local microphone stream
    audioManager.stopLocalStream();
    this.localStream = null;

    this.currentRoomId = null;
    this.currentUser = null;
  }

  public deleteRoom(roomId: string, hostId: string): void {
    this.sendSignaling({
      type: 'delete-room',
      roomId,
      hostId,
    });
    if (this.currentRoomId === roomId) {
      this.leaveRoom();
    }
  }

  public disconnect(): void {
    this.isIntentionalDisconnect = true;
    this.leaveRoom();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public toggleMute(muted: boolean): boolean {
    if (this.currentUser) {
      this.currentUser.isMuted = muted;
    }
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(t => t.enabled = !muted);
    }
    if (this.currentRoomId && this.currentUser) {
      this.sendSignaling({
        type: 'user-state-update',
        roomId: this.currentRoomId,
        userId: this.currentUser.userId,
        updates: { isMuted: muted },
      });
    }
    return muted;
  }

  public toggleDeafen(deafened: boolean): boolean {
    if (this.currentUser) {
      this.currentUser.isDeafened = deafened;
    }
    // Mute all remote audio elements
    for (const audioEl of this.remoteAudioElements.values()) {
      audioEl.muted = deafened;
    }
    if (this.currentRoomId && this.currentUser) {
      this.sendSignaling({
        type: 'user-state-update',
        roomId: this.currentRoomId,
        userId: this.currentUser.userId,
        updates: { isDeafened: deafened },
      });
    }
    return deafened;
  }

  public setPeerVolume(peerId: string, volumePercent: number) {
    const audioEl = this.remoteAudioElements.get(peerId);
    if (audioEl) {
      // Map 0 - 200% to volume (HTMLMediaElement max is 1.0; 0-100% maps to 0-1.0)
      audioEl.volume = Math.min(1, Math.max(0, volumePercent / 100));
    }
  }

  public async startScreenShare(): Promise<{ width: number; height: number; frameRate: number } | null> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      throw new Error('Screen sharing is not supported by this browser or platform (e.g. iOS Safari restricts web screen capture).');
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          frameRate: { ideal: 60, max: 60 },
          width: { ideal: 1920, max: 2560 },
          height: { ideal: 1080, max: 1440 },
        } as any,
        audio: true,
      });

      this.screenStream = displayStream;
      const videoTrack = displayStream.getVideoTracks()[0];

      // Add or replace track in all peer connections
      for (const pc of this.peerConnections.values()) {
        const senders = pc.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(videoTrack);
        } else {
          pc.addTrack(videoTrack, displayStream);
        }
      }

      // Handle when user stops sharing via browser notification bar
      videoTrack.onended = () => {
        this.stopScreenShare();
      };

      if (this.currentUser && this.currentRoomId) {
        this.currentUser.isScreenSharing = true;
        this.sendSignaling({
          type: 'user-state-update',
          roomId: this.currentRoomId,
          userId: this.currentUser.userId,
          updates: { isScreenSharing: true },
        });
      }

      const settings = videoTrack.getSettings();
      return {
        width: settings.width || 1920,
        height: settings.height || 1080,
        frameRate: Math.round(settings.frameRate || 60),
      };
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        return null; // user cancelled prompt
      }
      throw err;
    }
  }

  public stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }

    for (const pc of this.peerConnections.values()) {
      const senders = pc.getSenders();
      const videoSender = senders.find(s => s.track && s.track.kind === 'video');
      if (videoSender) {
        try {
          pc.removeTrack(videoSender);
        } catch (e) {
          console.warn('Error removing video track:', e);
        }
      }
    }

    if (this.currentUser && this.currentRoomId) {
      this.currentUser.isScreenSharing = false;
      this.sendSignaling({
        type: 'user-state-update',
        roomId: this.currentRoomId,
        userId: this.currentUser.userId,
        updates: { isScreenSharing: false },
      });
    }
  }

  public getScreenStream(): MediaStream | null {
    return this.screenStream;
  }

  private handleSignalingMessage(raw: string) {
    try {
      const msg = JSON.parse(raw);

      switch (msg.type) {
        case 'rooms-updated':
          this.callbacks.onRoomsList?.(msg.rooms);
          break;

        case 'room-joined': {
          const { room, existingPeers } = msg;
          this.callbacks.onRoomJoined?.(room, existingPeers);

          // Initiate WebRTC peer connections with existing peers in the room
          for (const peer of existingPeers) {
            this.initiatePeerConnection(peer.userId, true);
          }
          break;
        }

        case 'peer-joined': {
          const { peer } = msg;
          this.callbacks.onPeerJoined?.(peer);
          // Wait for incoming offer or initiate
          break;
        }

        case 'peer-left': {
          const { peerId } = msg;
          this.closePeerConnection(peerId);
          this.callbacks.onPeerLeft?.(peerId);
          break;
        }

        case 'webrtc-offer': {
          this.handleRemoteOffer(msg.senderId, msg.sdp);
          break;
        }

        case 'webrtc-answer': {
          this.handleRemoteAnswer(msg.senderId, msg.sdp);
          break;
        }

        case 'webrtc-ice': {
          this.handleRemoteIceCandidate(msg.senderId, msg.candidate);
          break;
        }

        case 'user-state-update': {
          this.callbacks.onUserStateUpdated?.(msg.userId, msg.updates);
          break;
        }

        case 'user-speaking': {
          this.callbacks.onUserSpeaking?.(msg.userId, msg.isSpeaking, msg.volumeLevel);
          break;
        }

        case 'room-deleted': {
          this.callbacks.onRoomDeleted?.(msg.roomId);
          if (this.currentRoomId === msg.roomId) {
            this.leaveRoom();
          }
          break;
        }
      }
    } catch (err) {
      console.warn('Signaling parse error:', err);
    }
  }

  private getOrCreatePeerConnection(peerId: string): RTCPeerConnection {
    let pc = this.peerConnections.get(peerId);
    if (!pc) {
      pc = new RTCPeerConnection(RTC_CONFIG);
      this.peerConnections.set(peerId, pc);

      // Add local audio track
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          pc!.addTrack(track, this.localStream!);
        });
      }

      // Add local screen video track if sharing
      if (this.screenStream) {
        this.screenStream.getTracks().forEach(track => {
          pc!.addTrack(track, this.screenStream!);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && this.currentUser) {
          this.sendSignaling({
            type: 'webrtc-ice',
            targetId: peerId,
            senderId: this.currentUser.userId,
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        const remoteStream = event.streams[0] || new MediaStream([event.track]);
        const isVideo = event.track.kind === 'video';

        if (!isVideo) {
          // Play remote audio
          let audioEl = this.remoteAudioElements.get(peerId);
          if (!audioEl) {
            audioEl = new Audio();
            audioEl.autoplay = true;
            (audioEl as any).playsInline = true;
            this.remoteAudioElements.set(peerId, audioEl);
          }
          audioEl.srcObject = remoteStream;
          audioEl.play().catch(e => console.warn('Remote audio autoplay blocked:', e));
        }

        this.callbacks.onRemoteTrack?.(peerId, remoteStream, isVideo);
      };

      pc.onconnectionstatechange = () => {
        if (pc?.connectionState === 'failed' || pc?.connectionState === 'closed') {
          this.closePeerConnection(peerId);
        }
      };
    }
    return pc;
  }

  private async initiatePeerConnection(peerId: string, isInitiator: boolean) {
    const pc = this.getOrCreatePeerConnection(peerId);
    if (isInitiator && this.currentUser) {
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);

        this.sendSignaling({
          type: 'webrtc-offer',
          targetId: peerId,
          senderId: this.currentUser.userId,
          sdp: offer,
        });
      } catch (err) {
        console.error('Error creating WebRTC offer:', err);
      }
    }
  }

  private async handleRemoteOffer(senderId: string, sdp: RTCSessionDescriptionInit) {
    if (!this.currentUser) return;
    const pc = this.getOrCreatePeerConnection(senderId);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.sendSignaling({
        type: 'webrtc-answer',
        targetId: senderId,
        senderId: this.currentUser.userId,
        sdp: answer,
      });
    } catch (err) {
      console.error('Error handling remote offer:', err);
    }
  }

  private async handleRemoteAnswer(senderId: string, sdp: RTCSessionDescriptionInit) {
    const pc = this.peerConnections.get(senderId);
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (err) {
        console.error('Error setting remote answer:', err);
      }
    }
  }

  private async handleRemoteIceCandidate(senderId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peerConnections.get(senderId);
    if (pc && candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('Error adding ICE candidate:', err);
      }
    }
  }

  private closePeerConnection(peerId: string) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
    const audioEl = this.remoteAudioElements.get(peerId);
    if (audioEl) {
      audioEl.srcObject = null;
      audioEl.remove();
      this.remoteAudioElements.delete(peerId);
    }
    this.callbacks.onRemoteTrackRemoved?.(peerId);
  }

  private sendSignaling(msg: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}
