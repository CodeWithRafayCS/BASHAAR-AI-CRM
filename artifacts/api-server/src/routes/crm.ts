import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  leadsTable,
  tasksTable,
  activitiesTable,
  dealsTable,
  companiesTable,
} from "@workspace/db";
import {
  CreateActivityBody,
  CreateTaskBody,
  CreateLeadBody,
  CreateDealBody,
  GetLeadsQueryParams,
  RecordDealPaymentBody,
  RecordDealPaymentParams,
  UpdateLeadBody,
  UpdateLeadParams,
  UpdateTaskBody,
  UpdateTaskParams,
} from "@workspace/api-zod";

type Lead = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  stage: string;
  owner: string;
  value: number;
  source: string;
  priority: string;
  nextAction: string;
  followUpDate: string;
  updatedAt: string;
  isStale?: boolean;
};

type Task = {
  id: string;
  title: string;
  lead: string;
  dueDate: string;
  assignee: string;
  priority: string;
  status: string;
};

type Activity = {
  id: string;
  type: string;
  title: string;
  person: string;
  detail: string;
  timestamp: string;
  tone: string;
  relatedType: string | null;
  relatedTo: string | null;
};

type Deal = {
  id: string;
  name: string;
  company: string;
  value: number;
  stage: string;
  owner: string;
  expectedClose: string;
  paid: number;
  currency: string;
};

const isoNow = () => new Date().toISOString();

const leads: Lead[] = [];
const tasks: Task[] = [];
const activities: Activity[] = [];
const deals: Deal[] = [];
const companies: { id: string; name: string; industry: string; leads: number; openValue: number; location: string; health: string }[] = [];

async function syncWithPostgres() {
  try {
    const [dbCompanies, dbLeads, dbTasks, dbActivities, dbDeals] = await Promise.all([
      db.select().from(companiesTable),
      db.select().from(leadsTable),
      db.select().from(tasksTable),
      db.select().from(activitiesTable),
      db.select().from(dealsTable),
    ]);
    if (dbCompanies.length) companies.splice(0, companies.length, ...dbCompanies);
    if (dbLeads.length) {
      leads.splice(0, leads.length, ...dbLeads.map((l: Lead) => ({
        ...l,
        isStale: l.isStale ?? false,
      })));
    }
    if (dbTasks.length) tasks.splice(0, tasks.length, ...dbTasks);
    if (dbActivities.length) activities.splice(0, activities.length, ...dbActivities);
    if (dbDeals.length) deals.splice(0, deals.length, ...dbDeals);
  } catch (err) {
    console.warn("Could not sync with Postgres initially:", err);
  }
}
syncWithPostgres();

const pipelineLabels = ["New", "Attempted", "Connected", "Interested", "Meeting Scheduled", "Proposal Sent", "Negotiation", "Won"];

function dashboard() {
  const openValue = leads.reduce((sum, lead) => sum + lead.value, 0);
  const booked = deals.reduce((sum, deal) => sum + deal.value, 0);
  const collected = deals.reduce((sum, deal) => sum + deal.paid, 0);
  const contactedLeads = leads.filter((lead) => lead.stage !== "New").length;
  const contactRate = leads.length ? (contactedLeads / leads.length) * 100 : 0;
  const overdueFollowUps = leads.filter((lead) => new Date(lead.followUpDate) < new Date()).length;
  const monthKeys = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    return { key: `${date.getFullYear()}-${date.getMonth()}`, month: date.toLocaleString("en-US", { month: "short" }) };
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
      { label: "New leads", value: String(leads.length), change: "—", trend: "flat", accent: "gold" },
      { label: "Contact rate", value: `${contactRate.toFixed(1)}%`, change: "—", trend: "flat", accent: "green" },
      { label: "Pipeline value", value: `$${Math.round(openValue / 1000)}k`, change: "—", trend: "flat", accent: "blue" },
      { label: "Revenue booked", value: `$${Math.round(booked / 1000)}k`, change: "—", trend: "flat", accent: "purple" },
      { label: "Cash collected", value: `$${Math.round(collected / 1000)}k`, change: "—", trend: "flat", accent: "green" },
      { label: "Overdue follow-ups", value: String(overdueFollowUps), change: "—", trend: "flat", accent: "red" },
    ],
    pipeline: pipelineLabels.map((label) => {
      const matching = leads.filter((lead) => lead.stage === label);
      return { label, count: matching.length, value: matching.reduce((sum, lead) => sum + lead.value, 0) };
    }),
    revenue: revenueByMonth,
    recentActivities: activities.slice(0, 4),
    todayTasks: tasks.filter((task) => task.dueDate === "Today"),
  };
}

