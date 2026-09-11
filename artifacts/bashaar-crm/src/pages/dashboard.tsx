import { ArrowUpRight, CheckCircle2, ChevronRight, Clock3, DollarSign, PhoneCall, Plus, Target, TrendingUp, Users2 } from 'lucide-react';
import { Link } from 'wouter';
import { useGetDashboard } from '@/lib/insforge-crm';
import type { Activity, Metric, PipelineStage, RevenuePoint, Task } from '@/lib/crm-types';
import { Button, Card, dateLabel, EmptyState, ErrorState, money, PageIntro, SectionHeading, Skeleton, toneClass } from '@/components/crm-shell';
import { useAuth } from '@/lib/auth-context';

export function DashboardPage() {
  const { user, role, permissions, isViewer } = useAuth();
  const dashboard = useGetDashboard({ email: user?.email, role, name: user?.profile?.name });
  if (dashboard.isLoading) return <DashboardSkeleton />;
  if (dashboard.isError || !dashboard.data) return <><PageIntro title="Good morning" description="Your revenue room for the day." /><ErrorState onRetry={() => dashboard.refetch()} /></>;
  const data = dashboard.data;
  const metrics: Metric[] = Array.isArray(data?.metrics) ? data.metrics : [];
  const revenue: RevenuePoint[] = Array.isArray(data?.revenue) ? data.revenue : [];
  const pipeline: PipelineStage[] = Array.isArray(data?.pipeline) ? data.pipeline : [];
  const todayTasks: Task[] = Array.isArray(data?.todayTasks) ? data.todayTasks : [];
  const recentActivities: Activity[] = Array.isArray(data?.recentActivities) ? data.recentActivities : [];

  return (
    <div className="animate-rise">
      <PageIntro
        eyebrow={new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
        title={`Good morning${user?.profile?.name ? `, ${user.profile.name}` : user?.email ? `, ${user.email.split('@')[0]}` : ''}`}
        description={role === 'Sales User' ? 'Your personal revenue motion and assigned book.' : 'Here’s the pulse of your revenue motion.'}
        action={
          !isViewer ? (
            <div className="flex gap-2">
              <Link href="/activities" data-testid="link-log-activity" className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-xs font-extrabold hover:border-[hsl(var(--accent))]">
                <PhoneCall size={15} /> Log activity
              </Link>
              <Link href="/leads?create=true" data-testid="link-add-lead" className="inline-flex h-9 items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-3.5 text-xs font-extrabold text-[hsl(var(--primary-foreground))]">
                <Plus size={15} /> Add lead
              </Link>
            </div>
          ) : undefined
        }
      />
      <div className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => {
          const totalLeads = Number(metrics[0]?.value) || 1;
          const dynamicWidth =
            index === 0
              ? Math.min(100, Math.max(15, totalLeads * 10))
              : index === 1
              ? Math.min(100, Math.max(10, parseFloat(metric.value) || 20))
              : index === 2 || index === 3 || index === 4
              ? Math.min(100, Math.max(15, 25 + index * 15))
              : Math.min(100, Math.max(10, (Number(metric.value) || 0) * 20));

          return (
            <Card key={metric.label} className="relative overflow-hidden p-4">
              <div className="mb-4 flex items-start justify-between">
                <span className="text-xs font-semibold text-muted-foreground">{metric.label}</span>
                <div className={`grid h-8 w-8 place-items-center rounded-lg ${index === 0 ? 'bg-[hsl(var(--accent)/.18)] text-[hsl(var(--accent-foreground))]' : index === 1 ? 'bg-[hsl(172_43%_38%/.14)] text-[hsl(172_43%_31%)]' : 'bg-muted text-foreground'}`}>
                  {index === 0 ? <DollarSign size={16} /> : index === 1 ? <TrendingUp size={16} /> : index === 2 ? <Users2 size={16} /> : <Target size={16} />}
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <strong className="text-2xl tracking-[-.05em]">{metric.value}</strong>
                <span className={`text-[10px] font-bold ${metric.trend === 'down' ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(160_38%_29%)]'}`}>{metric.change}</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-[hsl(var(--accent))]" style={{ width: `${dynamicWidth}%` }} />
              </div>
            </Card>
          );
        })}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.38fr_.82fr]">
        <Card className="p-5">
          <SectionHeading title="Revenue motion" action={<button className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground" data-testid="button-revenue-period">Last 6 months <ChevronRight size={14} /></button>} />
          <div className="mb-5 flex items-end gap-6">
            <div>
              <div className="font-mono-ui text-[10px] uppercase tracking-wider text-muted-foreground">Booked revenue</div>
              <div className="mt-1 text-2xl font-extrabold">{money(revenue.reduce((sum, point) => sum + (point.booked || 0), 0))}</div>
            </div>
            <div>
              <div className="font-mono-ui text-[10px] uppercase tracking-wider text-muted-foreground">Collected</div>
              <div className="mt-1 text-lg font-bold text-[hsl(172_43%_31%)]">{money(revenue.reduce((sum, point) => sum + (point.collected || 0), 0))}</div>
            </div>
          </div>
          <div className="flex h-[190px] items-end gap-2 sm:gap-5">
            {revenue.map(point => {
              const max = Math.max(...revenue.map(item => item.booked || 0), 1);
              return (
                <div className="flex flex-1 flex-col items-center gap-2" key={point.month}>
                  <div className="flex h-[150px] w-full items-end justify-center gap-1">
                    <div className="w-3 rounded-t bg-[hsl(var(--primary))] transition-all hover:bg-[hsl(var(--accent))]" style={{ height: `${Math.max((point.booked || 0) / max * 100, 8)}%` }} />
                    <div className="w-3 rounded-t bg-[hsl(var(--accent))]" style={{ height: `${Math.max((point.collected || 0) / max * 100, 6)}%` }} />
                  </div>
                  <span className="font-mono-ui text-[10px] text-muted-foreground">{point.month}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" /> Booked</span>
            <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[hsl(var(--accent))]" /> Collected</span>
          </div>
        </Card>
        <Card className="p-5">
          <SectionHeading title="Pipeline by stage" action={<Link href="/pipeline" className="text-[11px] font-bold text-[hsl(var(--accent-foreground))]" data-testid="link-view-pipeline">View pipeline</Link>} />
          <div className="space-y-4">
            {pipeline.map((stage, index) => {
              const maxStageCount = Math.max(...pipeline.map(s => s.count || 0), 1);
              const barWidth = stage.count > 0 ? Math.max(10, Math.round((stage.count / maxStageCount) * 100)) : 0;
              return (
                <div key={stage.label}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold">{stage.label}</span>
                    <span className="font-mono-ui text-muted-foreground">{stage.count} / {money(stage.value)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${barWidth}%`, background: index === pipeline.length - 1 ? 'hsl(var(--accent))' : 'hsl(var(--primary))' }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 rounded-lg bg-[hsl(var(--primary))] p-3 text-[hsl(var(--primary-foreground))]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold opacity-70">Weighted pipeline</span>
              <ArrowUpRight size={15} className="text-[hsl(var(--accent))]" />
            </div>
            <strong className="mt-1 block text-xl">{money(pipeline.reduce((sum, stage) => sum + (stage.value || 0), 0) * .63)}</strong>
          </div>
        </Card>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <SectionHeading title="Today’s focus" action={<Link href="/tasks" className="text-[11px] font-bold text-[hsl(var(--accent-foreground))]" data-testid="link-view-tasks">View all tasks</Link>} />
          {todayTasks.length === 0 ? (
            <EmptyState title="Clear runway" body="No tasks are due today. Use the space to move one high-value deal forward." />
          ) : (
            <div className="divide-y divide-border">
              {todayTasks.slice(0, 5).map(task => (
                <div key={task.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-muted"><Clock3 size={15} className="text-muted-foreground" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold">{task.title}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{task.lead} · {task.assignee}</div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${task.priority === 'high' ? 'bg-[hsl(2_60%_93%)] text-[hsl(var(--destructive))]' : 'bg-muted text-muted-foreground'}`}>{task.priority}</span>
                  <ChevronRight size={14} className="text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-5">
          <SectionHeading title="Latest signal" action={<Link href="/activities" className="text-[11px] font-bold text-[hsl(var(--accent-foreground))]" data-testid="link-view-activities">All activity</Link>} />
          {recentActivities.length === 0 ? (
            <EmptyState title="No activity yet" body="Log a call, meeting, email, or note and it will show up here." />
          ) : (
            <div className="space-y-4">
              {recentActivities.slice(0, 5).map(activity => (
                <div className="flex gap-3" key={activity.id}>
                  <div className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${toneClass(activity.tone)}`}>
                    <CheckCircle2 size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold">{activity.title}</div>
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{activity.person} · {activity.detail}</div>
                  </div>
                  <span className="shrink-0 font-mono-ui text-[10px] text-muted-foreground">{dateLabel(activity.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <PageIntro title="Good morning" description="Loading your revenue room…" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}