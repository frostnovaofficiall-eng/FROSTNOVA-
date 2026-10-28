-- ===================================================================
-- KEMOR Production Supabase Database Schema & Row Level Security (RLS)
-- Permanent Gmail-Owned Voice Channels with Unlimited Membership
-- ===================================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  status_message TEXT DEFAULT 'Ready for Free Fire squad 🔥',
  game_tag TEXT DEFAULT '',
  is_online BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Permanent Voice Rooms Table (Owned by Authenticated Gmail Account)
CREATE TABLE IF NOT EXISTS public.rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  host_email TEXT DEFAULT '',
  host_name TEXT DEFAULT '',
  host_avatar TEXT DEFAULT '',
  category TEXT DEFAULT 'Free Fire',
  is_unlimited BOOLEAN DEFAULT true, -- No artificial membership caps (unlimited capacity)
  is_private BOOLEAN DEFAULT false,
  pin_code TEXT DEFAULT NULL,
  wallpaper_preset TEXT DEFAULT 'freefire',
  custom_wallpaper_url TEXT DEFAULT '',
  recovery_key TEXT DEFAULT '', -- Encrypted recovery phrase for account recovery
  transfer_pending_to UUID REFERENCES public.profiles(id) DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Room Members (Real-Time Presence)
CREATE TABLE IF NOT EXISTS public.room_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_muted BOOLEAN DEFAULT false,
  is_deafened BOOLEAN DEFAULT false,
  is_speaking BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(room_id, user_id)
);

-- 4. Friends & Squad System
CREATE TABLE IF NOT EXISTS public.friends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, friend_id)
);

-- ===================================================================
-- Enable Row Level Security (RLS)
-- ===================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Rooms Policies (Strict Ownership & Deletion Security)
CREATE POLICY "Public and owned rooms viewable by all authenticated users" 
  ON public.rooms FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create their permanent rooms" 
  ON public.rooms FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Only room owners can update their channels" 
  ON public.rooms FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "Only room owners can permanently delete their channels" 
  ON public.rooms FOR DELETE USING (auth.uid() = host_id);

-- Room Members Policies
CREATE POLICY "Room members viewable by everyone" 
  ON public.room_members FOR SELECT USING (true);

CREATE POLICY "Users can join rooms" 
  ON public.room_members FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their member state" 
  ON public.room_members FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms" 
  ON public.room_members FOR DELETE USING (auth.uid() = user_id);

-- Friends Policies
CREATE POLICY "Users can view their friendships" 
  ON public.friends FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can request friendship" 
  ON public.friends FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friendship status" 
  ON public.friends FOR UPDATE USING (auth.uid() = friend_id OR auth.uid() = user_id);

-- Secure Channel Ownership Transfer Function
CREATE OR REPLACE FUNCTION public.transfer_channel_ownership(
  target_room_id TEXT,
  new_owner_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  caller_id UUID;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure caller is the genuine current owner
  IF NOT EXISTS (SELECT 1 FROM public.rooms WHERE id = target_room_id AND host_id = caller_id) THEN
    RAISE EXCEPTION 'Only the channel owner can transfer ownership';
  END IF;

  -- Ensure target new owner exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = new_owner_id) THEN
    RAISE EXCEPTION 'New owner does not exist';
  END IF;

  -- Perform transfer
  UPDATE public.rooms
  SET host_id = new_owner_id,
      transfer_pending_to = NULL
  WHERE id = target_room_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup auto-profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, email, avatar_url, game_tag)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'kemor_' || SUBSTRING(NEW.id::text, 1, 6)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Kemor Soldier'),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'),
    'FF: ' || UPPER(SUBSTRING(NEW.id::text, 1, 8))
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