const router: IRouter = Router();

router.get("/dashboard", (_req, res) => res.json(dashboard()));
router.get("/reports", (_req, res) => {
  const sourceNames = Array.from(new Set(leads.map((lead) => lead.source)));
  const sources = sourceNames.map((source) => {
    const matching = leads.filter((lead) => lead.source === source);
    const won = matching.filter((lead) => lead.stage === "Won").length;
    return { source, leads: matching.length, won, conversion: matching.length ? Number(((won / matching.length) * 100).toFixed(1)) : 0 };
  });
  const ownerNames = Array.from(new Set(leads.map((lead) => lead.owner)));
  const owners = ownerNames.map((owner) => {
    const ownedLeads = leads.filter((lead) => lead.owner === owner);
    const wonValue = deals.filter((deal) => deal.owner === owner).reduce((sum, deal) => sum + deal.value, 0);
    const ownerActivities = activities.filter((activity) => activity.person.startsWith(owner)).length;
    return { owner, leads: ownedLeads.length, wonValue, activities: ownerActivities };
  });
  return res.json({ funnel: dashboard().pipeline, sources, owners });
});

router.get("/leads", (req: Request, res: Response) => {
  const parsed = GetLeadsQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid lead filters" });
  const { search, stage, owner } = parsed.data;
  const query = search?.toLowerCase();
  return res.json(leads.filter((lead) => {
    const matchesSearch = !query || [lead.name, lead.company, lead.email].some((value) => value.toLowerCase().includes(query));
    return matchesSearch && (!stage || lead.stage === stage) && (!owner || lead.owner === owner);
  }));
});

router.post("/leads", (req: Request, res: Response) => {
  const parsed = CreateLeadBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please complete every required lead field" });
  const duplicate = leads.find((lead) => lead.email.toLowerCase() === parsed.data.email.toLowerCase());
  if (duplicate) return res.status(409).json({ error: `A lead already exists for ${duplicate.email}` });
  const lead: Lead = { ...parsed.data, id: `lead-${Date.now()}`, phone: parsed.data.phone ?? "", updatedAt: isoNow() };
  leads.unshift(lead);
  const leadTask: Task = { id: `task-${Date.now()}`, title: `First contact with ${lead.name}`, lead: lead.name, dueDate: lead.followUpDate, assignee: lead.owner, priority: lead.priority, status: "Open" };
  tasks.unshift(leadTask);
  const leadActivity: Activity = { id: `activity-${Date.now()}`, type: "Lead", title: "New lead created", person: `${lead.name} · ${lead.company}`, detail: `Assigned to ${lead.owner}. First contact task created.`, timestamp: "Just now", tone: "gold", relatedType: "lead", relatedTo: lead.id };
  activities.unshift(leadActivity);
  db.insert(leadsTable).values(lead).catch(() => {});
  db.insert(tasksTable).values(leadTask).catch(() => {});
  db.insert(activitiesTable).values(leadActivity).catch(() => {});
  return res.status(201).json(lead);
});

