import {
  Activity as ActivityIcon,
  BarChart3,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardCheck,
  DollarSign,
  Filter,
  Mail,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users2,
  Video,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import {
  useCreateActivity,
  useCreateCompany,
  useCreateDeal,
  useCreateTask,
  useDeleteActivity,
  useDeleteTask,
  useGetActivities,
  useGetCompanies,
  useGetDeals,
  useGetLeads,
  useGetReports,
  useGetTasks,
  useRecordDealPayment,
  useUpdateActivity,
  useUpdateTask,
  useGetTeamRoles,
  useUpdateTeamRole,
  useDeleteTeamMember,
  getGetActivitiesQueryKey,
  getGetCompaniesQueryKey,
  getGetDashboardQueryKey,
  getGetDealsQueryKey,
  getGetReportsQueryKey,
  getGetTasksQueryKey,
  getGetTeamRolesQueryKey,
  type Activity,
  type Deal,
  type DealInput,
  type Lead,
  type OwnerPerformance,
  type PipelineStage,
  type SourcePerformance,
  type Task,
  type UserRole,
  type TeamMemberRole,
} from '@/lib/insforge-crm';
import {
  Button,
  Card,
  dateLabel,
  EmptyState,
  ErrorState,
  money,
  PageIntro,
  SectionHeading,
  Skeleton,
  toneClass,
} from '@/components/crm-shell';
import { FormField, FormSection, Modal, fieldClass, selectClass, textareaClass } from '@/components/crm-modal';
import { toast } from '@/hooks/use-toast';

const pipelineStages = [
  'New',
  'Attempted',
  'Connected',
  'Interested',
  'Meeting Scheduled',
  'Proposal Sent',
  'Negotiation',
  'Won',
];

const today = () => new Date().toISOString().slice(0, 10);
const taskDate = (value: string) => {
  if (value === 'Today') return today();
  if (value === 'Tomorrow') return new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? today() : parsed.toISOString().slice(0, 10);
};

const taskBucket = (task: Task) => {
  if (task.status.toLowerCase() === 'completed') return 'completed';
  const due = taskDate(task.dueDate);
  if (due < today()) return 'overdue';
  if (due === today()) return 'today';
  return 'upcoming';
};

// ---------------------------------------------------------------------------
// Task Form
// ---------------------------------------------------------------------------
function toDateTimeLocal(value?: string) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fromDate = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (!value) return fromDate(now);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return value.slice(0, 16);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T09:00`;
  if (value === 'Today') return fromDate(now);
  if (value === 'Tomorrow') return fromDate(new Date(Date.now() + 86400000));
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fromDate(now) : fromDate(parsed);
}

function TaskForm({ task, onClose }: { task?: Task; onClose: () => void }) {
  const { user, role } = useAuth();
  const userContext = useMemo(
    () => ({ email: user?.email, role, name: user?.profile?.name, id: user?.id }),
    [user, role]
  );
  const leads = useGetLeads({}, userContext);
  const companies = useGetCompanies(userContext);
  const deals = useGetDeals(userContext);
  const create = useCreateTask(userContext);
  const update = useUpdateTask();
  const client = useQueryClient();
  const editing = Boolean(task);
  const relatedOptions = [
    ...(leads.data ?? []).map(item => ({ value: item.name, label: `${item.name} · Lead` })),
    ...(companies.data ?? []).map(item => ({ value: item.name, label: `${item.name} · Company` })),
    ...(deals.data ?? []).map(item => ({ value: item.name, label: `${item.name} · Deal` })),
  ];

  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: (task as Task & { description?: string })?.description ?? '',
    lead: task?.lead ?? leads.data?.[0]?.name ?? '',
    dueDate: toDateTimeLocal(task?.dueDate),
    assignee: task?.assignee ?? user?.profile?.name ?? user?.email?.split('@')[0] ?? '',
    priority: task?.priority ?? 'Medium',
    status: task?.status ?? 'Open',
    reminder: toDateTimeLocal((task as Task & { reminder?: string })?.reminder) === toDateTimeLocal(task?.dueDate)
      ? ''
      : ((task as Task & { reminder?: string })?.reminder ? toDateTimeLocal((task as Task & { reminder?: string }).reminder) : ''),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const set = (key: string, value: string) => {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = 'Enter a task title.';
    if (!form.lead.trim()) next.lead = 'Choose a related record.';
    if (!form.assignee.trim()) next.assignee = 'Assign someone.';
    if (!form.dueDate) next.dueDate = 'Choose a due date and time.';
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      title: form.title.trim(),
      lead: form.lead,
      dueDate: form.dueDate,
      assignee: form.assignee.trim(),
      priority: form.priority,
      status: form.status,
      description: form.description.trim(),
      reminder: form.reminder || undefined,
    };
    const onSuccess = () => {
      client.invalidateQueries({ queryKey: getGetTasksQueryKey() });
      client.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      toast({
        title: editing ? 'Task updated' : 'Task created',
        description: editing ? 'The follow-up was saved to the database.' : 'This work now appears in Tasks and the dashboard.',
      });
      onClose();
    };
    const onError = (error: Error) => {
      setFormError(error.message || 'Couldn���t save this task.');
      toast({ variant: 'destructive', title: 'Couldn’t save task', description: error.message });
    };
    if (editing && task) update.mutate({ id: task.id, data: payload }, { onSuccess, onError });
    else create.mutate({ data: payload }, { onSuccess, onError });
  };

  const pending = create.isPending || update.isPending;

  return (
    <Modal
      wide
      eyebrow={editing ? 'BASHAAR / FOLLOW-THROUGH' : 'BASHAAR / NEW WORK'}
      title={editing ? 'Edit task' : 'New task'}
      description="Create work that still needs to be completed — not a record of something that already happened."
      onClose={onClose}
      testId="modal-task-form"
      footer={
        <>
          <Button variant="outline" onClick={onClose} testId="button-cancel-task">Cancel</Button>
          <Button type="submit" form="task-form" disabled={pending} testId="button-save-task">
            {pending ? 'Saving…' : editing ? 'Save task' : 'Create task'}
          </Button>
        </>
      }
    >
      <form id="task-form" onSubmit={submit} className="grid gap-4" noValidate>
        {formError && <div className="rounded-lg border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] px-3 py-2 text-xs font-semibold text-[hsl(var(--destructive))]" role="alert">{formError}</div>}
        <FormSection title="Work to complete" description="A task is future work with an owner, due date, and status.">
          <FormField label="Task title" required error={errors.title} className="sm:col-span-2">
            <input required value={form.title} onChange={event => set('title', event.target.value)} placeholder="e.g. Send revised proposal" className={fieldClass} data-testid="input-task-title" />
          </FormField>
          <FormField label="Description" hint="Optional context for whoever will complete this." className="sm:col-span-2">
            <textarea value={form.description} onChange={event => set('description', event.target.value)} className={textareaClass} data-testid="input-task-description" />
          </FormField>
          <FormField label="Related record" required error={errors.lead} className="sm:col-span-2">
            <select required value={form.lead} onChange={event => set('lead', event.target.value)} className={selectClass} data-testid="select-task-lead">
              <option value="">Select a lead, company, or deal</option>
              {relatedOptions.map(option => <option key={`${option.label}-${option.value}`} value={option.value}>{option.label}</option>)}
              {form.lead && !relatedOptions.some(option => option.value === form.lead) && <option value={form.lead}>{form.lead}</option>}
            </select>
          </FormField>
        </FormSection>
        <FormSection title="Assignment & timing" description="Who owns it, when it is due, and how urgent it is.">
          <FormField label="Assignee" required error={errors.assignee}>
            <input required value={form.assignee} onChange={event => set('assignee', event.target.value)} className={fieldClass} data-testid="input-task-assignee" />
          </FormField>
          <FormField label="Due date / time" required error={errors.dueDate}>
            <input required type="datetime-local" value={form.dueDate} onChange={event => set('dueDate', event.target.value)} className={fieldClass} data-testid="input-task-due-date" />
          </FormField>
          <FormField label="Priority">
            <select value={form.priority} onChange={event => set('priority', event.target.value)} className={selectClass} data-testid="select-task-priority">
              {['Low', 'Medium', 'High'].map(value => <option key={value}>{value}</option>)}
            </select>
          </FormField>
          <FormField label="Status">
            <select value={form.status} onChange={event => set('status', event.target.value)} className={selectClass} data-testid="select-task-status">
              {['Open', 'In progress', 'Completed'].map(value => <option key={value}>{value}</option>)}
            </select>
          </FormField>
          <FormField label="Reminder" hint="Optional. Leave blank if the due date is enough." className="sm:col-span-2">
            <input type="datetime-local" value={form.reminder} onChange={event => set('reminder', event.target.value)} className={fieldClass} data-testid="input-task-reminder" />
          </FormField>
        </FormSection>
      </form>
    </Modal>
  );
}

export function PipelinePage() {
  const { user, role } = useAuth();
  const userContext = useMemo(
    () => ({ email: user?.email, role, name: user?.profile?.name }),
    [user, role]
  );
  const reports = useGetReports(userContext);
  const leads = useGetLeads({}, userContext);

  const [filterOpen, setFilterOpen] = useState(false);
  const [owner, setOwner] = useState('');
  const [priority, setPriority] = useState('');
  const [stage, setStage] = useState('');
  const [search, setSearch] = useState('');

  if (reports.isLoading || leads.isLoading)
    return (
      <>
        <PageIntro title="Pipeline" />
        <Skeleton className="h-[520px]" />
      </>
    );
  if (reports.isError || leads.isError || !reports.data)
    return (
      <ErrorState
        onRetry={() => {
          reports.refetch();
          leads.refetch();
        }}
      />
    );

  const owners = Array.from(new Set((leads.data ?? []).map((lead) => lead.owner))).sort();
  const filteredLeads = (leads.data ?? []).filter(
    (lead) =>
      (!owner || lead.owner === owner) &&
      (!priority || lead.priority.toLowerCase() === priority.toLowerCase()) &&
      (!stage || lead.stage === stage) &&
      (!search || `${lead.name} ${lead.company}`.toLowerCase().includes(search.toLowerCase()))
  );

  const funnelList: PipelineStage[] = Array.isArray(reports.data?.funnel) ? reports.data.funnel : [];
  const stageLeads = funnelList.map((item: PipelineStage) => {
    const matching = filteredLeads.filter((lead: Lead) => lead.stage === item.label);
    return {
      ...item,
      count: matching.length,
      value: matching.reduce((sum, lead) => sum + lead.value, 0),
      leads: matching,
    };
  });

  const clearFilters = () => {
    setOwner('');
    setPriority('');
    setStage('');
    setSearch('');
  };

  return (
    <div className="animate-rise">
      <PageIntro
        eyebrow="BASHAAR / MOMENTUM"
        title="Pipeline"
        description="See where every active opportunity is gathering energy."
        action={
          <Button
            onClick={() => setFilterOpen((value) => !value)}
            variant={filterOpen ? 'primary' : 'outline'}
            testId="button-pipeline-filter"
          >
            <Filter size={14} /> Filter view{' '}
            {filteredLeads.length !== leads.data?.length && `· ${filteredLeads.length}`}
          </Button>
        }
      />
      {filterOpen && (
        <Card className="mb-4 p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="grid gap-1.5 text-[11px] font-bold text-muted-foreground">
              Search
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Lead or company"
                className="h-9 rounded-lg border border-input bg-background px-3 text-xs"
                data-testid="input-pipeline-search"
              />
            </label>
            <label className="grid gap-1.5 text-[11px] font-bold text-muted-foreground">
              Owner
              <select
                value={owner}
                onChange={(event) => setOwner(event.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-3 text-xs"
                data-testid="select-pipeline-owner"
              >
                <option value="">All owners</option>
                {owners.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-[11px] font-bold text-muted-foreground">
              Priority
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-3 text-xs"
                data-testid="select-pipeline-priority"
              >
                <option value="">All priorities</option>
                {['high', 'medium', 'low'].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-[11px] font-bold text-muted-foreground">
              Stage
              <select
                value={stage}
                onChange={(event) => setStage(event.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-3 text-xs"
                data-testid="select-pipeline-stage"
              >
                <option value="">All stages</option>
                {pipelineStages.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {filteredLeads.length} matching opportunities
            </span>
            <Button variant="ghost" onClick={clearFilters} testId="button-clear-pipeline-filters">
              Clear filters
            </Button>
          </div>
        </Card>
      )}
      <div className="grid gap-3 overflow-x-auto pb-3 lg:grid-cols-5">
        {stageLeads.map((item, index: number) => (
          <Card key={item.label} className="min-w-[230px] overflow-hidden">
            <div className="border-b border-border p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono-ui text-[10px] text-muted-foreground">
                  0{index + 1}
                </span>
                <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold">
                  {item.count}
                </span>
              </div>
              <h2 className="mt-3 text-sm font-extrabold">{item.label}</h2>
              <div className="mt-1 font-mono-ui text-[11px] text-muted-foreground">
                {money(item.value)}
              </div>
            </div>
            <div className="min-h-[280px] space-y-2 p-3">
              {item.leads.length === 0 ? (
                <div className="flex h-28 items-center justify-center text-center text-[11px] text-muted-foreground">
                  No opportunities
                  <br />
                  in this stage
                </div>
              ) : (
                item.leads.map((lead: Lead) => (
                  <div
                    key={lead.id}
                    className="rounded-lg border border-border bg-background p-3 transition-colors hover:border-[hsl(var(--accent))]"
                    data-testid={`card-pipeline-${lead.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-bold">{lead.name}</div>
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          lead.priority.toLowerCase() === 'high'
                            ? 'bg-[hsl(var(--destructive))]'
                            : 'bg-[hsl(var(--accent))]'
                        }`}
                      />
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{lead.company}</div>
                    <div className="mt-3 flex items-center justify-between font-mono-ui text-[10px]">
                      <span>{money(lead.value)}</span>
                      <span className="text-muted-foreground">{lead.owner.split(' ')[0]}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tasks Page
// ---------------------------------------------------------------------------
export function TasksPage() {
  const { user, role, isViewer } = useAuth();
  const userContext = useMemo(
    () => ({ email: user?.email, role, name: user?.profile?.name }),
    [user, role]
  );
  const tasks = useGetTasks(userContext);
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const client = useQueryClient();

  const [filter, setFilter] = useState('open');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task>();

  const filteredItems = (tasks.data ?? []).filter((task) => {
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'open'
        ? task.status.toLowerCase() !== 'completed'
        : taskBucket(task) === filter;
    if (!matchesFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (task.title || '').toLowerCase().includes(q) ||
      (task.lead || '').toLowerCase().includes(q) ||
      (task.assignee || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('create') === 'true' && !isViewer) {
      setEditing(undefined);
      setFormOpen(true);
      window.history.replaceState({}, '', '/tasks');
    }
  }, [isViewer]);

  const complete = (task: Task) =>
    update.mutate(
      {
        id: task.id,
        data: { status: task.status.toLowerCase() === 'completed' ? 'Open' : 'completed' },
      },
      {
        onSuccess: () => {
          client.invalidateQueries({ queryKey: getGetTasksQueryKey() });
          client.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          toast({
            title: task.status.toLowerCase() === 'completed' ? 'Task reopened' : 'Task completed',
            description: task.title,
          });
        },
      }
    );

  const deleteTask = (task: Task) => {
    if (window.confirm(`Archive “${task.title}”?`))
      remove.mutate(
        { id: task.id },
        {
          onSuccess: () => {
            client.invalidateQueries({ queryKey: getGetTasksQueryKey() });
            client.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          },
        }
      );
  };

  return (
    <div className="animate-rise">
      <PageIntro
        eyebrow="BASHAAR / FOLLOW-THROUGH"
        title="Tasks"
        description="The next right action, always visible."
        action={
          !isViewer ? (
            <Button
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
              testId="button-create-task"
            >
              <Plus size={15} /> New task
            </Button>
          ) : undefined
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks, leads, assignees…"
            className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-xs outline-none focus:border-[hsl(var(--accent))]"
            data-testid="input-search-tasks"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ['open', 'Open'],
            ['overdue', 'Overdue'],
            ['today', 'Due today'],
            ['upcoming', 'Upcoming'],
            ['completed', 'Completed'],
            ['all', 'All'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
                filter === key
                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                  : 'border border-border bg-card text-muted-foreground'
              }`}
              data-testid={`button-filter-${key}-tasks`}
            >
              {label}{' '}
              {key !== 'all' && (
                <span className="ml-1 opacity-70">
                  {
                    (tasks.data ?? []).filter((task) =>
                      key === 'open'
                        ? task.status.toLowerCase() !== 'completed'
                        : taskBucket(task) === key
                    ).length
                  }
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <Card>
        <div className="flex items-center justify-between border-b border-border px-5 py-2.5 text-[10px] text-muted-foreground">
          <span>Showing {filteredItems.length} task{filteredItems.length === 1 ? '' : 's'}</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="rounded border border-border px-2 py-0.5 text-xs font-bold disabled:opacity-40"
                  data-testid="button-tasks-prev-page"
                >
                  Prev
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="rounded border border-border px-2 py-0.5 text-xs font-bold disabled:opacity-40"
                  data-testid="button-tasks-next-page"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
        {tasks.isLoading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : tasks.isError ? (
          <div className="p-5">
            <ErrorState onRetry={() => tasks.refetch()} />
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title="The runway is clear"
            body="No follow-ups are waiting in this view. Nice work."
            action={
              !isViewer ? (
                <Button onClick={() => setFormOpen(true)} testId="button-empty-create-task">
                  <Plus size={14} /> Create task
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {paginatedItems.map((task) => {
              const bucket = taskBucket(task);
              return (
                <div
                  key={task.id}
                  className="group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/40"
                  data-testid={`row-task-${task.id}`}
                >
                  <button
                    onClick={() => complete(task)}
                    disabled={update.isPending || isViewer}
                    title={
                      task.status.toLowerCase() === 'completed' ? 'Reopen task' : 'Complete task'
                    }
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${
                      task.status.toLowerCase() === 'completed'
                        ? 'border-[hsl(172_43%_38%)] bg-[hsl(172_43%_38%)] text-white'
                        : 'border-border hover:border-[hsl(var(--accent))]'
                    }`}
                    data-testid={`button-complete-task-${task.id}`}
                  >
                    {task.status.toLowerCase() === 'completed' && <Check size={13} />}
                  </button>
                  <button
                    onClick={() => {
                      if (!isViewer) {
                        setEditing(task);
                        setFormOpen(true);
                      }
                    }}
                    className="min-w-0 flex-1 text-left"
                    data-testid={`button-open-task-${task.id}`}
                  >
                    <div
                      className={`text-sm font-bold ${
                        task.status.toLowerCase() === 'completed'
                          ? 'text-muted-foreground line-through'
                          : ''
                      }`}
                    >
                      {task.title}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {task.lead} · {task.assignee}
                    </div>
                  </button>
                  <span
                    className={`hidden rounded-full px-2 py-1 text-[10px] font-bold sm:block ${
                      bucket === 'overdue'
                        ? 'bg-[hsl(2_60%_93%)] text-[hsl(var(--destructive))]'
                        : bucket === 'completed'
                        ? 'bg-[hsl(151_38%_91%)] text-[hsl(160_38%_29%)]'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {bucket}
                  </span>
                  <span className="hidden rounded-full bg-muted px-2 py-1 text-[10px] font-bold sm:block">
                    {task.priority}
                  </span>
                  <div className="flex items-center gap-1.5 font-mono-ui text-[10px] text-muted-foreground">
                    <CalendarDays size={13} />
                    {dateLabel(task.dueDate)}
                  </div>
                  {!isViewer && (
                    <>
                      <button
                        onClick={() => {
                          setEditing(task);
                          setFormOpen(true);
                        }}
                        className="rounded-md p-1.5 text-muted-foreground opacity-0 hover:bg-muted group-hover:opacity-100"
                        title="Edit task"
                        data-testid={`button-edit-task-${task.id}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteTask(task)}
                        className="rounded-md p-1.5 text-muted-foreground opacity-0 hover:bg-muted hover:text-[hsl(var(--destructive))] group-hover:opacity-100"
                        title="Archive task"
                        data-testid={`button-delete-task-${task.id}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
      {formOpen && !isViewer && (
        <TaskForm key={editing?.id ?? 'new'} task={editing} onClose={() => setFormOpen(false)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity Form
// ---------------------------------------------------------------------------
function ActivityForm({ activity, onClose }: { activity?: Activity; onClose: () => void }) {
  const { user, role } = useAuth();
  const userContext = useMemo(
    () => ({ email: user?.email, role, name: user?.profile?.name, id: user?.id }),
    [user, role]
  );
  const leads = useGetLeads({}, userContext);
  const companies = useGetCompanies(userContext);
  const deals = useGetDeals(userContext);
  const create = useCreateActivity(userContext);
  const update = useUpdateActivity();
  const createTask = useCreateTask(userContext);
  const client = useQueryClient();
  const editing = Boolean(activity);

  const [form, setForm] = useState({
    type: activity?.type || 'Call',
    title: activity?.title ?? '',
    person: activity?.person ?? user?.profile?.name ?? user?.email?.split('@')[0] ?? '',
    detail: activity?.detail ?? '',
    timestamp: toDateTimeLocal(activity?.timestamp),
    relatedType: activity?.relatedType || 'lead',
    relatedTo: activity?.relatedTo || '',
    nextAction: '',
    nextDue: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const options =
    form.relatedType === 'lead'
      ? (leads.data ?? []).map(item => ({ id: item.id, label: `${item.name} · ${item.company}`, name: item.name }))
      : form.relatedType === 'company'
      ? (companies.data ?? []).map(item => ({ id: item.id, label: item.name, name: item.name }))
      : (deals.data ?? []).map(item => ({ id: item.id, label: `${item.name} · ${item.company}`, name: item.name }));

  const set = (key: string, value: string) => {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    const next: Record<string, string> = {};
    if (!form.type) next.type = 'Choose an interaction type.';
    if (!form.title.trim()) next.title = 'Enter what happened.';
    if (!form.detail.trim()) next.detail = 'Add notes or an outcome.';
    if (!form.timestamp) next.timestamp = 'Choose when this happened.';
    setErrors(next);
    if (Object.keys(next).length) return;

    const related = options.find(option => option.id === form.relatedTo);
    const payload = {
      type: form.type,
      title: form.title.trim(),
      person: related?.name || form.person.trim() || user?.profile?.name || 'Team Rep',
      detail: form.detail.trim(),
      timestamp: new Date(form.timestamp).toISOString(),
      relatedType: form.relatedTo ? form.relatedType : undefined,
      relatedTo: form.relatedTo || undefined,
    };
    const onSuccess = async () => {
      if (form.nextAction.trim()) {
        try {
          await createTask.mutateAsync({
            data: {
              title: form.nextAction.trim(),
              lead: related?.name || form.person || 'Follow-up',
              dueDate: form.nextDue || toDateTimeLocal(),
              assignee: user?.profile?.name || user?.email?.split('@')[0] || 'Unassigned',
              priority: 'Medium',
              status: 'Open',
            },
          });
        } catch {
          // Activity already saved; follow-up task is optional.
        }
      }
      client.invalidateQueries({ queryKey: getGetActivitiesQueryKey() });
      client.invalidateQueries({ queryKey: getGetTasksQueryKey() });
      client.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      toast({
        title: editing ? 'Activity updated' : 'Activity logged',
        description: editing ? 'The timeline was updated in the database.' : 'This past interaction now appears in Activities and the dashboard.',
      });
      onClose();
    };
    const onError = (error: Error) => {
      setFormError(error.message || 'Couldn’t save this activity.');
      toast({ variant: 'destructive', title: 'Couldn’t save activity', description: error.message });
    };
    if (editing && activity) update.mutate({ id: activity.id, data: payload }, { onSuccess, onError });
    else create.mutate({ data: payload }, { onSuccess, onError });
  };

  const pending = create.isPending || update.isPending || createTask.isPending;

  return (
    <Modal
      wide
      eyebrow={editing ? 'BASHAAR / TIMELINE' : 'BASHAAR / PAST INTERACTION'}
      title={editing ? 'Edit activity' : 'Log activity'}
      description="Record something that already happened — a call, meeting, email, note, or message. This is not a to-do."
      onClose={onClose}
      testId="modal-activity-form"
      footer={
        <>
          <Button variant="outline" onClick={onClose} testId="button-cancel-activity">Cancel</Button>
          <Button type="submit" form="activity-form" disabled={pending} testId="button-save-activity">
            {pending ? 'Saving…' : editing ? 'Save activity' : 'Log activity'}
          </Button>
        </>
      }
    >
      <form id="activity-form" onSubmit={submit} className="grid gap-4" noValidate>
        {formError && <div className="rounded-lg border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] px-3 py-2 text-xs font-semibold text-[hsl(var(--destructive))]" role="alert">{formError}</div>}
        <FormSection title="What already happened" description="Capture the interaction after it took place.">
          <FormField label="Interaction type" required error={errors.type}>
            <select value={form.type} onChange={event => set('type', event.target.value)} className={selectClass} data-testid="select-activity-type">
              <option value="Call">Call</option>
              <option value="Meeting">Meeting</option>
              <option value="Email">Email</option>
              <option value="Note">Note</option>
              <option value="WhatsApp">WhatsApp / Message</option>
              <option value="Other">Other interaction</option>
            </select>
          </FormField>
          <FormField label="Date / time" required error={errors.timestamp}>
            <input required type="datetime-local" value={form.timestamp} onChange={event => set('timestamp', event.target.value)} className={fieldClass} data-testid="input-activity-timestamp" />
          </FormField>
          <FormField label="Subject" required error={errors.title} className="sm:col-span-2">
            <input required value={form.title} onChange={event => set('title', event.target.value)} placeholder="e.g. Discovery call with operations lead" className={fieldClass} data-testid="input-activity-title" />
          </FormField>
          <FormField label="Notes / outcome" required error={errors.detail} className="sm:col-span-2">
            <textarea required value={form.detail} onChange={event => set('detail', event.target.value)} placeholder="What was discussed, decided, or sent?" className={textareaClass} data-testid="input-activity-detail" />
          </FormField>
        </FormSection>
        <FormSection title="Related record" description="Optionally attach this touchpoint to a lead, company, or deal.">
          <FormField label="Associate with">
            <select
              value={form.relatedType}
              onChange={event => {
                set('relatedType', event.target.value);
                set('relatedTo', '');
              }}
              className={selectClass}
              data-testid="select-activity-related-type"
            >
              <option value="lead">Lead</option>
              <option value="company">Company</option>
              <option value="deal">Deal</option>
            </select>
          </FormField>
          <FormField label="Record">
            <select value={form.relatedTo} onChange={event => set('relatedTo', event.target.value)} className={selectClass} data-testid="select-activity-related-record">
              <option value="">None</option>
              {options.map(option => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </FormField>
        </FormSection>
        {!editing && (
          <FormSection title="Optional next action" description="If follow-up work is needed, this creates a real task — it is not part of the activity itself.">
            <FormField label="Next action" hint="Leave blank if nothing is owed next." className="sm:col-span-2">
              <input value={form.nextAction} onChange={event => set('nextAction', event.target.value)} placeholder="e.g. Send pricing follow-up" className={fieldClass} data-testid="input-activity-next-action" />
            </FormField>
            <FormField label="Next action due">
              <input type="datetime-local" value={form.nextDue} onChange={event => set('nextDue', event.target.value)} className={fieldClass} data-testid="input-activity-next-due" />
            </FormField>
          </FormSection>
        )}
      </form>
    </Modal>
  );
}

export function ActivitiesPage() {
  const { user, role, isViewer } = useAuth();
  const userContext = useMemo(
    () => ({ email: user?.email, role, name: user?.profile?.name }),
    [user, role]
  );
  const activities = useGetActivities(userContext);
  const removeActivity = useDeleteActivity();
  const client = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Activity>();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('create') === 'true') {
      setOpen(true);
      window.history.replaceState({}, '', '/activities');
    }
  }, []);

  const [page, setPage] = useState(1);
  const pageSize = 12;

  const items = (activities.data ?? []).filter(
    (activity) =>
      (filter === 'all' || activity.type.toLowerCase() === filter.toLowerCase()) &&
      (!search ||
        `${activity.title} ${activity.person} ${activity.detail}`
          .toLowerCase()
          .includes(search.toLowerCase()))
  );

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  const icons: Record<string, LucideIcon> = {
    call: ActivityIcon,
    meeting: Video,
    email: Mail,
    note: ClipboardCheck,
    whatsapp: MessageSquare,
    other: ActivityIcon,
    visit: Building2,
    proposal: BarChart3,
    deal: BarChart3,
  };

  const deleteActivity = (activity: Activity) => {
    if (!window.confirm(`Delete “${activity.title}”? This cannot be undone.`)) return;
    removeActivity.mutate(
      { id: activity.id },
      {
        onSuccess: () => {
          client.invalidateQueries({ queryKey: getGetActivitiesQueryKey() });
          client.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          toast({ title: 'Activity deleted', description: 'The timeline was updated.' });
        },
        onError: (error: Error) => {
          toast({ variant: 'destructive', title: 'Couldn’t delete activity', description: error.message });
        },
      }
    );
  };

  return (
    <div className="animate-rise">
      <PageIntro
        eyebrow="BASHAAR / CONTEXT"
        title="Activities"
        description="A living record of every meaningful touchpoint."
        action={
          !isViewer ? (
            <Button onClick={() => { setEditing(undefined); setOpen(true); }} testId="button-log-activity">
              <Plus size={15} /> Log activity
            </Button>
          ) : undefined
        }
      />
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search the timeline…"
              className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-xs outline-none focus:border-[hsl(var(--accent))]"
              data-testid="input-search-activities"
            />
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded border border-border px-2 py-0.5 text-xs font-bold disabled:opacity-40"
                  data-testid="button-activities-prev-page"
                >
                  Prev
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded border border-border px-2 py-0.5 text-xs font-bold disabled:opacity-40"
                  data-testid="button-activities-next-page"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['all', 'Call', 'Meeting', 'Email', 'Note', 'WhatsApp', 'Other'].map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold ${
                filter === item
                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                  : 'border border-border bg-card text-muted-foreground'
              }`}
              data-testid={`button-filter-activity-${item}`}
            >
              {item === 'all' ? 'All activity' : item}
            </button>
          ))}
        </div>
      </div>
      <Card className="p-5">
        {activities.isLoading ? (
          <div className="space-y-5">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton className="h-12" key={i} />
            ))}
          </div>
        ) : activities.isError ? (
          <ErrorState onRetry={() => activities.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No signal here yet"
            body="Log a call, meeting, email, WhatsApp message, or note to give this relationship context."
            action={
              !isViewer ? (
                <Button onClick={() => { setEditing(undefined); setOpen(true); }} testId="button-empty-log-activity">
                  <Plus size={14} /> Log activity
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="relative ml-3 border-l border-border pl-7">
            {paginatedItems.map((activity) => {
              const Icon = icons[activity.type.toLowerCase()] ?? ActivityIcon;
              return (
                <div
                  key={activity.id}
                  className="relative pb-7 last:pb-0"
                  data-testid={`timeline-activity-${activity.id}`}
                >
                  <div
                    className={`absolute -left-[42px] grid h-7 w-7 place-items-center rounded-full border-4 border-card ${toneClass(
                      activity.tone
                    )}`}
                  >
                    <Icon size={12} />
                  </div>
                  <div className="group flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-bold">{activity.title}</div>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold capitalize text-muted-foreground">{activity.type}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {activity.person} · {activity.detail}
                      </div>
                      {activity.relatedType && (
                        <div className="mt-2 inline-flex rounded-full bg-muted px-2 py-1 font-mono-ui text-[10px] text-muted-foreground">
                          Associated {activity.relatedType}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="font-mono-ui text-[10px] text-muted-foreground">
                        {dateLabel(activity.timestamp)}
                      </span>
                      {!isViewer && (
                        <>
                          <button
                            onClick={() => { setEditing(activity); setOpen(true); }}
                            className="rounded-md p-1.5 text-muted-foreground opacity-0 hover:bg-muted group-hover:opacity-100"
                            title="Edit activity"
                            data-testid={`button-edit-activity-${activity.id}`}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => deleteActivity(activity)}
                            className="rounded-md p-1.5 text-muted-foreground opacity-0 hover:bg-muted hover:text-[hsl(var(--destructive))] group-hover:opacity-100"
                            title="Delete activity"
                            data-testid={`button-delete-activity-${activity.id}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      {open && !isViewer && (
        <ActivityForm
          key={editing?.id ?? 'new'}
          activity={editing}
          onClose={() => {
            setOpen(false);
            setEditing(undefined);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Company Form
// ---------------------------------------------------------------------------
function CompanyForm({ onClose }: { onClose: () => void }) {
  const { user, role } = useAuth();
  const userContext = useMemo(
    () => ({ email: user?.email, role, name: user?.profile?.name, id: user?.id }),
    [user, role]
  );
  const create = useCreateCompany(userContext);
  const client = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    industry: 'Technology',
    location: 'Remote',
    health: 'Healthy',
  });
  const [formError, setFormError] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    if (!form.name.trim()) {
      setFormError('Enter a company name.');
      return;
    }
    create.mutate(
      { data: form },
      {
        onSuccess: () => {
          client.invalidateQueries({ queryKey: getGetCompaniesQueryKey() });
          client.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          toast({ title: 'Company created', description: `${form.name} is now in Accounts.` });
          onClose();
        },
        onError: (error: Error) => {
          setFormError(error.message || 'Couldn’t save this company.');
          toast({ variant: 'destructive', title: 'Couldn’t save company', description: error.message });
        },
      }
    );
  };

  return (
    <Modal
      eyebrow="BASHAAR / ACCOUNTS"
      title="New company"
      description="Add an account so leads and deals have a clean home."
      onClose={onClose}
      testId="modal-company-form"
      footer={
        <>
          <Button variant="outline" onClick={onClose} testId="button-cancel-company">Cancel</Button>
          <Button type="submit" form="company-form" disabled={create.isPending} testId="button-save-company">
            {create.isPending ? 'Saving…' : 'Create company'}
          </Button>
        </>
      }
    >
      <form id="company-form" onSubmit={submit} className="grid gap-4" noValidate>
        {formError && <div className="rounded-lg border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] px-3 py-2 text-xs font-semibold text-[hsl(var(--destructive))]" role="alert">{formError}</div>}
        <FormSection title="Company profile" description="The basics your team will scan first.">
          <FormField label="Company name" required className="sm:col-span-2">
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Apex Industries" className={fieldClass} data-testid="input-company-name" />
          </FormField>
          <FormField label="Industry">
            <select value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} className={selectClass} data-testid="select-company-industry">
              {['Technology', 'Retail', 'Manufacturing', 'Finance', 'Healthcare', 'Real Estate', 'Consulting', 'Logistics'].map(ind => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Health status">
            <select value={form.health} onChange={e => setForm({ ...form, health: e.target.value })} className={selectClass} data-testid="select-company-health">
              <option value="Healthy">Healthy</option>
              <option value="At risk">At risk</option>
              <option value="Stagnant">Stagnant</option>
            </select>
          </FormField>
          <FormField label="Location" className="sm:col-span-2">
            <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Karachi, Pakistan or Remote" className={fieldClass} data-testid="input-company-location" />
          </FormField>
        </FormSection>
      </form>
    </Modal>
  );
}

export function CompaniesPage() {
  const { user, role, isViewer } = useAuth();
  const userContext = useMemo(
    () => ({ email: user?.email, role, name: user?.profile?.name }),
    [user, role]
  );
  const companies = useGetCompanies(userContext);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const items = (companies.data ?? []).filter(
    (company) =>
      company.name.toLowerCase().includes(search.toLowerCase()) ||
      company.industry.toLowerCase().includes(search.toLowerCase()) ||
      company.location.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search]);

  return (
    <div className="animate-rise">
      <PageIntro
        eyebrow="BASHAAR / ACCOUNTS"
        title="Companies"
        description="Account health at a glance, without the spreadsheet fog."
        action={
          !isViewer ? (
            <Button onClick={() => setOpen(true)} testId="button-create-company">
              <Plus size={15} /> New company
            </Button>
          ) : undefined
        }
      />
      <Card className="overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border p-4 gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search companies or industries…"
            className="h-9 w-full max-w-md rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-[hsl(var(--accent))]"
            data-testid="input-search-companies"
          />
          {totalPages > 1 && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded border border-border px-2 py-0.5 text-xs font-bold disabled:opacity-40"
                  data-testid="button-companies-prev-page"
                >
                  Prev
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded border border-border px-2 py-0.5 text-xs font-bold disabled:opacity-40"
                  data-testid="button-companies-next-page"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
        {companies.isLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton className="h-14" key={i} />
            ))}
          </div>
        ) : companies.isError ? (
          <div className="p-5">
            <ErrorState onRetry={() => companies.refetch()} />
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="No accounts found" body="Try a different search term or create a new company." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead className="bg-muted/60 font-mono-ui text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-3 py-3 font-medium">Industry</th>
                  <th className="px-3 py-3 font-medium">Location</th>
                  <th className="px-3 py-3 font-medium">Leads</th>
                  <th className="px-3 py-3 font-medium">Open value</th>
                  <th className="px-5 py-3 font-medium">Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedItems.map((company) => (
                  <tr
                    key={company.id}
                    data-testid={`row-company-${company.id}`}
                    className="hover:bg-muted/40"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-[hsl(var(--primary))] text-[10px] font-bold text-[hsl(var(--accent))]">
                          {company.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold">{company.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-xs text-muted-foreground">{company.industry}</td>
                    <td className="px-3 py-4 text-xs text-muted-foreground">{company.location}</td>
                    <td className="px-3 py-4 font-mono-ui text-xs">{company.leads}</td>
                    <td className="px-3 py-4 font-mono-ui text-xs">{money(company.openValue)}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                          company.health.toLowerCase() === 'healthy'
                            ? 'bg-[hsl(151_38%_91%)] text-[hsl(160_38%_29%)]'
                            : company.health.toLowerCase() === 'at risk'
                            ? 'bg-[hsl(39_70%_91%)] text-[hsl(32_68%_34%)]'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {company.health}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {open && !isViewer && <CompanyForm onClose={() => setOpen(false)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deal Form
// ---------------------------------------------------------------------------
function DealForm({ onClose }: { onClose: () => void }) {
  const { user, role } = useAuth();
  const userContext = useMemo(
    () => ({ email: user?.email, role, name: user?.profile?.name, id: user?.id }),
    [user, role]
  );
  const create = useCreateDeal(userContext);
  const client = useQueryClient();
  const [form, setForm] = useState<DealInput>({
    name: '',
    company: '',
    value: 0,
    stage: 'Proposal Sent',
    owner: user?.profile?.name ?? user?.email?.split('@')[0] ?? '',
    expectedClose: new Date().toISOString().slice(0, 10),
    currency: 'PKR',
  });
  const [formError, setFormError] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    if (!form.name.trim() || !form.company.trim()) {
      setFormError('Deal name and company are required.');
      return;
    }
    create.mutate(
      { data: { ...form, value: Number(form.value) } },
      {
        onSuccess: () => {
          client.invalidateQueries({ queryKey: getGetDealsQueryKey() });
          client.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          client.invalidateQueries({ queryKey: getGetReportsQueryKey() });
          toast({ title: 'Deal created', description: `${form.name} is now in revenue.` });
          onClose();
        },
        onError: (error: Error) => {
          setFormError(error.message || 'Couldn’t save this deal.');
          toast({ variant: 'destructive', title: 'Couldn’t save deal', description: error.message });
        },
      }
    );
  };

  return (
    <Modal
      eyebrow="BASHAAR / REVENUE"
      title="Create deal"
      description="Book an opportunity so pipeline value and reports stay current."
      onClose={onClose}
      testId="modal-deal-form"
      footer={
        <>
          <Button variant="outline" onClick={onClose} testId="button-cancel-deal">Cancel</Button>
          <Button type="submit" form="deal-form" disabled={create.isPending} testId="button-save-deal">
            {create.isPending ? 'Saving…' : 'Create deal'}
          </Button>
        </>
      }
    >
      <form id="deal-form" onSubmit={submit} className="grid gap-4" noValidate>
        {formError && <div className="rounded-lg border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] px-3 py-2 text-xs font-semibold text-[hsl(var(--destructive))]" role="alert">{formError}</div>}
        <FormSection title="Opportunity" description="What is being sold, to whom, and for how much.">
          <FormField label="Deal name" required className="sm:col-span-2">
            <input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} className={fieldClass} data-testid="input-deal-name" />
          </FormField>
          <FormField label="Company" required>
            <input required value={form.company} onChange={event => setForm({ ...form, company: event.target.value })} className={fieldClass} data-testid="input-deal-company" />
          </FormField>
          <FormField label="Owner">
            <input required value={form.owner} onChange={event => setForm({ ...form, owner: event.target.value })} className={fieldClass} data-testid="input-deal-owner" />
          </FormField>
          <FormField label="Value">
            <input type="number" min="0" required value={form.value} onChange={event => setForm({ ...form, value: Number(event.target.value) })} className={fieldClass} data-testid="input-deal-value" />
          </FormField>
          <FormField label="Expected close">
            <input type="date" value={form.expectedClose} onChange={event => setForm({ ...form, expectedClose: event.target.value })} className={fieldClass} data-testid="input-deal-close" />
          </FormField>
          <FormField label="Stage" className="sm:col-span-2">
            <select value={form.stage} onChange={event => setForm({ ...form, stage: event.target.value })} className={selectClass} data-testid="select-deal-stage">
              {pipelineStages.slice(2).map(value => <option key={value}>{value}</option>)}
            </select>
          </FormField>
        </FormSection>
      </form>
    </Modal>
  );
}

function PaymentForm({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const record = useRecordDealPayment();
  const client = useQueryClient();
  const outstanding = Math.max(0, deal.value - deal.paid);
  const [amount, setAmount] = useState(outstanding);
  const [formError, setFormError] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    if (Number(amount) <= 0) {
      setFormError('Enter an amount greater than zero.');
      return;
    }
    record.mutate(
      { id: deal.id, data: { amount: Number(amount) } },
      {
        onSuccess: () => {
          client.invalidateQueries({ queryKey: getGetDealsQueryKey() });
          client.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          client.invalidateQueries({ queryKey: getGetReportsQueryKey() });
          toast({ title: 'Payment recorded', description: `${money(Number(amount), deal.currency)} collected against ${deal.name}.` });
          onClose();
        },
        onError: (error: Error) => {
          setFormError(error.message || 'Couldn’t record this payment.');
          toast({ variant: 'destructive', title: 'Couldn’t record payment', description: error.message });
        },
      }
    );
  };

  return (
    <Modal
      eyebrow="BASHAAR / CASH"
      title="Record payment"
      description="Log money already received against this deal."
      onClose={onClose}
      testId="modal-payment-form"
      footer={
        <>
          <Button variant="outline" onClick={onClose} testId="button-cancel-payment">Cancel</Button>
          <Button type="submit" form="payment-form" disabled={record.isPending} testId="button-save-payment">
            {record.isPending ? 'Recording…' : 'Record payment'}
          </Button>
        </>
      }
    >
      <form id="payment-form" onSubmit={submit} className="grid gap-4" noValidate>
        {formError && <div className="rounded-lg border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] px-3 py-2 text-xs font-semibold text-[hsl(var(--destructive))]" role="alert">{formError}</div>}
        <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs">
          <div className="flex justify-between gap-3">
            <span className="font-bold">{deal.name}</span>
            <span className="font-mono-ui">{money(deal.value, deal.currency)}</span>
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            <span>Collected so far</span>
            <span>{money(deal.paid, deal.currency)}</span>
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>Outstanding</span>
            <span>{money(outstanding, deal.currency)}</span>
          </div>
        </div>
        <FormField label="Amount received" required>
          <input type="number" min="0.01" step="0.01" max={outstanding} required value={amount} onChange={event => setAmount(Number(event.target.value))} className={fieldClass} data-testid="input-payment-amount" />
        </FormField>
      </form>
    </Modal>
  );
}

export function DealsPage() {
  const { user, role, isViewer } = useAuth();
  const userContext = useMemo(
    () => ({ email: user?.email, role, name: user?.profile?.name }),
    [user, role]
  );
  const deals = useGetDeals(userContext);

  const [open, setOpen] = useState(false);
  const [payingDeal, setPayingDeal] = useState<Deal>();
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('create') === 'true') {
      setOpen(true);
      window.history.replaceState({}, '', '/deals');
    }
  }, []);

  const rawItems = deals.data ?? [];
  const filteredItems = rawItems.filter((deal) => {
    if (stage && deal.stage !== stage) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (deal.name || '').toLowerCase().includes(q) ||
      (deal.company || '').toLowerCase().includes(q) ||
      (deal.owner || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, stage]);

  const dealStages = Array.from(new Set(rawItems.map((d) => d.stage))).filter(Boolean);

  return (
    <div className="animate-rise">
      <PageIntro
        eyebrow="BASHAAR / REVENUE"
        title="Deals"
        description="A clean read on what is booked, moving, and expected."
        action={
          !isViewer ? (
            <Button onClick={() => setOpen(true)} testId="button-create-deal">
              <Plus size={15} /> New deal
            </Button>
          ) : undefined
        }
      />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search deals, companies, owners…"
              className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-xs outline-none focus:border-[hsl(var(--accent))]"
              data-testid="input-search-deals"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="h-9 rounded-lg border border-input bg-card px-3 text-xs outline-none"
              data-testid="select-filter-deal-stage"
            >
              <option value="">All stages</option>
              {dealStages.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {(search || stage) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setStage('');
                }}
                testId="button-clear-deal-filters"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-2.5 text-[10px] text-muted-foreground">
          <span>
            Showing {filteredItems.length} deal{filteredItems.length === 1 ? '' : 's'}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded border border-border px-2 py-0.5 text-xs font-bold disabled:opacity-40"
                  data-testid="button-deals-prev-page"
                >
                  Prev
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded border border-border px-2 py-0.5 text-xs font-bold disabled:opacity-40"
                  data-testid="button-deals-next-page"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
        {deals.isLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton className="h-16" key={i} />
            ))}
          </div>
        ) : deals.isError ? (
          <div className="p-5">
            <ErrorState onRetry={() => deals.refetch()} />
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title="No deals found"
            body={search || stage ? 'No deals match your search criteria.' : 'Create the first deal to start tracking revenue.'}
            action={
              !isViewer ? (
                <Button onClick={() => setOpen(true)} testId="button-empty-create-deal">
                  <Plus size={14} /> Create deal
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-muted/60 font-mono-ui text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Deal</th>
                  <th className="px-3 py-3 font-medium">Stage</th>
                  <th className="px-3 py-3 font-medium">Owner</th>
                  <th className="px-3 py-3 font-medium">Value</th>
                  <th className="px-3 py-3 font-medium">Paid</th>
                  <th className="px-3 py-3 font-medium">Expected close</th>
                  <th className="px-5 py-3 text-right font-medium"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedItems.map((deal) => (
                  <tr
                    key={deal.id}
                    className="hover:bg-muted/40"
                    data-testid={`row-deal-${deal.id}`}
                  >
                    <td className="px-5 py-4">
                      <div className="text-xs font-bold">{deal.name}</div>
                      <div className="mt-1 text-[10px] text-muted-foreground">{deal.company}</div>
                    </td>
                    <td className="px-3 py-4">
                      <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold">
                        {deal.stage}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-xs">{deal.owner}</td>
                    <td className="px-3 py-4 font-mono-ui text-xs">
                      {money(deal.value, deal.currency)}
                    </td>
                    <td className="px-3 py-4 font-mono-ui text-xs text-[hsl(160_38%_29%)]">
                      {money(deal.paid, deal.currency)}
                    </td>
                    <td className="px-3 py-4 font-mono-ui text-[11px] text-muted-foreground">
                      {dateLabel(deal.expectedClose)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {!isViewer && deal.paid < deal.value ? (
                        <button
                          onClick={() => setPayingDeal(deal)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[10px] font-bold hover:border-[hsl(var(--accent))]"
                          data-testid={`button-record-payment-${deal.id}`}
                        >
                          <DollarSign size={12} /> Record payment
                        </button>
                      ) : deal.paid >= deal.value ? (
                        <span className="rounded-full bg-[hsl(151_38%_91%)] px-2 py-1 text-[10px] font-bold text-[hsl(160_38%_29%)]">
                          Paid in full
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {open && !isViewer && <DealForm onClose={() => setOpen(false)} />}
      {payingDeal && !isViewer && (
        <PaymentForm deal={payingDeal} onClose={() => setPayingDeal(undefined)} />
      )}
    </div>
  );
}

function exportCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Reports Page
// ---------------------------------------------------------------------------
export function ReportsPage() {
  const { user, role, permissions } = useAuth();
  const userContext = useMemo(
    () => ({ email: user?.email, role, name: user?.profile?.name }),
    [user, role]
  );
  const reports = useGetReports(userContext);
  const [view, setView] = useState('funnel');

  if (!permissions.canAccessReports) {
    return (
      <div className="animate-rise">
        <PageIntro
          eyebrow="BASHAAR / ACCESS CONTROL"
          title="Reports"
          description="Performance patterns and revenue attribution."
        />
        <Card className="mx-auto max-w-lg p-8 text-center mt-6">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/10 text-2xl text-amber-600 dark:text-amber-400">
            <ShieldAlert size={28} />
          </div>
          <h3 className="mb-2 text-base font-extrabold text-foreground">
            Reports Access Restricted
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Quarterly reports, funnel metrics, and team attribution are reserved for Managers and Super Admins.
            Contact your workspace administrator to request elevated reporting permissions.
          </p>
          <div className="mt-6 flex justify-center">
            <Link href="/">
              <Button variant="outline">Return to Dashboard</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (reports.isLoading)
    return (
      <>
        <PageIntro title="Reports" />
        <Skeleton className="h-[500px]" />
      </>
    );
  if (reports.isError || !reports.data) return <ErrorState onRetry={() => reports.refetch()} />;

  const data = reports.data;
  const sources: SourcePerformance[] = Array.isArray(data?.sources) ? data.sources : [];
  const funnel: PipelineStage[] = Array.isArray(data?.funnel) ? data.funnel : [];
  const owners: OwnerPerformance[] = Array.isArray(data?.owners) ? data.owners : [];
  const maxSource = Math.max(...sources.map((source) => source.leads || 0), 1);
  const maxFunnel = Math.max(...funnel.map((stage) => stage.count || 0), 1);

  const handleExport = () => {
    if (view === 'funnel')
      exportCsv('bashaar-funnel.csv', [
        ['Stage', 'Leads', 'Value'],
        ...funnel.map((item) => [item.label, String(item.count), String(item.value)]),
      ]);
    if (view === 'sources')
      exportCsv('bashaar-sources.csv', [
        ['Source', 'Leads', 'Won', 'Conversion'],
        ...sources.map((item) => [
          item.source,
          String(item.leads),
          String(item.won),
          `${item.conversion}%`,
        ]),
      ]);
    if (view === 'owners')
      exportCsv('bashaar-owner-performance.csv', [
        ['Owner', 'Leads', 'Won value', 'Activities'],
        ...owners.map((item) => [
          item.owner,
          String(item.leads),
          String(item.wonValue),
          String(item.activities),
        ]),
      ]);
  };

  return (
    <div className="animate-rise">
      <PageIntro
        eyebrow="BASHAAR / SIGNAL"
        title="Reports"
        description="The patterns behind this quarter’s motion."
        action={
          <div className="flex gap-2">
            <select
              value={view}
              onChange={(event) => setView(event.target.value)}
              className="h-9 rounded-lg border border-input bg-card px-3 text-xs font-bold"
              data-testid="select-report-view"
            >
              <option value="funnel">Funnel view</option>
              <option value="sources">Source view</option>
              <option value="owners">Owner view</option>
            </select>
            <Button variant="outline" onClick={handleExport} testId="button-export-report">
              <BarChart3 size={14} /> Export view
            </Button>
          </div>
        }
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <SectionHeading title="Funnel health" />
          <div className="space-y-4">
            {funnel.map((stage, index) => (
              <div key={stage.label}>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="font-bold">{stage.label}</span>
                  <span className="font-mono-ui text-muted-foreground">
                    {stage.count} leads · {money(stage.value)}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-[hsl(var(--primary))]"
                    style={{
                      width: `${Math.max(6, ((stage.count || 0) / maxFunnel) * 100)}%`,
                      opacity: 0.95 - index * 0.1,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <SectionHeading title="Source performance" />
          <div className="space-y-4">
            {sources.map((source) => (
              <div key={source.source}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-bold">{source.source}</span>
                  <span className="font-mono-ui text-[10px] text-muted-foreground">
                    {source.conversion}% conversion
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[hsl(var(--accent))]"
                      style={{ width: `${((source.leads || 0) / maxSource) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 font-mono-ui text-[10px]">{source.leads}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5 xl:col-span-2">
          <SectionHeading title="Owner performance" />
          <div className="grid gap-3 md:grid-cols-3">
            {owners.map((owner) => (
              <div className="rounded-lg border border-border bg-background p-4" key={owner.owner}>
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-[hsl(var(--primary))] text-[10px] font-bold text-[hsl(var(--accent))]">
                    {owner.owner
                      .split(' ')
                      .map((part: string) => part[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <span className="text-xs font-bold">{owner.owner}</span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4">
                  <div>
                    <div className="font-mono-ui text-[10px] text-muted-foreground">Won value</div>
                    <div className="mt-1 text-base font-extrabold">{money(owner.wonValue)}</div>
                  </div>
                  <div>
                    <div className="font-mono-ui text-[10px] text-muted-foreground">Activities</div>
                    <div className="mt-1 text-base font-extrabold">{owner.activities}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Team Page
// ---------------------------------------------------------------------------
export function TeamPage() {
  const { user, role, isSuperAdmin } = useAuth();
  const userContext = useMemo(
    () => ({ email: user?.email, role, name: user?.profile?.name }),
    [user, role]
  );
  const reports = useGetReports(userContext);
  const teamRoles = useGetTeamRoles();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  if (reports.isLoading || teamRoles.isLoading)
    return (
      <>
        <PageIntro title="Team" />
        <Skeleton className="h-96" />
      </>
    );
  if (reports.isError || !reports.data) return <ErrorState onRetry={() => reports.refetch()} />;

  const owners: OwnerPerformance[] = Array.isArray(reports.data?.owners) ? reports.data.owners : [];
  const dbRoles = teamRoles.data ?? [];
  type TeamMember = OwnerPerformance & { role: UserRole; status: string; email: string };

  // Combine reports with DB roles
  const members: TeamMember[] = owners.map((owner: OwnerPerformance) => {
    const matchedRole = dbRoles.find(
      (r) =>
        (r.name && r.name.toLowerCase() === owner.owner.toLowerCase()) ||
        (r.email && r.email.toLowerCase().includes(owner.owner.toLowerCase().replace(' ', '')))
    );
    return {
      ...owner,
      role: (matchedRole?.role ?? 'Sales User') as UserRole,
      status: matchedRole?.status ?? 'Active',
      email: matchedRole?.email ?? '',
    };
  });

  // If there are DB members not in reports, append them
  dbRoles.forEach((dr) => {
    if (!members.some((m) => m.email && m.email.toLowerCase() === dr.email.toLowerCase())) {
      members.push({
        owner: dr.name || dr.email.split('@')[0],
        leads: 0,
        wonValue: 0,
        activities: 0,
        role: dr.role,
        status: dr.status || 'Active',
        email: dr.email,
      });
    }
  });

  const items = members.filter(
    (member) =>
      (!search ||
        member.owner.toLowerCase().includes(search.toLowerCase()) ||
        member.email.toLowerCase().includes(search.toLowerCase())) &&
      (status === 'all' || member.status === status)
  );

  return (
    <div className="animate-rise">
      <PageIntro
        eyebrow="BASHAAR / PEOPLE"
        title="Team"
        description="Workload, role visibility, and outcomes in one place."
        action={
          isSuperAdmin ? (
            <Link
              href="/settings"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-xs font-extrabold hover:border-[hsl(var(--accent))]"
              data-testid="link-team-access"
            >
              <Settings2 size={14} /> Manage access
            </Link>
          ) : undefined
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="font-mono-ui text-[10px] uppercase text-muted-foreground">Active now</div>
          <div className="mt-2 text-2xl font-extrabold">
            {members.filter((member) => member.status === 'Active').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="font-mono-ui text-[10px] uppercase text-muted-foreground">Team activities</div>
          <div className="mt-2 text-2xl font-extrabold">
            {members.reduce((sum, member) => sum + member.activities, 0)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="font-mono-ui text-[10px] uppercase text-muted-foreground">Pipeline owned</div>
          <div className="mt-2 text-2xl font-extrabold">
            {money(members.reduce((sum, member) => sum + member.wonValue, 0))}
          </div>
        </Card>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search team by name or email…"
            className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-xs"
            data-testid="input-search-team"
          />
        </div>
        {['all', 'Active', 'Away'].map((item) => (
          <button
            key={item}
            onClick={() => setStatus(item)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
              status === item
                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                : 'border border-border bg-card text-muted-foreground'
            }`}
            data-testid={`button-filter-team-${item}`}
          >
            {item === 'all' ? 'Everyone' : item}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((member, index) => (
          <Card key={member.email || member.owner} className="p-5">
            <div className="flex items-start justify-between">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-[hsl(var(--primary))] font-bold text-[hsl(var(--accent))]">
                {member.owner
                  .split(' ')
                  .map((part: string) => part[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                  member.status === 'Active'
                    ? 'bg-[hsl(151_38%_91%)] text-[hsl(160_38%_29%)]'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {member.status}
              </span>
            </div>
            <h2 className="mt-4 text-sm font-extrabold">{member.owner}</h2>
            <div className="mt-0.5 text-[10px] text-muted-foreground truncate">{member.email}</div>
            <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-extrabold text-[hsl(var(--accent-foreground))]">
              <ShieldCheck size={12} />
              {member.role}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
              <div>
                <div className="font-mono-ui text-[10px] text-muted-foreground">Open leads</div>
                <div className="mt-1 text-xl font-extrabold">{member.leads}</div>
              </div>
              <div>
                <div className="font-mono-ui text-[10px] text-muted-foreground">Won value</div>
                <div className="mt-1 text-xl font-extrabold">{money(member.wonValue)}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{member.activities} activities</span>
              <span className="font-bold text-foreground">
                {index === 0 ? 'Top momentum' : 'Active rep'}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings Page (Super Admin Guarded + Live Team Access RBAC)
// ---------------------------------------------------------------------------
type NotificationPrefs = {
  overdue: boolean;
  taskReminders: boolean;
  activityDigest: boolean;
  weeklyReport: boolean;
};

const defaultPrefs: NotificationPrefs = {
  overdue: true,
  taskReminders: true,
  activityDigest: false,
  weeklyReport: true,
};

const availableRoles: UserRole[] = ['Super Admin', 'Manager', 'Sales User', 'Viewer'];

export function SettingsPage() {
  const { user, isSuperAdmin } = useAuth();
  const [tab, setTab] = useState<'general' | 'notifications' | 'access'>('general');
  const [saved, setSaved] = useState(false);
  const [generalSaved, setGeneralSaved] = useState(false);

  // General Workspace Settings state
  const [workspaceName, setWorkspaceName] = useState(() => {
    try {
      return localStorage.getItem('bashaar-workspace-name') || 'BASHAAR AI Revenue';
    } catch {
      return 'BASHAAR AI Revenue';
    }
  });
  const [workspaceCurrency, setWorkspaceCurrency] = useState(() => {
    try {
      return localStorage.getItem('bashaar-workspace-currency') || 'PKR';
    } catch {
      return 'PKR';
    }
  });
  const [workspaceTimezone, setWorkspaceTimezone] = useState(() => {
    try {
      return localStorage.getItem('bashaar-workspace-timezone') || 'Asia/Islamabad';
    } catch {
      return 'Asia/Islamabad';
    }
  });

  const saveGeneralSettings = (event: FormEvent) => {
    event.preventDefault();
    try {
      localStorage.setItem('bashaar-workspace-name', workspaceName);
      localStorage.setItem('bashaar-workspace-currency', workspaceCurrency);
      localStorage.setItem('bashaar-workspace-timezone', workspaceTimezone);
      window.dispatchEvent(new Event('storage'));
    } catch {
      // ignore
    }
    setGeneralSaved(true);
    window.setTimeout(() => setGeneralSaved(false), 2400);
  };

  const [prefs, setPrefs] = useState<NotificationPrefs>(() => {
    try {
      return (
        (JSON.parse(localStorage.getItem('bashaar-notification-prefs') ?? '') as NotificationPrefs) ??
        defaultPrefs
      );
    } catch {
      return defaultPrefs;
    }
  });

  // Team Access Live Data Hooks
  const teamRolesQuery = useGetTeamRoles();
  const updateRoleMutation = useUpdateTeamRole();
  const deleteMemberMutation = useDeleteTeamMember();

  // Add new team member form state
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('Sales User');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const savePreferences = (event: FormEvent) => {
    event.preventDefault();
    localStorage.setItem('bashaar-notification-prefs', JSON.stringify(prefs));
    window.dispatchEvent(new Event('storage'));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  };

  const handleAddMember = async (event: FormEvent) => {
    event.preventDefault();
    if (!newEmail.trim()) return;
    setActionError('');
    setActionSuccess('');
    try {
      await updateRoleMutation.mutateAsync({
        email: newEmail.trim().toLowerCase(),
        name: newName.trim() || undefined,
        role: newRole,
        status: 'Active',
      });
      setNewEmail('');
      setNewName('');
      setNewRole('Sales User');
      setActionSuccess(`Successfully assigned ${newRole} role to ${newEmail.trim().toLowerCase()}`);
      window.setTimeout(() => setActionSuccess(''), 3500);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update team member role.');
    }
  };

  const handleRoleChange = async (member: TeamMemberRole, targetRole: UserRole) => {
    setActionError('');
    setActionSuccess('');
    try {
      await updateRoleMutation.mutateAsync({
        email: member.email,
        name: member.name,
        role: targetRole,
        status: member.status,
      });
      setActionSuccess(`Updated ${member.email} to ${targetRole}.`);
      window.setTimeout(() => setActionSuccess(''), 3500);
    } catch (err: any) {
      setActionError(err.message || 'Failed to change role.');
    }
  };

  const handleDeleteMember = async (memberEmail: string) => {
    if (memberEmail.toLowerCase() === 'mi9491697@gmail.com') {
      alert('The primary Super Admin cannot be removed.');
      return;
    }
    if (window.confirm(`Are you sure you want to remove ${memberEmail} from team access?`)) {
      setActionError('');
      setActionSuccess('');
      try {
        await deleteMemberMutation.mutateAsync(memberEmail);
        setActionSuccess(`Removed ${memberEmail} from team access.`);
        window.setTimeout(() => setActionSuccess(''), 3500);
      } catch (err: any) {
        setActionError(err.message || 'Failed to remove member.');
      }
    }
  };

  // Guard: If current user is not a Super Admin, display the access restricted screen
  if (!isSuperAdmin) {
    return (
      <div className="animate-rise">
        <PageIntro
          eyebrow="BASHAAR / ACCESS CONTROL"
          title="Settings"
          description="Workspace configuration and permissions."
        />
        <Card className="mx-auto max-w-lg p-8 text-center mt-6">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/10 text-2xl text-amber-600 dark:text-amber-400">
            <ShieldAlert size={28} />
          </div>
          <h3 className="mb-2 text-base font-extrabold text-foreground">
            Super Admin Access Required
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Workspace settings and Team Access management are restricted to Super Admins.
            Only accounts with Super Admin privileges in InsForge can configure roles, manage team permissions, and modify workspace settings.
          </p>
          <div className="mt-6 flex justify-center">
            <Link href="/">
              <Button variant="outline">Return to Dashboard</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const tabs = [
    ['general', 'General', Settings2],
    ['notifications', 'Notifications', RefreshCw],
    ['access', 'Team access', Users2],
  ] as const;

  return (
    <div className="animate-rise">
      <PageIntro
        eyebrow="BASHAAR / CONTROL ROOM"
        title="Settings"
        description="Configure workspace settings, roles, and real-life team permissions."
      />
      <div className="grid gap-5 lg:grid-cols-[.72fr_1.28fr]">
        <Card className="h-fit p-2">
          {tabs.map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-xs font-bold ${
                tab === key ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
              data-testid={`button-settings-${key}`}
            >
              <Icon size={15} /> {label} <ChevronRight size={14} className="ml-auto" />
            </button>
          ))}
        </Card>

        <Card className="p-5">
          {tab === 'general' && (
            <>
              <SectionHeading title="Workspace details" />
              <form onSubmit={saveGeneralSettings} className="max-w-xl space-y-4">
                <label className="grid gap-1.5 text-[11px] font-bold text-muted-foreground">
                  Workspace name
                  <input
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="h-10 rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-[hsl(var(--accent))]"
                    data-testid="input-workspace-name"
                  />
                </label>
                <label className="grid gap-1.5 text-[11px] font-bold text-muted-foreground">
                  Default currency
                  <select
                    value={workspaceCurrency}
                    onChange={(e) => setWorkspaceCurrency(e.target.value)}
                    className="h-10 rounded-lg border border-input bg-background px-3 text-xs"
                    data-testid="select-workspace-currency"
                  >
                    <option value="PKR">PKR</option>
                    <option value="USD">USD</option>
                    <option value="AED">AED</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </label>
                <label className="grid gap-1.5 text-[11px] font-bold text-muted-foreground">
                  Workspace timezone
                  <select
                    value={workspaceTimezone}
                    onChange={(e) => setWorkspaceTimezone(e.target.value)}
                    className="h-10 rounded-lg border border-input bg-background px-3 text-xs"
                    data-testid="select-workspace-timezone"
                  >
                    <option value="Asia/Dubai">Asia/Dubai</option>
                    <option value="Asia/Islamabad">Asia/Islamabad</option>
                    <option value="Asia/Riyadh">Asia/Riyadh</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="America/New_York">America/New_York</option>
                  </select>
                </label>
                <SaveRow saved={generalSaved} />
              </form>
            </>
          )}

          {tab === 'notifications' && (
            <form onSubmit={savePreferences}>
              <SectionHeading title="Notification preferences" />
              <p className="mb-4 text-xs text-muted-foreground">
                Choose which signals appear in the workspace notification center.
              </p>
              <div className="divide-y divide-border">
                {(
                  [
                    ['overdue', 'Overdue follow-ups', 'Alert me when an open task is past due.'],
                    ['taskReminders', 'Task reminders', 'Show today and tomorrow reminders in the header.'],
                    ['activityDigest', 'Activity digest', 'Include a daily summary of team touchpoints.'],
                    ['weeklyReport', 'Weekly report', 'Send a weekly performance snapshot to managers.'],
                  ] as const
                ).map(([key, label, detail]) => (
                  <label key={key} className="flex items-center gap-4 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold">{label}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">{detail}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={prefs[key]}
                      onChange={(event) =>
                        setPrefs({ ...prefs, [key]: event.target.checked })
                      }
                      className="h-4 w-4 accent-[hsl(var(--accent))]"
                      data-testid={`checkbox-notification-${key}`}
                    />
                  </label>
                ))}
              </div>
              <SaveRow saved={saved} />
            </form>
          )}

          {tab === 'access' && (
            <div className="space-y-6">
              <div>
                <SectionHeading title="Real-Life Team Access & Roles" />
                <p className="mt-1 text-xs text-muted-foreground">
                  Assign real roles to user emails stored in your InsForge database.
                  Permissions take effect immediately for every signed-in team member.
                </p>
              </div>

              {actionSuccess && (
                <div className="rounded-lg bg-[hsl(151_38%_91%)] p-3 text-xs font-bold text-[hsl(160_38%_29%)] flex items-center gap-2">
                  <Check size={14} /> {actionSuccess}
                </div>
              )}

              {actionError && (
                <div className="rounded-lg bg-red-100 p-3 text-xs font-bold text-red-700">
                  {actionError}
                </div>
              )}

              {/* Add / Update Team Member Form */}
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold text-foreground">
                  <UserPlus size={15} /> Add or Update Team Member Role
                </div>
                <form onSubmit={handleAddMember} className="grid gap-3 sm:grid-cols-3">
                  <label className="grid gap-1 text-[11px] font-bold text-muted-foreground sm:col-span-1">
                    User Email *
                    <input
                      required
                      type="email"
                      placeholder="colleague@example.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="h-9 rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-[hsl(var(--accent))]"
                      data-testid="input-team-member-email"
                    />
                  </label>
                  <label className="grid gap-1 text-[11px] font-bold text-muted-foreground sm:col-span-1">
                    Name (Optional)
                    <input
                      placeholder="e.g. Sara Ahmed"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="h-9 rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-[hsl(var(--accent))]"
                      data-testid="input-team-member-name"
                    />
                  </label>
                  <label className="grid gap-1 text-[11px] font-bold text-muted-foreground sm:col-span-1">
                    Assigned Role
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as UserRole)}
                      className="h-9 rounded-lg border border-input bg-background px-3 text-xs"
                      data-testid="select-team-member-role"
                    >
                      {availableRoles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="sm:col-span-3 flex justify-end">
                    <Button
                      type="submit"
                      disabled={updateRoleMutation.isPending || !newEmail.trim()}
                      testId="button-assign-role"
                    >
                      {updateRoleMutation.isPending ? 'Saving…' : 'Save Role Assignment'}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Members Table */}
              <div>
                <div className="mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Configured Team Roles ({teamRolesQuery.data?.length ?? 0})
                </div>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[560px] text-left">
                    <thead className="bg-muted/60 font-mono-ui text-[10px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Member / Email</th>
                        <th className="px-4 py-3">Assigned Role</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {teamRolesQuery.isLoading ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-xs text-muted-foreground">
                            Loading team roles…
                          </td>
                        </tr>
                      ) : (teamRolesQuery.data ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-xs text-muted-foreground">
                            No team members configured yet.
                          </td>
                        </tr>
                      ) : (
                        (teamRolesQuery.data ?? []).map((member) => {
                          const isPrimaryAdmin =
                            member.email.toLowerCase() === 'mi9491697@gmail.com';
                          return (
                            <tr key={member.email} className="hover:bg-muted/30">
                              <td className="px-4 py-3">
                                <div className="text-xs font-bold text-foreground">
                                  {member.name || member.email.split('@')[0]}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  {member.email}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={member.role}
                                  disabled={isPrimaryAdmin || updateRoleMutation.isPending}
                                  onChange={(e) =>
                                    handleRoleChange(member, e.target.value as UserRole)
                                  }
                                  className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-bold outline-none focus:border-[hsl(var(--accent))]"
                                  data-testid={`select-role-${member.email}`}
                                >
                                  {availableRoles.map((r) => (
                                    <option key={r} value={r}>
                                      {r}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    member.status === 'Active'
                                      ? 'bg-[hsl(151_38%_91%)] text-[hsl(160_38%_29%)]'
                                      : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  {member.status || 'Active'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {isPrimaryAdmin ? (
                                  <span className="text-[10px] font-bold text-muted-foreground">
                                    Primary Admin
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleDeleteMember(member.email)}
                                    disabled={deleteMemberMutation.isPending}
                                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-[hsl(var(--destructive))]"
                                    title="Remove team access"
                                    data-testid={`button-delete-member-${member.email}`}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Role Permissions Matrix Reference */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="text-xs font-bold text-foreground">
                  Role Permissions & Access Guide
                </div>
                <div className="grid gap-2 sm:grid-cols-2 text-[11px] text-muted-foreground">
                  <div className="rounded-lg border border-border p-2.5">
                    <div className="font-extrabold text-foreground mb-0.5">Super Admin</div>
                    <div>Full access to all leads, deals, reports, Settings, and Team Access management. Only Super Admins can configure user roles.</div>
                  </div>
                  <div className="rounded-lg border border-border p-2.5">
                    <div className="font-extrabold text-foreground mb-0.5">Manager</div>
                    <div>Team-wide visibility across all sales reps, full access to deals and quarterly performance reports. Settings are restricted.</div>
                  </div>
                  <div className="rounded-lg border border-border p-2.5">
                    <div className="font-extrabold text-foreground mb-0.5">Sales User</div>
                    <div>Data privacy isolation enabled. Only sees and manages their own assigned leads, tasks, deals, and activities.</div>
                  </div>
                  <div className="rounded-lg border border-border p-2.5">
                    <div className="font-extrabold text-foreground mb-0.5">Viewer</div>
                    <div>Read-only access to view pipeline status and team dashboard. Cannot create, edit, or delete leads, deals, or tasks.</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function SaveRow({ saved }: { saved: boolean }) {
  return (
    <div className="flex items-center gap-3 pt-4">
      <Button type="submit" testId="button-save-settings">
        Save changes
      </Button>
      {saved && (
        <span className="text-xs font-bold text-[hsl(160_38%_29%)]">Saved successfully</span>
      )}
    </div>
  );
}
