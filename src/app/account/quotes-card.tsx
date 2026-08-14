'use client';

import { useUser, getClientSideAuthToken } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, FileText, MoreVertical, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useCallback } from 'react';
import { formatCurrency, formatDateSafe } from '@/lib/utils';


export default function QuotesCard() {
    const { user, isUserLoading: isAdminLoading } = useUser();
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [quotes, setQuotes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [companyId, setCompanyId] = useState<string | null>(user?.companyId || null);

    const fetchCompanyId = useCallback(async () => {
        if (!user?.uid) return;
        if (user?.companyId) {
            setCompanyId(user.companyId);
            return;
        }
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            
            const response = await fetch('/api/getUserSubcollection', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: `users/${user.uid}`, type: 'document' }),
            });

            if (!response.ok) return;

            const text = await response.text();
            if (!text) return;

            const result = JSON.parse(text);
            if (result.success && result.data?.companyId) {
                setCompanyId(result.data.companyId);
            }
        } catch (err) {
            console.warn("Failed to fetch companyId:", err);
        }
    }, [user]);

    const fetchQuotes = useCallback(async () => {
        if (!companyId) return;
        setIsLoading(true);
        setError(null);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");

            const response = await fetch('/api/getUserSubcollection', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: `companies/${companyId}/quotes`, type: 'collection' }),
            });
            
            if (!response.ok) {
                throw new Error(`Server returned status ${response.status}`);
            }

            const text = await response.text();
            if (!text) {
                setQuotes([]);
                return;
            }

            const result = JSON.parse(text);
            if (!result.success) throw new Error(result.error || 'Failed to fetch quotes.');
            
            const sortedQuotes = (result.data || []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setQuotes(sortedQuotes.slice(0, 10));
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, [companyId]);
    
    useEffect(() => {
        if (user) {
            if (user.companyId) {
                setCompanyId(user.companyId);
            } else {
                fetchCompanyId();
            }
        }
    }, [user, fetchCompanyId]);

    useEffect(() => {
        if (companyId) {
            fetchQuotes();
        }
    }, [companyId, fetchQuotes]);

    const handleDelete = async (quoteId: string) => {
        if (!companyId) return;
        setIsDeleting(quoteId);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            
            await fetch('/api/deleteUserDoc', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: `companies/${companyId}/quotes/${quoteId}` }),
            });

            toast({ title: "Quote Deleted", description: "The quote has been removed from your saved list." });
            fetchQuotes();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Delete Failed", description: e.message });
        } finally {
            setIsDeleting(null);
        }
    };


    const isAdmin = user && (user.email === 'beyondtransport@gmail.com' || user.email === 'mkoton100@gmail.com');
    if (isAdmin) {
        return null;
    }
    
    const pageIsLoading = isAdminLoading || isLoading;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                   <FileText className="h-6 w-6" />
                   My Saved Quotes
                </CardTitle>
                <CardDescription>Explore funding products to generate a quote. Your recent saved quotes are shown here.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="mb-6">
                    <Button asChild>
                        <Link href="/funding">Explore Funding & Get a Quote</Link>
                    </Button>
                </div>
                {pageIsLoading && (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
                
                {error && (
                    <div className="text-center py-10 text-destructive">
                        <p>Error loading quotes: {error}</p>
                    </div>
                )}

                {!pageIsLoading && !error && (
                    quotes && quotes.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Term</TableHead>
                                    <TableHead>Est. Payment</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {quotes.map((quote) => (
                                    <TableRow key={quote.id}>
                                        <TableCell className="text-muted-foreground text-xs">{formatDateSafe(quote.createdAt, "dd MMM yyyy")}</TableCell>
                                        <TableCell>
                                            <p className="font-medium capitalize">{quote.fundingType?.replace(/-/g, ' ')}</p>
                                        </TableCell>
                                        <TableCell className="font-semibold">{formatCurrency(quote.amountRequested)}</TableCell>
                                        <TableCell>{quote.details?.term || 'N/A'} months</TableCell>
                                        <TableCell>{formatCurrency(quote.details?.monthlyPayment)}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem>View</DropdownMenuItem>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem
                                                                className="text-destructive"
                                                                onSelect={(e) => e.preventDefault()}
                                                            >
                                                               {isDeleting === quote.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                                               Delete
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This action cannot be undone. This will permanently delete your saved quote.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(quote.id)} className={buttonVariants({ variant: "destructive" })}>
                                                                    Delete
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-10 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">You have no saved quotes yet.</p>
                            <p className="text-sm text-muted-foreground mt-1">Generate a quote from our funding products page.</p>
                        </div>
                    )
                )}
            </CardContent>
        </Card>
    );
}