import { useState } from "react";
import { FileRecord } from "@shared/schema";
import { Eye, Download, Edit2, Trash2, Play, Video, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatBytes } from "@/lib/utils";
import { format } from "date-fns";
import VideoPlayer from "./video-player";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FileGridProps {
  files: FileRecord[];
  onRename: (file: FileRecord) => void;
  onDelete: (file: FileRecord) => void;
  onImageView?: (file: FileRecord) => void;
  onTextView?: (file: FileRecord) => void;
}

export default function FileGrid({ files, onRename, onDelete, onImageView, onTextView }: FileGridProps) {
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  const isTextFile = (mimeType: string, filename: string) => {
    return mimeType.startsWith('text/') || 
           mimeType === 'application/json' ||
           mimeType === 'application/javascript' ||
           mimeType === 'application/xml' ||
           ['.txt', '.csv', '.js', '.css', '.html', '.xml', '.json', '.md', '.py', '.java', '.cpp', '.c', '.h', '.php', '.rb', '.go', '.rs', '.ts', '.tsx', '.jsx', '.vue', '.yml', '.yaml'].some(ext => 
             filename.toLowerCase().endsWith(ext)
           );
  };

  const handleView = (file: FileRecord) => {
    if (file.mimeType.startsWith('video/')) {
      setSelectedFile(file);
      setShowPlayer(true);
    } else if (file.mimeType.startsWith('image/') && onImageView) {
      // For images, open in modal
      onImageView(file);
    } else if (isTextFile(file.mimeType, file.originalName) && onTextView) {
      // For text files, open in text modal
      onTextView(file);
    } else {
      // Fallback to open in new tab
      window.open(`/api/files/${file.id}/view`, '_blank');
    }
  };

  const handleDownload = (file: FileRecord) => {
    const link = document.createElement('a');
    link.href = `/api/files/${file.id}/download`;
    link.download = file.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isVideo = (mimeType: string) => mimeType.startsWith('video/');
  const isImage = (mimeType: string) => mimeType.startsWith('image/');

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {files.map((file) => (
          <div
            key={file.id}
            className="group relative bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-all duration-200"
          >
            {/* File Preview */}
            <div className="relative aspect-square bg-muted">
              {isImage(file.mimeType) ? (
                <img
                  src={`/api/files/${file.id}/view`}
                  alt={file.originalName}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => handleView(file)}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : isVideo(file.mimeType) ? (
                file.thumbnailPath ? (
                  <div className="relative w-full h-full">
                    <img
                      src={`/api/files/${file.id}/thumbnail`}
                      alt={file.originalName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden w-full h-full bg-black flex items-center justify-center">
                      <div className="text-center">
                        <Video className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Video File</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full bg-black flex items-center justify-center">
                    <div className="text-center">
                      <Video className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Video File</p>
                    </div>
                  </div>
                )
              ) : isTextFile(file.mimeType, file.originalName) ? (
                <div className="w-full h-full bg-muted flex items-center justify-center cursor-pointer" onClick={() => handleView(file)}>
                  <div className="text-center">
                    <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {file.originalName.split('.').pop()?.toUpperCase() || 'TEXT'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <div className="text-center">
                    <Eye className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {file.mimeType.split('/')[1].toUpperCase()}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Video Play Overlay */}
              {isVideo(file.mimeType) && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleView(file)}
                    className="w-12 h-12 bg-black/50 hover:bg-black/70 text-white rounded-full"
                  >
                    <Play className="w-6 h-6 ml-1" />
                  </Button>
                </div>
              )}
              
              {/* Actions Menu */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-8 h-8 bg-black/50 hover:bg-black/70 text-white">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleView(file)}>
                      <Eye className="w-4 h-4 mr-2" />
                      {isVideo(file.mimeType) ? 'Play' : 'View'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload(file)}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onRename(file)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(file)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* File Info */}
            <div className="p-3">
              <h3 className="font-medium text-sm text-foreground truncate mb-1">
                {file.originalName}
              </h3>
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>{formatBytes(file.size)}</span>
                <span>{format(new Date(file.createdAt), 'MMM d')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Video Player Dialog */}
      <Dialog open={showPlayer} onOpenChange={setShowPlayer}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedFile?.originalName}</DialogTitle>
            <DialogDescription>
              {selectedFile ? formatBytes(selectedFile.size) : ''} • {selectedFile?.mimeType}
            </DialogDescription>
          </DialogHeader>
          {selectedFile && isVideo(selectedFile.mimeType) && (
            <VideoPlayer file={selectedFile} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}