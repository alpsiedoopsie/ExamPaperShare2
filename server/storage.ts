import { 
  users, type User, type InsertUser,
  questionPapers, type QuestionPaper, type InsertQuestionPaper,
  answerSubmissions, type AnswerSubmission, type InsertAnswerSubmission,
  comments, type Comment, type InsertComment,
  notifications, type Notification, type InsertNotification
} from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

const MemoryStore = createMemoryStore(session);

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private questionPapers: Map<number, QuestionPaper>;
  private answerSubmissions: Map<number, AnswerSubmission>;
  private comments: Map<number, Comment>;
  private notifications: Map<number, Notification>;
  
  currentUserId: number;
  currentPaperId: number;
  currentSubmissionId: number;
  currentCommentId: number;
  currentNotificationId: number;
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.questionPapers = new Map();
    this.answerSubmissions = new Map();
    this.comments = new Map();
    this.notifications = new Map();
    
    this.currentUserId = 1;
    this.currentPaperId = 1;
    this.currentSubmissionId = 1;
    this.currentCommentId = 1;
    this.currentNotificationId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Question paper methods
  async getQuestionPapers(): Promise<QuestionPaper[]> {
    return Array.from(this.questionPapers.values());
  }

  async getQuestionPaper(id: number): Promise<QuestionPaper | undefined> {
    return this.questionPapers.get(id);
  }

  async createQuestionPaper(paper: InsertQuestionPaper): Promise<QuestionPaper> {
    const id = this.currentPaperId++;
    const now = new Date();
    const questionPaper: QuestionPaper = { 
      ...paper, 
      id, 
      createdAt: now 
    };
    this.questionPapers.set(id, questionPaper);
    return questionPaper;
  }

  async updateQuestionPaper(id: number, updates: Partial<InsertQuestionPaper>): Promise<QuestionPaper | undefined> {
    const paper = this.questionPapers.get(id);
    if (!paper) return undefined;
    
    const updatedPaper = { ...paper, ...updates };
    this.questionPapers.set(id, updatedPaper);
    return updatedPaper;
  }

  async deleteQuestionPaper(id: number): Promise<boolean> {
    return this.questionPapers.delete(id);
  }

  // Answer submission methods
  async getAnswerSubmissions(questionPaperId?: number): Promise<AnswerSubmission[]> {
    const submissions = Array.from(this.answerSubmissions.values());
    if (questionPaperId) {
      return submissions.filter(submission => submission.questionPaperId === questionPaperId);
    }
    return submissions;
  }

  async getAnswerSubmissionsByStudent(studentId: number): Promise<AnswerSubmission[]> {
    return Array.from(this.answerSubmissions.values())
      .filter(submission => submission.studentId === studentId);
  }

  async getAnswerSubmission(id: number): Promise<AnswerSubmission | undefined> {
    return this.answerSubmissions.get(id);
  }

  async createAnswerSubmission(submission: InsertAnswerSubmission): Promise<AnswerSubmission> {
    const id = this.currentSubmissionId++;
    const now = new Date();
    const answerSubmission: AnswerSubmission = { 
      ...submission, 
      id, 
      status: "submitted",
      submittedAt: now 
    };
    this.answerSubmissions.set(id, answerSubmission);
    return answerSubmission;
  }

  async updateAnswerSubmission(id: number, updates: Partial<InsertAnswerSubmission>): Promise<AnswerSubmission | undefined> {
    const submission = this.answerSubmissions.get(id);
    if (!submission) return undefined;
    
    const updatedSubmission = { ...submission, ...updates };
    this.answerSubmissions.set(id, updatedSubmission);
    return updatedSubmission;
  }

  // Comment methods
  async getComments(submissionId: number): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.submissionId === submissionId);
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const id = this.currentCommentId++;
    const now = new Date();
    const newComment: Comment = { 
      ...comment, 
      id, 
      createdAt: now 
    };
    this.comments.set(id, newComment);
    return newComment;
  }

  // Notification methods
  async getNotifications(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = this.currentNotificationId++;
    const now = new Date();
    const newNotification: Notification = { 
      ...notification, 
      id, 
      isRead: false,
      createdAt: now 
    };
    this.notifications.set(id, newNotification);
    return newNotification;
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (!notification) return false;
    
    notification.isRead = true;
    this.notifications.set(id, notification);
    return true;
  }
}

export const storage = new MemStorage();
