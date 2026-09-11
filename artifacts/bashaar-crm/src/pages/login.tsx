import { ArrowRight, Check, ExternalLink, Instagram, LockKeyhole, MapPin, MessageCircle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';

function redirectTarget() {
  const params = new URLSearchParams(window.location.search);
  return params.get('redirect') || '/';
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

const mapsUrl =
  'https://www.google.com/maps/search/?api=1&query=Cotechly+Coworking+Space+Karnal+Sher+Khan+Road+Islamabad';
const whatsappUrl = 'https://wa.me/923405494527';
const instagramUrl = 'https://www.instagram.com/bashaar';

function LoginFooter() {
  return (
    <div className="mt-16 grid gap-8 border-t border-white/10 pt-6 sm:grid-cols-2">
      <div>
        <div className="font-mono-ui text-[10px] uppercase tracking-[.24em] text-[hsl(var(--accent))]">Visit</div>
        <div className="mt-3 space-y-1.5 text-[12px] leading-6 text-white/75">
          <div className="flex items-start gap-2">
            <MapPin size={14} className="mt-1 shrink-0 text-[hsl(var(--accent))]" />
            <div>
              <div>Cotechly Coworking Space</div>
              <div>Karnal Sher Khan Road</div>
              <div>Islamabad / Rawalpindi</div>
            </div>
          </div>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-white/80 transition-colors hover:text-[hsl(var(--accent))]"
            data-testid="link-login-maps"
          >
            View on Google Maps <ExternalLink size={12} />
          </a>
        </div>
      </div>
      <div>
        <div className="font-mono-ui text-[10px] uppercase tracking-[.24em] text-[hsl(var(--accent))]">Talk to us</div>
        <div className="mt-3 space-y-2 text-[12px] leading-6">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-white/75 transition-colors hover:text-[hsl(var(--accent))]"
            data-testid="link-login-whatsapp"
          >
            <MessageCircle size={14} className="text-[hsl(var(--accent))]" />
            WhatsApp: +92 340 5494527
          </a>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-white/75 transition-colors hover:text-[hsl(var(--accent))]"
            data-testid="link-login-instagram"
          >
            <Instagram size={14} className="text-[hsl(var(--accent))]" />
            Instagram: @bashaar._ai
          </a>
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const [, setLocation] = useLocation();
  const auth = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'verify'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error: signInError } = await auth.signIn({ email, password });
        if (signInError) {
          setError(signInError.message);
          return;
        }
        setLocation(redirectTarget());
      } else if (mode === 'signup') {
        const { data, error: signUpError } = await auth.signUp({
          email,
          password,
          name: name || undefined,
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        if (data?.requireEmailVerification) {
          setNotice(`We sent a verification code to ${email}.`);
          setMode('verify');
        } else {
          setLocation(redirectTarget());
        }
      } else {
        const { error: verifyError } = await auth.verifyEmail({ email, otp });
        if (verifyError) {
          setError(verifyError.message);
          return;
        }
        setLocation(redirectTarget());
      }
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const { error: resendError } = await auth.resendVerificationEmail(email);
      if (resendError) {
        setError(resendError.message);
        return;
      }
      setNotice(`Sent a new code to ${email}.`);
    } finally {
      setBusy(false);
    }
  };

  const withGoogle = async () => {
    setError('');
    const redirectTo = `${window.location.origin}${redirectTarget()}`;
    const res = await auth.signInWithGoogle(redirectTo);
    if (res?.error) {
      setError(res.error.message);
    } else if (res?.data?.url) {
      window.location.href = res.data.url;
    }
  };

  return (
    <div className="grain relative grid min-h-[100dvh] lg:grid-cols-[.94fr_1.06fr]">
      <div className="login-hero relative flex flex-col justify-between overflow-hidden p-7 text-white md:p-12">
        <div className="pointer-events-none absolute inset-0 login-hero-orbs" />
        <div className="relative">
          <Link href="/" className="flex items-center gap-3" data-testid="link-login-logo">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-[#f1d27a] to-[#c9a227] text-sm font-extrabold text-[#1c160c]">
              B
            </div>
            <div>
              <div className="text-[15px] font-extrabold tracking-[.18em]">BASHAAR</div>
              <div className="font-mono-ui text-[9px] uppercase tracking-[.24em] text-[#f1d27a]">AI CRM</div>
            </div>
          </Link>
          <div className="mt-24 max-w-md md:mt-32">
            <div className="mb-5 font-mono-ui text-[10px] uppercase tracking-[.24em] text-[#f1d27a]">
              Revenue, with context.
            </div>
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-[-.06em] md:text-6xl">
              Make every
              <br />
              <span className="bg-gradient-to-r from-[#f8e7b0] via-[#f1d27a] to-[#d4af37] bg-clip-text text-transparent">
                conversation
              </span>
              <br />
              count.
            </h1>
            <p className="mt-7 max-w-sm text-sm leading-7 text-white/65">
              BASHAAR gives ambitious teams one calm, intelligent room to move deals forward.
            </p>
          </div>
        </div>
        <div className="relative hidden lg:block">
          <LoginFooter />
          <div className="mt-6 flex items-center justify-between text-[10px] text-white/40">
            <span>© 2026 BASHAAR AI</span>
            <span className="font-mono-ui uppercase tracking-wider">Dubai · Islamabad · Everywhere</span>
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-center bg-background p-6 md:p-12">
        <div className="w-full max-w-[390px]">
          <div className="mb-10">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#f7edd4] text-[#7a4d00]">
              <LockKeyhole size={18} />
            </div>
            <h2 className="text-2xl font-extrabold tracking-[-.04em]">
              {mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Check your email'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === 'signin'
                ? 'Sign in to your revenue workspace.'
                : mode === 'signup'
                ? 'Set up your revenue workspace.'
                : notice}
            </p>
          </div>
          {error && (
            <div
              className="mb-4 rounded-lg border border-[hsl(var(--destructive)/.35)] bg-[hsl(var(--destructive)/.08)] px-3 py-2 text-xs font-bold text-[hsl(var(--destructive))]"
              data-testid="text-auth-error"
            >
              {error}
            </div>
          )}
          {mode === 'verify' ? (
            <form onSubmit={submit} className="space-y-4">
              <label className="grid gap-1.5 text-[11px] font-bold text-muted-foreground">
                Verification code
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={otp}
                  onChange={event => setOtp(event.target.value)}
                  placeholder="6-digit code"
                  className="h-11 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:border-[hsl(var(--accent))]"
                  data-testid="input-login-otp"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="btn-gradient mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-extrabold disabled:opacity-60"
                data-testid="button-verify-email"
              >
                {busy ? 'Verifying…' : 'Verify email'} <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={resend}
                disabled={busy}
                className="w-full text-center text-[11px] font-bold text-[hsl(var(--accent))]"
                data-testid="button-resend-code"
              >
                Resend code
              </button>
            </form>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {mode === 'signup' && (
                <label className="grid gap-1.5 text-[11px] font-bold text-muted-foreground">
                  Full name
                  <input
                    type="text"
                    value={name}
                    onChange={event => setName(event.target.value)}
                    placeholder="Jane Doe"
                    className="h-11 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:border-[hsl(var(--accent))]"
                    data-testid="input-login-name"
                  />
                </label>
              )}
              <label className="grid gap-1.5 text-[11px] font-bold text-muted-foreground">
                Work email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  className="h-11 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:border-[hsl(var(--accent))]"
                  data-testid="input-login-email"
                />
              </label>
              <label className="grid gap-1.5 text-[11px] font-bold text-muted-foreground">
                Password
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="h-11 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:border-[hsl(var(--accent))]"
                  data-testid="input-login-password"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="btn-gradient mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-extrabold disabled:opacity-60"
                data-testid="button-login"
              >
                {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}{' '}
                <ArrowRight size={16} />
              </button>
            </form>
          )}
          {mode !== 'verify' && (
            <>
              <div className="my-7 flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
              </div>
              <button
                type="button"
                onClick={withGoogle}
                data-testid="button-google-oauth"
                className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-white/10 bg-white text-sm font-extrabold text-[#1f1f1f] shadow-[0_10px_24px_rgba(8,17,31,.18)] transition-all hover:-translate-y-px hover:bg-[#eef3ff] hover:shadow-[0_12px_28px_rgba(66,133,244,.28)]"
              >
                <GoogleMark />
                Sign in with Google
              </button>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                }}
                className="mt-6 w-full text-center text-[11px] font-bold text-muted-foreground hover:text-foreground"
                data-testid="button-toggle-auth-mode"
              >
                {mode === 'signin' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
              </button>
            </>
          )}
          <div className="mt-8 space-y-2 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check size={14} className="text-[#c9a227]" /> Pipeline visibility for every rep
            </div>
            <div className="flex items-center gap-2">
              <Check size={14} className="text-[#c9a227]" /> Follow-up discipline without busywork
            </div>
          </div>
          <div className="lg:hidden">
            <LoginFooter />
          </div>
        </div>
      </div>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
        className="whatsapp-fab fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full text-[#08111f] shadow-[0_12px_30px_rgba(37,211,102,.35)] transition-transform hover:scale-105"
        data-testid="link-whatsapp-fab"
      >
        <MessageCircle size={26} fill="currentColor" />
      </a>
    </div>
  );
}
