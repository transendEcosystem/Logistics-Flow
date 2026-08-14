'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    Loader2, Lock, Edit, RefreshCcw, ShieldCheck, Scale, Landmark, Zap, FileCheck, 
    Gavel, UserCheck, Info, Save, Ban, Trash2, MoreVertical, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger 
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn, fetchFromAdminAPI } from '@/lib/utils';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Label } from '@/components/ui/label';
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, 
    AlertDialogTrigger 
} from '@/components/ui/alert-dialog';

// --- LENDING-CENTRIC PERMISSION SCHEMA ---

const lendingResources = [
    { id: 'debtor', label: 'Debtor Registry', description: 'Client profiles, KYC standing, and historical data.' },
    { id: 'discovery', label: 'Forensic Discovery', description: 'Vision AI extractions, sitemap mining, and KYC audits.' },
    { id: 'agreement', label: 'Lending Agreements', description: 'Repayment schedules, contract terms, and disbursements.' },
    { id: 'asset', label: 'Asset Register', description: 'Financed equipment, RC1 verification, and valuations.' },
    { id: 'collateral', label: 'Collateral Vault', description: 'Security documents, sureties, pledges, and cessions.' },
    { id: 'policy', label: 'Lending Policies', description: 'Business model, target margins, and risk thresholds.' },
    { id: 'utility', label: 'Global Utilities', description: 'Installment raising, prime rate sync, and batch interest.' },
    { id: 'staff', label: 'Staff & Authority', description: 'Management of internal team and functional permissions.' },
] as const;

const lendingActions = [
    { id: 'view', label: 'View', description: 'Read-only access to registry records.' },
    { id: 'edit', label: 'Edit', description: 'Ability to update data nodes or technical specs.' },
    { id: 'analyze', label: 'Analyze', description: 'Execute forensic engines, discovery, or scorecards.' },
    { id: 'authorize', label: 'Authorize', description: 'Final credit approval or disbursement authority.' },
] as const;

const permissionsSchema = z.object({
  ...lendingResources.reduce((acc, resource) => {
    acc[resource.id] = z.array(z.string()).optional();
    return acc;
  }, {} as Record<string, z.ZodOptional<z.ZodArray<z.ZodString, "many">>>),
});

type PermissionsFormValues = z.infer<typeof permissionsSchema>;

// --- HELPER COMPONENTS ---

