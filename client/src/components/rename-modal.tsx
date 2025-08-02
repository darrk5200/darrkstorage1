import { useState } from "react";
import { FileRecord } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface RenameModalProps {
  file: FileRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RenameModal({ file, isOpen, onClose, onSuccess }: RenameModalProps) {
  const [newName, setNewName] = useState("");
  const { toast } = useToast();
  
  const renameMutation = useMutation({
    mutationFn: async ({ fileId, newName }: { fileId: string; newName: string }) => {
      return apiRequest('PATCH', `/api/files/${fileId}/rename`, { newName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      onSuccess();
      toast({
        title: "File renamed",
        description: "The file has been renamed successfully.",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Rename failed",
        description: error?.message || "Failed to rename file",
        variant: "destructive",
      });
    }
  });

  const handleClose = () => {
    setNewName("");
    onClose();
  };

  const handleRename = () => {
    if (file && newName.trim()) {
      renameMutation.mutate({ fileId: file.id, newName: newName.trim() });
    }
  };

  const getFileNameWithoutExtension = (fileName: string) => {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
  };

  const getFileExtension = (fileName: string) => {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex > 0 ? fileName.substring(lastDotIndex) : '';
  };

  if (!file) return null;

  const currentNameWithoutExt = getFileNameWithoutExtension(file.originalName);
  const extension = getFileExtension(file.originalName);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Edit2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Rename File</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Enter a new name for your file
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Current name</label>
            <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
              {file.originalName}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">New name</label>
            <div className="flex items-center space-x-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={currentNameWithoutExt}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !renameMutation.isPending) {
                    handleRename();
                  }
                }}
                autoFocus
              />
              {extension && (
                <span className="text-sm text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                  {extension}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={handleClose} disabled={renameMutation.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleRename} 
            disabled={!newName.trim() || renameMutation.isPending}
          >
            {renameMutation.isPending ? "Renaming..." : "Rename"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}