import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import StudentView from '@/components/user/student-view';
import AssessorView from '@/components/user/assessor-view';
import AdminView from '@/components/user/admin-view';
import { UserRole } from '@shared/schema';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<string>(user?.role || 'student');
  
  // Fetch notifications for the current user
  const { data: notifications, isPending: notificationsLoading } = useQuery({
    queryKey: ['/api/notifications'],
    enabled: !!user,
  });
  
  // Update active view when user role changes
  useEffect(() => {
    if (user?.role) {
      setActiveView(user.role);
    }
  }, [user?.role]);
  
  // Determine which roles the user can access
  const canAccessStudentView = true; // All users can see the student view for demo purposes
  const canAccessAssessorView = user?.role === UserRole.ASSESSOR || user?.role === UserRole.ADMIN;
  const canAccessAdminView = user?.role === UserRole.ADMIN;
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        user={user} 
        notifications={notifications} 
        notificationsLoading={notificationsLoading} 
      />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
            <TabsList className="flex border-b border-gray-200 mb-6 bg-transparent shadow-none h-auto">
              {canAccessStudentView && (
                <TabsTrigger 
                  value={UserRole.STUDENT}
                  className="py-2 px-4 text-center border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-500 font-medium text-sm focus:outline-none"
                >
                  Student View
                </TabsTrigger>
              )}
              
              {canAccessAssessorView && (
                <TabsTrigger 
                  value={UserRole.ASSESSOR}
                  className="py-2 px-4 text-center border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-500 font-medium text-sm focus:outline-none"
                >
                  Assessor View
                </TabsTrigger>
              )}
              
              {canAccessAdminView && (
                <TabsTrigger 
                  value={UserRole.ADMIN}
                  className="py-2 px-4 text-center border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-500 font-medium text-sm focus:outline-none"
                >
                  Admin View
                </TabsTrigger>
              )}
            </TabsList>
            
            {!user ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <TabsContent value={UserRole.STUDENT}>
                  <StudentView user={user} />
                </TabsContent>
                
                {canAccessAssessorView && (
                  <TabsContent value={UserRole.ASSESSOR}>
                    <AssessorView user={user} />
                  </TabsContent>
                )}
                
                {canAccessAdminView && (
                  <TabsContent value={UserRole.ADMIN}>
                    <AdminView user={user} />
                  </TabsContent>
                )}
              </>
            )}
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
