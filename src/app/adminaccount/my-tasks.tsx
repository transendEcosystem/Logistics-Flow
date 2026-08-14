
'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlusCircle, ClipboardList, Edit, Trash2, CheckCircle, Circle } from "lucide-react";
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { getClientSideAuthToken, useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { formatDateSafe } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { collection, query, where, orderBy } from 'firebase/firestore';

// Zod Schema for the task form
const taskSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  relatedToName: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

// Task Dialog for adding/editing tasks
function TaskDialog({ task, onSave, isOpen, onOpenChange }: { task?: any; onSave: () => void; isOpen: boolean; onOpenChange: (open: boolean) => void; }) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
  });

  useEffect(() => {
    if (isOpen) {
        form.reset({
            title: task?.title || '',
            relatedToName: task?.relatedToName || '',
            description: task?.description || '',
            dueDate: task?.dueDate ? formatDateSafe(task.dueDate, 'yyyy-MM-dd') : '',
        });
    }
  }, [isOpen, task, form]);

  const onSubmit = async (values: TaskFormValues) => {
    setIsLoading(true);
    if (!user) {
        toast({ variant: 'destructive', title: 'Not logged in' });
        setIsLoading(false);
        return;
    }
    try {
        const token = await getClientSideAuthToken();
        if (!token) throw new Error("Authentication failed.");

        const path = task ? `/users/${user.uid}/tasks/${task.id}` : `/users/${user.uid}/tasks`;
        const data = task
            ? { ...values, updatedAt: { _methodName: 'serverTimestamp' } }
            : { ...values, status: 'pending', assigneeId: user.uid, createdAt: { _methodName: 'serverTimestamp' } };
        
        const apiEndpoint = task ? '/api/updateUserDoc' : '/api/addUserDoc';
        
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(task ? { path, data } : { collectionPath: path, data }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to save task.');

        toast({ title: task ? 'Task Updated' : 'Task Created' });
        onSave();
        onOpenChange(false);
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: e.message });
    } finally {
        setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>{task ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                <DialogDescription>
                    Fill in the details for your task or reminder.
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="relatedToName" render={({ field }) => ( <FormItem><FormLabel>Related To (Optional)</FormLabel><FormControl><Input placeholder="e.g. Partner One" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="dueDate" render={({ field }) => ( <FormItem><FormLabel>Due Date (Optional)</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                    <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description / Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Save Task</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
  );
}

// Main Component
export default function MyTasksContent() {
    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any | null>(null);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<any | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const tasksQuery = useMemoFirebase(() => {
        if (!firestore || !user?.uid) return null;
        return query(collection(firestore, `users/${user.uid}/tasks`), orderBy('dueDate', 'asc'));
    }, [firestore, user?.uid]);

    const { data: tasks, isLoading: areTasksLoading, forceRefresh } = useCollection(tasksQuery);

    const isLoading = isUserLoading || areTasksLoading;

    const handleAction = async (task: any, action: 'toggle' | 'delete') => {
        setIsProcessing(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            
            if (action === 'delete') {
                await fetch('/api/deleteUserDoc', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: `users/${user!.uid}/tasks/${task.id}` }),
                });
                toast({ title: "Task Deleted" });
            } else if (action === 'toggle') {
                await fetch('/api/updateUserDoc', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        path: `users/${user!.uid}/tasks/${task.id}`,
                        data: { status: task.status === 'pending' ? 'completed' : 'pending' }
                    }),
                });
                toast({ title: `Task marked as ${task.status === 'pending' ? 'completed' : 'pending'}.` });
            }
            forceRefresh();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
        } finally {
            setIsProcessing(false);
            setTaskToDelete(null);
            setIsDeleteAlertOpen(false);
        }
    };
    
    const columns: ColumnDef<any>[] = useMemo(() => [
        {
            id: 'status',
            header: 'Status',
            cell: ({ row }) => (
                <Button variant="ghost" size="icon" onClick={() => handleAction(row.original, 'toggle')}>
                    {row.original.status === 'completed' ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                </Button>
            ),
        },
        { accessorKey: 'title', header: 'Title' },
        { accessorKey: 'relatedToName', header: 'Related To' },
        { accessorKey: 'description', header: 'Description', cell: ({ row }) => <p className="truncate max-w-xs">{row.original.description}</p> },
        { accessorKey: 'dueDate', header: 'Due Date', cell: ({ row }) => formatDateSafe(row.original.dueDate, 'dd MMM yyyy') },
        {
            id: 'actions',
            header: <div className="text-right">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-end">
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedTask(row.original); setIsEditDialogOpen(true); }}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setTaskToDelete(row.original); setIsDeleteAlertOpen(true); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            )
        },
    ], [handleAction]);

    const pendingTasks = useMemo(() => tasks?.filter(t => t.status === 'pending') || [], [tasks]);
    const completedTasks = useMemo(() => tasks?.filter(t => t.status === 'completed') || [], [tasks]);


    return (
        <>
            <TaskDialog 
                isOpen={isAddDialogOpen} 
                onOpenChange={setIsAddDialogOpen} 
                onSave={forceRefresh} 
            />
            {selectedTask && (
                <TaskDialog 
                    isOpen={isEditDialogOpen} 
                    onOpenChange={setIsEditDialogOpen} 
                    task={selectedTask}
                    onSave={forceRefresh} 
                />
            )}
            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete the task: "{taskToDelete?.title}".</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setTaskToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleAction(taskToDelete, 'delete')} className={buttonVariants({ variant: "destructive" })}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div className="space-y-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2"><ClipboardList /> My Tasks & Reminders</CardTitle>
                            <CardDescription>Keep track of your outreach and follow-up activities.</CardDescription>
                        </div>
                        <Button onClick={() => setIsAddDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4"/>Add Task</Button>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                        ) : (
                            <DataTable columns={columns} data={pendingTasks} />
                        )}
                    </CardContent>
                </Card>
                
                {completedTasks.length > 0 && (
                     <Card>
                        <CardHeader>
                            <CardTitle>Completed Tasks</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DataTable columns={columns} data={completedTasks} />
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}
