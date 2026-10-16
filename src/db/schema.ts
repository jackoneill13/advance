import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import type { SpecPack, RiderParse, FitCheck, ItemCategory, RequirementLevel, ItemState, Decision, Schedule } from "@/lib/schemas";

const now = sql`(current_timestamp)`;

export const venues = sqliteTable("venues", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city"),
  capacity: integer("capacity").notNull().default(300),
  specPack: text("spec_pack", { mode: "json" }).$type<SpecPack>().notNull(),
  createdAt: text("created_at").notNull().default(now),
});

export const artists = sqliteTable("artists", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  agency: text("agency"),
  createdAt: text("created_at").notNull().default(now),
});

export const riders = sqliteTable("riders", {
  id: text("id").primaryKey(),
  artistId: text("artist_id").notNull().references(() => artists.id),
  filenames: text("filenames", { mode: "json" }).$type<string[]>().notNull(),
  storagePaths: text("storage_paths", { mode: "json" }).$type<string[]>().notNull(),
  parsed: text("parsed", { mode: "json" }).$type<RiderParse>(),
  parsedAt: text("parsed_at"),
  parseModel: text("parse_model"),
  createdAt: text("created_at").notNull().default(now),
});

export const advances = sqliteTable("advances", {
  id: text("id").primaryKey(),
  venueId: text("venue_id").notNull().references(() => venues.id),
  artistId: text("artist_id").notNull().references(() => artists.id),
  riderId: text("rider_id").references(() => riders.id),
  title: text("title").notNull(),
  showDate: text("show_date"),
  doorsTime: text("doors_time"),
  status: text("status").$type<"open" | "ready" | "published">().notNull().default("open"),
  shareToken: text("share_token").notNull(),
  fit: text("fit", { mode: "json" }).$type<FitCheck>(),
  scopeMessage: text("scope_message"),
  matchModel: text("match_model"),
  schedule: text("schedule", { mode: "json" }).$type<Schedule>(),
  scheduleConfirmedAt: text("schedule_confirmed_at"),
  dosNotes: text("dos_notes"),
  createdAt: text("created_at").notNull().default(now),
});

export const venueStaff = sqliteTable("venue_staff", {
  id: text("id").primaryKey(),
  advanceId: text("advance_id").notNull().references(() => advances.id),
  name: text("name").notNull(),
  role: text("role").notNull(),
  phone: text("phone"),
  callTime: text("call_time"),
  createdAt: text("created_at").notNull().default(now),
});

export const lineItems = sqliteTable("line_items", {
  id: text("id").primaryKey(),
  advanceId: text("advance_id").notNull().references(() => advances.id),
  idx: integer("idx").notNull(),
  category: text("category").$type<ItemCategory>().notNull(),
  text: text("text").notNull(),
  quantity: text("quantity"),
  spec: text("spec"),
  requirement: text("requirement").$type<RequirementLevel>().notNull(),
  page: integer("page"),
  confidence: text("confidence").$type<"high" | "medium" | "low">().notNull(),
  state: text("state").$type<ItemState>().notNull(),
  reason: text("reason").notNull(),
  suggestedSubstitute: text("suggested_substitute"),
  questionForArtist: text("question_for_artist"),
  costNote: text("cost_note"),
  decision: text("decision").$type<Decision>(),
  decisionNote: text("decision_note"),
  decidedBy: text("decided_by"),
  decidedAt: text("decided_at"),
  artistAnswer: text("artist_answer"),
  answeredAt: text("answered_at"),
  tmApprovalRequired: integer("tm_approval_required", { mode: "boolean" }).notNull().default(false),
  tmApproved: integer("tm_approved", { mode: "boolean" }).notNull().default(false),
});

export const partyMembers = sqliteTable("party_members", {
  id: text("id").primaryKey(),
  advanceId: text("advance_id").notNull().references(() => advances.id),
  name: text("name").notNull(),
  role: text("role").notNull(),
  phone: text("phone"),
  email: text("email"),
  dietary: text("dietary"),
  arrival: text("arrival"),
  passType: text("pass_type"),
  source: text("source").$type<"artist" | "venue">().notNull().default("venue"),
  createdAt: text("created_at").notNull().default(now),
});

export const guests = sqliteTable("guests", {
  id: text("id").primaryKey(),
  advanceId: text("advance_id").notNull().references(() => advances.id),
  actName: text("act_name").notNull(),
  name: text("name").notNull(),
  plusOnes: integer("plus_ones").notNull().default(0),
  note: text("note"),
  addedBy: text("added_by").notNull(),
  source: text("source").$type<"artist" | "venue">().notNull().default("venue"),
  late: integer("late", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(now),
});

export const vehicles = sqliteTable("vehicles", {
  id: text("id").primaryKey(),
  advanceId: text("advance_id").notNull().references(() => advances.id),
  kind: text("kind").notNull(),
  plate: text("plate"),
  driver: text("driver"),
  phone: text("phone"),
  arrival: text("arrival"),
  note: text("note"),
  createdAt: text("created_at").notNull().default(now),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  advanceId: text("advance_id").notNull().references(() => advances.id),
  channel: text("channel").$type<"email" | "sms" | "share" | "note">().notNull(),
  direction: text("direction").$type<"out" | "in">().notNull(),
  party: text("party").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull().default(now),
});

export type Venue = typeof venues.$inferSelect;
export type Artist = typeof artists.$inferSelect;
export type Rider = typeof riders.$inferSelect;
export type Advance = typeof advances.$inferSelect;
export type LineItem = typeof lineItems.$inferSelect;
export type PartyMember = typeof partyMembers.$inferSelect;
export type Guest = typeof guests.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type VenueStaff = typeof venueStaff.$inferSelect;
