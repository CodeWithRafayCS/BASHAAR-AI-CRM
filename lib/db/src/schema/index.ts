import { pgTable, text, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const leadsTable = pgTable("leads", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  company: text("company").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().default(""),
  stage: text("stage").notNull(),
  owner: text("owner").notNull(),
  value: integer("value").notNull().default(0),
  source: text("source").notNull(),
  priority: text("priority").notNull(),
  nextAction: text("next_action").notNull(),
  followUpDate: text("follow_up_date").notNull(),
  updatedAt: text("updated_at").notNull(),
  isStale: boolean("is_stale").notNull().default(false),
});

export const insertLeadSchema = createInsertSchema(leadsTable);
export const selectLeadSchema = createSelectSchema(leadsTable);
export type Lead = typeof leadsTable.$inferSelect;
export type InsertLead = typeof leadsTable.$inferInsert;

export const tasksTable = pgTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  lead: text("lead").notNull(),
  dueDate: text("due_date").notNull(),
  assignee: text("assignee").notNull(),
  priority: text("priority").notNull(),
  status: text("status").notNull(),
});

export const insertTaskSchema = createInsertSchema(tasksTable);
export const selectTaskSchema = createSelectSchema(tasksTable);
export type Task = typeof tasksTable.$inferSelect;
export type InsertTask = typeof tasksTable.$inferInsert;

export const activitiesTable = pgTable("activities", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  person: text("person").notNull(),
  detail: text("detail").notNull(),
  timestamp: text("timestamp").notNull(),
  tone: text("tone").notNull(),
  relatedType: text("related_type"),
  relatedTo: text("related_to"),
});

export const insertActivitySchema = createInsertSchema(activitiesTable);
export const selectActivitySchema = createSelectSchema(activitiesTable);
export type Activity = typeof activitiesTable.$inferSelect;
export type InsertActivity = typeof activitiesTable.$inferInsert;

export const dealsTable = pgTable("deals", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  company: text("company").notNull(),
  value: integer("value").notNull().default(0),
  stage: text("stage").notNull(),
  owner: text("owner").notNull(),
  expectedClose: text("expected_close").notNull(),
  paid: integer("paid").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
});

export const insertDealSchema = createInsertSchema(dealsTable);
export const selectDealSchema = createSelectSchema(dealsTable);
export type Deal = typeof dealsTable.$inferSelect;
export type InsertDeal = typeof dealsTable.$inferInsert;

export const companiesTable = pgTable("companies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry").notNull(),
  leads: integer("leads").notNull().default(0),
  openValue: integer("open_value").notNull().default(0),
  location: text("location").notNull(),
  health: text("health").notNull(),
});

export const insertCompanySchema = createInsertSchema(companiesTable);
export const selectCompanySchema = createSelectSchema(companiesTable);
export type Company = typeof companiesTable.$inferSelect;
export type InsertCompany = typeof companiesTable.$inferInsert;