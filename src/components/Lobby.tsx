import React, { useState } from 'react';
import { VoiceRoom, UserProfile, FriendItem } from '../types';
import { WALLPAPER_PRESETS } from './CreateRoomModal';
import {
  Users,
  Plus,
  Search,
  Lock,
  Globe,
  Flame,
  Volume2,
  Gamepad2,
  UserPlus,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Headphones,
  Smartphone,
  Crown,
  Trash2,
  Key,
  ShieldCheck,
  Check,
  Radio,
  ExternalLink
} from 'lucide-react';

interface LobbyProps {
  currentUser: UserProfile;
  rooms: VoiceRoom[];
  onJoinRoom: (roomId: string, pinCode?: string) => void;
  onOpenCreateRoom: () => void;
  onOpenIosGuide: () => void;
  onOpenAudioSettings: () => void;
  onDeleteRoom?: (roomId: string) => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  currentUser,
  rooms,
  onJoinRoom,
  onOpenCreateRoom,
  onOpenIosGuide,
  onOpenAudioSettings,
  onDeleteRoom,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'all' | 'my-channels'>('all');
  const [pinModalRoom, setPinModalRoom] = useState<VoiceRoom | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);

  // Mock friends list with real joinable rooms
  const [friends, setFriends] = useState<FriendItem[]>([
    {
      id: 'f1',
      userId: 'usr_ff_akash',
      displayName: 'Akash_Pro',
      username: 'akash_pro',
      avatarUrl: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
      status: 'in_room',
      currentRoomId: 'ff-grandmaster-hq',
      currentRoomName: 'Free Fire Grandmaster HQ 🔥',
      gameTag: 'FF: 92837194',
    },
    {
      id: 'f2',
      userId: 'usr_ff_sniper',
      displayName: 'ViperX',
      username: 'viperx',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      status: 'online',
      gameTag: 'FF: 11029384',
    },
    {
      id: 'f3',
      userId: 'usr_ff_luna',
      displayName: 'LunaGamer',
      username: 'lunagamer',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      status: 'in_room',
      currentRoomId: 'chill-late-night',
      currentRoomName: 'Late Night Chill & Lo-Fi Lounge 🌙',
      gameTag: 'FF: 74829104',
    },
  ]);

  const [newFriendTag, setNewFriendTag] = useState('');
  const [friendNotice, setFriendNotice] = useState<string | null>(null);

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFriendTag.trim()) return;

    const newF: FriendItem = {
      id: `f_${Date.now()}`,
      userId: `usr_${Math.random().toString(36).substring(2, 7)}`,
      displayName: newFriendTag.trim(),
      username: newFriendTag.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
      status: 'online',
      gameTag: 'FF: ' + Math.floor(10000000 + Math.random() * 90000000),
    };

    setFriends(prev => [newF, ...prev]);
    setNewFriendTag('');
    setFriendNotice(`Squad invite sent to ${newFriendTag}!`);
    setTimeout(() => setFriendNotice(null), 3000);
  };

  const handleRoomClick = (room: VoiceRoom) => {
    if (room.isPrivate) {
      setPinModalRoom(room);
      setEnteredPin('');
      setPinError(false);
    } else {
      onJoinRoom(room.id);
    }
  };

  const submitPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinModalRoom) return;

    if (pinModalRoom.pinCode && pinModalRoom.pinCode !== enteredPin.trim()) {
      setPinError(true);
      return;
    }

    onJoinRoom(pinModalRoom.id, enteredPin.trim());
    setPinModalRoom(null);
  };

  const myChannels = rooms.filter(r => r.hostId === currentUser.id);

  const displayedRooms = (activeTab === 'my-channels' ? myChannels : rooms).filter(r => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.hostEmail && r.hostEmail.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'All' || r.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const categories = ['All', 'Free Fire', 'Ranked Push', 'Battle Royale', 'Casual Squad', 'Tourney'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 overflow-x-hidden">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-[#1F1414] dark:from-[#141517] dark:via-[#161719] dark:to-[#201515] p-6 sm:p-8 text-white border border-neutral-800 shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E53935]/20 text-[#E53935] border border-[#E53935]/30 text-xs font-bold uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5" />
            <span>Permanent Gmail-Owned Voice Channels</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Unlimited Membership Voice Channels
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
            Every channel is permanently bound to your account and saved in Supabase. Zero artificial participant caps (no 4, 10, or 99 limit).
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onOpenCreateRoom}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E53935] hover:bg-[#D32F2F] text-white text-xs font-bold shadow-lg shadow-[#E53935]/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Permanent Channel</span>
            </button>
            <button
              onClick={onOpenIosGuide}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/10 transition-all"
            >
              <Smartphone className="w-4 h-4 text-[#E53935]" />
              <span>iPhone Audio Optimizer</span>
            </button>
            <button
              onClick={onOpenAudioSettings}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/10 transition-all"
            >
              <Volume2 className="w-4 h-4" />
              <span>Hardware & Mic Test</span>
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-80 h-80 rounded-full bg-[#E53935]/15 blur-3xl pointer-events-none" />
      </div>

      {/* Main Grid: Rooms on Left, Friends on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column: Voice Channels (3 Cols) */}
        <div className="lg:col-span-3 space-y-6 min-w-0">
          {/* Tabs: All Channels vs My Owned Channels */}
          <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              All Voice Channels ({rooms.length})
            </button>
            <button
              onClick={() => setActiveTab('my-channels')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'my-channels'
                  ? 'bg-[#E53935] text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>My Channels ({myChannels.length})</span>
            </button>
          </div>

          {/* Controls: Search + Quick Create */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search channels, hosts, or categories..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#18191C] text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#E53935] shadow-sm transition-all"
              />
            </div>

            <button
              onClick={onOpenCreateRoom}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#E53935] hover:bg-[#D32F2F] text-white text-xs font-bold shadow-md shadow-[#E53935]/25 shrink-0 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Channel</span>
            </button>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#E53935] text-white shadow-sm'
                    : 'bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Rooms Grid (Unlimited Capacity, Permanent Ownership) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedRooms.map((room) => {
              const preset = WALLPAPER_PRESETS.find(p => p.id === room.wallpaperPreset) || WALLPAPER_PRESETS[0];
              const isOwner = room.hostId === currentUser.id;

              return (
                <div
                  key={room.id}
                  onClick={() => handleRoomClick(room)}
                  className="group relative overflow-hidden rounded-2xl bg-white dark:bg-[#18191C] border border-neutral-200/90 dark:border-neutral-800/90 shadow-sm hover:shadow-md hover:border-[#E53935]/40 transition-all duration-200 flex flex-col justify-between cursor-pointer"
                >
                  {/* Top Wallpaper Strip */}
                  <div className="relative h-24 overflow-hidden">
                    <img
                      src={room.customWallpaperUrl || preset.preview}
                      alt={room.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                    {/* Category & Badges */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white font-bold text-[10px] border border-white/10 uppercase tracking-wider">
                        {room.category}
                      </span>
                      {isOwner && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/80 backdrop-blur-md text-black font-bold text-[10px] flex items-center gap-1">
                          <Crown className="w-3 h-3 fill-current" />
                          <span>Owner</span>
                        </span>
                      )}
                    </div>

                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                      {room.isPrivate ? (
                        <span className="p-1 rounded-full bg-black/60 text-[#E53935] border border-white/10" title="Private Channel">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="p-1 rounded-full bg-black/60 text-emerald-400 border border-white/10" title="Public Channel">
                          <Globe className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                    {/* Real Participant Counter (No Artificial Cap) */}
                    <div className="absolute bottom-2 right-2.5 px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-white font-mono text-[11px] font-bold border border-white/10 flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-emerald-400" />
                      <span>{room.participantCount} in voice</span>
                      <span className="text-[9px] text-neutral-400">/ ∞</span>
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 group-hover:text-[#E53935] transition-colors truncate">
                          {room.name}
                        </h3>
                        {isOwner && onDeleteRoom && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingRoomId(room.id);
                            }}
                            className="p-1 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            title="Delete this permanent channel"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-1 leading-relaxed">
                        {room.description || 'Permanent voice channel open for squad comms.'}
                      </p>
                    </div>

                    {/* Host & Join Action */}
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={room.hostAvatar}
                          alt={room.hostName}
                          className="w-5 h-5 rounded-full object-cover ring-1 ring-neutral-300 dark:ring-neutral-700 shrink-0"
                        />
                        <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 truncate max-w-[120px]">
                          {room.hostName} {isOwner ? '(You)' : ''}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 group-hover:bg-[#E53935] group-hover:text-white transition-all shadow-sm"
                      >
                        Join Voice
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {displayedRooms.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-[#18191C] rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 space-y-3">
              <Headphones className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto" />
              <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                {activeTab === 'my-channels'
                  ? "You haven't created any permanent voice channels yet"
                  : 'No channels match your filter'}
              </p>
              <p className="text-xs text-neutral-400">
                Create a permanent channel under your Gmail account that stays in your channel list forever.
              </p>
              <button
                onClick={onOpenCreateRoom}
                className="mt-2 px-4 py-2 rounded-xl bg-[#E53935] text-white text-xs font-bold shadow-md shadow-[#E53935]/25"
              >
                Create Permanent Channel
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Squad Friends & SFU Architecture Overview (1 Col) */}
        <div className="space-y-6">
          {/* Scalable Architecture Card */}
          <div className="bg-white dark:bg-[#18191C] rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <Radio className="w-4 h-4 text-[#E53935]" />
              <h2 className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                Scalable Voice Mesh
              </h2>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              KEMOR voice rooms run without artificial member caps. Peer audio is signaled in real-time over WebSocket with Google STUN endpoints.
            </p>
            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 text-[11px] space-y-1">
              <div className="flex justify-between text-neutral-700 dark:text-neutral-300">
                <span>Channel Capacity:</span>
                <span className="font-bold text-emerald-500">Unlimited (∞)</span>
              </div>
              <div className="flex justify-between text-neutral-700 dark:text-neutral-300">
                <span>Account Anchor:</span>
                <span className="font-bold text-neutral-900 dark:text-white truncate max-w-[120px]">
                  {currentUser.email || 'Verified Account'}
                </span>
              </div>
            </div>
          </div>

          {/* Friends Sidebar */}
          <div className="bg-white dark:bg-[#18191C] rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#E53935]" />
                <h2 className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                  Squad Friends ({friends.length})
                </h2>
              </div>
            </div>

            {friendNotice && (
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium">
                {friendNotice}
              </div>
            )}

            <form onSubmit={handleAddFriend} className="flex gap-1.5 text-xs">
              <input
                type="text"
                value={newFriendTag}
                onChange={(e) => setNewFriendTag(e.target.value)}
                placeholder="Gamer tag / UID..."
                className="flex-1 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#E53935]"
              />
              <button
                type="submit"
                className="px-2.5 py-1.5 rounded-xl bg-[#E53935] hover:bg-[#D32F2F] text-white font-bold text-xs"
                title="Add Friend"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="space-y-2.5 max-h-[420px] overflow-y-auto">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="p-2.5 rounded-xl bg-neutral-50/80 dark:bg-neutral-900/60 border border-neutral-200/60 dark:border-neutral-800/80 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={friend.avatarUrl}
                        alt={friend.displayName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#18191C] ${
                          friend.status === 'in_room'
                            ? 'bg-[#E53935]'
                            : friend.status === 'online'
                            ? 'bg-emerald-500'
                            : 'bg-neutral-400'
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-neutral-900 dark:text-neutral-100 truncate">
                        {friend.displayName}
                      </p>
                      <p className="text-[10px] text-neutral-500 truncate font-mono">
                        {friend.status === 'in_room' ? friend.currentRoomName : friend.gameTag || 'Available'}
                      </p>
                    </div>
                  </div>

                  {friend.status === 'in_room' && friend.currentRoomId && (
                    <button
                      onClick={() => onJoinRoom(friend.currentRoomId!)}
                      className="px-2.5 py-1 rounded-lg bg-[#E53935]/10 hover:bg-[#E53935] text-[#E53935] hover:text-white font-bold text-[11px] transition-colors shrink-0"
                      title="Join Friend's Room"
                    >
                      Join
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PIN Modal */}
      {pinModalRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#18191C] rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#E53935]/10 text-[#E53935] flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 dark:text-white text-sm">Squad PIN Required</h3>
                <p className="text-[11px] text-neutral-500 truncate">{pinModalRoom.name}</p>
              </div>
            </div>

            {pinError && (
              <p className="text-red-500 font-semibold text-[11px]">Incorrect squad PIN code.</p>
            )}

            <form onSubmit={submitPin} className="space-y-3">
              <input
                type="password"
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value)}
                placeholder="Enter 4-digit PIN"
                autoFocus
                maxLength={6}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white text-center font-mono text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-[#E53935]"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPinModalRoom(null)}
                  className="px-3 py-1.5 rounded-lg text-neutral-600 dark:text-neutral-400 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#E53935] text-white font-bold"
                >
                  Enter Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRoomId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center gap-2.5 text-red-500">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h3 className="font-black text-sm text-neutral-900 dark:text-white">Delete Permanent Channel?</h3>
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed">
              This will permanently delete this voice channel from your Gmail account and from the Supabase database.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingRoomId(null)}
                className="px-3.5 py-2 rounded-xl text-neutral-500 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onDeleteRoom) {
                    onDeleteRoom(deletingRoomId);
                  }
                  setDeletingRoomId(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
