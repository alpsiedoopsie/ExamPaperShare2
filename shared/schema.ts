import { pgTable, text, serial, integer, boolean, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enum for user roles
export enum UserRole {
  ADMIN = "admin",
  STUDENT = "student",
  ASSESSOR = "assessor"
}

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default(UserRole.STUDENT),
  fullName: text("full_name").notNull()
});

// Question paper table
export const questionPapers = pgTable("question_papers", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  course: text("course").notNull(),
  examDate: timestamp("exam_date").notNull(),
  duration: integer("duration").notNull(), // in minutes
  fileName: text("file_name").notNull(),
  fileContent: text("file_content").notNull(), // base64 encoded file content
  uploadedById: integer("uploaded_by_id").notNull().references(() => users.id),
  status: text("status").notNull().default("published"), // draft, published, closed
  createdAt: timestamp("created_at").defaultNow()
});

// Answer submissions table
export const answerSubmissions = pgTable("answer_submissions", {
  id: serial("id").primaryKey(),
  questionPaperId: integer("question_paper_id").notNull().references(() => questionPapers.id),
  studentId: integer("student_id").notNull().references(() => users.id),
  fileName: text("file_name").notNull(),
  fileContent: text("file_content").notNull(), // base64 encoded file content
  status: text("status").notNull().default("submitted"), // submitted, graded
  submittedAt: timestamp("submitted_at").defaultNow()
});

// Comments table
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => answerSubmissions.id),
  assessorId: integer("assessor_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow()
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  fullName: true
});

const insertQuestionPaperSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  examDate: z.coerce.date(),
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  totalMarks: z.number().min(1, "Total marks must be at least 1"),
  questions: z.array(z.string()).min(1, "At least one question is required")
});

export const insertAnswerSubmissionSchema = createInsertSchema(answerSubmissions).pick({
  questionPaperId: true,
  studentId: true,
  fileName: true,
  fileContent: true
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  submissionId: true,
  assessorId: true,
  content: true
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  title: true,
  message: true
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  questionPapers: many(questionPapers),
  answerSubmissions: many(answerSubmissions),
  comments: many(comments),
  notifications: many(notifications)
}));

export const questionPapersRelations = relations(questionPapers, ({ one, many }) => ({
  uploadedBy: one(users, {
    fields: [questionPapers.uploadedById],
    references: [users.id]
  }),
  answerSubmissions: many(answerSubmissions)
}));

export const answerSubmissionsRelations = relations(answerSubmissions, ({ one, many }) => ({
  questionPaper: one(questionPapers, {
    fields: [answerSubmissions.questionPaperId],
    references: [questionPapers.id]
  }),
  student: one(users, {
    fields: [answerSubmissions.studentId],
    references: [users.id]
  }),
  comments: many(comments)
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  submission: one(answerSubmissions, {
    fields: [comments.submissionId],
    references: [answerSubmissions.id]
  }),
  assessor: one(users, {
    fields: [comments.assessorId],
    references: [users.id]
  })
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id]
  })
}));

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertQuestionPaper = z.infer<typeof insertQuestionPaperSchema>;
export type QuestionPaper = typeof questionPapers.$inferSelect;

export type InsertAnswerSubmission = z.infer<typeof insertAnswerSubmissionSchema>;
export type AnswerSubmission = typeof answerSubmissions.$inferSelect;

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;