function PermissionsDialog({ staffMember, onSave }: { staffMember: any, onSave: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const parsePermissions = (permissions: string[] = []): PermissionsFormValues => {
        const parsed: any = {};
        for (const resource of lendingResources) {
            parsed[resource.id] = [];
        }
        for (const p of permissions) {
            const [actionId, resourceId] = p.split(':');
            if (resourceId && parsed[resourceId] && lendingActions.some(a => a.id === actionId)) {
                parsed[resourceId].push(actionId);
            }
        }
        return parsed;
    };
    
    const form = useForm<PermissionsFormValues>({
        resolver: zodResolver(permissionsSchema),
        defaultValues: parsePermissions(staffMember.permissions),
    });

    const watchedPermissions = form.watch();

    const isAllSelected = useMemo(() => {
        return lendingResources.every(resource =>
            lendingActions.every(action =>
                watchedPermissions[resource.id]?.includes(action.id)
            )
        );
    }, [watchedPermissions]);
    
    const handleSelectAll = (checked: boolean) => {
        const allActionIds = lendingActions.map(a => a.id);
        lendingResources.forEach(resource => {
            form.setValue(resource.id, checked ? allActionIds : []);
        });
    };
    
     useEffect(() => {
        if (isOpen) {
            form.reset(parsePermissions(staffMember.permissions));
        }
    }, [isOpen, staffMember, form]);
    
    const processPermissionsForSave = (data: PermissionsFormValues): string[] => {
        const generatedPermissions: string[] = [];
        for (const resourceId in data) {
            const selectedActions = data[resourceId as keyof typeof data];
            if (selectedActions && selectedActions.length > 0) {
                for (const actionId of selectedActions) {
                    generatedPermissions.push(`${actionId}:${resourceId}`);
                }
            }
        }
        return generatedPermissions;
    };
    
    const onSubmit = async (data: PermissionsFormValues) => {
        setIsLoading(true);
        const finalPermissions = processPermissionsForSave(data);
        
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");

            const path = staffMember.type === 'platform' 
                ? `platformStaff/${staffMember.id}`
                : `companies/${staffMember.companyId}/staff/${staffMember.id}`;

            const response = await fetch('/api/updateUserDoc', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: path,
                    data: { permissions: finalPermissions }
                }),
            });

            if (!response.ok) throw new Error((await response.json()).error || 'Failed to save authority.');
            
            toast({ title: 'Authority Updated', description: `Lending permissions for ${staffMember.firstName} are now synchronized.` });
            onSave();
            setIsOpen(false);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 <Button variant="ghost" size="icon" title="Edit Authority"><Edit className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-5xl text-left text-foreground overflow-hidden flex flex-col h-[85vh] p-0">
                <DialogHeader className="p-6 border-b bg-muted/30 shrink-0 text-left">
                    <div className="flex items-center gap-4 text-left">
                        <div className="bg-primary/10 p-3 rounded-xl"><Lock className="h-6 w-6 text-primary"/></div>
                        <div className="text-left">
                            <DialogTitle className="text-xl font-black uppercase tracking-tight text-left">Edit Authority: {staffMember.firstName} {staffMember.lastName}</DialogTitle>
                            <DialogDescription className="text-left text-foreground">Define functional boundaries within the lending cycle.</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 text-left text-foreground">
                    <div className="flex items-center gap-2 px-2 text-left">
                        <Checkbox
                            id="select-all-matrix"
                            checked={isAllSelected}
                            onCheckedChange={(checked) => handleSelectAll(!!checked)}
                        />
                        <Label htmlFor="select-all-matrix" className="text-xs font-black uppercase tracking-widest cursor-pointer text-left">Authorize All Capabilities (Full Oversight)</Label>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 text-left">
                            <div className="rounded-2xl border shadow-inner overflow-hidden bg-slate-50/50 text-left">
                                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center gap-2 sticky top-0 bg-slate-100 p-4 border-b z-20 text-left">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">Lending Infrastructure Nodes</div>
                                    {lendingActions.map(action => (
                                        <div key={action.id} className="text-center">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{action.label}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="divide-y text-left">
                                    {lendingResources.map((resource) => (
                                        <FormField
                                            key={resource.id}
                                            control={form.control}
                                            name={resource.id as any}
                                            render={({ field }) => (
                                            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center gap-2 p-4 hover:bg-white transition-colors text-left">
                                                <div className="text-left">
                                                    <p className="font-bold text-sm text-foreground">{resource.label}</p>
                                                    <p className="text-[10px] text-muted-foreground leading-tight">{resource.description}</p>
                                                </div>
                                                {lendingActions.map(action => (
                                                    <div key={action.id} className="flex justify-center">
                                                        <Checkbox
                                                            checked={field.value?.includes(action.id)}
                                                            onCheckedChange={(checked) => {
                                                                return checked
                                                                ? field.onChange([...(field.value || []), action.id])
                                                                : field.onChange((field.value || []).filter((value) => value !== action.id))
                                                            }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>
                        </form>
                    </Form>
                </div>

                <DialogFooter className="p-6 border-t bg-slate-50">
                    <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isLoading} className="w-full h-12 font-black uppercase tracking-tight shadow-lg text-white">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />} 
                        Commit Authority node
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- MAIN COMPONENT ---

export default function PermissionsContent() {
    const { toast } = useToast();
    const [staff, setStaff] = useState<any[]>([]);
    const [platformStaff, setPlatformStaff] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const forceRefresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth failed");
            
            const [staffRes, platformRes, companiesRes] = await Promise.all([
                fetchFromAdminAPI(token, 'getStaff'),
                fetchFromAdminAPI(token, 'getPlatformStaff'),
                fetchFromAdminAPI(token, 'getMembers')
            ]);

            setStaff(staffRes.data || []);
            setPlatformStaff(platformRes.data || []);
            setCompanies(companiesRes.data || []);

        } catch (e: any) {
            setError(e.message);
            toast({ variant: 'destructive', title: 'Error Loading Matrix', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => { forceRefresh(); }, [forceRefresh]);

    const handleUpdateStatus = async (staffMember: any, status: 'active' | 'inactive') => {
        setIsProcessing(staffMember.id);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;

            const path = staffMember.type === 'platform' 
                ? `platformStaff/${staffMember.id}`
                : `companies/${staffMember.companyId}/staff/${staffMember.id}`;

            await fetch('/api/updateUserDoc', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ path, data: { status, updatedAt: { _methodName: 'serverTimestamp' } } }),
            });

            toast({ title: `Node ${status === 'active' ? 'Reactivated' : 'Suspended'}` });
            forceRefresh();
        } catch (e) {
            toast({ variant: 'destructive', title: "Update Failed" });
        } finally {
            setIsProcessing(null);
        }
    };

    const handleDelete = async (staffMember: any) => {
        setIsProcessing(staffMember.id);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;

            const action = staffMember.type === 'platform' ? 'deletePlatformStaff' : 'deleteStaffMember';
            const payload = staffMember.type === 'platform' 
                ? { staffId: staffMember.id }
                : { companyId: staffMember.companyId, staffId: staffMember.id };

            await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, payload }),
            });

            toast({ title: "Node Expunged", description: "The staff record has been removed from the registry." });
            forceRefresh();
        } catch (e) {
            toast({ variant: 'destructive', title: "Delete Failed" });
        } finally {
            setIsProcessing(null);
        }
    };

    const enrichedStaff = useMemo(() => {
        if (!staff || !companies || !platformStaff) return [];
        const companyMap = new Map(companies.map(c => [c.id, c.companyName]));
        
        const mappedCompanyStaff = staff.map(s => ({
            ...s,
            type: 'company',
            uniqueId: `company-${s.companyId}-${s.id}`,
            companyName: companyMap.get(s.companyId) || 'External Member'
        }));

        const mappedPlatformStaff = platformStaff.map(s => ({
            ...s,
            type: 'platform',
            uniqueId: `platform-${s.id}`,
            companyName: 'Lending Division (Internal)'
        }));

        return [...mappedPlatformStaff, ...mappedCompanyStaff];
    }, [staff, companies, platformStaff]);


    const columns: ColumnDef<any>[] = [
        {
          header: 'Identity Node',
          cell: ({ row }) => (
            <div className={cn("flex flex-col text-left transition-opacity", row.original.status === 'inactive' && "opacity-40")}>
              <span className="font-bold text-foreground text-left">{row.original.firstName} {row.original.lastName}</span>
              <span className="text-[10px] text-muted-foreground font-mono text-left">{row.original.email}</span>
            </div>
          ),
        },
        {
          header: 'Role / Organization',
          cell: ({ row }) => (
            <div className={cn("flex flex-col text-left", row.original.status === 'inactive' && "opacity-40")}>
                <span className="text-xs font-bold text-slate-700 text-left">{row.original.companyName}</span>
                <Badge variant={row.original.type === 'platform' ? 'default' : 'outline'} className="w-fit text-[8px] h-4 mt-1 uppercase font-black tracking-widest text-left">
                    {row.original.type === 'platform' ? 'Internal Team' : 'Member Staff'}
                </Badge>
            </div>
          ),
        },
        {
          header: 'Account Standing',
          cell: ({ row }) => {
            const status = row.original.status || 'active';
            return (
                <Badge variant={status === 'active' ? 'default' : 'secondary'} className={cn(
                    "capitalize text-[9px] font-black tracking-widest",
                    status === 'active' ? "bg-green-600" : "bg-slate-200 text-slate-600"
                )}>
                    {status}
                </Badge>
            );
          }
        },
        {
          header: 'Authority Matrix',
          cell: ({ row }) => {
            const perms = row.original.permissions || [];
            return (
                <div className="flex items-center gap-2 text-left">
                    {perms.length > 0 ? (
                        <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] uppercase">
                            {perms.length} Functions Active
                        </Badge>
                    ) : <span className="text-[10px] text-muted-foreground italic text-left">No Authority</span>}
                </div>
            )
          }
        },
        {
            id: 'actions',
            header: <div className="text-right">Audit</div>,
            cell: ({ row }) => (
                <div className="text-right flex justify-end gap-1">
                    <PermissionsDialog staffMember={row.original} onSave={forceRefresh} />
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                {isProcessing === row.original.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreVertical className="h-4 w-4" />}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-left">
                            <DropdownMenuItem onClick={() => handleUpdateStatus(row.original, row.original.status === 'inactive' ? 'active' : 'inactive')}>
                                {row.original.status === 'inactive' ? (
                                    <><CheckCircle2 className="h-4 w-4 mr-2 text-green-600" /> Reactivate Node</>
                                ) : (
                                    <><Ban className="h-4 w-4 mr-2 text-amber-600" /> Suspend Authority</>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                        <Trash2 className="h-4 w-4 mr-2" /> Expunge Identity
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="text-left text-foreground">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-left text-foreground">Confirm Permanent Termination</AlertDialogTitle>
                                        <AlertDialogDescription className="text-left text-foreground">
                                            This will permanently delete "{row.original.firstName} {row.original.lastName}" from the lending registry and revoke all functional authorities immediately. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(row.original)} className={cn(buttonVariants({ variant: 'destructive' }))}>
                                            Confirm Termination
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ),
        }
    ];
    

    return (
        <div className="space-y-8 text-left text-foreground">
            <div className="flex justify-between items-end">
                <div className="text-left">
                    <h1 className="text-3xl font-black font-headline tracking-tight flex items-center gap-3 text-left text-foreground">
                        <Lock className="h-8 w-8 text-primary" />
                        Lending Security Matrix
                    </h1>
                    <p className="text-muted-foreground mt-1 text-left">Manage functional authorities and account standing for the capital division and member staff.</p>
                </div>
                <Button variant="outline" onClick={forceRefresh} disabled={isLoading} className="gap-2 text-left">
                    <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    Refresh Matrix
                </Button>
            </div>

            <Card className="border-none shadow-2xl bg-white text-left text-foreground">
                <CardContent className="pt-6 text-left">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground text-center">Synchronizing Authority Ledger...</p>
                        </div>
                    ) : (
                        <DataTable columns={columns} data={enrichedStaff} />
                    )}
                </CardContent>
            </Card>

            <div className="p-10 bg-slate-900 text-white rounded-[3rem] shadow-2xl relative overflow-hidden text-left text-white">
                <div className="absolute top-0 right-0 p-12 opacity-5 text-left"><Gavel className="h-40 w-40 text-primary" /></div>
                <div className="relative z-10 flex items-start gap-6 text-left text-white">
                    <div className="bg-primary/20 p-4 rounded-3xl shrink-0"><Info className="h-8 w-8 text-primary" /></div>
                    <div className="space-y-2 text-left text-white">
                        <h4 className="text-xl font-black uppercase text-left text-white">Institutional Oversight Protocol</h4>
                        <p className="text-slate-400 text-sm leading-relaxed max-w-4xl text-left text-white">
                            Permissions are mapped to the specific stages of the credit life-cycle. Deactivating a node instantly blocks all functional access to the registry, audit tools, and payout authorizations.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
