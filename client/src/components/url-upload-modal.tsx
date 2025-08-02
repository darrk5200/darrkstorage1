import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link, Download } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { urlFileSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface UrlUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolder?: string;
}

export default function UrlUploadModal({ 
  isOpen, 
  onClose, 
  currentFolder 
}: UrlUploadModalProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (data: { url: string; folderPath?: string }) => {
      const response = await fetch("/api/files/upload-url", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload from URL");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      if (currentFolder) {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/folders", currentFolder, "contents"] 
        });
      }
      toast({
        title: "Success",
        description: "File downloaded from URL successfully",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to download file from URL",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    setError("");
    
    try {
      urlFileSchema.parse({ url, folderPath: currentFolder });
    } catch (validationError: any) {
      setError(validationError.errors?.[0]?.message || "Invalid URL");
      return;
    }
    
    uploadMutation.mutate({ url, folderPath: currentFolder });
  };

  const handleClose = () => {
    setUrl("");
    setError("");
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Download from URL
          </DialogTitle>
          <DialogDescription>
            Enter a URL to download and store the file
            {currentFolder && ` in "${currentFolder}"`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="url">File URL</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="https://example.com/image.jpg"
              autoFocus
              disabled={uploadMutation.isPending}
            />
          </div>
          
          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploadMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={uploadMutation.isPending || !url.trim()}>
            {uploadMutation.isPending ? "Downloading..." : "Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}