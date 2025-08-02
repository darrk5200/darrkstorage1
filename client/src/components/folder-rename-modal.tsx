import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { FolderInfo } from "@shared/schema";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FolderRenameModalProps {
  folder: FolderInfo | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function FolderRenameModal({ folder, isOpen, onClose }: FolderRenameModalProps) {
  const [newName, setNewName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const renameMutation = useMutation({
    mutationFn: async (data: { folderPath: string; newName: string }) => {
      return apiRequest('PATCH', `/api/folders/${encodeURIComponent(data.folderPath)}/rename`, {
        newName: data.newName
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Folder renamed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to rename folder",
        variant: "destructive",
      });
    }
  });

  const handleClose = () => {
    setNewName("");
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folder || !newName.trim()) return;

    renameMutation.mutate({
      folderPath: folder.path,
      newName: newName.trim()
    });
  };

  // Reset form when modal opens
  if (isOpen && folder && newName === "") {
    setNewName(folder.name);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Folder</DialogTitle>
          <DialogDescription>
            Enter a new name for the folder "{folder?.name}"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter folder name"
                disabled={renameMutation.isPending}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={renameMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={renameMutation.isPending || !newName.trim()}
            >
              {renameMutation.isPending ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}