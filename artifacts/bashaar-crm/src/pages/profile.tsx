import { LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button, Card, PageIntro, dateLabel } from '@/components/crm-shell';
import { useAuth } from '@/lib/auth-context';

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const [, setLocation] = useLocation();
  if (!user) return null;

  const initials = (user.profile?.name || user.email).slice(0, 2).toUpperCase();

  const logout = async () => {
    await signOut();
    setLocation('/login');
  };

  return <div className="animate-rise"><PageIntro eyebrow="BASHAAR / ACCOUNT" title="Profile" description="Your account details for this workspace." /><div className="grid gap-4 md:grid-cols-[220px_1fr]"><Card className="flex flex-col items-center gap-3 p-6 text-center"><div className="grid h-16 w-16 place-items-center rounded-full bg-[hsl(var(--primary))] text-lg font-bold text-[hsl(var(--accent))]">{initials}</div><div><div className="text-sm font-extrabold" data-testid="text-profile-name">{user.profile?.name || 'Unnamed user'}</div><div className="mt-1 text-[11px] text-muted-foreground">{user.emailVerified ? 'Verified account' : 'Email not verified'}</div></div></Card><Card className="p-5"><div className="space-y-4"><div className="flex items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><Mail size={16} /></div><div><div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email</div><div className="text-sm font-bold" data-testid="text-profile-email">{user.email}</div></div></div><div className="flex items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><ShieldCheck size={16} /></div><div><div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Signed in with</div><div className="text-sm font-bold">{(user.providers ?? ['email']).join(', ')}</div></div></div><div className="flex items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><UserRound size={16} /></div><div><div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Member since</div><div className="text-sm font-bold">{dateLabel(user.createdAt)}</div></div></div></div><div className="mt-6 border-t border-border pt-5"><Button variant="outline" onClick={logout} testId="button-profile-sign-out"><LogOut size={14} /> Sign out</Button></div></Card></div></div>;
}
