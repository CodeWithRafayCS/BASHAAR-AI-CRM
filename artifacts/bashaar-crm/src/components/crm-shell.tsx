import { Bell, ChevronDown, CircleHelp, Command, LayoutDashboard, LogOut, Menu, PanelLeftClose, Plus, Search, Settings2, UsersRound, X } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useMemo, useState, type ReactNode } from 'react';
import { useGetActivities, useGetCompanies, useGetDeals, useGetLeads, useGetTasks } from '@/lib/insforge-crm';
import { useAuth } from '@/lib/auth-context';

export const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: UsersRound },
  { href: '/pipeline', label: 'Pipeline', icon: PanelLeftClose },
  { href: '/tasks', label: 'Tasks', icon: CircleHelp },
  { href: '/activities', label: 'Activities', icon: Bell },
];
export const moreItems = [
  { href: '/companies', label: 'Companies' },
  { href: '/deals', label: 'Deals' },
  { href: '/reports', label: 'Reports' },
  { href: '/team', label: 'Team' },
  { href: '/settings', label: 'Settings' },
];

export function Logo() {
  return <div className="flex items-center gap-3"><div className="grid h-8 w-8 place-items-center rounded-lg bg-[hsl(var(--accent))] text-sm font-extrabold text-[hsl(var(--primary))]">B</div><div><div className="text-[15px] font-extrabold tracking-[.18em] text-[hsl(var(--sidebar-foreground))]">BASHAAR</div><div className="font-mono-ui text-[9px] uppercase tracking-[.24em] text-[hsl(var(--accent))]">AI CRM</div></div></div>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, signOut, role, permissions, isSuperAdmin, isViewer } = useAuth();
  const userContext = useMemo(() => ({ email: user?.email, role, name: user?.profile?.name, id: user?.id }), [user, role]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [quickOpen, setQuickOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const leads = useGetLeads(undefined, userContext);
  const companies = useGetCompanies(userContext);
  const deals = useGetDeals(userContext);
  const tasks = useGetTasks(userContext);
  const activities = useGetActivities(userContext);
  const tasksList = Array.isArray(tasks.data) ? tasks.data : [];
  const leadsList = Array.isArray(leads.data) ? leads.data : [];
  const companiesList = Array.isArray(companies.data) ? companies.data : [];
  const dealsList = Array.isArray(deals.data) ? deals.data : [];
  const activitiesList = Array.isArray(activities.data) ? activities.data : [];

  const filteredMoreItems = useMemo(() => {
    return moreItems.filter(item => {
      if (item.href === '/settings' && !isSuperAdmin) return false;
      if (item.href === '/reports' && !permissions.canAccessReports) return false;
      return true;
    });
  }, [isSuperAdmin, permissions.canAccessReports]);

  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('bashaar-read-notifications') || '[]');
    } catch {
      return [];
    }
  });

  const [notificationPrefs] = useState<{ overdue: boolean; taskReminders: boolean; activityDigest: boolean }>(() => {
    try {
      return JSON.parse(localStorage.getItem('bashaar-notification-prefs') || '{"overdue":true,"taskReminders":true,"activityDigest":false}');
    } catch {
      return { overdue: true, taskReminders: true, activityDigest: false };
    }
  });

  const openTaskCount = tasksList.filter(task => (task.status ?? '').toLowerCase() !== 'completed').length;

  const rawNotifications = useMemo(() => {
    const list: { id: string; title: string; detail: string; href: string; type: 'task' | 'activity' | 'deal' }[] = [];
    const todayStr = new Date().toISOString().slice(0, 10);

    tasksList.forEach(task => {
      if ((task.status ?? '').toLowerCase() === 'completed') return;
      const isDueSoon = ['Today', 'Tomorrow'].includes(task.dueDate ?? '');
      const isOverdue = task.dueDate && task.dueDate !== 'Today' && task.dueDate !== 'Tomorrow' && task.dueDate < todayStr;
      
      if (isOverdue && notificationPrefs.overdue) {
        list.push({
          id: `task-overdue-${task.id}`,
          title: `Overdue: ${task.title}`,
          detail: `${task.lead} · Due ${task.dueDate}`,
          href: '/tasks',
          type: 'task',
        });
      } else if (isDueSoon && notificationPrefs.taskReminders) {
        list.push({
          id: `task-due-${task.id}`,
          title: task.title,
          detail: `${task.lead} · Due ${task.dueDate}`,
          href: '/tasks',
          type: 'task',
        });
      }
    });

    if (notificationPrefs.activityDigest && activitiesList.length > 0) {
      const latestAct = activitiesList[0];
      if (latestAct) {
        list.push({
          id: `act-latest-${latestAct.id}`,
          title: latestAct.title,
          detail: `${latestAct.person} · ${latestAct.detail}`,
          href: '/activities',
          type: 'activity',
        });
      }
    }

    return list.slice(0, 8);
  }, [activitiesList, notificationPrefs.activityDigest, notificationPrefs.overdue, notificationPrefs.taskReminders, tasksList]);

  const unreadNotifications = rawNotifications.filter(n => !readNotificationIds.includes(n.id));

  const markNotificationAsRead = (id: string) => {
    const updated = Array.from(new Set([...readNotificationIds, id]));
    setReadNotificationIds(updated);
    localStorage.setItem('bashaar-read-notifications', JSON.stringify(updated));
  };

  const markAllNotificationsAsRead = () => {
    const allIds = rawNotifications.map(n => n.id);
    const updated = Array.from(new Set([...readNotificationIds, ...allIds]));
    setReadNotificationIds(updated);
    localStorage.setItem('bashaar-read-notifications', JSON.stringify(updated));
  };

  const results = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query.length < 2) return [];
    return [
      ...leadsList.filter(item => `${item?.name ?? ''} ${item?.company ?? ''} ${item?.email ?? ''}`.toLowerCase().includes(query)).slice(0, 4).map(item => ({ label: item.name, detail: `${item.company} · Lead`, href: '/leads' })),
      ...companiesList.filter(item => `${item?.name ?? ''} ${item?.industry ?? ''}`.toLowerCase().includes(query)).slice(0, 3).map(item => ({ label: item.name, detail: `${item.industry} · Company`, href: '/companies' })),
      ...dealsList.filter(item => `${item?.name ?? ''} ${item?.company ?? ''}`.toLowerCase().includes(query)).slice(0, 3).map(item => ({ label: item.name, detail: `${item.company} · Deal`, href: '/deals' })),
      ...tasksList.filter(item => `${item?.title ?? ''} ${item?.lead ?? ''} ${item?.assignee ?? ''}`.toLowerCase().includes(query)).slice(0, 3).map(item => ({ label: item.title, detail: `${item.lead} · Task`, href: '/tasks' })),
      ...activitiesList.filter(item => `${item?.title ?? ''} ${item?.person ?? ''} ${item?.detail ?? ''}`.toLowerCase().includes(query)).slice(0, 3).map(item => ({ label: item.title, detail: `${item.person} · Activity`, href: '/activities' })),
    ].slice(0, 8);
  }, [activitiesList, companiesList, dealsList, leadsList, search, tasksList]);

  const displayName = user?.profile?.name || user?.email || 'Account';
  const initials = displayName.slice(0, 2).toUpperCase();
  const logout = async () => { await signOut(); setLocation('/login'); };

  const closeOverlays = () => {
    setQuickOpen(false);
    setNotificationsOpen(false);
    setAccountOpen(false);
  };

  return <div className="grain min-h-[100dvh]">
    <aside className={`fixed inset-y-0 left-0 z-30 flex w-[248px] flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))] px-4 py-5 transition-transform duration-300 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="mb-8 flex items-center justify-between px-2"><Logo /><button className="rounded-md p-1 text-[#ead9a8] md:hidden" onClick={() => setMobileOpen(false)} data-testid="button-close-navigation"><X size={18} /></button></div>
      <div className="mb-3 px-3 font-mono-ui text-[10px] uppercase tracking-[.22em] text-[#ead9a8]">Workspace</div>
      <nav className="space-y-1">{navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} data-testid={`link-nav-${label.toLowerCase()}`} className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors ${location === href ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))]' : 'text-[#ead9a8] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]'}`}><Icon size={16} strokeWidth={location === href ? 2.5 : 1.8} /><span>{label}</span>{label === 'Tasks' && openTaskCount > 0 && <span className="ml-auto rounded-full bg-[hsl(var(--accent))] px-1.5 py-0.5 font-mono-ui text-[10px] text-[hsl(var(--primary))]">{openTaskCount}</span>}</Link>)}</nav>
      <div className="mb-3 mt-8 px-3 font-mono-ui text-[10px] uppercase tracking-[.22em] text-[#ead9a8]">Workspace data</div>
      <nav className="space-y-1">{filteredMoreItems.map(({ href, label }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} data-testid={`link-nav-${label.toLowerCase()}`} className={`block rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors ${location === href ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))]' : 'text-[#ead9a8] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]'}`}>{label}</Link>)}</nav>
      <div className="mt-auto rounded-xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent))] p-3"><div className="mb-3 flex items-center justify-between"><span className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#ead9a8]">This month</span><span className="h-2 w-2 rounded-full bg-[hsl(var(--accent))]" /></div><p className="text-[12px] leading-relaxed text-[hsl(var(--sidebar-foreground))]">Your team has <strong>{openTaskCount}</strong> follow-ups due. Keep the momentum.</p><Link href="/tasks" data-testid="link-sidebar-followups" className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[hsl(var(--accent))]">Review follow-ups <span>→</span></Link></div>
      <div className="mt-4 flex items-center gap-3 rounded-lg px-2 py-2"><Link href="/profile" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[hsl(var(--accent))] text-xs font-bold text-[hsl(var(--primary))]" data-testid="link-sidebar-profile">{initials}</Link><Link href="/profile" className="min-w-0 flex-1" data-testid="link-sidebar-profile-name"><div className="flex items-center gap-1.5"><span className="truncate text-xs font-bold text-[hsl(var(--sidebar-foreground))]">{displayName}</span><span className="rounded bg-[hsl(var(--accent)/.2)] px-1 py-0.5 font-mono-ui text-[8px] font-extrabold uppercase text-[hsl(var(--accent))]">{role}</span></div><div className="truncate text-[10px] text-[#ead9a8]">{user?.email}</div></Link><button onClick={logout} title="Sign out" className="text-[#ead9a8]" data-testid="link-sign-out"><LogOut size={15} /></button></div>
    </aside>
    {mobileOpen && <button aria-label="Close menu" className="fixed inset-0 z-20 bg-[hsl(var(--primary)/.45)] md:hidden" onClick={() => setMobileOpen(false)} data-testid="button-overlay-navigation" />}
    <div className="md:pl-[248px]"><header className="sticky top-0 z-10 flex h-[70px] items-center gap-4 border-b border-border bg-white px-5 md:px-8"><button className="rounded-lg border border-border p-2 md:hidden" onClick={() => setMobileOpen(true)} data-testid="button-open-navigation"><Menu size={18} /></button><div className="relative hidden max-w-md flex-1 sm:block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input aria-label="Search workspace" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search workspace" data-testid="input-global-search" className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-16 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-[hsl(var(--accent))]" /><kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 font-mono-ui text-[10px] text-muted-foreground">⌘ K</kbd>{search.trim().length >= 2 && <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border border-card-border bg-card p-1 shadow-[var(--shadow-md)]">{results.length > 0 ? results.map((result, index) => <Link key={`${result.href}-${result.label}-${index}`} href={result.href} onClick={() => setSearch('')} className="flex items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-muted" data-testid={`global-search-result-${index}`}><span className="text-xs font-bold">{result.label}</span><span className="text-[10px] text-muted-foreground">{result.detail}</span></Link>) : <div className="px-3 py-4 text-xs text-muted-foreground">No records match “{search}”.</div>}</div>}</div><div className="ml-auto flex items-center gap-2">{!isViewer && <div className="relative"><button className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground" onClick={() => { setQuickOpen(value => !value); setNotificationsOpen(false); setAccountOpen(false); }} data-testid="button-quick-add"><Plus size={17} /></button>{quickOpen && <div className="absolute right-0 top-11 z-50 w-48 rounded-xl border border-card-border bg-card p-1.5 shadow-[var(--shadow-md)]"><div className="px-2.5 py-2 font-mono-ui text-[9px] uppercase tracking-wider text-muted-foreground">Create</div>{[['/leads?create=true', 'New lead'], ['/tasks?create=true', 'New task'], ['/activities?create=true', 'Log activity'], ['/deals?create=true', 'New deal']].map(([href, label]) => <Link key={href} href={href} onClick={closeOverlays} className="block rounded-lg px-2.5 py-2 text-xs font-bold hover:bg-muted" data-testid={`quick-add-${label.toLowerCase().replace(' ', '-')}`}>{label}</Link>)}</div>}</div>}<div className="relative"><button className="relative grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground" onClick={() => { setNotificationsOpen(value => !value); setQuickOpen(false); setAccountOpen(false); }} data-testid="button-notifications"><Bell size={16} />{unreadNotifications.length > 0 && <span className="absolute right-2 top-2 flex h-2 w-2 items-center justify-center rounded-full bg-[hsl(var(--accent))]"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--accent))] opacity-75"></span></span>}</button>{notificationsOpen && <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-card-border bg-card p-2 shadow-[var(--shadow-md)]"><div className="flex items-center justify-between border-b border-border pb-2 px-2"><div className="flex items-center gap-2"><span className="text-xs font-extrabold">Notifications</span>{unreadNotifications.length > 0 && <span className="rounded-full bg-[hsl(var(--accent)/.2)] px-1.5 py-0.5 font-mono-ui text-[9px] font-bold text-[hsl(var(--accent))]">{unreadNotifications.length} unread</span>}</div><div className="flex items-center gap-2">{unreadNotifications.length > 0 && <button onClick={markAllNotificationsAsRead} className="text-[10px] font-bold text-[hsl(var(--accent-foreground))] hover:underline" data-testid="button-mark-all-read">Mark read</button>}{isSuperAdmin && <Link href="/settings" onClick={closeOverlays} className="text-[10px] font-bold text-muted-foreground hover:text-foreground">Settings</Link>}</div></div><div className="max-h-72 overflow-y-auto divide-y divide-border/60">{rawNotifications.length === 0 ? <div className="px-3 py-6 text-center text-xs text-muted-foreground">You’re all caught up.</div> : rawNotifications.map(item => { const isUnread = !readNotificationIds.includes(item.id); return <div key={item.id} className={`flex items-start justify-between gap-2 p-2.5 rounded-lg transition-colors hover:bg-muted/60 ${isUnread ? 'bg-[hsl(var(--accent)/.05)]' : ''}`}><Link href={item.href} onClick={() => { markNotificationAsRead(item.id); closeOverlays(); }} className="min-w-0 flex-1" data-testid={`notification-${item.id}`}><div className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${isUnread ? 'bg-[hsl(var(--accent))]' : 'bg-transparent'}`} /><div className={`text-xs font-bold truncate ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>{item.title}</div></div><div className="mt-1 pl-3 text-[10px] text-muted-foreground truncate">{item.detail}</div></Link>{isUnread && <button onClick={() => markNotificationAsRead(item.id)} className="text-[10px] text-muted-foreground hover:text-foreground p-1" title="Mark as read" data-testid={`button-read-${item.id}`}>✓</button>}</div>; })}</div></div>}</div><div className="hidden h-6 w-px bg-border sm:block" /><div className="relative"><button className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-left" onClick={() => { setAccountOpen(value => !value); setQuickOpen(false); setNotificationsOpen(false); }} data-testid="button-account-menu"><div className="grid h-8 w-8 place-items-center rounded-full bg-[hsl(var(--primary))] text-[11px] font-bold text-[hsl(var(--accent))]">{initials}</div><span className="hidden text-xs font-bold sm:block">{displayName}</span><ChevronDown size={14} className="text-muted-foreground" /></button>{accountOpen && <div className="absolute right-0 top-11 z-50 w-44 rounded-xl border border-card-border bg-card p-1.5 shadow-[var(--shadow-md)]"><Link href="/profile" onClick={closeOverlays} className="block rounded-lg px-2.5 py-2 text-xs font-bold hover:bg-muted" data-testid="link-account-profile">My profile</Link><Link href="/team" onClick={closeOverlays} className="block rounded-lg px-2.5 py-2 text-xs font-bold hover:bg-muted">Team profile</Link>{isSuperAdmin && <Link href="/settings" onClick={closeOverlays} className="block rounded-lg px-2.5 py-2 text-xs font-bold hover:bg-muted">Workspace settings</Link>}<button onClick={() => { closeOverlays(); logout(); }} className="block w-full rounded-lg px-2.5 py-2 text-left text-xs font-bold text-[hsl(var(--destructive))] hover:bg-muted" data-testid="button-account-sign-out">Sign out</button></div>}</div></div></header><main className="mx-auto max-w-[1500px] px-5 py-7 md:px-8 lg:px-10">{children}</main></div>
  </div>;
}

