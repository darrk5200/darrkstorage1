import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import UrlUploadModal from "./url-upload-modal";

interface FileUploadProps {
  onUpload: () => void;
  currentFolder?: string | null;
}

export default function FileUpload({ onUpload, currentFolder }: FileUploadProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [draggedUrl, setDraggedUrl] = useState<string>("");
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
        // Add folder path information from webkitRelativePath or current folder
        if ((file as any).webkitRelativePath) {
          const relativePath = (file as any).webkitRelativePath;
          const folderPath = currentFolder 
            ? `${currentFolder}/${relativePath}` 
            : relativePath;
          formData.append('folderPaths', folderPath);
        } else {
          formData.append('folderPaths', currentFolder || '');
        }
      });

      return apiRequest('POST', '/api/files/upload', formData);
    },
    onSuccess: () => {
      setUploadProgress(0);
      onUpload();
      toast({
        title: "Upload successful",
        description: "Your files have been uploaded successfully.",
      });
    },
    onError: (error) => {
      setUploadProgress(0);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    uploadMutation.mutate(acceptedFiles);
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'],
      'video/*': ['.mp4', '.webm', '.ogg', '.avi', '.mov']
    },
    multiple: true,
    disabled: uploadMutation.isPending,
    // Handle folder drag and drop + external website files
    getFilesFromEvent: async (event: any) => {
      const files: File[] = [];
      
      if (event.dataTransfer?.items) {
        const items = Array.from(event.dataTransfer.items);
        
        for (const item of items) {
          const dataTransferItem = item as DataTransferItem;
          if (dataTransferItem.kind === 'file') {
            const entry = dataTransferItem.webkitGetAsEntry();
            if (entry) {
              const entryFiles = await getFilesFromEntry(entry, '');
              files.push(...entryFiles);
            }
          } else if (dataTransferItem.kind === 'string' && dataTransferItem.type === 'text/uri-list') {
            // Handle URLs dragged from other websites
            const urlData = await new Promise<string>((resolve) => {
              dataTransferItem.getAsString(resolve);
            });
            
            const urls = urlData.split('\n').filter(url => url.trim() && !url.startsWith('#'));
            for (const url of urls) {
              try {
                const urlFile = await fetchFileFromUrl(url.trim());
                if (urlFile) {
                  files.push(urlFile);
                }
              } catch (error) {
                console.warn('Failed to fetch file from URL:', url, error);
              }
            }
          }
        }
      }
      
      return files.length > 0 ? files : Array.from(event.target?.files || event.dataTransfer?.files || []);
    }
  });
  
  // Helper function to fetch file from external URL
  const fetchFileFromUrl = async (url: string): Promise<File | null> => {
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type') || '';
      
      // Only process image and video files
      if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) {
        return null;
      }
      
      const blob = await response.blob();
      const filename = url.split('/').pop()?.split('?')[0] || 'downloaded_file';
      
      // Ensure proper file extension
      let finalFilename = filename;
      if (!finalFilename.includes('.')) {
        const extension = contentType.split('/')[1]?.split(';')[0];
        if (extension) {
          finalFilename += `.${extension}`;
        }
      }
      
      return new File([blob], finalFilename, { type: contentType });
    } catch (error) {
      console.error('Error fetching file from URL:', error);
      return null;
    }
  };

  // Helper function to recursively read files from directory entries
  const getFilesFromEntry = async (entry: any, basePath: string): Promise<File[]> => {
    const files: File[] = [];
    
    if (entry.isFile) {
      const file = await new Promise<File>((resolve) => {
        entry.file((file: File) => {
          // Set the webkitRelativePath for folder structure
          Object.defineProperty(file, 'webkitRelativePath', {
            value: basePath + file.name,
            writable: false
          });
          resolve(file);
        });
      });
      
      // Include image and video files
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        files.push(file);
      }
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const entries = await new Promise<any[]>((resolve) => {
        reader.readEntries(resolve);
      });
      
      for (const childEntry of entries) {
        const childFiles = await getFilesFromEntry(childEntry, basePath + entry.name + '/');
        files.push(...childFiles);
      }
    }
    
    return files;
  };

  return (
    <div className="mb-8">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 bg-card/30 hover:bg-card/50'}
          ${uploadMutation.isPending ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
            <CloudUpload className="text-primary w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {isDragActive ? 'Drop files, folders, or images from websites here' : 'Drop files, folders, or images from websites here to upload'}
            </h3>
            <p className="text-muted-foreground mb-4">or click to browse files and folders</p>
            
            
          </div>
          <div className="flex gap-3">
            <Button 
              disabled={uploadMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Choose Files
            </Button>
            <label>
              <input
                type="file"
                {...({ webkitdirectory: "" } as any)}
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) {
                    uploadMutation.mutate(files);
                  }
                }}
                disabled={uploadMutation.isPending}
              />
              <Button 
                type="button"
                variant="outline"
                disabled={uploadMutation.isPending}
                className="cursor-pointer"
                asChild
              >
                <span>Choose Folder</span>
              </Button>
            </label>
            <Button 
              type="button"
              variant="secondary"
              disabled={uploadMutation.isPending}
              onClick={(e) => {
                e.stopPropagation();
                setShowUrlModal(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const urlData = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
                if (urlData) {
                  const urls = urlData.split('\n').filter(url => url.trim() && !url.startsWith('#'));
                  if (urls.length > 0) {
                    setDraggedUrl(urls[0].trim());
                    setShowUrlModal(true);
                  }
                }
              }}
              className="transition-colors hover:bg-secondary/80 focus:ring-2 focus:ring-primary/50"
            >
              From URL
            </Button>
          </div>
        </div>
      </div>

      {uploadMutation.isPending && (
        <div className="mt-4 bg-card rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Uploading files...</span>
            <span className="text-sm text-muted-foreground">Processing...</span>
          </div>
          <Progress value={50} className="w-full" />
        </div>
      )}
      
      <UrlUploadModal
        isOpen={showUrlModal}
        onClose={() => {
          setShowUrlModal(false);
          setDraggedUrl("");
        }}
        currentFolder={currentFolder || undefined}
        initialUrl={draggedUrl}
      />
    </div>
  );
}
