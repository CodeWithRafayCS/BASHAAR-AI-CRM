import { insforge } from './insforge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Lead,
  LeadInput,
  LeadUpdate,
  Task,
  TaskInput,
  TaskUpdate,
  Activity,
  ActivityInput,
  Deal,
  DealInput,
  DealPayment,
  Company,
  DashboardSummary,
  ReportsSnapshot,
  GetLeadsParams,
  Metric,
  PipelineStage,
  RevenuePoint,
  SourcePerformance,
  OwnerPerformance,
} from './crm-types';

export type {
  Lead,
  LeadInput,
  LeadUpdate,
  Task,
  TaskInput,
  TaskUpdate,
  Activity,
  ActivityInput,
  Deal,
  DealInput,
  DealPayment,
  Company,
  DashboardSummary,
  ReportsSnapshot,
  GetLeadsParams,
  Metric,
  PipelineStage,
  RevenuePoint,
  SourcePerformance,
  OwnerPerformance,
};

export type UserRole = 'Super Admin' | 'Manager' | 'Sales User' | 'Viewer';

export interface TeamMemberRole {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface RolePermissions {
  canAccessSettings: boolean;
  canAccessReports: boolean;
  canManageDeals: boolean;
  canEditRecords: boolean;
  canViewAllTeamData: boolean;
}

export function getRolePermissions(role: UserRole): RolePermissions {
  switch (role) {
    case 'Super Admin':
      return {
        canAccessSettings: true,
        canAccessReports: true,
        canManageDeals: true,
        canEditRecords: true,
        canViewAllTeamData: true,
      };
    case 'Manager':
      return {
        canAccessSettings: false,
        canAccessReports: true,
        canManageDeals: true,
        canEditRecords: true,
        canViewAllTeamData: true,
      };
    case 'Sales User':
      return {
        canAccessSettings: false,
        canAccessReports: false,
        canManageDeals: true,
        canEditRecords: true,
        canViewAllTeamData: false, // Strict data privacy: only their own records!
      };
    case 'Viewer':
      return {
        canAccessSettings: false,
        canAccessReports: true,
        canManageDeals: false,
        canEditRecords: false, // Read only
        canViewAllTeamData: true,
      };
  }
}

export interface UserContext {
  email?: string;
  id?: string;
  name?: string;
  role?: UserRole;
}

const pipelineLabels = [
  'New',
  'Attempted',
  'Connected',
  'Interested',
  'Meeting Scheduled',
  'Proposal Sent',
  'Negotiation',
  'Won',
];

export function matchesUser(itemUserEmail: string | undefined, itemOwner: string | undefined, user?: UserContext): boolean {
  if (!user?.email) return true;
  if (user.role === 'Super Admin' || user.role === 'Manager' || user.role === 'Viewer') return true;

  const email = user.email.toLowerCase();
  const handle = email.split('@')[0];
  const name = (user.name || '').toLowerCase();

  if (itemUserEmail && itemUserEmail.toLowerCase() === email) return true;
  if (itemOwner) {
    const ownerLower = itemOwner.toLowerCase();
    if (ownerLower === email) return true;
    if (ownerLower.includes(handle)) return true;
    if (name && ownerLower.includes(name)) return true;
  }
  return false;
}

function mapLead(l: any): Lead & { userEmail?: string; createdBy?: string } {
  return {
    id: String(l.id),
    name: String(l.name || ''),
    company: String(l.company || ''),
    email: String(l.email || ''),
    phone: l.phone ?? undefined,
    stage: String(l.stage || 'New'),
    owner: String(l.owner || 'Unassigned'),
    value: Number(l.value) || 0,
    source: String(l.source || 'Direct'),
    priority: String(l.priority || 'medium'),
    nextAction: String(l.next_action ?? l.nextAction ?? ''),
    followUpDate: String(l.follow_up_date ?? l.followUpDate ?? 'Today'),
    updatedAt: String(l.updated_at ?? l.updatedAt ?? new Date().toISOString()),
    isStale: Boolean(l.is_stale ?? l.isStale ?? false),
    userEmail: l.user_email ? String(l.user_email) : undefined,
    createdBy: l.created_by ? String(l.created_by) : undefined,
  };
}

const TASK_EXTRA_MARK = '\n\u001e';

export type TaskExtras = {
  description?: string;
  reminder?: string;
};

export type TaskRecord = Task & TaskExtras & { userEmail?: string; createdBy?: string };

function encodeTaskTitle(title: string, extra?: TaskExtras) {
  const payload: TaskExtras = {};
  if (extra?.description?.trim()) payload.description = extra.description.trim();
  if (extra?.reminder?.trim()) payload.reminder = extra.reminder.trim();
  if (!payload.description && !payload.reminder) return title;
  return `${title}${TASK_EXTRA_MARK}${JSON.stringify(payload)}`;
}

function decodeTaskTitle(raw: string): { title: string } & TaskExtras {
  const idx = raw.indexOf(TASK_EXTRA_MARK);
  if (idx === -1) return { title: raw };
  try {
    const extra = JSON.parse(raw.slice(idx + TASK_EXTRA_MARK.length)) as TaskExtras;
    return { title: raw.slice(0, idx), ...extra };
  } catch {
    return { title: raw };
  }
}

function mapTask(t: any): TaskRecord {
  const decoded = decodeTaskTitle(String(t.title || ''));
  return {
    id: String(t.id),
    title: decoded.title,
    lead: String(t.lead || ''),
    dueDate: String(t.due_date ?? t.dueDate ?? 'Today'),
    assignee: String(t.assignee || 'Unassigned'),
    priority: String(t.priority || 'Medium'),
    status: String(t.status || 'Open'),
    description: String(t.description ?? decoded.description ?? ''),
    reminder: String(t.reminder ?? decoded.reminder ?? ''),
    userEmail: t.user_email ? String(t.user_email) : undefined,
    createdBy: t.created_by ? String(t.created_by) : undefined,
  };
}

function mapActivity(a: any): Activity & { userEmail?: string; createdBy?: string } {
  return {
    id: String(a.id),
    type: String(a.type || 'note'),
    title: String(a.title || ''),
    person: String(a.person || ''),
    detail: String(a.detail || ''),
    timestamp: String(a.timestamp || new Date().toISOString()),
    tone: String(a.tone || 'gold'),
    relatedType: a.related_type ?? a.relatedType ?? null,
    relatedTo: a.related_to ?? a.relatedTo ?? null,
    userEmail: a.user_email ? String(a.user_email) : undefined,
    createdBy: a.created_by ? String(a.created_by) : undefined,
  };
}

function mapDeal(d: any): Deal & { userEmail?: string; createdBy?: string } {
  return {
    id: String(d.id),
    name: String(d.name || ''),
    company: String(d.company || ''),
    value: Number(d.value) || 0,
    stage: String(d.stage || 'Proposal Sent'),
    owner: String(d.owner || 'Unassigned'),
    expectedClose: String(d.expected_close ?? d.expectedClose ?? new Date().toISOString().slice(0, 10)),
    paid: Number(d.paid) || 0,
    currency: String(d.currency || 'USD'),
    userEmail: d.user_email ? String(d.user_email) : undefined,
    createdBy: d.created_by ? String(d.created_by) : undefined,
  };
}

function mapCompany(c: any): Company & { userEmail?: string; createdBy?: string } {
  return {
    id: String(c.id),
    name: String(c.name || ''),
    industry: String(c.industry || 'General'),
    leads: Number(c.leads) || 0,
    openValue: Number(c.open_value ?? c.openValue) || 0,
    location: String(c.location || 'Remote'),
    health: String(c.health || 'Healthy'),
    userEmail: c.user_email ? String(c.user_email) : undefined,
    createdBy: c.created_by ? String(c.created_by) : undefined,
  };
}

// ---------------------------------------------------------------------------
// Team Role Management API
// ---------------------------------------------------------------------------
export async function fetchUserRole(email: string, userId?: string, userName?: string): Promise<UserRole> {
  const normalizedEmail = email.toLowerCase().trim();
  if (normalizedEmail === 'mi9491697@gmail.com') {
    return 'Super Admin';
  }

  try {
    const res = await insforge.database
      .from('user_roles')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (res.data?.role) {
      return res.data.role as UserRole;
    }

    // First user or new signup: auto-register with default role
    const newRole: UserRole = 'Sales User';
    await insforge.database.from('user_roles').insert([
      {
        id: userId || `role-${Date.now().toString(36)}`,
        email: normalizedEmail,
        name: userName || normalizedEmail.split('@')[0],
        role: newRole,
        status: 'Active',
      },
    ]);
    return newRole;
  } catch {
    return normalizedEmail === 'mi9491697@gmail.com' ? 'Super Admin' : 'Sales User';
  }
}

export async function fetchAllTeamRoles(): Promise<TeamMemberRole[]> {
  const res = await insforge.database
    .from('user_roles')
    .select('*')
    .order('created_at', { ascending: true });

  return (res.data ?? []).map((r: any) => ({
    id: String(r.id),
    email: String(r.email),
    name: String(r.name || r.email.split('@')[0]),
    role: (r.role as UserRole) || 'Sales User',
    status: String(r.status || 'Active'),
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function upsertTeamMemberRole(member: {
  email: string;
  name?: string;
  role: UserRole;
  status?: string;
}): Promise<TeamMemberRole> {
  const normalizedEmail = member.email.toLowerCase().trim();
  const existing = await insforge.database
    .from('user_roles')
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (existing.data) {
    const updateRes = await insforge.database
      .from('user_roles')
      .update({
        role: member.role,
        status: member.status || 'Active',
        name: member.name || existing.data.name,
        updated_at: new Date().toISOString(),
      })
      .eq('email', normalizedEmail)
      .select()
      .single();

    if (updateRes.error) throw new Error(updateRes.error.message);
    const r = updateRes.data;
    return {
      id: String(r.id),
      email: String(r.email),
      name: String(r.name || r.email.split('@')[0]),
      role: r.role as UserRole,
      status: String(r.status || 'Active'),
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  } else {
    const insertRes = await insforge.database
      .from('user_roles')
      .insert([
        {
          id: `role-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          email: normalizedEmail,
          name: member.name || normalizedEmail.split('@')[0],
          role: member.role,
          status: member.status || 'Active',
        },
      ])
      .select()
      .single();

    if (insertRes.error) throw new Error(insertRes.error.message);
    const r = insertRes.data;
    return {
      id: String(r.id),
      email: String(r.email),
      name: String(r.name || r.email.split('@')[0]),
      role: r.role as UserRole,
      status: String(r.status || 'Active'),
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }
}

export async function deleteTeamMemberRole(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  if (normalizedEmail === 'mi9491697@gmail.com') {
    throw new Error('The primary Super Admin cannot be removed.');
  }
  const res = await insforge.database.from('user_roles').delete().eq('email', normalizedEmail);
  if (res.error) throw new Error(res.error.message);
}

// ---------------------------------------------------------------------------
// Dashboard Query (Privacy-Filtered)
// ---------------------------------------------------------------------------
export async function fetchDirectDashboard(userContext?: UserContext): Promise<DashboardSummary> {
  const [leadsRes, tasksRes, activitiesRes, dealsRes] = await Promise.all([
    insforge.database.from('leads').select('*'),
    insforge.database.from('tasks').select('*'),
    insforge.database.from('activities').select('*'),
    insforge.database.from('deals').select('*'),
  ]);

  let rawLeads = (leadsRes.data ?? []).map(mapLead);
  let rawTasks = (tasksRes.data ?? []).map(mapTask);
  let rawActivities = (activitiesRes.data ?? []).map(mapActivity);
  let rawDeals = (dealsRes.data ?? []).map(mapDeal);

  // Apply User Privacy Filter for Sales Users
  if (userContext?.role === 'Sales User' && userContext.email) {
    rawLeads = rawLeads.filter((l) => matchesUser(l.userEmail, l.owner, userContext));
    rawTasks = rawTasks.filter((t) => matchesUser(t.userEmail, t.assignee, userContext));
    rawActivities = rawActivities.filter((a) => matchesUser(a.userEmail, a.person, userContext));
    rawDeals = rawDeals.filter((d) => matchesUser(d.userEmail, d.owner, userContext));
  }

  const leads = rawLeads;
  const tasks = rawTasks;
  const activities = rawActivities;
  const deals = rawDeals;

  const openValue = leads.reduce((sum, lead) => sum + lead.value, 0);
  const booked = deals.reduce((sum, deal) => sum + deal.value, 0);
  const collected = deals.reduce((sum, deal) => sum + deal.paid, 0);
  const contactedLeads = leads.filter((lead) => lead.stage !== 'New').length;
  const contactRate = leads.length ? (contactedLeads / leads.length) * 100 : 0;
  const overdueFollowUps = leads.filter(
    (lead) => new Date(lead.followUpDate).getTime() < Date.now() && lead.followUpDate !== 'Today' && lead.followUpDate !== 'Tomorrow'
  ).length;

  const wonDealsCount = deals.filter((d) => d.stage === 'Won').length;
  const dealWinRate = deals.length ? Math.round((wonDealsCount / deals.length) * 100) : 0;
  const collectionRate = booked > 0 ? Math.round((collected / booked) * 100) : 0;
  const highPriorityLeads = leads.filter((l) => (l.priority || '').toLowerCase() === 'high').length;

  const monthKeys = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      month: date.toLocaleString('en-US', { month: 'short' }),
    };
  });

  const revenueByMonth = monthKeys.map(({ key, month }) => {
    const dealsInMonth = deals.filter((deal) => {
      const closeDate = new Date(deal.expectedClose);
      if (Number.isNaN(closeDate.getTime())) return false;
      return `${closeDate.getFullYear()}-${closeDate.getMonth()}` === key;
    });
    return {
      month,
      booked: dealsInMonth.reduce((sum, deal) => sum + deal.value, 0),
      collected: dealsInMonth.reduce((sum, deal) => sum + deal.paid, 0),
    };
  });

  return {
    metrics: [
      {
        label: 'Active leads',
        value: String(leads.length),
        change: leads.length > 0 ? `${highPriorityLeads} high priority` : '0 active',
        trend: leads.length > 0 ? 'up' : 'flat',
        accent: 'gold',
      },
      {
        label: 'Contact rate',
        value: `${contactRate.toFixed(1)}%`,
        change: `${contactedLeads} of ${leads.length} engaged`,
        trend: contactRate >= 50 ? 'up' : contactRate > 0 ? 'flat' : 'down',
        accent: 'green',
      },
      {
        label: 'Pipeline value',
        value: openValue >= 1000 ? `$${Math.round(openValue / 1000)}k` : `$${openValue}`,
        change: `${leads.length} active opportunities`,
        trend: openValue > 0 ? 'up' : 'flat',
        accent: 'blue',
      },
      {
        label: 'Revenue booked',
        value: booked >= 1000 ? `$${Math.round(booked / 1000)}k` : `$${booked}`,
        change: `${deals.length} deals total (${dealWinRate}% won)`,
        trend: booked > 0 ? 'up' : 'flat',
        accent: 'purple',
      },
      {
        label: 'Cash collected',
        value: collected >= 1000 ? `$${Math.round(collected / 1000)}k` : `$${collected}`,
        change: booked > 0 ? `${collectionRate}% of booked collected` : '0 collected',
        trend: collected > 0 ? 'up' : 'flat',
        accent: 'green',
      },
      {
        label: 'Overdue follow-ups',
        value: String(overdueFollowUps),
        change: overdueFollowUps > 0 ? 'Requires attention' : 'All caught up',
        trend: overdueFollowUps > 0 ? 'down' : 'flat',
        accent: 'red',
      },
    ],
    pipeline: pipelineLabels.map((label) => {
      const matching = leads.filter((lead) => lead.stage === label);
      return {
        label,
        count: matching.length,
        value: matching.reduce((sum, lead) => sum + lead.value, 0),
      };
    }),
    revenue: revenueByMonth,
    recentActivities: activities.slice(0, 5),
    todayTasks: tasks.filter((task) => task.dueDate === 'Today' || task.dueDate === 'Tomorrow'),
  };
}

// ---------------------------------------------------------------------------
// Leads Queries & Mutations (Privacy-Filtered)
// ---------------------------------------------------------------------------
export async function fetchDirectLeads(query?: GetLeadsParams, userContext?: UserContext): Promise<Lead[]> {
  let builder = insforge.database.from('leads').select('*');
  if (query?.stage) builder = builder.eq('stage', query.stage);
  if (query?.owner) builder = builder.eq('owner', query.owner);

  const res = await builder;
  let list: Lead[] = (res.data ?? []).map(mapLead);

  if (userContext?.role === 'Sales User' && userContext.email) {
    list = list.filter((l: any) => matchesUser(l.userEmail, l.owner, userContext));
  }

  if (query?.search) {
    const q = query.search.toLowerCase();
    return list.filter((lead) =>
      [lead.name, lead.company, lead.email].some((v) => v.toLowerCase().includes(q))
    );
  }
  return list;
}

export async function createDirectLead(data: LeadInput, userContext?: UserContext): Promise<Lead> {
  const id = `lead-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const owner = data.owner || userContext?.name || userContext?.email?.split('@')[0] || 'Unassigned';
  const row = {
    id,
    name: data.name,
    company: data.company,
    email: data.email,
    phone: data.phone ?? '',
    stage: data.stage,
    owner,
    value: Number(data.value) || 0,
    source: data.source,
    priority: data.priority,
    next_action: data.nextAction,
    follow_up_date: data.followUpDate,
    updated_at: new Date().toISOString(),
    is_stale: false,
    user_email: userContext?.email || 'mi9491697@gmail.com',
    created_by: userContext?.id || '',
  };
  const res = await insforge.database.from('leads').insert([row]).select().single();
  if (res.error) throw new Error(res.error.message);
  return mapLead(res.data);
}

export async function updateDirectLead(id: string, data: LeadUpdate & Partial<LeadInput>): Promise<Lead> {
  const updateRow: Record<string, any> = { updated_at: new Date().toISOString() };
  if (data.name !== undefined) updateRow.name = data.name;
  if (data.company !== undefined) updateRow.company = data.company;
  if (data.email !== undefined) updateRow.email = data.email;
  if (data.phone !== undefined) updateRow.phone = data.phone;
  if (data.source !== undefined) updateRow.source = data.source;
  if (data.stage !== undefined) updateRow.stage = data.stage;
  if (data.owner !== undefined) updateRow.owner = data.owner;
  if (data.value !== undefined) updateRow.value = Number(data.value) || 0;
  if (data.priority !== undefined) updateRow.priority = data.priority;
  if (data.nextAction !== undefined) updateRow.next_action = data.nextAction;
  if (data.followUpDate !== undefined) updateRow.follow_up_date = data.followUpDate;

  const res = await insforge.database.from('leads').update(updateRow).eq('id', id).select().single();
  if (res.error) throw new Error(res.error.message);
  return mapLead(res.data);
}

// ---------------------------------------------------------------------------
// Tasks Queries & Mutations (Privacy-Filtered)
// ---------------------------------------------------------------------------
export async function fetchDirectTasks(userContext?: UserContext): Promise<Task[]> {
  const res = await insforge.database.from('tasks').select('*');
  let list = (res.data ?? []).map(mapTask);
  if (userContext?.role === 'Sales User' && userContext.email) {
    list = list.filter((t) => matchesUser(t.userEmail, t.assignee, userContext));
  }
  return list;
}

export type TaskWrite = TaskInput & TaskExtras & { status?: string };

export async function createDirectTask(data: TaskWrite, userContext?: UserContext): Promise<Task> {
  const id = `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const assignee = data.assignee || userContext?.name || userContext?.email?.split('@')[0] || 'Unassigned';
  const row = {
    id,
    title: encodeTaskTitle(data.title, { description: data.description, reminder: data.reminder }),
    lead: data.lead,
    due_date: data.dueDate,
    assignee,
    priority: data.priority,
    status: data.status || 'Open',
    user_email: userContext?.email || 'mi9491697@gmail.com',
    created_by: userContext?.id || '',
  };
  const res = await insforge.database.from('tasks').insert([row]).select().single();
  if (res.error) throw new Error(res.error.message);
  return mapTask(res.data);
}

export async function updateDirectTask(id: string, data: TaskUpdate & TaskExtras): Promise<Task> {
  const updateRow: Record<string, any> = {};
  if (data.status !== undefined) updateRow.status = data.status;
  if (data.lead !== undefined) updateRow.lead = data.lead;
  if (data.dueDate !== undefined) updateRow.due_date = data.dueDate;
  if (data.assignee !== undefined) updateRow.assignee = data.assignee;
  if (data.priority !== undefined) updateRow.priority = data.priority;
  if (data.title !== undefined || data.description !== undefined || data.reminder !== undefined) {
    let currentTitle = data.title;
    let currentDescription = data.description;
    let currentReminder = data.reminder;
    if (currentTitle === undefined || currentDescription === undefined || currentReminder === undefined) {
      const existing = await insforge.database.from('tasks').select('title').eq('id', id).single();
      const decoded = decodeTaskTitle(String(existing.data?.title || ''));
      currentTitle = currentTitle ?? decoded.title;
      currentDescription = currentDescription ?? decoded.description ?? '';
      currentReminder = currentReminder ?? decoded.reminder ?? '';
    }
    updateRow.title = encodeTaskTitle(currentTitle || '', {
      description: currentDescription,
      reminder: currentReminder,
    });
  }

  const res = await insforge.database.from('tasks').update(updateRow).eq('id', id).select().single();
  if (res.error) throw new Error(res.error.message);
  return mapTask(res.data);
}

export async function deleteDirectTask(id: string): Promise<void> {
  const res = await insforge.database.from('tasks').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

// ---------------------------------------------------------------------------
// Activities Queries & Mutations (Privacy-Filtered)
// ---------------------------------------------------------------------------
export async function fetchDirectActivities(userContext?: UserContext): Promise<Activity[]> {
  const res = await insforge.database.from('activities').select('*');
  let list = (res.data ?? []).map(mapActivity);
  if (userContext?.role === 'Sales User' && userContext.email) {
    list = list.filter((a) => matchesUser(a.userEmail, a.person, userContext));
  }
  return list;
}

export type ActivityWrite = ActivityInput & { timestamp?: string; tone?: string };

export async function createDirectActivity(data: ActivityWrite, userContext?: UserContext): Promise<Activity> {
  const id = `act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const row = {
    id,
    type: data.type,
    title: data.title,
    person: data.person || userContext?.name || userContext?.email?.split('@')[0] || 'Team Rep',
    detail: data.detail,
    timestamp: data.timestamp || new Date().toISOString(),
    tone: data.tone || activityTone(data.type),
    related_type: data.relatedType ?? null,
    related_to: data.relatedTo ?? null,
    user_email: userContext?.email || 'mi9491697@gmail.com',
    created_by: userContext?.id || '',
  };
  const res = await insforge.database.from('activities').insert([row]).select().single();
  if (res.error) throw new Error(res.error.message);
  return mapActivity(res.data);
}

function activityTone(type: string) {
  const value = type.toLowerCase();
  if (value === 'meeting') return 'green';
  if (value === 'email') return 'blue';
  if (value === 'whatsapp') return 'green';
  if (value === 'call') return 'gold';
  if (value === 'note') return 'amber';
  return 'gold';
}

export async function updateDirectActivity(id: string, data: Partial<ActivityWrite>): Promise<Activity> {
  const updateRow: Record<string, any> = {};
  if (data.type !== undefined) {
    updateRow.type = data.type;
    updateRow.tone = data.tone || activityTone(data.type);
  }
  if (data.title !== undefined) updateRow.title = data.title;
  if (data.person !== undefined) updateRow.person = data.person;
  if (data.detail !== undefined) updateRow.detail = data.detail;
  if (data.timestamp !== undefined) updateRow.timestamp = data.timestamp;
  if (data.relatedType !== undefined) updateRow.related_type = data.relatedType ?? null;
  if (data.relatedTo !== undefined) updateRow.related_to = data.relatedTo ?? null;
  const res = await insforge.database.from('activities').update(updateRow).eq('id', id).select().single();
  if (res.error) throw new Error(res.error.message);
  return mapActivity(res.data);
}

export async function deleteDirectActivity(id: string): Promise<void> {
  const res = await insforge.database.from('activities').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

// ---------------------------------------------------------------------------
// Companies Queries (Privacy-Filtered)
// ---------------------------------------------------------------------------
export async function fetchDirectCompanies(userContext?: UserContext): Promise<Company[]> {
  const [companiesRes, leadsRes] = await Promise.all([
    insforge.database.from('companies').select('*'),
    fetchDirectLeads(undefined, userContext),
  ]);
  let list = (companiesRes.data ?? []).map(mapCompany);
  if (userContext?.role === 'Sales User' && userContext.email) {
    list = list.filter((c) => matchesUser(c.userEmail, undefined, userContext));
  }

  // Dynamically compute real lead count and open value from live database leads
  return list.map((company) => {
    const matchingLeads = leadsRes.filter(
      (l) => l.company && l.company.toLowerCase() === company.name.toLowerCase()
    );
    const dynamicLeadsCount = matchingLeads.length;
    const dynamicOpenValue = matchingLeads.reduce((sum, l) => sum + (l.value || 0), 0);
    return {
      ...company,
      leads: dynamicLeadsCount > 0 ? dynamicLeadsCount : company.leads,
      openValue: dynamicOpenValue > 0 ? dynamicOpenValue : company.openValue,
    };
  });
}

export async function createDirectCompany(data: { name: string; industry: string; location: string; health?: string }, userContext?: UserContext): Promise<Company> {
  const id = `comp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const row = {
    id,
    name: data.name,
    industry: data.industry || 'Technology',
    location: data.location || 'Remote',
    leads: 0,
    open_value: 0,
    health: data.health || 'Healthy',
    user_email: userContext?.email || 'mi9491697@gmail.com',
    created_by: userContext?.id || '',
  };
  const res = await insforge.database.from('companies').insert([row]).select().single();
  if (res.error) throw new Error(res.error.message);
  return mapCompany(res.data);
}

// ---------------------------------------------------------------------------
// Deals Queries & Mutations (Privacy-Filtered)
// ---------------------------------------------------------------------------
export async function fetchDirectDeals(userContext?: UserContext): Promise<Deal[]> {
  const res = await insforge.database.from('deals').select('*');
  let list = (res.data ?? []).map(mapDeal);
  if (userContext?.role === 'Sales User' && userContext.email) {
    list = list.filter((d) => matchesUser(d.userEmail, d.owner, userContext));
  }
  return list;
}

export async function createDirectDeal(data: DealInput, userContext?: UserContext): Promise<Deal> {
  const id = `deal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const owner = data.owner || userContext?.name || userContext?.email?.split('@')[0] || 'Unassigned';
  const row = {
    id,
    name: data.name,
    company: data.company,
    value: Number(data.value) || 0,
    stage: data.stage,
    owner,
    expected_close: data.expectedClose,
    paid: 0,
    currency: data.currency || 'USD',
    user_email: userContext?.email || 'mi9491697@gmail.com',
    created_by: userContext?.id || '',
  };
  const res = await insforge.database.from('deals').insert([row]).select().single();
  if (res.error) throw new Error(res.error.message);
  return mapDeal(res.data);
}

export async function recordDirectDealPayment(id: string, payment: DealPayment): Promise<Deal> {
  const currentRes = await insforge.database.from('deals').select('paid').eq('id', id).single();
  const currentPaid = Number(currentRes.data?.paid) || 0;
  const newPaid = currentPaid + Number(payment.amount);
  const res = await insforge.database.from('deals').update({ paid: newPaid }).eq('id', id).select().single();
  if (res.error) throw new Error(res.error.message);
  return mapDeal(res.data);
}

// ---------------------------------------------------------------------------
// Reports Query (Privacy-Filtered)
// ---------------------------------------------------------------------------
export async function fetchDirectReports(userContext?: UserContext): Promise<ReportsSnapshot> {
  const [leads, deals, activities] = await Promise.all([
    fetchDirectLeads(undefined, userContext),
    fetchDirectDeals(userContext),
    fetchDirectActivities(userContext),
  ]);

  const sourceNames = Array.from(new Set(leads.map((l) => l.source)));
  const sources = sourceNames.map((source) => {
    const matching = leads.filter((l) => l.source === source);
    const won = matching.filter((l) => l.stage === 'Won').length;
    return {
      source,
      leads: matching.length,
      won,
      conversion: matching.length ? Number(((won / matching.length) * 100).toFixed(1)) : 0,
    };
  });

  const ownerNames = Array.from(new Set(leads.map((l) => l.owner)));
  const owners = ownerNames.map((owner) => {
    const ownedLeads = leads.filter((l) => l.owner === owner);
    const wonValue = deals.filter((d) => d.owner === owner).reduce((sum, d) => sum + d.value, 0);
    const ownerActivities = activities.filter((a) => a.person.startsWith(owner)).length;
    return {
      owner,
      leads: ownedLeads.length,
      wonValue,
      activities: ownerActivities,
    };
  });

  const funnel = pipelineLabels.map((label) => {
    const matching = leads.filter((lead) => lead.stage === label);
    return {
      label,
      count: matching.length,
      value: matching.reduce((sum, lead) => sum + lead.value, 0),
    };
  });

  return { funnel, sources, owners };
}

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------
export const getGetDashboardQueryKey = () => ['insforge-crm', 'dashboard'] as const;
export const getGetLeadsQueryKey = (params?: GetLeadsParams) => ['insforge-crm', 'leads', params] as const;
export const getGetTasksQueryKey = () => ['insforge-crm', 'tasks'] as const;
export const getGetActivitiesQueryKey = () => ['insforge-crm', 'activities'] as const;
export const getGetCompaniesQueryKey = () => ['insforge-crm', 'companies'] as const;
export const getGetDealsQueryKey = () => ['insforge-crm', 'deals'] as const;
export const getGetReportsQueryKey = () => ['insforge-crm', 'reports'] as const;
export const getGetTeamRolesQueryKey = () => ['insforge-crm', 'team-roles'] as const;

// ---------------------------------------------------------------------------
// React Query Hooks
// ---------------------------------------------------------------------------
export function useGetDashboard(userContext?: UserContext) {
  return useQuery({
    queryKey: [...getGetDashboardQueryKey(), userContext?.email, userContext?.role],
    queryFn: () => fetchDirectDashboard(userContext),
  });
}

export function useGetLeads(params?: GetLeadsParams, userContext?: UserContext) {
  return useQuery({
    queryKey: [...getGetLeadsQueryKey(params), userContext?.email, userContext?.role],
    queryFn: () => fetchDirectLeads(params, userContext),
  });
}

export function useCreateLead(userContext?: UserContext) {
  return useMutation({
    mutationFn: ({ data }: { data: LeadInput }) => createDirectLead(data, userContext),
  });
}

export function useUpdateLead() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LeadUpdate & Partial<LeadInput> }) => updateDirectLead(id, data),
  });
}

export function useGetTasks(userContext?: UserContext) {
  return useQuery({
    queryKey: [...getGetTasksQueryKey(), userContext?.email, userContext?.role],
    queryFn: () => fetchDirectTasks(userContext),
  });
}

export function useCreateTask(userContext?: UserContext) {
  return useMutation({
    mutationFn: ({ data }: { data: TaskWrite }) => createDirectTask(data, userContext),
  });
}

export function useUpdateTask() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TaskUpdate & TaskExtras }) => updateDirectTask(id, data),
  });
}

export function useDeleteTask() {
  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteDirectTask(id),
  });
}

