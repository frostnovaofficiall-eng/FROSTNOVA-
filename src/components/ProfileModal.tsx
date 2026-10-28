import React, { useState } from 'react';
import { UserProfile } from '../types';
import { saveLocalUser, supabase } from '../lib/supabase';
import { User, X, Check, Camera, Sparkles, Shield, Upload } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150&auto=format&fit=crop&q=80',
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
}) => {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [username, setUsername] = useState(user.username);
  const [statusMessage, setStatusMessage] = useState(user.statusMessage || '');
  const [gameTag, setGameTag] = useState(user.gameTag || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [customAvatarInput, setCustomAvatarInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMsg('Display name is required.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    const updated: UserProfile = {
      ...user,
      displayName: displayName.trim(),
      username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
      statusMessage: statusMessage.trim(),
      gameTag: gameTag.trim(),
      avatarUrl,
    };

    try {
      saveLocalUser(updated);

      if (supabase && user.id && !user.id.startsWith('usr_')) {
        await supabase
          .from('profiles')
          .update({
            display_name: updated.displayName,
            username: updated.username,
            status_message: updated.statusMessage,
            game_tag: updated.gameTag,
            avatar_url: updated.avatarUrl,
          })
          .eq('id', user.id);
      }

      onUpdateUser(updated);
      onClose();
    } catch (err: any) {
      console.warn('Profile sync notice:', err);
      // Still update locally
      onUpdateUser(updated);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg('Image size must be under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-[#18191C] rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#E53935]" />
            <h2 className="text-base font-black text-neutral-900 dark:text-white">Edit Gamer Profile</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-20 h-20 rounded-full object-cover ring-2 ring-[#E53935] shadow-md"
              />
              <label className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#E53935] text-white cursor-pointer hover:bg-[#D32F2F] shadow-sm">
                <Camera className="w-3.5 h-3.5" />
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-2">
              {AVATAR_PRESETS.map((p, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setAvatarUrl(p)}
                  className={`w-7 h-7 rounded-full overflow-hidden transition-all ${
                    avatarUrl === p ? 'ring-2 ring-[#E53935] scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={p} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={24}
              required
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E53935]"
            />
          </div>

          <div>
            <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Gamer Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-neutral-400 font-mono">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
                required
                className="w-full pl-7 pr-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E53935] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Free Fire / Game Tag UID
            </label>
            <input
              type="text"
              value={gameTag}
              onChange={(e) => setGameTag(e.target.value)}
              placeholder="e.g. FF: 981240182"
              maxLength={24}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E53935]"
            />
          </div>

          <div>
            <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Status Message
            </label>
            <input
              type="text"
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
              placeholder="e.g. Grinding Heroic in CS Ranked"
              maxLength={60}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E53935]"
            />
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
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E53935] hover:bg-[#D32F2F] text-white font-bold shadow-md shadow-[#E53935]/25"
            >
              <Check className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
