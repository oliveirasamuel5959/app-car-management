import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
});

export const cars = pgTable("cars", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Ideally references users.id
  plate: text("plate").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  owner: text("owner").notNull(),
  color: text("color").notNull(),
});

export const workshops = pgTable("workshops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  owner: text("owner").notNull(),
  stars: numeric("stars").notNull(),
  image: text("image").notNull(),
  address: text("address").notNull(),
  lat: numeric("lat").notNull(),
  lng: numeric("lng").notNull(),
  employeeCount: integer("employee_count").notNull(),
  marketTime: text("market_time").notNull(),
  description: text("description").notNull(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  workshopId: integer("workshop_id").notNull(),
  userName: text("user_name").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  workshopId: integer("workshop_id").notNull(),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(), // storing as ISO string for simplicity
  status: text("status").notNull().default("pending"),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertCarSchema = createInsertSchema(cars).omit({ id: true });
export const insertWorkshopSchema = createInsertSchema(workshops).omit({ id: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true });
export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Car = typeof cars.$inferSelect;
export type InsertCar = z.infer<typeof insertCarSchema>;
export type Workshop = typeof workshops.$inferSelect;
export type InsertWorkshop = z.infer<typeof insertWorkshopSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
