import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { UserRole } from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Helper function to handle validation errors
  const validateRequest = (schema: any, data: any) => {
    try {
      return { data: schema.parse(data), error: null };
    } catch (error) {
      if (error instanceof ZodError) {
        return { data: null, error: error.errors };
      }
      return { data: null, error };
    }
  };

  // Helper function for role-based access control
  const checkRole = (...roles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in" });
      }
      
      if (!roles.includes(req.user!.role as UserRole)) {
        return res.status(403).json({ message: "You don't have permission to access this resource" });
      }
      
      next();
    };
  };

  // === Question Paper Routes ===

  // Get all question papers
  app.get("/api/question-papers", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
    try {
      const papers = await storage.getQuestionPapers();
      res.json(papers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch question papers", error });
    }
  });

  // Get a specific question paper
  app.get("/api/question-papers/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
    try {
      const paperId = parseInt(req.params.id);
      const paper = await storage.getQuestionPaper(paperId);
      
      if (!paper) {
        return res.status(404).json({ message: "Question paper not found" });
      }
      
      res.json(paper);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch question paper", error });
    }
  });

  // Create a new question paper (admin only)
  app.post(
    "/api/question-papers", 
    checkRole(UserRole.ADMIN),
    async (req: Request, res: Response) => {
      try {
        const { data, error } = validateRequest(createInsertSchema(questionPapers), {
          ...req.body,
          uploadedById: req.user!.id,
          status: 'published',
          createdAt: new Date()
        });
        
        if (error) {
          return res.status(400).json({ message: "Invalid input", error });
        }
        
        const paper = await storage.createQuestionPaper(data);
        
        res.status(201).json(paper);
      } catch (error) {
        res.status(500).json({ message: "Failed to create question paper", error });
      }
    }
  );

  // Update a question paper (admin only)
  app.put(
    "/api/question-papers/:id", 
    checkRole(UserRole.ADMIN),
    async (req: Request, res: Response) => {
      try {
        const paperId = parseInt(req.params.id);
        const paper = await storage.getQuestionPaper(paperId);
        
        if (!paper) {
          return res.status(404).json({ message: "Question paper not found" });
        }
        
        const { data, error } = validateRequest(insertQuestionPaperSchema.partial(), req.body);
        
        if (error) {
          return res.status(400).json({ message: "Invalid input", error });
        }
        
        const updatedPaper = await storage.updateQuestionPaper(paperId, data);
        res.json(updatedPaper);
      } catch (error) {
        res.status(500).json({ message: "Failed to update question paper", error });
      }
    }
  );

  // Delete a question paper (admin only)
  app.delete(
    "/api/question-papers/:id", 
    checkRole(UserRole.ADMIN),
    async (req: Request, res: Response) => {
      try {
        const paperId = parseInt(req.params.id);
        const paper = await storage.getQuestionPaper(paperId);
        
        if (!paper) {
          return res.status(404).json({ message: "Question paper not found" });
        }
        
        await storage.deleteQuestionPaper(paperId);
        res.status(204).send();
      } catch (error) {
        res.status(500).json({ message: "Failed to delete question paper", error });
      }
    }
  );

  // === Answer Submission Routes ===

  // Get all answer submissions for a question paper (admin, assessor)
  app.get(
    "/api/question-papers/:id/submissions", 
    checkRole(UserRole.ADMIN, UserRole.ASSESSOR),
    async (req: Request, res: Response) => {
      try {
        const paperId = parseInt(req.params.id);
        const paper = await storage.getQuestionPaper(paperId);
        
        if (!paper) {
          return res.status(404).json({ message: "Question paper not found" });
        }
        
        const submissions = await storage.getAnswerSubmissions(paperId);
        res.json(submissions);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch submissions", error });
      }
    }
  );

  // Get all submissions by the current student
  app.get(
    "/api/my-submissions", 
    checkRole(UserRole.STUDENT),
    async (req: Request, res: Response) => {
      try {
        const submissions = await storage.getAnswerSubmissionsByStudent(req.user!.id);
        res.json(submissions);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch your submissions", error });
      }
    }
  );

  // Get a specific submission
  app.get("/api/submissions/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
    try {
      const submissionId = parseInt(req.params.id);
      const submission = await storage.getAnswerSubmission(submissionId);
      
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }
      
      // Check if the user has access to this submission
      const userRole = req.user!.role as UserRole;
      const userId = req.user!.id;
      
      if (userRole === UserRole.STUDENT && submission.studentId !== userId) {
        return res.status(403).json({ message: "You don't have permission to access this submission" });
      }
      
      res.json(submission);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch submission", error });
    }
  });

  // Create a new submission (student only)
  app.post(
    "/api/submissions", 
    checkRole(UserRole.STUDENT),
    async (req: Request, res: Response) => {
      try {
        const { data, error } = validateRequest(insertAnswerSubmissionSchema, req.body);
        
        if (error) {
          return res.status(400).json({ message: "Invalid input", error });
        }
        
        // Check if the question paper exists
        const paper = await storage.getQuestionPaper(data.questionPaperId);
        if (!paper) {
          return res.status(404).json({ message: "Question paper not found" });
        }
        
        const submission = await storage.createAnswerSubmission({
          ...data,
          studentId: req.user!.id
        });
        
        res.status(201).json(submission);
      } catch (error) {
        res.status(500).json({ message: "Failed to create submission", error });
      }
    }
  );

  // === Comment Routes ===

  // Get all comments for a submission
  app.get("/api/submissions/:id/comments", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
    try {
      const submissionId = parseInt(req.params.id);
      const submission = await storage.getAnswerSubmission(submissionId);
      
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }
      
      // Check if the user has access to these comments
      const userRole = req.user!.role as UserRole;
      const userId = req.user!.id;
      
      if (userRole === UserRole.STUDENT && submission.studentId !== userId) {
        return res.status(403).json({ message: "You don't have permission to access these comments" });
      }
      
      const comments = await storage.getComments(submissionId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments", error });
    }
  });

  // Add a comment to a submission (assessor only)
  app.post(
    "/api/submissions/:id/comments", 
    checkRole(UserRole.ASSESSOR),
    async (req: Request, res: Response) => {
      try {
        const submissionId = parseInt(req.params.id);
        const submission = await storage.getAnswerSubmission(submissionId);
        
        if (!submission) {
          return res.status(404).json({ message: "Submission not found" });
        }
        
        const { data, error } = validateRequest(insertCommentSchema.pick({ content: true }), req.body);
        
        if (error) {
          return res.status(400).json({ message: "Invalid input", error });
        }
        
        const comment = await storage.createComment({
          submissionId,
          assessorId: req.user!.id,
          content: data.content
        });
        
        // Create a notification for the student
        await storage.createNotification({
          userId: submission.studentId,
          title: "New Comment on Your Submission",
          message: `An assessor has commented on your submission.`
        });
        
        res.status(201).json(comment);
      } catch (error) {
        res.status(500).json({ message: "Failed to create comment", error });
      }
    }
  );

  // === Notification Routes ===

  // Get all notifications for the current user
  app.get("/api/notifications", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
    try {
      const notifications = await storage.getNotifications(req.user!.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications", error });
    }
  });

  // Mark a notification as read
  app.put("/api/notifications/:id/read", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
    try {
      const notificationId = parseInt(req.params.id);
      const success = await storage.markNotificationAsRead(notificationId);
      
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to update notification", error });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
