import React, { useState } from 'react';
import { KemorLogo } from './KemorLogo';
import {
  isSupabaseConfigured,
  signInWithGoogle,
  signInWithApple,
  createGuestProfile
} from '../lib/supabase';
import { UserProfile } from '../types';
import { AlertCircle, CheckCircle2, ChevronRight, ShieldCheck, Key, ExternalLink, Sparkles } from 'lucide-react';

interface AuthModalProps {
  onSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'apple' | 'guest' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setErrorMessage(null);
      setLoadingProvider('google');

      if (!isSupabaseConfigured) {
        setShowSetupGuide(true);
        setErrorMessage(
          'Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are not configured. You can use the instant Squad Pass below, or configure your Supabase project in .env.'
        );
        return;
      }

      await signInWithGoogle();
      // Browser redirects to Google OAuth
    } catch (err: any) {
      console.error('Google OAuth error:', err);
      setErrorMessage(err.message || 'Google authentication failed or was cancelled.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleAppleLogin = async () => {
    try {
      setErrorMessage(null);
      setLoadingProvider('apple');

      if (!isSupabaseConfigured) {
        setShowSetupGuide(true);
        setErrorMessage(
          'Supabase environment variables are required for Apple Sign-in. Please configure your Apple Developer Services ID in your Supabase dashboard or enter via Squad Pass below.'
        );
        return;
      }

      await signInWithApple();
    } catch (err: any) {
      console.error('Apple OAuth error:', err);
      setErrorMessage(err.message || 'Apple authentication failed or was cancelled.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleGuestLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProvider('guest');
    try {
      const profile = createGuestProfile(guestName);
      onSuccess(profile);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to enter lobby.');
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-[#090A0B] dark:to-[#121316] text-neutral-900 dark:text-neutral-100">
      <div className="w-full max-w-md bg-white dark:bg-[#18191C] rounded-2xl shadow-xl border border-neutral-200/80 dark:border-neutral-800 p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <KemorLogo size="xl" showText={false} glow />
          <div>
            <h1 className="text-2xl font-black tracking-tight text-neutral-950 dark:text-white">
              Welcome to KEMOR
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              High-performance voice community for squads and competitive gamers.
            </p>
          </div>
        </div>

        {/* OAuth Status Banner */}
        <div className="rounded-xl border border-neutral-200/60 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 p-3 text-xs flex items-start gap-2.5">
          <ShieldCheck className={`w-4 h-4 mt-0.5 shrink-0 ${isSupabaseConfigured ? 'text-emerald-500' : 'text-amber-500'}`} />
          <div className="flex-1">
            <div className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center justify-between">
              <span>{isSupabaseConfigured ? 'Supabase Auth Ready' : 'Development Preview Mode'}</span>
              <button
                type="button"
                onClick={() => setShowSetupGuide(!showSetupGuide)}
                className="text-[#E53935] hover:underline font-normal text-[11px]"
              >
                {showSetupGuide ? 'Hide Checklist' : 'Setup Checklist'}
              </button>
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
              {isSupabaseConfigured
                ? 'Official Google & Apple OAuth handlers linked with Supabase.'
                : 'Supabase credentials unpopulated. Real WebRTC voice rooms are fully active; you can join immediately with Squad Pass.'}
            </p>
          </div>
        </div>

        {/* Setup Guide Modal/Panel if expanded */}
        {showSetupGuide && (
          <div className="rounded-xl bg-neutral-100 dark:bg-neutral-900 p-4 border border-neutral-200 dark:border-neutral-800 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
              <Key className="w-4 h-4 text-[#E53935]" />
              Production OAuth Setup Checklist
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-neutral-600 dark:text-neutral-300">
              <li>Create a free project at <span className="font-mono text-neutral-900 dark:text-white">supabase.com</span>.</li>
              <li>Under Authentication &rarr; Providers, enable <strong>Google</strong> & <strong>Apple</strong>.</li>
              <li>Set Redirect URL in Google Cloud / Apple Dev to: <code className="bg-neutral-200 dark:bg-neutral-800 px-1 py-0.5 rounded text-[11px]">https://&lt;your-ref&gt;.supabase.co/auth/v1/callback</code>.</li>
              <li>Add <code className="bg-neutral-200 dark:bg-neutral-800 px-1 py-0.5 rounded text-[11px]">VITE_SUPABASE_URL</code> and <code className="bg-neutral-200 dark:bg-neutral-800 px-1 py-0.5 rounded text-[11px]">VITE_SUPABASE_ANON_KEY</code> to your environment.</li>
              <li>Run the provided <code className="font-mono text-[#E53935]">supabase-schema.sql</code> in the Supabase SQL Editor.</li>
            </ol>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-3 text-xs text-red-700 dark:text-red-300 flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="flex-1 leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* Primary OAuth Actions */}
        <div className="space-y-3">
          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loadingProvider !== null}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-100 font-semibold text-sm shadow-sm transition-all duration-150 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            {loadingProvider === 'google' ? 'Connecting to Google...' : 'Continue with Google'}
          </button>

          {/* Apple Button */}
          <button
            type="button"
            onClick={handleAppleLogin}
            disabled={loadingProvider !== null}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-black hover:bg-neutral-900 text-white font-semibold text-sm shadow-sm transition-all duration-150 disabled:opacity-50"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.84c.62-.75 1.04-1.8 1.04-2.84 0-.15-.01-.29-.04-.44-.99.04-2.19.66-2.88 1.48-.56.65-1.04 1.68-1.04 2.74 0 .15.02.31.05.39.09.01.21.03.32.03.88 0 1.93-.57 2.55-1.36z" />
            </svg>
            {loadingProvider === 'apple' ? 'Connecting to Apple...' : 'Continue with Apple'}
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-neutral-200 dark:border-neutral-800 w-full" />
          <span className="bg-white dark:bg-[#18191C] px-3 text-xs uppercase tracking-wider text-neutral-400 font-semibold">
            or instant squad pass
          </span>
        </div>

        {/* Fast Guest / Gamer Entry */}
        <form onSubmit={handleGuestLogin} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Choose In-Game Display Name
            </label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="e.g. FrostNova, ShadowHunter"
              maxLength={24}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#E53935]"
            />
          </div>

          <button
            type="submit"
            disabled={loadingProvider !== null}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#E53935] hover:bg-[#D32F2F] text-white font-bold text-sm shadow-md shadow-[#E53935]/25 transition-all duration-150 disabled:opacity-50"
          >
            <span>Enter Lobby & Voice Rooms</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer Note */}
        <p className="text-[11px] text-center text-neutral-400 dark:text-neutral-500">
          By continuing, you agree to KEMOR Voice Community Standards. No harassment or voice spam permitted.
        </p>
      </div>
    </div>
  );
};
