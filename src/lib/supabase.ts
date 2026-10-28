import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { UserProfile, VoiceRoom } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('your-project')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

const LOCAL_STORAGE_USER_KEY = 'kemor_user_profile';
const LOCAL_STORAGE_SESSION_KEY = 'kemor_demo_session';
const LOCAL_CHANNELS_KEY_PREFIX = 'kemor_permanent_channels_';

export async function signInWithGoogle() {
  if (!supabase) {
    throw new Error('Supabase URL and Anon Key are not yet configured. Please see setup guide.');
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithApple() {
  if (!supabase) {
    throw new Error('Supabase URL and Anon Key are not yet configured. Please see setup guide.');
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: `${window.location.origin}/`,
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut error:', e);
    }
  }
  localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
}

export function getStoredLocalUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveLocalUser(profile: UserProfile): void {
  localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
}

export function createGuestProfile(customName?: string): UserProfile {
  const randomId = Math.random().toString(36).substring(2, 9);
  const avatars = [
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150&auto=format&fit=crop&q=80'
  ];
  const avatarUrl = avatars[Math.floor(Math.random() * avatars.length)];
  const name = customName?.trim() || `KemorUser_${randomId.slice(0, 4)}`;

  const profile: UserProfile = {
    id: `usr_${randomId}`,
    email: `${name.toLowerCase()}@kemor.preview`,
    displayName: name,
    username: name.toLowerCase().replace(/[^a-z0-9_]/g, ''),
    avatarUrl,
    statusMessage: 'Squad Ready 🔥',
    gameTag: 'FF: ' + Math.floor(10000000 + Math.random() * 90000000),
    isOnline: true,
    createdAt: new Date().toISOString(),
  };

  saveLocalUser(profile);
  localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, 'guest');
  return profile;
}

export function buildProfileFromAuthUser(user: User): UserProfile {
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Kemor Player';
  const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture ||
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';

  return {
    id: user.id, // Stable Supabase UUID
    email: user.email, // Verified Gmail address
    displayName: name,
    username: (user.email ? user.email.split('@')[0] : 'kemor_' + user.id.slice(0, 5)).replace(/[^a-z0-9_]/g, ''),
    avatarUrl: avatar,
    statusMessage: 'Online • Permanent Channel Host',
    gameTag: 'FF: ' + user.id.slice(0, 8).toUpperCase(),
    isOnline: true,
    createdAt: user.created_at,
  };
}

// ------------------------------------------------------------------
// Permanent Channel Database Methods (Supabase + Local Fallback)
// ------------------------------------------------------------------

export async function savePermanentChannel(room: VoiceRoom, user: UserProfile): Promise<VoiceRoom> {
  const channelData: VoiceRoom = {
    ...room,
    hostId: user.id,
    hostEmail: user.email || '',
    hostName: user.displayName,
    hostAvatar: user.avatarUrl,
    isUnlimited: true,
    isPermanent: true,
    participantCount: 0,
    participants: [],
  };

  // If Supabase is active, persist to PostgreSQL
  if (supabase && user.id && !user.id.startsWith('usr_')) {
    const { data, error } = await supabase.from('rooms').upsert({
      id: channelData.id,
      name: channelData.name,
      description: channelData.description,
      host_id: user.id,
      host_email: channelData.hostEmail,
      host_name: channelData.hostName,
      host_avatar: channelData.hostAvatar,
      category: channelData.category,
      is_unlimited: true,
      is_private: channelData.isPrivate,
      pin_code: channelData.pinCode || null,
      wallpaper_preset: channelData.wallpaperPreset,
      custom_wallpaper_url: channelData.customWallpaperUrl || '',
      recovery_key: channelData.recoveryKey || '',
      created_at: new Date(channelData.createdAt).toISOString(),
    }).select().single();

    if (error) {
      console.warn('[KEMOR] Supabase room upsert warning:', error.message);
    }
  }

  // Also store in user's permanent channel list for instantaneous offline/re-login caching
  try {
    const key = `${LOCAL_CHANNELS_KEY_PREFIX}${user.id}`;
    const raw = localStorage.getItem(key);
    const list: VoiceRoom[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(r => r.id !== channelData.id);
    filtered.unshift(channelData);
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch (err) {
    console.warn('LocalStorage error:', err);
  }

  return channelData;
}

export async function fetchUserPermanentChannels(userId: string): Promise<VoiceRoom[]> {
  // If Supabase is configured, load from PostgreSQL
  if (supabase && userId && !userId.startsWith('usr_')) {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('host_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const parsed: VoiceRoom[] = data.map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description || '',
        hostId: r.host_id,
        hostEmail: r.host_email || '',
        hostName: r.host_name || 'Host',
        hostAvatar: r.host_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        category: r.category || 'Free Fire',
        isUnlimited: true,
        isPrivate: Boolean(r.is_private),
        pinCode: r.pin_code || undefined,
        wallpaperPreset: r.wallpaper_preset || 'freefire',
        customWallpaperUrl: r.custom_wallpaper_url || undefined,
        participantCount: 0,
        participants: [],
        isPermanent: true,
        recoveryKey: r.recovery_key || undefined,
        createdAt: new Date(r.created_at).getTime(),
      }));

      // Cache locally
      localStorage.setItem(`${LOCAL_CHANNELS_KEY_PREFIX}${userId}`, JSON.stringify(parsed));
      return parsed;
    }
  }

  // Fallback to local permanent cache
  try {
    const raw = localStorage.getItem(`${LOCAL_CHANNELS_KEY_PREFIX}${userId}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

export async function deletePermanentChannel(roomId: string, userId: string): Promise<boolean> {
  // Delete from Supabase
  if (supabase && userId && !userId.startsWith('usr_')) {
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', roomId)
      .eq('host_id', userId);

    if (error) {
      console.error('[KEMOR] Failed to delete room from Supabase:', error);
      throw new Error(error.message || 'Deletion failed in database');
    }
  }

  // Delete from local cache
  try {
    const key = `${LOCAL_CHANNELS_KEY_PREFIX}${userId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const list: VoiceRoom[] = JSON.parse(raw);
      const updated = list.filter(r => r.id !== roomId);
      localStorage.setItem(key, JSON.stringify(updated));
    }
  } catch {
    // ignore
  }

  return true;
}

export async function transferChannelOwnership(roomId: string, currentUserId: string, newOwnerId: string): Promise<boolean> {
  if (supabase && currentUserId && !currentUserId.startsWith('usr_')) {
    const { data, error } = await supabase.rpc('transfer_channel_ownership', {
      target_room_id: roomId,
      new_owner_id: newOwnerId,
    });

    if (error) {
      throw new Error(error.message || 'Ownership transfer failed in Supabase');
    }
    return Boolean(data);
  }

  // Local fallback
  const key = `${LOCAL_CHANNELS_KEY_PREFIX}${currentUserId}`;
  const raw = localStorage.getItem(key);
  if (raw) {
    const list: VoiceRoom[] = JSON.parse(raw);
    const updated = list.filter(r => r.id !== roomId);
    localStorage.setItem(key, JSON.stringify(updated));
  }
  return true;
}

export function generateChannelRecoveryKey(): string {
  const words = ['kemor', 'squad', 'crimson', 'voice', 'alpha', 'titan', 'apex', 'delta', 'vanguard', 'signal'];
  const shuffled = [...words].sort(() => 0.5 - Math.random());
  return `${shuffled.slice(0, 4).join('-')}-${Math.floor(1000 + Math.random() * 9000)}`;
}
