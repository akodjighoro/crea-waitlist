import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const CAP = 100;
const STORE = 'crea.waitlist';
const COOKIE = 'crea_waitlist';
const USERNAME = /^[a-z0-9_]{2,20}$/;
const INSTAGRAM = /^[a-z0-9._]{1,30}$/;
const EMAIL = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;

type Status = { taken: number; remaining: number; cap: number };
type Place = { position: number; username: string; remaining: number; cap: number };

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = url && key ? createClient(url, key) : null;

function normalizeHandle(value: string) {
  let next = value.trim().toLowerCase();
  next = next.replace(/^https?:\/\/(www\.)?instagram\.com\//, '');
  next = next.replace(/\/.*$/, '');
  return next.replace(/^@+/, '');
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/^@+/, '').replace(/\s/g, '');
}

function parsePlace(raw: string | null | undefined): Place | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Place;
    if (!parsed.position || !parsed.username) return null;
    return parsed;
  } catch {
    return null;
  }
}

function readCookie() {
  const match = document.cookie.match(/(?:^|;\s*)crea_waitlist=([^;]+)/);
  return match ? parsePlace(decodeURIComponent(match[1])) : null;
}

function readPlace(): Place | null {
  return parsePlace(localStorage.getItem(STORE)) ?? readCookie();
}

function savePlace(place: Place) {
  const raw = JSON.stringify(place);
  localStorage.setItem(STORE, raw);
  document.cookie = `${COOKIE}=${encodeURIComponent(raw)}; max-age=31536000; path=/; SameSite=Lax`;
}

function readThanks() {
  return sessionStorage.getItem(`${STORE}.thanks`) === '1';
}

