import { 
  users, type User, type InsertUser,
  questionPapers, type QuestionPaper, type InsertQuestionPaper,
  answerSubmissions, type AnswerSubmission, type InsertAnswerSubmission,
  comments, type Comment, type InsertComment,
  notifications, type Notification, type InsertNotification
} from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>; // Added getUsers method

  // Question paper operations
  getQuestionPapers(): Promise<QuestionPaper[]>;
  getQuestionPaper(id: number): Promise<QuestionPaper | undefined>;
  createQuestionPaper(paper: InsertQuestionPaper): Promise<QuestionPaper>;
  updateQuestionPaper(id: number, updates: Partial<InsertQuestionPaper>): Promise<QuestionPaper | undefined>;
  deleteQuestionPaper(id: number): Promise<boolean>;

  // Answer submission operations
  getAnswerSubmissions(questionPaperId?: number): Promise<AnswerSubmission[]>;
  getAnswerSubmissionsByStudent(studentId: number): Promise<AnswerSubmission[]>;
  getAnswerSubmission(id: number): Promise<AnswerSubmission | undefined>;
  createAnswerSubmission(submission: InsertAnswerSubmission): Promise<AnswerSubmission>;
  updateAnswerSubmission(id: number, updates: Partial<InsertAnswerSubmission>): Promise<AnswerSubmission | undefined>;

  // Comment operations
  getComments(submissionId: number): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;

  // Notification operations
  getNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<boolean>;

  // Session store
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUsers(): Promise<User[]> { // Added getUsers method
    return await db.select().from(users);
  }

  // Question paper methods
  async getQuestionPapers(): Promise<QuestionPaper[]> {
    return await db.select().from(questionPapers).orderBy(desc(questionPapers.createdAt));
  }

  async getQuestionPaper(id: number): Promise<QuestionPaper | undefined> {
    const [paper] = await db.select().from(questionPapers).where(eq(questionPapers.id, id));
    return paper;
  }

  async createQuestionPaper(paper: InsertQuestionPaper): Promise<QuestionPaper> {
    const [questionPaper] = await db.insert(questionPapers).values(paper).returning();
    return questionPaper;
  }

  async updateQuestionPaper(id: number, updates: Partial<InsertQuestionPaper>): Promise<QuestionPaper | undefined> {
    const [updated] = await db
      .update(questionPapers)
      .set(updates)
      .where(eq(questionPapers.id, id))
      .returning();
    return updated;
  }

  async deleteQuestionPaper(id: number): Promise<boolean> {
    const result = await db.delete(questionPapers).where(eq(questionPapers.id, id));
    return result.rowCount > 0;
  }

  // Answer submission methods
  async getAnswerSubmissions(questionPaperId?: number): Promise<AnswerSubmission[]> {
    if (questionPaperId) {
      return await db
        .select()
        .from(answerSubmissions)
        .where(eq(answerSubmissions.questionPaperId, questionPaperId))
        .orderBy(desc(answerSubmissions.submittedAt));
    }
    return await db
      .select()
      .from(answerSubmissions)
      .orderBy(desc(answerSubmissions.submittedAt));
  }

  async getAnswerSubmissionsByStudent(studentId: number): Promise<AnswerSubmission[]> {
    return await db
      .select()
      .from(answerSubmissions)
      .where(eq(answerSubmissions.studentId, studentId))
      .orderBy(desc(answerSubmissions.submittedAt));
  }

  async getAnswerSubmission(id: number): Promise<AnswerSubmission | undefined> {
    const [submission] = await db
      .select()
      .from(answerSubmissions)
      .where(eq(answerSubmissions.id, id));
    return submission;
  }

  async createAnswerSubmission(submission: InsertAnswerSubmission): Promise<AnswerSubmission> {
    const [answer] = await db
      .insert(answerSubmissions)
      .values(submission)
      .returning();
    return answer;
  }

  async updateAnswerSubmission(id: number, updates: Partial<InsertAnswerSubmission>): Promise<AnswerSubmission | undefined> {
    const [updated] = await db
      .update(answerSubmissions)
      .set(updates)
      .where(eq(answerSubmissions.id, id))
      .returning();
    return updated;
  }

  // Comment methods
  async getComments(submissionId: number): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.submissionId, submissionId))
      .orderBy(desc(comments.createdAt));
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db
      .insert(comments)
      .values(comment)
      .returning();
    return newComment;
  }

  // Notification methods
  async getNotifications(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
    return result.rowCount > 0;
  }
}



export const storage = new DatabaseStorage();