'use client';

import { useUser, getClientSideAuthToken } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, FileText, MoreVertical, Trash2, Edit, Eye, Zap, Landmark, Globe, PlusCircle } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useCallback } from 'react';
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
import { formatCurrency, formatDateSafe, cn } from '@/lib/utils';

const statusColors: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  pending: 'secondary',
  under_review: 'outline',
  matched: 'default',
  rejected: 'destructive',
  funded: 'default'
};

const fundingNeedsMap: { [key: string]: string } = {
    'business': 'My Business',
    'equipment': 'Equipment',
    'vehicles': 'Vehicles',
    'cashflow': 'Cashflow',
    'loan-pv-term': 'Working Capital',
    'installment-sale-term': 'Equipment Finance',
    'disclosed-confirmed-factoring': 'Factoring',
};

export default function EnquiriesCard() {
    const { user, isUserLoading: isAdminLoading } = useUser();
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [enquiries, setEnquiries] = useState<any[]>([]);
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

    const fetchEnquiries = useCallback(async () => {
        if (!companyId) return;
        setIsLoading(true);
        setError(null);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");

            const response = await fetch('/api/getUserSubcollection', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: `companies/${companyId}/enquiries`, type: 'collection' }),
            });
            
            if (!response.ok) {
                throw new Error(`Server returned status ${response.status}`);
            }

            const text = await response.text();
            if (!text) {
                setEnquiries([]);
                return;
            }

            const result = JSON.parse(text);
            if (!result.success) throw new Error(result.error || 'Failed to fetch enquiries.');
            
            const sortedEnquiries = (result.data || []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setEnquiries(sortedEnquiries);
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
            fetchEnquiries();
        }
    }, [companyId, fetchEnquiries]);

    const handleDelete = async (enquiryId: string) => {
        if (!companyId) return;
        setIsDeleting(enquiryId);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            
            await fetch('/api/deleteUserDoc', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: `companies/${companyId}/enquiries/${enquiryId}` }),
            });
            
            toast({ title: "Enquiry Deleted", description: "The enquiry has been removed." });
            fetchEnquiries();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Delete Failed", description: e.message });
        } finally {
            setIsDeleting(null);
        }
    };

    const isAdmin = user && (
        user.email === 'beyondtransport@gmail.com' || 
        user.email === 'mkoton100@gmail.com' ||
        user.email === 'michael@logisticsflow.co.za'
    );
    if (isAdmin) return null;
    
    const pageIsLoading = isAdminLoading || isLoading;

    return (
        <Card className="text-left">
            <CardHeader className="text-left border-b bg-muted/20">
                <CardTitle className="flex items-center gap-2 text-left">
                   <FileText className="h-6 w-6 text-primary" />
                   Funding Applications Ledger
                </CardTitle>
                <CardDescription className="text-left">
                    Manage your internal and market-broadcast enquiries.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
                <div className="flex flex-col sm:flex-row gap-4">
                    <Button asChild className="flex-1 h-12 font-bold gap-2 shadow-sm" variant="default">
                        <Link href="/funding">
                            <Landmark className="h-4 w-4" /> Start In-House Application
                        </Link>
                    </Button>
                    <Button asChild className="flex-1 h-12 font-bold gap-2 shadow-sm" variant="outline">
                        <Link href="/funding/apply?origination=market">
                            <Globe className="h-4 w-4 text-primary" /> Start Market Broadcast
                        </Link>
                    </Button>
                </div>

                {pageIsLoading && (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
                
                {error && (
                    <div className="text-center py-10 text-destructive">
                        <p>Error loading enquiries: {error}</p>
                    </div>
                )}

                {!pageIsLoading && !error && (
                    enquiries && enquiries.length > 0 ? (
                        <div className="overflow-x-auto rounded-lg border">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Path</TableHead>
                                        <TableHead>Purpose</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {enquiries.map((enquiry) => (
                                        <TableRow key={enquiry.id} className="hover:bg-slate-50/50">
                                            <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{formatDateSafe(enquiry.createdAt, "dd MMM yyyy")}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn(
                                                    "text-[10px] font-black uppercase tracking-tight h-5",
                                                    enquiry.originationType === 'direct' ? "bg-green-50 text-green-700 border-green-100" : "bg-blue-50 text-blue-700 border-blue-100"
                                                )}>
                                                    {enquiry.originationType === 'direct' ? 'Direct' : 'Broadcast'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-xs font-bold text-foreground">
                                                    {fundingNeedsMap[enquiry.fundingNeed] || enquiry.fundingNeed?.replace(/-/g, ' ')}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={statusColors[enquiry.status] || 'secondary'} className="capitalize text-[10px]">
                                                    {enquiry.status.replace(/_/g, ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-bold text-sm whitespace-nowrap">
                                                {formatCurrency(enquiry.amountRequested)}
                                            </TableCell>
                                            <TableCell className="text-right space-x-1">
                                                <Button asChild variant="ghost" size="icon">
                                                    <Link href={`/account/enquiries/${enquiry.id}`}><Eye className="h-4 w-4" /></Link>
                                                </Button>
                                                <Button asChild variant="ghost" size="icon">
                                                     <Link href={`/funding/apply?enquiryId=${enquiry.id}`}><Edit className="h-4 w-4" /></Link>
                                                </Button>
                                                 <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem
                                                                    className="text-destructive"
                                                                    onSelect={(e) => e.preventDefault()}
                                                                 >
                                                                    {isDeleting === enquiry.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        This action cannot be undone. This will permanently delete your enquiry.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDelete(enquiry.id)} className={buttonVariants({ variant: "destructive" })}>
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
                        </div>
                    ) : (
                         <div className="text-center py-20 border-2 border-dashed rounded-xl bg-slate-50/50">
                            <PlusCircle className="mx-auto h-12 w-12 text-muted-foreground/20" />
                            <p className="text-muted-foreground mt-4 font-medium">You have no formal enquiries yet.</p>
                             <p className="text-sm text-muted-foreground mt-1">Select an origination path above to begin.</p>
                        </div>
                    )
                )}
            </CardContent>
        </Card>
    );
}