function writeThanks(on: boolean) {
  if (on) sessionStorage.setItem(`${STORE}.thanks`, '1');
  else sessionStorage.removeItem(`${STORE}.thanks`);
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  prefix,
  maxLength,
  type = 'text',
  autoComplete,
  hint,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  prefix?: string;
  maxLength?: number;
  type?: string;
  autoComplete?: string;
  hint?: string;
  error?: string | null;
}) {
  return (
    <label className="field">
      <span className="label-row">
        <span className="label">{label}</span>
        {maxLength ? (
          <span className={`count${value.length >= maxLength ? ' warn' : ''}`}>{value.length}/{maxLength}</span>
        ) : null}
      </span>
      <span className={`input-row${error ? ' invalid' : ''}`}>
        {prefix ? <span className="prefix">{prefix}</span> : null}
        <input
          className="input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          type={type}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
      </span>
      {error ? <span className="hint error">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </label>
  );
}

export function App() {
  const stored = useMemo(() => readPlace(), []);
  const [instagram, setInstagram] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<Status | null>(null);
  const [place, setPlace] = useState<Place | null>(stored);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [ready, setReady] = useState(false);
  const [thanks, setThanks] = useState(readThanks);

  useEffect(() => {
    if (stored) savePlace(stored);
  }, [stored]);

  useEffect(() => {
    if (!supabase) return;
    supabase.rpc('waitlist_status').then(({ data, error: next }) => {
      if (next || !data) setUnavailable(true);
      else setStatus(data as Status);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const handle = normalizeUsername(username);
    if (!handle) {
      setUsernameError(null);
      return;
    }
    if (!USERNAME.test(handle)) {
      setUsernameError(handle.length < 2 ? 'At least 2 characters.' : handle.length > 20 ? 'At most 20 characters.' : 'Letters, numbers, and underscore only.');
      return;
    }
    const timer = window.setTimeout(() => {
      supabase.rpc('username_open', { p_username: handle }).then(({ data }) => {
        setUsernameError(data === false ? 'That username is taken.' : null);
      });
    }, 320);
    return () => window.clearTimeout(timer);
  }, [username]);

  const remaining = status?.remaining ?? CAP;
  const closed = remaining <= 0 && !place;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || busy || place) return;
    const ig = normalizeHandle(instagram);
    const address = email.trim().toLowerCase();
    const handle = normalizeUsername(username);
    if (!INSTAGRAM.test(ig)) {
      setError('Enter a valid Instagram handle.');
      return;
    }
    if (!EMAIL.test(address)) {
      setError('Enter a valid email.');
      return;
    }
    if (!USERNAME.test(handle)) {
      setError(usernameError || 'Pick a username.');
      return;
    }
    if (usernameError) {
      setError(usernameError);
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error: next } = await supabase.rpc('join_waitlist', {
      p_instagram: ig,
      p_email: address,
      p_username: handle,
    });
    setBusy(false);
    if (next) {
      setError(next.message.replace(/^.*ERROR:\s*/i, ''));
      return;
    }
    const joined = data as Place;
    savePlace(joined);
    writeThanks(true);
    setPlace(joined);
    setThanks(true);
    setStatus({ taken: joined.position, remaining: joined.remaining, cap: joined.cap ?? CAP });
  };

  const lookup = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || busy) return;
    const address = email.trim().toLowerCase();
    if (!EMAIL.test(address)) {
      setError('Enter a valid email.');
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error: next } = await supabase.rpc('waitlist_lookup', { p_email: address });
    setBusy(false);
    if (next) {
      setError(next.message.replace(/^.*ERROR:\s*/i, ''));
      return;
    }
    const found = data as Place;
    savePlace(found);
    writeThanks(true);
    setPlace(found);
    setThanks(true);
  };

  if (!supabase) {
    return (
      <main className="page">
        <h1 className="mark enter">crea</h1>
        <p className="setup enter d1">Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to web/.env.local.</p>
      </main>
    );
  }

  if (place && thanks) {
    return (
      <main className="page">
        <h1 className="mark enter">crea</h1>
        <div className="glass done">
          <div className="number enter d1">#{place.position}</div>
          <h2 className="done-title enter d2">you’re in line.</h2>
          <p className="done-copy enter d3">@{place.username} is reserved. We’ll email you when it’s your turn.</p>
          <button className="reset enter d4" type="button" onClick={() => { writeThanks(false); setThanks(false); }}>done</button>
        </div>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="page">
        <h1 className="mark enter">crea</h1>
      </main>
    );
  }

  if (place) {
    return (
      <main className="page">
        <h1 className="mark enter">crea</h1>
        <div className="glass locked enter d1">
          <p className="locked-copy">This device already reserved a spot.</p>
          <p className="locked-number">#{place.position}</p>
          <p className="locked-copy">@{place.username} is reserved.</p>
        </div>
        <p className="spots enter d2">{remaining} of {CAP} spots left</p>
      </main>
    );
  }

  if (closed) {
    return (
      <main className="page">
        <h1 className="mark enter">crea</h1>
        <div className="glass closed enter d1">
          <h2 className="done-title">the first 100 are in.</h2>
          <p className="done-copy">If you already reserved a spot, enter the same email to see your number.</p>
        </div>
        <form className="glass form enter d2" onSubmit={lookup}>
          <Field label="email" value={email} onChange={setEmail} placeholder="you@email.com" type="email" autoComplete="email" />
          {error ? <p className="error">{error}</p> : null}
          <button className="submit" type="submit" disabled={busy}>{busy ? 'checking' : 'see my number'}</button>
        </form>
      </main>
    );
  }

  return (
    <main className="page">
      <h1 className="mark enter">crea</h1>
      <form className="glass form enter d1" onSubmit={submit}>
        <div className="fields">
          <Field
            label="instagram"
            value={instagram}
            onChange={(value) => setInstagram(normalizeHandle(value))}
            prefix="@"
            maxLength={30}
            placeholder="handle"
            autoComplete="username"
          />
          <Field
            label="email"
            value={email}
            onChange={setEmail}
            placeholder="you@email.com"
            type="email"
            autoComplete="email"
          />
          <Field
            label="desired username"
            value={username}
            onChange={(value) => setUsername(normalizeUsername(value))}
            prefix="@"
            maxLength={20}
            hint="Letters, numbers, underscore."
            error={usernameError}
            autoComplete="off"
          />
        </div>
        {unavailable ? <p className="error">The list is not open yet. Run the waitlist SQL in Supabase, then refresh.</p> : null}
        {error ? <p className="error">{error}</p> : null}
        <button className="submit" type="submit" disabled={busy || unavailable || !!usernameError}>
          {busy ? 'joining' : 'join'}
        </button>
        <p className="legal">This reserves a spot. It is not an account. You must be 17 or older.</p>
      </form>
      <p className="spots enter d2">{remaining} of {CAP} spots left</p>
    </main>
  );
}
