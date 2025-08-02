import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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

interface FolderPinVerifyModalProps {
  folder: FolderInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
}

export default function FolderPinVerifyModal({ 
  folder, 
  isOpen, 
  onClose, 
  onVerified 
}: FolderPinVerifyModalProps) {
  const [pin, setPin] = useState("");
  const { toast } = useToast();

  const verifyPinMutation = useMutation({
    mutationFn: async (data: { folderPath: string; pin: string }) => {
      return apiRequest('POST', `/api/folders/${encodeURIComponent(data.folderPath)}/verify-pin`, {
        pin: data.pin
      });
    },
    onSuccess: () => {
      toast({
        title: "Access Granted",
        description: "PIN verified successfully",
      });
      handleClose();
      onVerified();
    },
    onError: (error: any) => {
      toast({
        title: "Access Denied",
        description: "Incorrect PIN",
        variant: "destructive",
      });
      setPin("");
    }
  });

  const handleClose = () => {
    setPin("");
    onClose();
  };

  const handleVerify = () => {
    if (!folder || !pin) return;
    
    verifyPinMutation.mutate({
      folderPath: folder.path,
      pin: pin
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Enter PIN for "{folder?.name}"
          </DialogTitle>
          <DialogDescription>
            This folder is protected. Please enter the PIN to access it.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="pin">PIN</Label>
            <Input
              id="pin"
              type="password"
              placeholder="Enter PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyPress={handleKeyPress}
              maxLength={6}
              autoFocus
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleVerify}
            disabled={!pin || verifyPinMutation.isPending}
          >
            {verifyPinMutation.isPending ? "Verifying..." : "Verify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}