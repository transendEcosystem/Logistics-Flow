
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@/hooks/use-data-table';
import { Badge } from '@/components/ui/badge';
import { getClientSideAuthToken } from '@/firebase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { MoreVertical, Mail, XCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { formatDateSafe } from '@/lib/utils';


async function fetchFromAdminAPI(token: string, action: string, payload?: any) {
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

export default function UsersList() {
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const loadUsers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            
            const result = await fetchFromAdminAPI(token, 'listAllUsers');
            setUsers(result.data || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);
    
    const handlePasswordReset = async (email: string) => {
        try {
            const auth = getAuth();
            await sendPasswordResetEmail(auth, email);
            toast({
                title: 'Password Reset Email Sent',
                description: `A reset link has been sent to ${email}.`,
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Failed to Send Email',
                description: error.message,
            });
        }
    };


    const columns: ColumnDef<any>[] = useMemo(() => [
        { 
          accessorKey: 'displayName', 
          header: 'Name', 
          cell: ({row}) => <div>{row.original.displayName || 'N/A'}</div> 
        },
        { 
          accessorKey: 'email', 
          header: 'Email', 
          cell: ({row}) => <div>{row.original.email}</div> 
        },
        { 
          accessorKey: 'uid', 
          header: 'User ID', 
          cell: ({row}) => <div className="font-mono text-xs">{row.original.uid}</div> 
        },
        { 
          accessorKey: 'disabled', 
          header: 'Status', 
          cell: ({row}) => <Badge variant={row.original.disabled ? 'destructive' : 'default'}>{row.original.disabled ? 'Disabled' : 'Active'}</Badge> 
        },
        { 
          accessorKey: 'creationTime', 
          header: 'Date Created', 
          cell: ({row}) => formatDateSafe(row.original.creationTime)
        },
        { 
          accessorKey: 'lastSignInTime', 
          header: 'Last Sign-In', 
          cell: ({row}) => formatDateSafe(row.original.lastSignInTime)
        },
        {
          id: 'actions',
          header: <div className="text-right">Actions</div>,
          cell: ({ row }) => (
            <div className="text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handlePasswordReset(row.original.email)}>
                           <Mail className="mr-2 h-4 w-4" /> Send Password Reset
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>
                           <XCircle className="mr-2 h-4 w-4" /> Disable User
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
          )
        },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ], []);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users /> All Authenticated Users</CardTitle>
                <CardDescription>A list of all users registered with Firebase Authentication.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                ) : error ? (
                    <div className="text-destructive text-center py-10 bg-destructive/10 rounded-md">
                        <p className="font-semibold">Error loading users:</p>
                        <p className="text-sm">{error}</p>
                    </div>
                ) : (
                    <DataTable columns={columns} data={users} />
                )}
            </CardContent>
        </Card>
    );
}
