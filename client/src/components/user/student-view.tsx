import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { User, QuestionPaper, AnswerSubmission } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Download, Upload, Eye, Clock, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import FileUpload from '@/components/file-upload';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface StudentViewProps {
  user: User;
}

export default function StudentView({ user }: StudentViewProps) {
  const { toast } = useToast();
  const [selectedPaper, setSelectedPaper] = useState<QuestionPaper | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ file: File; content: string } | null>(null);
  
  // Fetch question papers
  const { data: papers, isLoading: papersLoading } = useQuery({
    queryKey: ['/api/question-papers'],
  });
  
  // Fetch user's submissions
  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ['/api/my-submissions'],
  });
  
  // Submit answer mutation
  const submitAnswerMutation = useMutation({
    mutationFn: async (data: { questionPaperId: number; fileName: string; fileContent: string }) => {
      const res = await apiRequest('POST', '/api/submissions', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-submissions'] });
      setUploadDialogOpen(false);
      setSelectedFile(null);
      toast({
        title: 'Answer submitted successfully',
        description: 'Your answer has been uploaded to the system',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to submit answer',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  const handleFileSelect = (file: File, content: string) => {
    setSelectedFile({ file, content });
  };
  
  const handleSubmitAnswer = () => {
    if (!selectedFile || !selectedPaper) return;
    
    submitAnswerMutation.mutate({
      questionPaperId: selectedPaper.id,
      fileName: selectedFile.file.name,
      fileContent: selectedFile.content,
    });
  };
  
  // Check if a paper has been submitted by the user
  const hasSubmitted = (paperId: number): boolean => {
    if (!submissions) return false;
    return submissions.some((sub: AnswerSubmission) => sub.questionPaperId === paperId);
  };
  
  // Get submission for a paper
  const getSubmission = (paperId: number): AnswerSubmission | undefined => {
    if (!submissions) return undefined;
    return submissions.find((sub: AnswerSubmission) => sub.questionPaperId === paperId);
  };
  
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
  
  return (
    <div className="space-y-6">
      {/* Available Question Papers */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Available Question Papers</h2>
          
          {papersLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : papers && papers.length > 0 ? (
            <div className="space-y-4">
              {papers.map((paper: QuestionPaper) => (
                <div key={paper.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-lg text-gray-800">{paper.title}</h3>
                      <p className="text-sm text-gray-600">{paper.course}</p>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>{formatDate(paper.examDate)}</span>
                        <span className="mx-2">•</span>
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{formatDuration(paper.duration)}</span>
                      </div>
                    </div>
                    <div>
                      <Badge variant={paper.status === 'published' ? 'success' : 'secondary'}>
                        {paper.status === 'published' ? 'Available' : 'Closed'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-between items-center">
                    <div>
                      <Button variant="outline" size="sm" className="text-primary">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      
                      {hasSubmitted(paper.id) && (
                        <Button variant="outline" size="sm" className="ml-2">
                          <Eye className="h-4 w-4 mr-1" />
                          View Submission
                        </Button>
                      )}
                    </div>
                    
                    {paper.status === 'published' && !hasSubmitted(paper.id) ? (
                      <Button 
                        onClick={() => {
                          setSelectedPaper(paper);
                          setUploadDialogOpen(true);
                        }}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Upload Answer
                      </Button>
                    ) : hasSubmitted(paper.id) ? (
                      <div className="text-sm text-gray-500 flex items-center">
                        <Badge variant="outline" className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          {getSubmission(paper.id)?.status === 'graded' ? 'Graded' : 'Submitted'}
                        </Badge>
                      </div>
                    ) : (
                      <Button disabled>
                        Paper Closed
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No question papers available yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* My Submissions */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">My Submissions</h2>
          
          {submissionsLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : submissions && submissions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
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
                  {submissions.map((submission: AnswerSubmission) => {
                    const paper = papers?.find((p: QuestionPaper) => p.id === submission.questionPaperId);
                    return (
                      <tr key={submission.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{paper?.title || 'Unknown Exam'}</div>
                          <div className="text-sm text-gray-500">{paper?.course || 'Unknown Course'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(submission.submittedAt)}</div>
                          <div className="text-sm text-gray-500">{format(new Date(submission.submittedAt), 'hh:mm a')}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={submission.status === 'graded' ? 'success' : 'outline'}>
                            {submission.status === 'graded' ? 'Graded' : 'Pending Review'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {/* This would require another query to get comments - simplified for now */}
                          <span className="inline-flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                            {submission.status === 'graded' ? 'Has comments' : 'No comments yet'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button variant="link" className="text-primary">View</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">You haven't submitted any answers yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Upload Answer Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Your Answer</DialogTitle>
            <DialogDescription>
              {selectedPaper && `Submit your answer for ${selectedPaper.title}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <FileUpload
              onFileSelect={handleFileSelect}
              isUploading={submitAnswerMutation.isPending}
              label="Upload Answer File"
              description="Upload your answer as a PDF (max 10MB)"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAnswer}
              disabled={!selectedFile || submitAnswerMutation.isPending}
            >
              {submitAnswerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Answer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
