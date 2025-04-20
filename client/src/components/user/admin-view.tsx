import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { User, QuestionPaper, UserRole } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, PenLine, Trash2, PlusCircle, CalendarIcon, Clock, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import FileUpload from '@/components/file-upload';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface AdminViewProps {
  user: User;
}

const paperSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  course: z.string().min(1, 'Course is required'),
  examDate: z.date(),
  duration: z.number().min(1, 'Duration must be at least 1 minute'),
  status: z.string().default('published')
});

type PaperFormValues = z.infer<typeof paperSchema>;

export default function AdminView({ user }: AdminViewProps) {
  const { toast } = useToast();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [filterCourse, setFilterCourse] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<{ file: File; content: string } | null>(null);
  const [userRoleFilter, setUserRoleFilter] = useState<string>('');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('');
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');

  // Fetch question papers
  const { data: papers, isLoading: papersLoading } = useQuery({
    queryKey: ['/api/question-papers'],
  });

  // Fetch users (in a real app this would be a separate endpoint)
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
  });

  // Create question paper mutation
  const createPaperMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/question-papers', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/question-papers'] });
      setUploadDialogOpen(false);
      setSelectedFile(null);
      form.reset();
      toast({
        title: 'Question paper uploaded successfully',
        description: 'The paper has been added to the system',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to upload question paper',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Form for question paper upload
  const form = useForm<PaperFormValues>({
    resolver: zodResolver(paperSchema),
    defaultValues: {
      title: '',
      course: '',
      examDate: new Date(),
      duration: 120,
      status: 'published'
    },
  });

  const handleFileSelect = (file: File, content: string) => {
    setSelectedFile({ file, content });
  };

  const onSubmit = (data: PaperFormValues) => {
    if (!selectedFile) {
      toast({
        title: 'File required',
        description: 'Please upload a question paper file',
        variant: 'destructive',
      });
      return;
    }

    // Convert examDate to ISO string before submitting
    const formattedData = { ...data, examDate: data.examDate.toISOString() };

    createPaperMutation.mutate({
      ...formattedData,
      fileName: selectedFile.file.name,
      fileContent: selectedFile.content,
      uploadedById: user.id
    });
  };

  // Delete paper mutation
  const deletePaperMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/question-papers/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/question-papers'] });
      toast({
        title: 'Question paper deleted',
        description: 'The paper has been removed from the system',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete question paper',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update paper status mutation
  const updatePaperStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest('PUT', `/api/question-papers/${id}`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/question-papers'] });
      toast({
        title: 'Question paper updated',
        description: 'The paper status has been updated',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update question paper',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Filter papers
  const filteredPapers = papers
    ? papers.filter((paper: QuestionPaper) => {
        let matchesCourse = true;
        let matchesStatus = true;
        let matchesSearch = true;

        if (filterCourse) {
          matchesCourse = paper.course === filterCourse;
        }

        if (filterStatus) {
          matchesStatus = paper.status === filterStatus;
        }

        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          matchesSearch = 
            paper.title.toLowerCase().includes(query) ||
            paper.course.toLowerCase().includes(query);
        }

        return matchesCourse && matchesStatus && matchesSearch;
      })
    : [];

  // Format date
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return format(date, 'MMMM d, yyyy');
  };

  // Format duration (from minutes to hours)
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes ? `${hours} hours ${remainingMinutes} minutes` : `${hours} hours`;
  };

  // Get submission count for a paper
  const getSubmissionCount = (paperId: number) => {
    // In a real app, this would come from the API
    return Math.floor(Math.random() * 20); // Mock for demo purposes
  };

  // Get initials from full name
  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Manage Question Papers */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Manage Question Papers</h2>
            <Button 
              onClick={() => setUploadDialogOpen(true)}
              className="bg-accent hover:bg-accent/90"
            >
              <PlusCircle className="h-5 w-5 mr-2" />
              Upload New Paper
            </Button>
          </div>

          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="adminCourseFilter">Course</Label>
              <Select value={filterCourse} onValueChange={setFilterCourse}>
                <SelectTrigger id="adminCourseFilter" className="mt-1">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-courses">All Courses</SelectItem>
                  {papers && Array.from(new Set(papers.map((p: QuestionPaper) => p.course))).map((course: string) => (
                    <SelectItem key={course} value={course}>{course}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="adminStatusFilter">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="adminStatusFilter" className="mt-1">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-statuses">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="adminSearch">Search</Label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <Input
                  type="text"
                  id="adminSearch"
                  placeholder="Search exams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {papersLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredPapers && filteredPapers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exam
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submissions
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPapers.map((paper: QuestionPaper) => (
                    <tr key={paper.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{paper.title}</div>
                        <div className="text-sm text-gray-500">{paper.course}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(paper.examDate)}</div>
                        <div className="text-sm text-gray-500">{formatDuration(paper.duration)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge 
                          variant={
                            paper.status === 'published' ? 'success' :
                            paper.status === 'draft' ? 'secondary' :
                            'outline'
                          }
                        >
                          {paper.status.charAt(0).toUpperCase() + paper.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="text-sm">{getSubmissionCount(paper.id)} submissions</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button variant="link" className="text-primary mr-3">
                          <PenLine className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        {paper.status === 'draft' ? (
                          <Button 
                            variant="link" 
                            className="text-accent"
                            onClick={() => updatePaperStatusMutation.mutate({ id: paper.id, status: 'published' })}
                          >
                            Publish
                          </Button>
                        ) : paper.status === 'published' ? (
                          <Button 
                            variant="link" 
                            className="text-red-600"
                            onClick={() => updatePaperStatusMutation.mutate({ id: paper.id, status: 'closed' })}
                          >
                            Close
                          </Button>
                        ) : (
                          <Button 
                            variant="link" 
                            className="text-red-600"
                            onClick={() => deletePaperMutation.mutate(paper.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No question papers available. Click the button above to upload one.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manage Users */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Manage Users</h2>
            <Button 
              onClick={() => setAddUserDialogOpen(true)}
              className="bg-accent hover:bg-accent/90"
            >
              <PlusCircle className="h-5 w-5 mr-2" />
              Add New User
            </Button>
          </div>

          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="userRoleFilter">Role</Label>
              <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                <SelectTrigger id="userRoleFilter" className="mt-1">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-roles">All Roles</SelectItem>
                  <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                  <SelectItem value={UserRole.STUDENT}>Student</SelectItem>
                  <SelectItem value={UserRole.ASSESSOR}>Assessor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="userStatusFilter">Status</Label>
              <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
                <SelectTrigger id="userStatusFilter" className="mt-1">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-statuses">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="userSearch">Search</Label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <Input
                  type="text"
                  id="userSearch"
                  placeholder="Search users..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {usersLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : users && users.length > 0 ? (
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user: any) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <Avatar>
                            <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email || 'No email provided'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="primary" className="bg-blue-100 text-blue-800">
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="success">
                        Active
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button variant="link" className="text-primary mr-3">Edit</Button>
                      <Button variant="link" className="text-red-600">Deactivate</Button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <Avatar>
                          <AvatarFallback>SJ</AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">Sarah Johnson</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">sarah.johnson@example.com</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      Assessor
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="success">
                      Active
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button variant="link" className="text-primary mr-3">Edit</Button>
                    <Button variant="link" className="text-red-600">Deactivate</Button>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <Avatar>
                          <AvatarFallback>RL</AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">Robert Lee</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">robert.lee@example.com</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="success" className="bg-green-100 text-green-800">
                      Admin
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="success">
                      Active
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button variant="link" className="text-primary mr-3">Edit</Button>
                    <Button variant="link" className="text-red-600">Deactivate</Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Upload Paper Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload New Question Paper</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Mathematics Final Exam" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="course"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. MATH301 - Advanced Calculus" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="examDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className="pl-3 text-left font-normal"
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="120" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="mt-4">
                <FileUpload
                  onFileSelect={handleFileSelect}
                  isUploading={createPaperMutation.isPending}
                  label="Upload File"
                  description="PDF up to 10MB"
                />
              </div>

              <DialogFooter className="mt-6">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setUploadDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createPaperMutation.isPending || !selectedFile}
                  className="bg-accent hover:bg-accent/90"
                >
                  {createPaperMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload Paper'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog (simplified for demo) */}
      <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" placeholder="Enter full name" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter email address" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select defaultValue={UserRole.STUDENT}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                  <SelectItem value={UserRole.STUDENT}>Student</SelectItem>
                  <SelectItem value={UserRole.ASSESSOR}>Assessor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Enter password" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-accent hover:bg-accent/90">
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}