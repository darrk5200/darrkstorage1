import React from "react";
import { FileRecord } from "@shared/schema";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ImageModalProps {
  file: FileRecord | null;
  isOpen: boolean;
  onClose: () => void;
  files?: FileRecord[];
  onNavigate?: (file: FileRecord) => void;
}

export default function ImageModal({ file, isOpen, onClose, files = [], onNavigate }: ImageModalProps) {
  if (!file) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const currentIndex = files.findIndex(f => f.id === file.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < files.length - 1;

  const handlePrevious = () => {
    if (hasPrevious && onNavigate) {
      onNavigate(files[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext && onNavigate) {
      onNavigate(files[currentIndex + 1]);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' && hasPrevious) {
      handlePrevious();
    } else if (e.key === 'ArrowRight' && hasNext) {
      handleNext();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Add keyboard event listeners
  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, hasPrevious, hasNext, currentIndex]);

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-transparent border-0">
        <VisuallyHidden>
          <DialogTitle>Image Viewer</DialogTitle>
          <DialogDescription>
            Viewing {file.originalName}. Use arrow keys or buttons to navigate between images.
          </DialogDescription>
        </VisuallyHidden>
        <div className="relative">
          {/* Header buttons */}
          <div className="absolute -top-12 right-0 flex items-center space-x-2 z-10">
            {files.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={!hasPrevious}
                  className="text-white hover:text-slate-300 disabled:opacity-30"
                  title="Previous image (←)"
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNext}
                  disabled={!hasNext}
                  className="text-white hover:text-slate-300 disabled:opacity-30"
                  title="Next image (→)"
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:text-slate-300"
              title="Close (Esc)"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
          
          <div className="relative rounded-lg overflow-hidden">
            {/* Navigation arrows overlay */}
            {files.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={handlePrevious}
                  disabled={!hasPrevious}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white disabled:opacity-30 z-10"
                  title="Previous image (←)"
                >
                  <ChevronLeft className="w-8 h-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={handleNext}
                  disabled={!hasNext}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white disabled:opacity-30 z-10"
                  title="Next image (→)"
                >
                  <ChevronRight className="w-8 h-8" />
                </Button>
              </>
            )}
            
            <img
              key={file.id}
              src={`/api/files/${file.id}/view`}
              alt={file.originalName}
              className="max-w-full max-h-[80vh] object-contain mx-auto"
            />
            
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{file.originalName}</h4>
                  <p className="text-sm text-slate-300 mt-1">
                    {formatFileSize(file.size)} • {file.mimeType.split('/')[1].toUpperCase()}
                  </p>
                </div>
                {files.length > 1 && (
                  <div className="text-sm text-slate-300">
                    {currentIndex + 1} of {files.length}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
