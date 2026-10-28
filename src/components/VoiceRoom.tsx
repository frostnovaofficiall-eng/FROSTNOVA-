import React, { useState, useEffect, useRef } from 'react';
import { VoiceRoom as VoiceRoomType, RoomParticipant, AudioSettings } from '../types';
import { WebRTCService } from '../lib/webrtc';
import { WALLPAPER_PRESETS } from './CreateRoomModal';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Monitor,
  MonitorOff,
  PhoneOff,
  Sliders,
  Share2,
  Lock,
  Crown,
  Maximize2,
  Minimize2,
  Smartphone,
  Check,
  Flame,
  Trash2,
  Users,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

interface VoiceRoomProps {
  room: VoiceRoomType;
  currentUser: RoomParticipant;
  webrtcService: WebRTCService;
  audioSettings: AudioSettings;
  onLeaveRoom: () => void;
  onOpenAudioSettings: () => void;
  onOpenIosGuide: () => void;
  onDeleteChannel?: (roomId: string) => void;
}

export const VoiceRoom: React.FC<VoiceRoomProps> = ({
  room,
  currentUser,
  webrtcService,
  audioSettings,
  onLeaveRoom,
  onOpenAudioSettings,
  onOpenIosGuide,
  onDeleteChannel,
}) => {
  const [isMuted, setIsMuted] = useState(currentUser.isMuted);
  const [isDeafened, setIsDeafened] = useState(currentUser.isDeafened);
  const [isScreenSharing, setIsScreenSharing] = useState(currentUser.isScreenSharing);
  const [screenStats, setScreenStats] = useState<{ width: number; height: number; frameRate: number } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [participantVolumes, setParticipantVolumes] = useState<Record<string, number>>({});
  const [isTheaterExpanded, setIsTheaterExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isOwner = room.hostId === currentUser.userId;
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync screen stream to video element when sharing
  useEffect(() => {
    if (isScreenSharing && videoRef.current) {
      const stream = webrtcService.getScreenStream();
      if (stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Video play error:', e));
      }
    }
  }, [isScreenSharing]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    webrtcService.toggleMute(next);
  };

  const toggleDeafen = () => {
    const next = !isDeafened;
    setIsDeafened(next);
    webrtcService.toggleDeafen(next);
  };

  const handleScreenShareToggle = async () => {
    if (isScreenSharing) {
      webrtcService.stopScreenShare();
      setIsScreenSharing(false);
      setScreenStats(null);
    } else {
      try {
        const stats = await webrtcService.startScreenShare();
        if (stats) {
          setIsScreenSharing(true);
          setScreenStats(stats);
        }
      } catch (err: any) {
        alert(err.message || 'Screen sharing not available on this device.');
      }
    }
  };

  const handleVolumeChange = (peerId: string, val: number) => {
    setParticipantVolumes(prev => ({ ...prev, [peerId]: val }));
    webrtcService.setPeerVolume(peerId, val);
  };

  const copyRoomInvite = () => {
    const shareUrl = `${window.location.origin}/#room=${room.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDeleteRoom = () => {
    if (onDeleteChannel) {
      onDeleteChannel(room.id);
    }
  };

  // Find background wallpaper preset
  const preset = WALLPAPER_PRESETS.find(p => p.id === room.wallpaperPreset) || WALLPAPER_PRESETS[0];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-between overflow-x-hidden bg-neutral-950 text-white selection:bg-[#E53935]/30">
      {/* Background Image / Gradient with Overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src={room.customWallpaperUrl || preset.preview}
          alt={room.name}
          className="w-full h-full object-cover opacity-20 filter blur-sm scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/85 to-neutral-950/70" />
      </div>

      {/* Top Channel Header Bar */}
      <div className="relative z-10 px-3 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 backdrop-blur-md bg-black/30">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#E53935] flex items-center justify-center font-bold shadow-lg shadow-[#E53935]/30 shrink-0">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-lg font-black tracking-tight text-white truncate flex items-center gap-1.5">
                {room.name}
                {room.isPrivate && <Lock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />}
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#E53935]/20 text-[#E53935] border border-[#E53935]/30 shrink-0">
                {room.category}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-400 truncate mt-0.5">
              <span className="flex items-center gap-1 text-[11px] text-neutral-300">
                <Crown className="w-3 h-3 text-amber-400" />
                {room.hostName} {isOwner ? '(You)' : ''}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                <Users className="w-3 h-3" />
                {room.participants.length} in voice (Unlimited)
              </span>
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={copyRoomInvite}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all border border-white/10"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-neutral-300" />}
            <span className="hidden sm:inline">{copiedLink ? 'Link Copied!' : 'Invite Members'}</span>
          </button>

          {isOwner && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-white border border-red-500/30 text-xs font-semibold transition-all"
              title="Delete this permanent channel"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Delete Channel</span>
            </button>
          )}
        </div>
      </div>

      {/* Center Stage: Screen Share Stream + Unlimited Participant Grid */}
      <div className="relative z-10 flex-1 p-3 sm:p-6 flex flex-col items-center justify-center max-w-6xl mx-auto w-full">
        {/* Screen Share Viewer (If Active) */}
        {isScreenSharing && (
          <div className={`w-full mb-6 rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl relative transition-all ${
            isTheaterExpanded ? 'fixed inset-4 z-50 m-0' : 'max-h-[50vh]'
          }`}>
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs">
              <span className="w-2 h-2 rounded-full bg-[#E53935] animate-ping" />
              <span className="font-bold text-white">Live Screen Stream</span>
              {screenStats && (
                <span className="font-mono text-neutral-400 text-[11px] border-l border-white/20 pl-2">
                  {screenStats.width}x{screenStats.height} @ {screenStats.frameRate} FPS
                </span>
              )}
            </div>

            <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
              <button
                onClick={() => setIsTheaterExpanded(!isTheaterExpanded)}
                className="p-1.5 rounded-lg bg-black/70 hover:bg-black text-white border border-white/10 transition-colors"
              >
                {isTheaterExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full max-h-[70vh] object-contain bg-black"
            />
          </div>
        )}

        {/* Real Active Voice Participants Grid (Scalable) */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6 justify-center">
          {/* Local User Card */}
          <div className="relative group flex flex-col items-center p-3.5 sm:p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md border border-white/10 transition-all duration-200">
            {/* Speaking Halo & Avatar */}
            <div className="relative mb-2.5">
              <div
                className={`w-16 h-16 sm:w-22 sm:h-22 rounded-full overflow-hidden transition-all duration-150 ${
                  currentUser.isSpeaking
                    ? 'ring-4 ring-[#E53935] shadow-[0_0_25px_rgba(229,57,53,0.7)] scale-105 speaking-pulse'
                    : 'ring-2 ring-white/20'
                }`}
              >
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.displayName}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Mute / Deafen badge */}
              <div className="absolute bottom-0 right-0 flex gap-1">
                {isMuted && (
                  <span className="p-1 rounded-full bg-[#E53935] text-white shadow-md">
                    <MicOff className="w-3 h-3" />
                  </span>
                )}
                {isDeafened && (
                  <span className="p-1 rounded-full bg-neutral-800 text-neutral-300 shadow-md">
                    <VolumeX className="w-3 h-3" />
                  </span>
                )}
              </div>

              {/* Host Crown */}
              {isOwner && (
                <span className="absolute -top-1 -right-1 p-1 rounded-full bg-amber-500 text-black shadow-md">
                  <Crown className="w-3 h-3 fill-current" />
                </span>
              )}
            </div>

            {/* Name & Status */}
            <div className="text-center w-full">
              <p className="font-bold text-xs sm:text-sm text-white truncate flex items-center justify-center gap-1">
                {currentUser.displayName}
                <span className="text-[10px] text-neutral-400 font-normal">(You)</span>
              </p>
              <p className="text-[10px] text-neutral-400 font-mono truncate mt-0.5">
                {currentUser.isSpeaking ? 'Speaking...' : isMuted ? 'Muted' : 'Voice Active'}
              </p>
            </div>
          </div>

          {/* Remote Connected Peers */}
          {room.participants
            .filter(p => p.userId !== currentUser.userId)
            .map(peer => {
              const currentVol = participantVolumes[peer.userId] ?? 100;
              return (
                <div
                  key={peer.userId}
                  className="relative group flex flex-col items-center p-3.5 sm:p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md border border-white/10 transition-all duration-200"
                >
                  <div className="relative mb-2.5">
                    <div
                      className={`w-16 h-16 sm:w-22 sm:h-22 rounded-full overflow-hidden transition-all duration-150 ${
                        peer.isSpeaking
                          ? 'ring-4 ring-[#E53935] shadow-[0_0_25px_rgba(229,57,53,0.7)] scale-105 speaking-pulse'
                          : 'ring-2 ring-white/20'
                      }`}
                    >
                      <img
                        src={peer.avatarUrl}
                        alt={peer.displayName}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="absolute bottom-0 right-0 flex gap-1">
                      {peer.isMuted && (
                        <span className="p-1 rounded-full bg-[#E53935] text-white shadow-md">
                          <MicOff className="w-3 h-3" />
                        </span>
                      )}
                      {peer.isDeafened && (
                        <span className="p-1 rounded-full bg-neutral-800 text-neutral-300 shadow-md">
                          <VolumeX className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    {peer.isHost && (
                      <span className="absolute -top-1 -right-1 p-1 rounded-full bg-amber-500 text-black shadow-md">
                        <Crown className="w-3 h-3 fill-current" />
                      </span>
                    )}
                  </div>

                  <div className="text-center w-full">
                    <p className="font-bold text-xs sm:text-sm text-white truncate">{peer.displayName}</p>
                    <p className="text-[10px] text-neutral-400 font-mono truncate mt-0.5">
                      {peer.isSpeaking ? 'Speaking...' : peer.isMuted ? 'Muted' : 'Voice Active'}
                    </p>
                  </div>

                  {/* Volume Slider */}
                  <div className="mt-2 w-full pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-neutral-400">
                    <Volume2 className="w-3 h-3 text-neutral-400" />
                    <input
                      type="range"
                      min="0"
                      max="150"
                      value={currentVol}
                      onChange={(e) => handleVolumeChange(peer.userId, Number(e.target.value))}
                      className="w-16 accent-[#E53935]"
                      title={`Volume: ${currentVol}%`}
                    />
                    <span className="font-mono text-[9px]">{currentVol}%</span>
                  </div>
                </div>
              );
            })}

          {/* Quick Invite Slot (Unlimited Capacity) */}
          <div
            onClick={copyRoomInvite}
            className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl border-2 border-dashed border-white/10 hover:border-[#E53935]/50 bg-black/20 hover:bg-[#E53935]/5 transition-all cursor-pointer group"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-white/10 group-hover:border-[#E53935]/40 flex items-center justify-center text-neutral-400 group-hover:text-[#E53935] transition-colors mb-2">
              <Share2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <p className="text-xs font-bold text-neutral-300 group-hover:text-white text-center">Invite Teammates</p>
            <p className="text-[10px] text-neutral-500 font-mono">Unlimited Capacity (∞)</p>
          </div>
        </div>
      </div>

      {/* Fixed Responsive Voice Control Dock (Entirely Contained on iPhone & Desktop) */}
      <div className="relative z-30 pb-[calc(1.25rem+var(--safe-bottom,0px))] px-2 sm:px-4 pt-2 w-full">
        <div className="w-full max-w-md mx-auto bg-neutral-900/95 dark:bg-black/95 backdrop-blur-2xl border border-white/20 rounded-2xl sm:rounded-3xl p-1.5 sm:p-2.5 shadow-2xl flex items-center justify-between gap-1 sm:gap-2 flex-nowrap shrink-0 overflow-x-hidden">
          {/* Mute Mic Toggle */}
          <button
            onClick={toggleMute}
            className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl shrink-0 transition-all ${
              isMuted
                ? 'bg-[#E53935] text-white shadow-md shadow-[#E53935]/30 scale-95'
                : 'hover:bg-white/10 text-white'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />}
            <span className="text-[9px] sm:text-[10px] font-bold tracking-tight truncate max-w-full">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          {/* Deafen Output Toggle */}
          <button
            onClick={toggleDeafen}
            className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl shrink-0 transition-all ${
              isDeafened
                ? 'bg-neutral-800 text-[#E53935] border border-[#E53935]/40 scale-95'
                : 'hover:bg-white/10 text-white'
            }`}
            title={isDeafened ? 'Undeafen' : 'Deafen'}
          >
            {isDeafened ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />}
            <span className="text-[9px] sm:text-[10px] font-bold tracking-tight truncate max-w-full">{isDeafened ? 'Deafened' : 'Deafen'}</span>
          </button>

          {/* Screen Share Toggle */}
          <button
            onClick={handleScreenShareToggle}
            className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl shrink-0 transition-all ${
              isScreenSharing
                ? 'bg-[#E53935] text-white shadow-md shadow-[#E53935]/30'
                : 'hover:bg-white/10 text-white'
            }`}
            title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen (60 FPS)'}
          >
            {isScreenSharing ? <MonitorOff className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> : <Monitor className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />}
            <span className="text-[9px] sm:text-[10px] font-bold tracking-tight truncate max-w-full">Screen</span>
          </button>

          {/* Audio Settings */}
          <button
            onClick={onOpenAudioSettings}
            className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl shrink-0 hover:bg-white/10 text-white transition-all"
            title="Audio Hardware & Noise Cancellation"
          >
            <Sliders className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-bold tracking-tight truncate max-w-full">Audio</span>
          </button>

          {/* iPhone Game Sound Guide */}
          <button
            onClick={onOpenIosGuide}
            className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl shrink-0 hover:bg-white/10 text-neutral-300 hover:text-white transition-all"
            title="iPhone & Free Fire Game Audio Guide"
          >
            <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-[#E53935] shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-bold tracking-tight truncate max-w-full">Sound</span>
          </button>

          {/* Leave Call (Red Phone) - Strictly inside container on all screens */}
          <button
            onClick={onLeaveRoom}
            className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl shrink-0 bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-lg shadow-[#E53935]/40 transition-all font-bold"
            title="Disconnect from Voice Channel"
          >
            <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-bold tracking-tight truncate max-w-full">Leave</span>
          </button>
        </div>
      </div>

      {/* Delete Permanent Channel Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center gap-2.5 text-red-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-black text-sm text-white">Permanently Delete Channel?</h3>
            </div>
            <p className="text-neutral-400 leading-relaxed">
              Are you sure you want to delete <strong className="text-white">"{room.name}"</strong>? It will be permanently removed from Supabase and can no longer be accessed.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3.5 py-2 rounded-xl text-neutral-400 hover:text-white font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  handleDeleteRoom();
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md shadow-red-600/30"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
