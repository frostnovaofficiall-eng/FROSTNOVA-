import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserProfile, VoiceRoom, RoomParticipant, AudioSettings } from './types';
import {
  supabase,
  isSupabaseConfigured,
  getStoredLocalUser,
  saveLocalUser,
  signOut,
  buildProfileFromAuthUser,
  savePermanentChannel,
  fetchUserPermanentChannels,
  deletePermanentChannel
} from './lib/supabase';
import { WebRTCService } from './lib/webrtc';
import { DEFAULT_AUDIO_SETTINGS } from './lib/audioManager';
import { Navbar } from './components/Navbar';
import { Lobby } from './components/Lobby';
import { VoiceRoom as VoiceRoomComponent } from './components/VoiceRoom';
import { AuthModal } from './components/AuthModal';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { IosAudioGuideModal } from './components/IosAudioGuideModal';
import { ProfileModal } from './components/ProfileModal';
import { CreateRoomModal } from './components/CreateRoomModal';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(() => getStoredLocalUser());
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('kemor_theme') as any) || 'system';
  });
  const [activeRoom, setActiveRoom] = useState<VoiceRoom | null>(null);
  const [rooms, setRooms] = useState<VoiceRoom[]>([]);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() => {
    try {
      const stored = localStorage.getItem('kemor_audio_settings');
      return stored ? JSON.parse(stored) : DEFAULT_AUDIO_SETTINGS;
    } catch {
      return DEFAULT_AUDIO_SETTINGS;
    }
  });

  // Modals state
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState(false);
  const [isIosGuideOpen, setIsIosGuideOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeRoomRef = useRef<VoiceRoom | null>(null);
  activeRoomRef.current = activeRoom;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Initialize WebRTC Service
  const webrtcService = useMemo(() => {
    return new WebRTCService({
      onRoomJoined: (room, existingPeers) => {
        setActiveRoom({
          ...room,
          isUnlimited: true,
          isPermanent: true,
          participants: room.participants || [],
          participantCount: (room.participants || []).length,
        });
        showToast(`Connected to voice channel: ${room.name}`);
      },
      onPeerJoined: (peer) => {
        if (!activeRoomRef.current) return;
        const current = activeRoomRef.current;
        const exists = current.participants.some(p => p.userId === peer.userId);
        const updatedPeers = exists
          ? current.participants.map(p => p.userId === peer.userId ? peer : p)
          : [...current.participants, peer];

        setActiveRoom({
          ...current,
          participants: updatedPeers,
          participantCount: updatedPeers.length,
        });
        showToast(`${peer.displayName} joined the channel.`);
      },
      onPeerLeft: (peerId) => {
        if (!activeRoomRef.current) return;
        const current = activeRoomRef.current;
        const updatedPeers = current.participants.filter(p => p.userId !== peerId);
        setActiveRoom({
          ...current,
          participants: updatedPeers,
          participantCount: updatedPeers.length,
        });
      },
      onUserStateUpdated: (userId, updates) => {
        if (!activeRoomRef.current) return;
        const current = activeRoomRef.current;
        const updatedPeers = current.participants.map(p => {
          if (p.userId === userId) {
            return { ...p, ...updates };
          }
          return p;
        });
        setActiveRoom({
          ...current,
          participants: updatedPeers,
        });
      },
      onUserSpeaking: (userId, isSpeaking, volumeLevel) => {
        if (!activeRoomRef.current) return;
        const current = activeRoomRef.current;
        const updatedPeers = current.participants.map(p => {
          if (p.userId === userId) {
            return { ...p, isSpeaking };
          }
          return p;
        });
        setActiveRoom({
          ...current,
          participants: updatedPeers,
        });
      },
      onRoomsList: (incomingRooms) => {
        // Merge incoming active rooms with existing
        setRooms(prev => {
          const map = new Map<string, VoiceRoom>();
          for (const r of incomingRooms) map.set(r.id, r);
          for (const r of prev) {
            if (!map.has(r.id)) map.set(r.id, r);
          }
          return Array.from(map.values());
        });
      },
      onRoomDeleted: (roomId) => {
        setRooms(prev => prev.filter(r => r.id !== roomId));
        if (activeRoomRef.current?.id === roomId) {
          setActiveRoom(null);
          window.location.hash = '';
          showToast('Voice channel was deleted by owner.');
        }
      },
      onError: (err) => {
        showToast(err);
      },
    });
  }, []);

  // System Theme Listener & Apply Theme Class
  useEffect(() => {
    const root = document.documentElement;

    const apply = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => apply(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      apply(theme === 'dark');
    }

    localStorage.setItem('kemor_theme', theme);
  }, [theme]);

  // Restore Supabase Session and User's Permanent Channels
  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const profile = buildProfileFromAuthUser(session.user);
          setUser(profile);
          saveLocalUser(profile);
          loadUserChannels(profile.id);
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const profile = buildProfileFromAuthUser(session.user);
          setUser(profile);
          saveLocalUser(profile);
          loadUserChannels(profile.id);
        } else if (_event === 'SIGNED_OUT') {
          setUser(null);
        }
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  const loadUserChannels = async (userId: string) => {
    try {
      const owned = await fetchUserPermanentChannels(userId);
      if (owned.length > 0) {
        setRooms(prev => {
          const map = new Map<string, VoiceRoom>();
          for (const r of prev) map.set(r.id, r);
          for (const r of owned) map.set(r.id, r);
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.warn('Load user channels error:', err);
    }
  };

  // Connect to Signaling Server & Fetch Initial Channels
  useEffect(() => {
    webrtcService.connectSignaling().catch(e => {
      console.warn('Initial WebSocket signaling connect:', e);
    });

    fetch('/api/rooms')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRooms(prev => {
            const map = new Map<string, VoiceRoom>();
            for (const r of data) map.set(r.id, r);
            for (const r of prev) {
              if (!map.has(r.id)) map.set(r.id, r);
            }
            return Array.from(map.values());
          });
        }
      })
      .catch(e => console.warn('Fetch rooms error:', e));

    if (user?.id) {
      loadUserChannels(user.id);
    }

    return () => {
      webrtcService.disconnect();
    };
  }, [webrtcService, user?.id]);

  // Direct Join from URL Hash (e.g. #room=ff-grandmaster-hq)
  useEffect(() => {
    if (!user) return;
    const hash = window.location.hash;
    if (hash.startsWith('#room=')) {
      const targetRoomId = hash.replace('#room=', '');
      if (targetRoomId && (!activeRoom || activeRoom.id !== targetRoomId)) {
        handleJoinRoom(targetRoomId);
      }
    }
  }, [user]);

  const handleJoinRoom = async (roomId: string, _pinCode?: string) => {
    if (!user) return;

    const participant: RoomParticipant = {
      id: `part_${user.id}`,
      userId: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isHost: false,
      isMuted: false,
      isDeafened: false,
      isSpeaking: false,
      isScreenSharing: false,
      volume: 100,
      joinedAt: Date.now(),
    };

    try {
      await webrtcService.joinRoom(roomId, participant, audioSettings);
      window.location.hash = `room=${roomId}`;
    } catch (err: any) {
      showToast(err.message || 'Failed to join voice channel.');
    }
  };

  const handleLeaveRoom = () => {
    webrtcService.leaveRoom();
    setActiveRoom(null);
    window.location.hash = '';
    showToast('Left voice channel.');
  };

  const handleCreateRoom = async (newRoom: VoiceRoom) => {
    if (!user) return;

    // Persist permanently to Supabase with authenticated Google account UID
    const permanentRoom = await savePermanentChannel(newRoom, user);

    // Register with server REST API
    fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(permanentRoom),
    })
      .then(res => res.json())
      .then(created => {
        setRooms(prev => [created, ...prev.filter(r => r.id !== created.id)]);
        handleJoinRoom(created.id);
      })
      .catch(err => {
        console.warn('Server room sync warning:', err);
        setRooms(prev => [permanentRoom, ...prev.filter(r => r.id !== permanentRoom.id)]);
        handleJoinRoom(permanentRoom.id);
      });

    showToast(`Created permanent channel: ${newRoom.name}`);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!user) return;

    try {
      // Delete from Supabase
      await deletePermanentChannel(roomId, user.id);

      // Delete from server REST API
      await fetch(`/api/rooms/${roomId}?hostId=${user.id}`, { method: 'DELETE' });

      // Signal over WebSocket
      webrtcService.deleteRoom(roomId, user.id);

      // Update local state
      setRooms(prev => prev.filter(r => r.id !== roomId));

      if (activeRoom?.id === roomId) {
        handleLeaveRoom();
      }

      showToast('Permanent channel deleted.');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete channel.');
    }
  };

  const handleUpdateAudioSettings = (newSettings: AudioSettings) => {
    setAudioSettings(newSettings);
    localStorage.setItem('kemor_audio_settings', JSON.stringify(newSettings));
    showToast('Audio settings applied.');
  };

  const handleSignOut = async () => {
    handleLeaveRoom();
    await signOut();
    setUser(null);
  };

  if (!user) {
    return <AuthModal onSuccess={(newUser) => setUser(newUser)} />;
  }

  const currentParticipant = activeRoom?.participants.find(p => p.userId === user.id) || {
    id: `part_${user.id}`,
    userId: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    isHost: activeRoom?.hostId === user.id,
    isMuted: false,
    isDeafened: false,
    isSpeaking: false,
    isScreenSharing: false,
    volume: 100,
    joinedAt: Date.now(),
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 dark:bg-[#0C0D0E] dark:text-neutral-100 transition-colors overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/95 dark:bg-white/95 text-white dark:text-neutral-900 text-xs font-bold py-2 px-4 rounded-full shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-3 flex items-center gap-2 border border-white/10 dark:border-black/10">
          <span className="w-2 h-2 rounded-full bg-[#E53935]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Top Navigation */}
      <Navbar
        user={user}
        activeRoom={activeRoom}
        theme={theme}
        onThemeChange={(newTheme) => setTheme(newTheme)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenAudioSettings={() => setIsAudioSettingsOpen(true)}
        onOpenIosGuide={() => setIsIosGuideOpen(true)}
        onLeaveRoom={handleLeaveRoom}
        onSignOut={handleSignOut}
      />

      {/* Content Area: Voice Room OR Lobby */}
      <main className="flex-1 min-w-0">
        {activeRoom ? (
          <VoiceRoomComponent
            room={activeRoom}
            currentUser={currentParticipant}
            webrtcService={webrtcService}
            audioSettings={audioSettings}
            onLeaveRoom={handleLeaveRoom}
            onOpenAudioSettings={() => setIsAudioSettingsOpen(true)}
            onOpenIosGuide={() => setIsIosGuideOpen(true)}
            onDeleteChannel={handleDeleteRoom}
          />
        ) : (
          <Lobby
            currentUser={user}
            rooms={rooms}
            onJoinRoom={handleJoinRoom}
            onOpenCreateRoom={() => setIsCreateRoomOpen(true)}
            onOpenIosGuide={() => setIsIosGuideOpen(true)}
            onOpenAudioSettings={() => setIsAudioSettingsOpen(true)}
            onDeleteRoom={handleDeleteRoom}
          />
        )}
      </main>

      {/* Audio Settings Modal */}
      <AudioSettingsModal
        isOpen={isAudioSettingsOpen}
        onClose={() => setIsAudioSettingsOpen(false)}
        settings={audioSettings}
        onUpdateSettings={handleUpdateAudioSettings}
      />

      {/* iPhone Game Audio Guide Modal */}
      <IosAudioGuideModal
        isOpen={isIosGuideOpen}
        onClose={() => setIsIosGuideOpen(false)}
      />

      {/* User Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onUpdateUser={(updated) => setUser(updated)}
      />

      {/* Create Permanent Room Modal */}
      <CreateRoomModal
        isOpen={isCreateRoomOpen}
        onClose={() => setIsCreateRoomOpen(false)}
        currentUser={user}
        onCreateRoom={handleCreateRoom}
      />
    </div>
  );
}