export function useGetActivities(userContext?: UserContext) {
  return useQuery({
    queryKey: [...getGetActivitiesQueryKey(), userContext?.email, userContext?.role],
    queryFn: () => fetchDirectActivities(userContext),
  });
}

export function useCreateActivity(userContext?: UserContext) {
  return useMutation({
    mutationFn: ({ data }: { data: ActivityWrite }) => createDirectActivity(data, userContext),
  });
}

export function useUpdateActivity() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ActivityWrite> }) => updateDirectActivity(id, data),
  });
}

export function useDeleteActivity() {
  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteDirectActivity(id),
  });
}

export function useGetCompanies(userContext?: UserContext) {
  return useQuery({
    queryKey: [...getGetCompaniesQueryKey(), userContext?.email, userContext?.role],
    queryFn: () => fetchDirectCompanies(userContext),
  });
}

export function useCreateCompany(userContext?: UserContext) {
  return useMutation({
    mutationFn: ({ data }: { data: { name: string; industry: string; location: string; health?: string } }) =>
      createDirectCompany(data, userContext),
  });
}

export function useGetDeals(userContext?: UserContext) {
  return useQuery({
    queryKey: [...getGetDealsQueryKey(), userContext?.email, userContext?.role],
    queryFn: () => fetchDirectDeals(userContext),
  });
}

export function useCreateDeal(userContext?: UserContext) {
  return useMutation({
    mutationFn: ({ data }: { data: DealInput }) => createDirectDeal(data, userContext),
  });
}

export function useRecordDealPayment() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DealPayment }) => recordDirectDealPayment(id, data),
  });
}

export function useGetReports(userContext?: UserContext) {
  return useQuery({
    queryKey: [...getGetReportsQueryKey(), userContext?.email, userContext?.role],
    queryFn: () => fetchDirectReports(userContext),
  });
}

export function useGetTeamRoles() {
  return useQuery({
    queryKey: getGetTeamRolesQueryKey(),
    queryFn: fetchAllTeamRoles,
  });
}

export function useUpdateTeamRole() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (member: { email: string; name?: string; role: UserRole; status?: string }) =>
      upsertTeamMemberRole(member),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: getGetTeamRolesQueryKey() });
    },
  });
}

export function useDeleteTeamMember() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => deleteTeamMemberRole(email),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: getGetTeamRolesQueryKey() });
    },
  });
}
