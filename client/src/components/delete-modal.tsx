import { FileRecord } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface DeleteModalProps {
  file: FileRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteModal({ file, isOpen, onClose, onConfirm }: DeleteModalProps) {
  const { toast } = useToast();
  
  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return apiRequest('DELETE', `/api/files/${fileId}`);
    },
    onSuccess: () => {
      onConfirm();
      toast({
        title: "File deleted",
        description: "The file has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleDelete = () => {
    if (file) {
      deleteMutation.mutate(file.id);
    }
  };

  if (!file) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-destructive/20 rounded-full flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-foreground">Delete File</DialogTitle>
              <p className="text-sm text-muted-foreground">This action cannot be undone</p>
            </div>
          </div>
        </DialogHeader>
        
        <p className="text-muted-foreground mb-6">
          Are you sure you want to delete{' '}
          <span className="font-medium text-foreground">"{file.originalName}"</span>?
        </p>
        
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={deleteMutation.isPending}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="flex-1"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
