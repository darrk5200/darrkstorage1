import { useState, useEffect } from "react";
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
import { FolderEdit } from "lucide-react";
import { FolderInfo } from "@shared/schema";

interface RenameFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: (newName: string) => void;
  folder: FolderInfo | null;
}

export default function RenameFolderModal({ 
  isOpen, 
  onClose, 
  onRename, 
  folder 
}: RenameFolderModalProps) {
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (folder) {
      setNewName(folder.name);
    }
  }, [folder]);

  const handleSubmit = () => {
    setError("");
    
    if (!newName.trim()) {
      setError("Folder name cannot be empty");
      return;
    }
    
    if (newName.trim() === folder?.name) {
      setError("Name hasn't changed");
      return;
    }
    
    // Check for invalid characters
    if (!/^[a-zA-Z0-9_\-\s]+$/.test(newName.trim())) {
      setError("Folder name can only contain letters, numbers, spaces, hyphens, and underscores");
      return;
    }
    
    onRename(newName.trim());
    handleClose();
  };

  const handleClose = () => {
    setNewName("");
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
            <FolderEdit className="w-5 h-5" />
            Rename Folder
          </DialogTitle>
          <DialogDescription>
            Enter a new name for "{folder?.name}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="folderName">Folder Name</Label>
            <Input
              id="folderName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter folder name"
              autoFocus
            />
          </div>
          
          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Rename
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}