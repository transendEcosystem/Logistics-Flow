
'use client';

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Loader2, MoreVertical, CheckCircle, XCircle, Trash2, Eye, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken } from '@/firebase';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

async function performAdminAction(token: string, action: string, payload: any) {
    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, payload }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
        throw new Error(result.error || `API Error for action: ${action}`);
    }
    return result;
}


export default function MemberActionMenu({ member, onUpdate }: { member: any; onUpdate: () => void }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [actionToConfirm, setActionToConfirm] = useState<'delete' | 'confirm' | 'unconfirm' | null>(null);
  const [isInstructionOpen, setIsInstructionOpen] = useState(false);
  
  const { toast } = useToast();

  const handleAction = async () => {
    if (!actionToConfirm) return;

    setIsProcessing(true);
    setIsAlertOpen(false);

    try {
        const token = await getClientSideAuthToken();
        if (!token) throw new Error("Authentication failed.");
        
        let apiAction = '';
        let payload: any = { companyId: member.id };
        let successMessage = '';

        if (actionToConfirm === 'delete') {
            apiAction = 'deleteMember';
            successMessage = 'Member has been deleted.';
        } else {
            apiAction = 'updateMemberStatus';
            payload.status = actionToConfirm === 'confirm' ? 'active' : 'suspended';
            successMessage = `Member status updated to ${payload.status}.`;
        }
        
        await performAdminAction(token, apiAction, payload);
        toast({ title: 'Success', description: successMessage });
        onUpdate();

    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
    } finally {
      setIsProcessing(false);
      setActionToConfirm(null);
    }
  };

  const openConfirmation = (action: 'delete' | 'confirm' | 'unconfirm') => {
      setActionToConfirm(action);
      setIsAlertOpen(true);
  }

  const getAlertStrings = () => {
      switch(actionToConfirm) {
          case 'delete': return { title: "Delete Member?", description: "This will permanently delete the member and all associated data. This action cannot be undone." };
          case 'confirm': return { title: "Confirm Member Account?", description: "This will activate the member's account, setting their status to 'Member (Active)' and enabling platform features." };
          case 'unconfirm': return { title: "Suspend Member?", description: "This will suspend the member's account, setting their status to 'suspended'." };
          default: return { title: "Are you sure?", description: "This action cannot be undone." };
      }
  }

  return (
    <>
      <Dialog open={isInstructionOpen} onOpenChange={setIsInstructionOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>How to Invite or Reset Password</DialogTitle>
                <DialogDescription>
                    To ensure security, members must reset their own password.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <p className="font-semibold">Please instruct the user to do the following:</p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Go to the <Link href="/signin" className="text-primary underline">Sign In</Link> page.</li>
                    <li>Enter their email address: <span className="font-mono bg-muted p-1 rounded">{member.email}</span></li>
                    <li>Click the "Forgot password?" link.</li>
                    <li>Follow the instructions sent to their email to set or reset their password.</li>
                </ol>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsInstructionOpen(false)}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex justify-end items-center gap-1">
          <Button asChild variant="ghost" size="icon">
              <Link href={`/backend?view=wallet&memberId=${member.id}`} title="View & Manage Member">
                  <Eye className="h-4 w-4" />
              </Link>
          </Button>
        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={isProcessing}>
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setIsInstructionOpen(true)}>
                <Send className="mr-2 h-4 w-4" /> Invite / Reset Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => openConfirmation('confirm')}>
                  <CheckCircle className="mr-2 h-4 w-4" /> Confirm Member
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openConfirmation('unconfirm')}>
                  <XCircle className="mr-2 h-4 w-4" /> Suspend
                </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onSelect={() => openConfirmation('delete')}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{getAlertStrings().title}</AlertDialogTitle>
              <AlertDialogDescription>
                {getAlertStrings().description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleAction} className={buttonVariants({ variant: actionToConfirm === 'delete' ? 'destructive' : 'default' })}>
                Yes, proceed
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
