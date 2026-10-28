export interface UserProfile {
  id: string; // Permanent Supabase Auth User ID (UUID)
  email?: string; // Verified Gmail account
  displayName: string;
  username: string;
  avatarUrl: string;
  statusMessage?: string;
  isOnline: boolean;
  gameTag?: string; // e.g. "Free Fire: 82910382"
  createdAt?: string;
}

export interface VoiceRoom {
  id: string;
  name: string;
  description: string;
  hostId: string; // Stable Supabase user ID of channel owner
  hostEmail?: string; // Verified owner Gmail
  hostName: string;
  hostAvatar: string;
  category: 'Free Fire' | 'Battle Royale' | 'Ranked Push' | 'Casual Squad' | 'Tourney' | 'Community';
  isUnlimited: boolean; // No artificial participant caps
  isPrivate: boolean;
  pinCode?: string;
  wallpaperPreset: string;
  customWallpaperUrl?: string;
  participantCount: number; // Real-time active peers in voice
  participants: RoomParticipant[];
  isPermanent: boolean; // Retained permanently even when 0 participants
  recoveryKey?: string;
  transferPendingTo?: string;
  createdAt: number;
}

export interface RoomParticipant {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string;
  isHost: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
  volume: number; // 0 to 200
  joinedAt: number;
}

export interface AudioSettings {
  inputDeviceId: string;
  outputDeviceId: string;
  inputVolume: number; // 0 to 100
  outputVolume: number; // 0 to 100
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  pushToTalk: boolean;
  pushToTalkKey: string;
}

export interface FriendItem {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  status: 'online' | 'in_room' | 'offline';
  currentRoomId?: string;
  currentRoomName?: string;
  gameTag?: string;
}

export type SignalMessage =
  | { type: 'join-room'; roomId: string; user: RoomParticipant }
  | { type: 'leave-room'; roomId: string; userId: string }
  | { type: 'room-state'; room: VoiceRoom }
  | { type: 'peer-joined'; peer: RoomParticipant }
  | { type: 'peer-left'; peerId: string }
  | { type: 'existing-peers'; peers: RoomParticipant[] }
  | { type: 'webrtc-offer'; targetId: string; senderId: string; sdp: RTCSessionDescriptionInit }
  | { type: 'webrtc-answer'; targetId: string; senderId: string; sdp: RTCSessionDescriptionInit }
  | { type: 'webrtc-ice'; targetId: string; senderId: string; candidate: RTCIceCandidateInit }
  | { type: 'user-state-update'; roomId: string; userId: string; updates: Partial<RoomParticipant> }
  | { type: 'user-speaking'; roomId: string; userId: string; isSpeaking: boolean; volumeLevel: number }
  | { type: 'delete-room'; roomId: string; hostId: string };
