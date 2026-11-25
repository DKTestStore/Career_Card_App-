/**
 * Auth module — guest provider today, structured so a Supabase Google
 * provider can be swapped in later without rewriting pages.
 *
 * Session flag lives in localStorage (`hire-ready:session`). Profile
 * (display name) is kept separately so "keep my data" sign-out can
 * restore the greeting on the next sign-in. IndexedDB resume/application
 * data is owned by the store, not this module.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { nowIso } from './util';

export type AuthProviderId = 'guest' | 'google';

export interface Session {
  provider: AuthProviderId;
  firstName: string;
  signedInAt: string;
}

export interface Profile {
  firstName: string;
}

interface Auth {
  ready: boolean;
  session: Session | null;
  signedIn: boolean;
  firstName: string;
  /** False until a Supabase (or other) Google provider is wired in. */
  googleAvailable: boolean;
  signInAsGuest: (firstName?: string) => void;
  /** Placeholder for future Supabase OAuth. Currently a no-op that rejects. */
  signInWithGoogle: () => Promise<void>;
  /** Clears the guest session. Does not touch resume/application data. */
  endSession: () => void;
  /** Drop saved profile (call together with data erase). */
  clearProfile: () => void;
}

const SESSION_KEY = 'hire-ready:session';
const PROFILE_KEY = 'hire-ready:profile';

const Ctx = createContext<Auth | null>(null);

export function useAuth(): Auth {
  const v = useContext(Ctx);
  if (!v) throw new Error('AuthProvider missing');
  return v;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota — session will be in-memory only this visit */
  }
}

function removeKey(key: string) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile>({ firstName: '' });

  useEffect(() => {
    const s = readJson<Session>(SESSION_KEY);
    const p = readJson<Profile>(PROFILE_KEY);
    if (s && s.provider) setSession({ provider: s.provider, firstName: s.firstName ?? '', signedInAt: s.signedInAt ?? '' });
    if (p?.firstName) setProfile({ firstName: p.firstName });
    setReady(true);
  }, []);

  const signInAsGuest = useCallback((firstName?: string) => {
    const name = (firstName ?? profile.firstName ?? '').trim();
    const next: Session = { provider: 'guest', firstName: name, signedInAt: nowIso() };
    const nextProfile: Profile = { firstName: name };
    setSession(next);
    setProfile(nextProfile);
    writeJson(SESSION_KEY, next);
    writeJson(PROFILE_KEY, nextProfile);
  }, [profile.firstName]);

  const signInWithGoogle = useCallback(async () => {
    // Planned hook: supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: origin } })
    throw new Error('Google sign-in is coming soon');
  }, []);

  const endSession = useCallback(() => {
    setSession(null);
    removeKey(SESSION_KEY);
  }, []);

  const clearProfile = useCallback(() => {
    setProfile({ firstName: '' });
    removeKey(PROFILE_KEY);
  }, []);

  const value = useMemo<Auth>(() => ({
    ready,
    session,
    signedIn: !!session,
    firstName: session?.firstName || profile.firstName,
    googleAvailable: false,
    signInAsGuest,
    signInWithGoogle,
    endSession,
    clearProfile,
  }), [ready, session, profile.firstName, signInAsGuest, signInWithGoogle, endSession, clearProfile]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
