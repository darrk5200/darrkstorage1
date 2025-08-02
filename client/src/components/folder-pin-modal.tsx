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
import { Lock } from "lucide-react";

interface FolderPinModalProps {
  folder: FolderInfo | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function FolderPinModal({ folder, isOpen, onClose }: FolderPinModalProps) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const setPinMutation = useMutation({
    mutationFn: async (data: { folderPath: string; pin: string }) => {
      return apiRequest('POST', `/api/folders/${encodeURIComponent(data.folderPath)}/pin`, {
        pin: data.pin
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "PIN set successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set PIN",
        variant: "destructive",
      });
    }
  });

  const handleClose = () => {
    setPin("");
    setConfirmPin("");
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folder) return;

    if (!pin.trim() || pin !== confirmPin) {
      toast({
        title: "Error",
        description: "PINs don't match or are empty",
        variant: "destructive",
      });
      return;
    }

    if (!/^\d{4,8}$/.test(pin)) {
      toast({
        title: "Error", 
        description: "PIN must be 4-8 digits",
        variant: "destructive",
      });
      return;
    }

    setPinMutation.mutate({
      folderPath: folder.path,
      pin: pin
    });
  };

  const isLoading = setPinMutation.isPending;

  // Don't show modal if folder already has a PIN
  if (!folder || folder.hasPin) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Set PIN for "{folder.name}"
          </DialogTitle>
          <DialogDescription>
            Enter a 4-8 digit PIN to protect this folder. Once set, the PIN cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pin">PIN (4-8 digits)</Label>
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="Enter PIN"
                disabled={isLoading}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pin">Confirm PIN</Label>
              <Input
                id="confirm-pin"
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="Confirm PIN"
                disabled={isLoading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !pin || !confirmPin}
            >
              {isLoading ? "Setting..." : "Set PIN"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}