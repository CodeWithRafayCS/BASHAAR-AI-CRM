export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  stage: string;
  owner: string;
  value: number;
  source: string;
  priority: string;
  nextAction: string;
  followUpDate: string;
  updatedAt: string;
  isStale?: boolean;
}

export interface LeadInput {
  name: string;
  company: string;
  email: string;
  phone?: string;
  stage: string;
  owner: string;
  value: number;
  source: string;
  priority: string;
  nextAction: string;
  followUpDate: string;
}

export interface LeadUpdate {
  stage?: string;
  owner?: string;
  value?: number;
  priority?: string;
  nextAction?: string;
  followUpDate?: string;
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  leads: number;
  openValue: number;
  location: string;
  health: string;
}

export interface Task {
  id: string;
  title: string;
  lead: string;
  dueDate: string;
  assignee: string;
  priority: string;
  status: string;
}

export interface TaskInput {
  title: string;
  lead: string;
  dueDate: string;
  assignee: string;
  priority: string;
}

export interface TaskUpdate {
  status?: string;
  title?: string;
  lead?: string;
  dueDate?: string;
  assignee?: string;
  priority?: string;
}

export interface Activity {
  id: string;
  type: string;
  title: string;
  person: string;
  detail: string;
  timestamp: string;
  tone: string;
  relatedType?: string | null;
  relatedTo?: string | null;
}

export interface ActivityInput {
  type: string;
  title: string;
  person: string;
  detail: string;
  relatedType?: string;
  relatedTo?: string;
}

export interface Deal {
  id: string;
  name: string;
  company: string;
  value: number;
  stage: string;
  owner: string;
  expectedClose: string;
  paid: number;
  currency: string;
}

export interface DealInput {
  name: string;
  company: string;
  value: number;
  stage: string;
  owner: string;
  expectedClose: string;
  currency: string;
}

export interface DealPayment {
  amount: number;
}

export interface Metric {
  label: string;
  value: string;
  change: string;
  trend: string;
  accent: string;
}

export interface PipelineStage {
  label: string;
  count: number;
  value: number;
}

export interface RevenuePoint {
  month: string;
  booked: number;
  collected: number;
}

export interface DashboardSummary {
  metrics: Metric[];
  pipeline: PipelineStage[];
  revenue: RevenuePoint[];
  recentActivities: Activity[];
  todayTasks: Task[];
}

export interface SourcePerformance {
  source: string;
  leads: number;
  won: number;
  conversion: number;
}

export interface OwnerPerformance {
  owner: string;
  leads: number;
  wonValue: number;
  activities: number;
}

export interface ReportsSnapshot {
  funnel: PipelineStage[];
  sources: SourcePerformance[];
  owners: OwnerPerformance[];
}

export interface DeleteResponse {
  success: boolean;
}

export type GetLeadsParams = {
  search?: string;
  stage?: string;
  owner?: string;
};