export function PageIntro({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-2 font-mono-ui text-[10px] uppercase tracking-[.2em] text-[hsl(var(--accent-foreground))]">{eyebrow ?? 'BASHAAR / WORKSPACE'}</div><h1 className="text-2xl font-extrabold tracking-[-.04em] text-foreground md:text-[30px]">{title}</h1>{description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}</div>{action}</div>;
}

export function Button({ children, variant = 'primary', onClick, type = 'button', disabled, testId, form }: { children: ReactNode; variant?: 'primary' | 'outline' | 'ghost'; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean; testId?: string; form?: string }) {
  return <button type={type} form={form} onClick={onClick} disabled={disabled} data-testid={testId} className={`inline-flex h-11 min-w-[44px] items-center justify-center gap-2 rounded-lg px-3.5 text-xs font-extrabold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent)/.35)] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 ${variant === 'primary' ? 'btn-gradient' : variant === 'outline' ? 'border border-border bg-card/80 text-foreground hover:border-[hsl(var(--accent))] hover:bg-muted/40' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>{children}</button>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`rounded-xl border border-card-border bg-card shadow-[var(--shadow-sm)] ${className}`}>{children}</section>; }
export function SectionHeading({ title, action }: { title: string; action?: ReactNode }) { return <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-extrabold tracking-[-.02em]">{title}</h2>{action}</div>; }
export function Skeleton({ className = '' }: { className?: string }) { return <div className={`skeleton rounded-md ${className}`} />; }
export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) { return <div className="flex min-h-[200px] flex-col items-center justify-center px-6 py-8 text-center"><div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-border bg-muted/70 text-muted-foreground"><Command size={18} /></div><h3 className="text-sm font-extrabold">{title}</h3><p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">{body}</p>{action && <div className="mt-4">{action}</div>}</div>; }
export function ErrorState({ onRetry }: { onRetry: () => void }) { return <div className="rounded-xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.06)] p-6 text-center"><p className="text-sm font-bold text-[hsl(var(--destructive))]">Couldn’t load this workspace view.</p><p className="mt-1 text-xs text-muted-foreground">Check the connection, then try again.</p><div className="mt-4 flex justify-center"><Button variant="outline" onClick={onRetry} testId="button-retry">Try again</Button></div></div>; }
export const money = (value: number, currency?: string) => {
  const activeCurrency = currency || (typeof localStorage !== 'undefined' ? localStorage.getItem('bashaar-workspace-currency') || 'USD' : 'USD');
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: activeCurrency, maximumFractionDigits: 0 }).format(value);
};
export const dateLabel = (value: string) => {
  if (!value) return '—';
  if (['Today', 'Tomorrow', 'Just now'].includes(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const hasTime = value.includes('T') || /\d{2}:\d{2}/.test(value);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...(hasTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(parsed);
};
export const toneClass = (tone: string) => tone === 'positive' || tone === 'green' ? 'bg-[#e8f5ee] text-[#14532d]' : tone === 'warning' || tone === 'amber' ? 'bg-[#f7edd4] text-[#7a4d00]' : tone === 'negative' ? 'bg-[#fde8e8] text-[#9b1c1c]' : 'bg-[#f4ead0] text-[#1c160c]';