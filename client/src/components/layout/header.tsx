import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Bell, 
  User, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Home,
  FileText,
  Upload
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Notification, User as UserType, UserRole } from '@shared/schema';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';

interface HeaderProps {
  user: UserType | null;
  notifications?: Notification[];
  notificationsLoading?: boolean;
}

export default function Header({ user, notifications, notificationsLoading }: HeaderProps) {
  const { logoutMutation } = useAuth();
  const [, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  // Count unread notifications
  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;
  
  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('PUT', `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Get user role display text
  const getRoleDisplay = (role: string) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'Admin';
      case UserRole.STUDENT:
        return 'Student';
      case UserRole.ASSESSOR:
        return 'Assessor';
      default:
        return role;
    }
  };
  
  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user || !user.fullName) return 'U';
    
    return user.fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };
  
  // Navigation links based on user role
  const navLinks = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Question Papers', href: '/#papers', icon: FileText },
    { name: 'My Submissions', href: '/#submissions', icon: Upload },
  ];
  
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <span 
              className="text-2xl font-semibold text-primary cursor-pointer"
              onClick={() => navigate('/')}
            >
              ExamShare
            </span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-4">
            {user && navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium flex items-center"
              >
                <link.icon className="h-4 w-4 mr-1" />
                {link.name}
              </a>
            ))}
          </nav>
          
          {/* User Menu */}
          {user ? (
            <div className="flex items-center">
              {/* Notifications */}
              <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="mr-3 relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="p-2 font-medium text-sm">Notifications</div>
                  <DropdownMenuSeparator />
                  <ScrollArea className="h-80">
                    {notifications && notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div 
                          key={notification.id} 
                          className={`p-3 text-sm hover:bg-gray-50 ${!notification.isRead ? 'bg-blue-50' : ''}`}
                          onClick={() => {
                            if (!notification.isRead) {
                              markAsReadMutation.mutate(notification.id);
                            }
                          }}
                        >
                          <div className="font-medium">{notification.title}</div>
                          <div className="text-gray-500 mb-1">{notification.message}</div>
                          <div className="text-xs text-gray-400">
                            {format(new Date(notification.createdAt), 'MMM d, yyyy h:mm a')}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No notifications yet
                      </div>
                    )}
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* User profile dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-white">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center">
                      <span className="text-gray-700 font-medium hidden md:block mr-2">
                        {user.fullName}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {getRoleDisplay(user.role)}
                      </Badge>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Your Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer text-red-600"
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{logoutMutation.isPending ? 'Logging out...' : 'Sign out'}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Button onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          )}
          
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="flex flex-col space-y-4 mt-8">
                  {user && navLinks.map((link) => (
                    <a
                      key={link.name}
                      href={link.href}
                      className="flex items-center py-2 text-base font-medium text-gray-700 hover:text-primary"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <link.icon className="h-5 w-5 mr-2" />
                      {link.name}
                    </a>
                  ))}
                  
                  <DropdownMenuSeparator />
                  
                  {user ? (
                    <Button
                      variant="ghost" 
                      className="flex items-center justify-start p-2 text-red-600 hover:text-red-800" 
                      onClick={handleLogout}
                    >
                      <LogOut className="h-5 w-5 mr-2" />
                      Sign out
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => {
                        navigate('/auth');
                        setMobileMenuOpen(false);
                      }}
                    >
                      Sign In
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
