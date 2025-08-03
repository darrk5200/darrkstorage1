import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentFolder?: string | null;
}

export default function CreateFolderModal({ isOpen, onClose, onSuccess, currentFolder }: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState("");
  const { toast } = useToast();
  

  
  const createFolderMutation = useMutation({
    mutationFn: async (folderName: string) => {
      const fullFolderPath = currentFolder ? `${currentFolder}/${folderName}` : folderName;

      return apiRequest('POST', '/api/folders', { folderName: fullFolderPath });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      if (currentFolder) {
        queryClient.invalidateQueries({ queryKey: ['/api/folders', currentFolder, 'contents'] });
      }
      onSuccess();
      toast({
        title: "Folder created",
        description: "The folder has been created successfully.",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Creation failed",
        description: error?.message || "Failed to create folder",
        variant: "destructive",
      });
    }
  });

  const handleClose = () => {
    setFolderName("");
    onClose();
  };

  const handleCreate = () => {
    if (folderName.trim()) {
      createFolderMutation.mutate(folderName.trim());
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
              <FolderPlus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Create New Folder</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {currentFolder 
                  ? `Create a new subfolder in ${currentFolder}`
                  : "Enter a name for your new folder"
                }
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Folder name</label>
            <Input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Enter folder name..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !createFolderMutation.isPending) {
                  handleCreate();
                }
              }}
              autoFocus
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={handleClose} disabled={createFolderMutation.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={!folderName.trim() || createFolderMutation.isPending}
          >
            {createFolderMutation.isPending ? "Creating..." : "Create Folder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}