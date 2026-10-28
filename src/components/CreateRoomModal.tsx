import React, { useState } from 'react';
import { VoiceRoom, UserProfile } from '../types';
import { generateChannelRecoveryKey } from '../lib/supabase';
import {
  Users,
  Lock,
  Globe,
  Flame,
  Check,
  X,
  Key,
  ShieldCheck,
  Copy,
  Radio
} from 'lucide-react';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onCreateRoom: (room: VoiceRoom) => void;
}

export const WALLPAPER_PRESETS = [
  {
    id: 'freefire',
    name: 'Free Fire Peak',
    bg: 'linear-gradient(135deg, #FF6F00 0%, #D84315 50%, #212121 100%)',
    preview: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'crimson',
    name: 'Kemor Crimson Arena',
    bg: 'linear-gradient(135deg, #B71C1C 0%, #E53935 40%, #1A1A1A 100%)',
    preview: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    bg: 'linear-gradient(135deg, #4A148C 0%, #00B0FF 100%)',
    preview: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'nebula',
    name: 'Deep Space Nebula',
    bg: 'linear-gradient(135deg, #0D1B2A 0%, #1B263B 50%, #415A77 100%)',
    preview: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'carbon',
    name: 'Minimal Carbon',
    bg: 'linear-gradient(135deg, #121212 0%, #242424 100%)',
    preview: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=80',
  },
];

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCreateRoom,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<VoiceRoom['category']>('Free Fire');
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [pinCode, setPinCode] = useState<string>('');
  const [wallpaperPreset, setWallpaperPreset] = useState<string>('freefire');
  const [recoveryKey] = useState<string>(() => generateChannelRecoveryKey());
  const [copiedKey, setCopiedKey] = useState(false);

  if (!isOpen) return null;

  const handleCopyRecoveryKey = () => {
    navigator.clipboard.writeText(recoveryKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const roomId = `room_${Math.random().toString(36).substring(2, 9)}`;

    const newRoom: VoiceRoom = {
      id: roomId,
      name: name.trim(),
      description: description.trim() || 'Permanent voice channel for squad comms.',
      hostId: currentUser.id, // Stable user ID from Google/Supabase Auth
      hostEmail: currentUser.email || '',
      hostName: currentUser.displayName,
      hostAvatar: currentUser.avatarUrl,
      category,
      isUnlimited: true, // Unlimited membership, no artificial cap
      isPrivate,
      pinCode: isPrivate ? pinCode.trim() : undefined,
      wallpaperPreset,
      participantCount: 0,
      participants: [],
      isPermanent: true, // Remains permanently in Supabase
      recoveryKey,
      createdAt: Date.now(),
    };

    onCreateRoom(newRoom);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-[#18191C] rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#E53935]/10 text-[#E53935] flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-neutral-900 dark:text-white">Create Permanent Voice Channel</h2>
              <p className="text-xs text-neutral-500">Unlimited membership • Owned permanently by your account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ownership Notice */}
        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-neutral-800 dark:text-neutral-200">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Permanent Account-Based Ownership</span>
          </div>
          <p className="text-neutral-500 leading-relaxed">
            This voice channel will be permanently linked to <strong>{currentUser.email || currentUser.displayName}</strong> in Supabase. It stays in your channel list after logout, browser change, or when 0 members are connected. Only you can delete it.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Channel Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. FrostNova Squad HQ 🔥"
              maxLength={40}
              required
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E53935]"
            />
          </div>

          <div>
            <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Description / Topic
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Permanent channel for Free Fire scrims & tournament talk"
              maxLength={80}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E53935]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E53935]"
              >
                <option value="Free Fire">Free Fire</option>
                <option value="Ranked Push">Ranked Push</option>
                <option value="Battle Royale">Battle Royale</option>
                <option value="Casual Squad">Casual Squad</option>
                <option value="Tourney">Tourney / Scrims</option>
                <option value="Community">Community</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Voice Capacity
              </label>
              <div className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-200 font-bold flex items-center justify-between">
                <span>Unlimited (∞)</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold opacity-75">No Cap</span>
              </div>
            </div>
          </div>

          {/* Privacy */}
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                {isPrivate ? <Lock className="w-4 h-4 text-[#E53935]" /> : <Globe className="w-4 h-4 text-emerald-500" />}
                {isPrivate ? 'Private Channel (PIN Protected)' : 'Public Channel (Community Lobby)'}
              </span>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 accent-[#E53935]"
              />
            </div>
            {isPrivate && (
              <div>
                <input
                  type="password"
                  placeholder="Enter 4-digit squad PIN"
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-mono"
                />
              </div>
            )}
          </div>

          {/* Channel Recovery Key */}
          <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#E53935]" />
                Channel Ownership Recovery Key
              </span>
              <button
                type="button"
                onClick={handleCopyRecoveryKey}
                className="text-[11px] font-bold text-[#E53935] hover:underline flex items-center gap-1"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey ? 'Copied' : 'Copy Key'}
              </button>
            </div>
            <p className="font-mono text-[11px] bg-white dark:bg-neutral-800 p-2 rounded-lg text-neutral-700 dark:text-neutral-300 select-all border border-neutral-200/60 dark:border-neutral-700">
              {recoveryKey}
            </p>
            <p className="text-[10px] text-neutral-400">
              Use this key to recover or transfer channel ownership if you change email credentials.
            </p>
          </div>

          {/* Wallpaper Presets */}
          <div>
            <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-2">
              Atmosphere & Wallpaper
            </label>
            <div className="grid grid-cols-3 gap-2">
              {WALLPAPER_PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setWallpaperPreset(p.id)}
                  className={`relative h-16 rounded-xl overflow-hidden border-2 transition-all ${
                    wallpaperPreset === p.id
                      ? 'border-[#E53935] scale-[1.02] shadow-sm'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={p.preview} alt={p.name} className="w-full h-full object-cover" />
                  <span className="absolute inset-0 bg-black/40 flex items-end p-1.5 text-[10px] font-bold text-white truncate">
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E53935] hover:bg-[#D32F2F] text-white font-bold shadow-md shadow-[#E53935]/25"
            >
              <Check className="w-4 h-4" />
              Create Channel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
