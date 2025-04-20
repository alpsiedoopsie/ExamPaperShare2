# ExamShare - Exam Paper Sharing Platform

A web application for sharing exam papers with role-based access control. The platform allows different user roles (admin, student, assessor) to interact with exam papers and submissions in specific ways, along with offline capabilities through service workers.

## Features

- **Authentication System**: User registration and login with role-based access control
- **Role-Based Access**:
  - **Admin**: Upload and manage question papers
  - **Student**: View papers and submit answers
  - **Assessor**: Review submissions and provide feedback
- **Notification System**: Real-time notifications for comments and submissions
- **Service Worker Integration**: Enables offline capabilities and improved performance
- **Responsive Design**: Works on mobile, tablet, and desktop devices

## Technology Stack

- **Frontend**: React with TypeScript
- **UI Components**: ShadCN UI + Tailwind CSS
- **Backend**: Express.js
- **Authentication**: Passport.js with local strategy
- **Data Validation**: Zod
- **Database**: In-memory storage (can be replaced with PostgreSQL for production)
- **Form Handling**: React Hook Form
- **Data Fetching**: TanStack React Query
- **Routing**: Wouter

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```
4. Visit http://localhost:5000 in your browser

## Project Structure

- `/client`: Frontend React application
  - `/src/components`: UI components
  - `/src/hooks`: Custom React hooks
  - `/src/pages`: Application pages
  - `/src/lib`: Utility functions and shared code
- `/server`: Backend Express application
  - `index.ts`: Server entry point
  - `routes.ts`: API routes
  - `auth.ts`: Authentication logic
  - `storage.ts`: Data storage interface
- `/shared`: Code shared between client and server
  - `schema.ts`: Data models and validation schemas

## License

MIT