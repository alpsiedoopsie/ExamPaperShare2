import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { User, AnswerSubmission } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Download, Search, Filter, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface AssessorViewProps {
  user: User;
}

export default function AssessorView({ user }: AssessorViewProps) {
  const { toast } = useToast();
  const [filterCourse, setFilterCourse] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubmission, setSelectedSubmission] = useState<AnswerSubmission | null>(null);
  const [assessmentDialogOpen, setAssessmentDialogOpen] = useState(false);
  const [comment, setComment] = useState<string>('');
  
  // Fetch all question papers
  const { data: papers, isLoading: papersLoading } = useQuery({
    queryKey: ['/api/question-papers'],
  });
  
  // We'll need to make separate requests for each paper's submissions in a real app
  // For simplicity, let's assume this endpoint returns all submissions
  const { data: allSubmissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ['/api/submissions-to-assess'],
  });
  
  // For getting comments for a specific submission
  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ['/api/submissions', selectedSubmission?.id, 'comments'],
    enabled: !!selectedSubmission && assessmentDialogOpen,
  });
  
  // Submit comment mutation
  const submitCommentMutation = useMutation({
    mutationFn: async (data: { submissionId: number; content: string }) => {
      const res = await apiRequest('POST', `/api/submissions/${data.submissionId}/comments`, { content: data.content });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/submissions', selectedSubmission?.id, 'comments'] });
      setComment('');
      toast({
        title: 'Comment added successfully',
        description: 'Your feedback has been saved',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to add comment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  const handleSubmitComment = () => {
    if (!selectedSubmission || !comment.trim()) return;
    
    submitCommentMutation.mutate({
      submissionId: selectedSubmission.id,
      content: comment,
    });
  };
  
  // Get student initials for avatar
  const getStudentInitials = (studentId: number) => {
    // This would need to be fetched from the user data in a real app
    return 'ST';
  };
  
  // Format date
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return format(date, 'MMMM d, yyyy');
  };
  
  // Filter and search submissions
  const filteredSubmissions = allSubmissions
    ? allSubmissions.filter((submission: AnswerSubmission & { student?: User, paper?: any }) => {
        let matchesCourse = true;
        let matchesStatus = true;
        let matchesSearch = true;
        
        if (filterCourse && submission.paper) {
          matchesCourse = submission.paper.course === filterCourse;
        }
        
        if (filterStatus) {
          matchesStatus = submission.status === filterStatus;
        }
        
        if (searchQuery && submission.student) {
          const query = searchQuery.toLowerCase();
          matchesSearch = 
            submission.student.fullName.toLowerCase().includes(query) ||
            (submission.paper && submission.paper.title.toLowerCase().includes(query));
        }
        
        return matchesCourse && matchesStatus && matchesSearch;
      })
    : [];
  
  return (
    <div className="space-y-6">
      {/* Submissions to Assess */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Submissions to Assess</h2>
          
          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="courseFilter">Course</Label>
              <Select value={filterCourse} onValueChange={setFilterCourse}>
                <SelectTrigger id="courseFilter" className="mt-1">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-courses">All Courses</SelectItem>
                  {papers && papers.map((paper: any) => (
                    <SelectItem key={paper.course} value={paper.course}>{paper.course}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="statusFilter">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="statusFilter" className="mt-1">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-statuses">All Statuses</SelectItem>
                  <SelectItem value="submitted">Not Reviewed</SelectItem>
                  <SelectItem value="reviewing">In Progress</SelectItem>
                  <SelectItem value="graded">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <Input
                  type="text"
                  id="search"
                  placeholder="Search student or exam..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
          
          {submissionsLoading || papersLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredSubmissions && filteredSubmissions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exam
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comments
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSubmissions.map((submission: any) => {
                    const paper = papers?.find(p => p.id === submission.questionPaperId);
                    return (
                      <tr key={submission.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <Avatar>
                                <AvatarFallback>{getStudentInitials(submission.studentId)}</AvatarFallback>
                              </Avatar>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">Student {submission.studentId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{paper?.title || 'Unknown Exam'}</div>
                          <div className="text-sm text-gray-500">{paper?.course || 'Unknown Course'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(submission.submittedAt)}</div>
                          <div className="text-sm text-gray-500">{format(new Date(submission.submittedAt), 'hh:mm a')}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={submission.status === 'submitted' ? 'destructive' : 'outline'}>
                            {submission.status === 'submitted' ? 'Not Reviewed' : submission.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="inline-flex items-center">
                            <MessageSquare className="h-4 w-4 mr-1 text-gray-400" />
                            {/* Comments count would come from API in real implementation */}
                            0 comments
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button 
                            variant="link" 
                            className="text-secondary"
                            onClick={() => {
                              setSelectedSubmission(submission);
                              setAssessmentDialogOpen(true);
                            }}
                          >
                            Review
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <Avatar>
                            <AvatarFallback>TW</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">Tom Wilson</div>
                          <div className="text-sm text-gray-500">tom.wilson@example.com</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">Biology - Final Exam</div>
                      <div className="text-sm text-gray-500">BIO101 - Introduction to Biology</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">March 25, 2023</div>
                      <div className="text-sm text-gray-500">02:30 PM</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="warning">In Progress</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center">
                        <MessageSquare className="h-4 w-4 mr-1 text-secondary" />
                        1 comment
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button 
                        variant="link" 
                        className="text-secondary"
                        onClick={() => {
                          // Mock data for demonstration
                          setSelectedSubmission({
                            id: 2,
                            questionPaperId: 2,
                            studentId: 2,
                            fileName: "tom_wilson_answer.pdf",
                            fileContent: "",
                            status: "reviewing",
                            submittedAt: new Date(),
                          });
                          setAssessmentDialogOpen(true);
                        }}
                      >
                        Continue Review
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No submissions to assess.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Assessment Dialog */}
      <Dialog open={assessmentDialogOpen} onOpenChange={setAssessmentDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Assessment Review</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-800 mb-2">Question Paper</h3>
              <div className="aspect-video bg-white border border-gray-200 rounded-md flex items-center justify-center p-6">
                <div className="text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">Question Paper PDF</p>
                  <Button variant="link" size="sm" className="mt-1">
                    <Download className="h-4 w-4 mr-1" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-800 mb-2">Student Answer</h3>
              <div className="aspect-video bg-white border border-gray-200 rounded-md flex items-center justify-center p-6">
                <div className="text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">Student Answer PDF</p>
                  <Button variant="link" size="sm" className="mt-1">
                    <Download className="h-4 w-4 mr-1" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t pt-4 mt-4">
            <h3 className="font-medium text-gray-800 mb-4">Assessment Comments</h3>
            
            <div className="space-y-4 mb-6 max-h-60 overflow-y-auto">
              {commentsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : comments && comments.length > 0 ? (
                comments.map((comment: any) => (
                  <div key={comment.id} className="bg-gray-50 p-4 rounded-md">
                    <div className="flex justify-between mb-2">
                      <div className="font-medium text-gray-800">{comment.assessorName || 'Dr. Sarah Johnson'}</div>
                      <div className="text-sm text-gray-500">{format(new Date(comment.createdAt), 'MMM d, yyyy h:mm a')}</div>
                    </div>
                    <p className="text-gray-700">{comment.content}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">No comments yet. Be the first to provide feedback.</p>
                </div>
              )}
            </div>
            
            <div className="mt-4">
              <Label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">Add Comment</Label>
              <Textarea
                id="comment"
                rows={4}
                placeholder="Enter your assessment feedback here..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="resize-none"
              />
              
              <div className="mt-4 flex justify-end">
                <Button 
                  variant="outline" 
                  className="mr-3"
                >
                  Save Draft
                </Button>
                <Button 
                  onClick={handleSubmitComment}
                  disabled={!comment.trim() || submitCommentMutation.isPending}
                  className="bg-secondary hover:bg-secondary/90"
                >
                  {submitCommentMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    'Post Comment'
                  )}
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter className="border-t pt-4 flex justify-between">
            <Button variant="outline" onClick={() => setAssessmentDialogOpen(false)}>
              Back to List
            </Button>
            
            <div>
              <Button variant="outline" className="mr-3">
                Mark as In Progress
              </Button>
              <Button className="bg-green-600 hover:bg-green-700">
                Complete Assessment
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