router.patch("/leads/:id", (req: Request, res: Response) => {
  const params = UpdateLeadParams.safeParse(req.params);
  const body = UpdateLeadBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid lead update" });
  const lead = leads.find((item) => item.id === params.data.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  Object.assign(lead, body.data, { updatedAt: isoNow() });
  db.update(leadsTable).set({ ...body.data, updatedAt: lead.updatedAt }).where(eq(leadsTable.id, lead.id)).catch(() => {});
  return res.json(lead);
});

router.get("/companies", (_req, res) => res.json(companies));
router.get("/tasks", (_req, res) => res.json(tasks));
router.post("/tasks", (req: Request, res: Response) => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please complete the task details" });
  const task: Task = { ...parsed.data, id: `task-${Date.now()}`, status: "Open" };
  tasks.unshift(task);
  db.insert(tasksTable).values(task).catch(() => {});
  return res.status(201).json(task);
});
router.patch("/tasks/:id", (req: Request, res: Response) => {
  const params = UpdateTaskParams.safeParse(req.params);
  const body = UpdateTaskBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid task update" });
  const task = tasks.find((item) => item.id === params.data.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  Object.assign(task, body.data);
  db.update(tasksTable).set(body.data).where(eq(tasksTable.id, task.id)).catch(() => {});
  return res.json(task);
});
router.delete("/tasks/:id", (req: Request, res: Response) => {
  const taskId = String(req.params.id);
  const index = tasks.findIndex((item) => item.id === taskId);
  if (index === -1) return res.status(404).json({ error: "Task not found" });
  tasks.splice(index, 1);
  db.delete(tasksTable).where(eq(tasksTable.id, taskId)).catch(() => {});
  return res.json({ success: true });
});
router.get("/activities", (_req, res) => res.json(activities));
router.post("/activities", (req: Request, res: Response) => {
  const parsed = CreateActivityBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please complete the activity details" });
  const activity: Activity = { ...parsed.data, id: `activity-${Date.now()}`, timestamp: "Just now", tone: "gold", relatedType: parsed.data.relatedType ?? null, relatedTo: parsed.data.relatedTo ?? null };
  activities.unshift(activity);
  db.insert(activitiesTable).values(activity).catch(() => {});
  return res.status(201).json(activity);
});
router.get("/deals", (_req, res) => res.json(deals));
router.post("/deals", (req: Request, res: Response) => {
  const parsed = CreateDealBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please complete every required deal field" });
  const deal: Deal = { ...parsed.data, id: `deal-${Date.now()}`, paid: 0 };
  deals.unshift(deal);
  const dealAct: Activity = { id: `activity-${Date.now()}`, type: "Deal", title: "New deal created", person: `${deal.name} · ${deal.company}`, detail: `${deal.currency} ${deal.value.toLocaleString()} pipeline value`, timestamp: "Just now", tone: "green", relatedType: "deal", relatedTo: deal.id };
  activities.unshift(dealAct);
  db.insert(dealsTable).values(deal).catch(() => {});
  db.insert(activitiesTable).values(dealAct).catch(() => {});
  return res.status(201).json(deal);
});
router.patch("/deals/:id/payment", (req: Request, res: Response) => {
  const params = RecordDealPaymentParams.safeParse(req.params);
  const body = RecordDealPaymentBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Enter a valid payment amount" });
  const deal = deals.find((item) => item.id === params.data.id);
  if (!deal) return res.status(404).json({ error: "Deal not found" });
  deal.paid = Math.min(deal.value, deal.paid + body.data.amount);
  const payAct: Activity = { id: `activity-${Date.now()}`, type: "Deal", title: "Payment recorded", person: `${deal.name} · ${deal.company}`, detail: `${deal.currency} ${body.data.amount.toLocaleString()} received · ${deal.currency} ${deal.paid.toLocaleString()} of ${deal.value.toLocaleString()} collected`, timestamp: "Just now", tone: "green", relatedType: "deal", relatedTo: deal.id };
  activities.unshift(payAct);
  db.update(dealsTable).set({ paid: deal.paid }).where(eq(dealsTable.id, deal.id)).catch(() => {});
  db.insert(activitiesTable).values(payAct).catch(() => {});
  return res.json(deal);
});

export default router;