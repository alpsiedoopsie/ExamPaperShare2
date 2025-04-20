import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { UploadCloud, FileText, X, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FileUploadProps {
  onFileSelect: (file: File, base64Content: string) => void;
  acceptedFileTypes?: string;
  maxSizeMB?: number;
  isUploading?: boolean;
  error?: string;
  label?: string;
  description?: string;
}

export default function FileUpload({
  onFileSelect,
  acceptedFileTypes = "application/pdf",
  maxSizeMB = 10,
  isUploading = false,
  error,
  label = "Upload File",
  description = "PDF up to 10MB"
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const validateFile = (file: File): boolean => {
    // Check file type
    if (!file.type.match(acceptedFileTypes)) {
      setUploadError(`Invalid file type. Please upload a ${acceptedFileTypes.split(',').join(' or ')} file.`);
      return false;
    }
    
    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setUploadError(`File is too large. Maximum size is ${maxSizeMB}MB.`);
      return false;
    }
    
    setUploadError(null);
    return true;
  };
  
  const handleFile = (file: File) => {
    if (validateFile(file)) {
      setFile(file);
      
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64Content = reader.result as string;
        onFileSelect(file, base64Content);
      };
      reader.onerror = () => {
        setUploadError('Error reading file');
      };
    }
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };
  
  const handleRemoveFile = () => {
    setFile(null);
    setUploadError(null);
  };
  
  return (
    <div className="w-full">
      <Label className="block text-sm font-medium text-gray-700 mb-1">{label}</Label>
      
      {file ? (
        <div className="mt-1 flex items-center p-3 border rounded-md bg-gray-50">
          <FileText className="h-6 w-6 text-primary mr-2" />
          <span className="text-sm text-gray-700 flex-1 truncate">{file.name}</span>
          
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700"
              onClick={handleRemoveFile}
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      ) : (
        <div
          className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${
            dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 bg-white'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="space-y-1 text-center">
            <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
            <div className="flex text-sm text-gray-600">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
              >
                <span>Upload a file</span>
                <Input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  accept={acceptedFileTypes}
                  className="sr-only"
                  onChange={handleChange}
                  disabled={isUploading}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
        </div>
      )}
      
      {(error || uploadError) && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>
            {error || uploadError}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
