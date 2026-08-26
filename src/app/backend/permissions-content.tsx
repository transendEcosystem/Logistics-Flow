'use client';

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getClientSideAuthToken } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormField } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lock, Save, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const commercialResources = [
  ['loads', 'View Loads', 'Search freight and view load details.'],
  ['postLoads', 'Post Loads', 'Create and publish freight instructions.'],
  ['warehouseMall', 'View Warehouses', 'Search storage capacity and services.'],
  ['postWarehouse', 'Post Warehouse Capacity', 'Publish storage capacity and terms.'],
  ['transporterMall', 'View Transporters', 'Search verified transport capacity.'],
  ['postTransport', 'Post Transport Capacity', 'Publish fleet, routes, and capacity.'],
  ['supplierMall', 'View Suppliers', 'Search verified suppliers and services.'],
  ['postProducts', 'Post Supplier Products', 'Create and publish storefront products.'],
  ['buySellMall', 'View Assets', 'Browse vehicle and equipment listings.'],
  ['postAssets', 'Post Assets', 'Publish vehicles and equipment for sale.'],
  ['financeMall', 'View Finance Providers', 'Search lenders and funding products.'],
  ['postFinance', 'Post Finance Products', 'Publish lending products and criteria.'],
  ['billing', 'Buy Membership', 'Purchase or change membership plans.'],
  ['wallet', 'Wallet and Payouts', 'View balances and request payouts.'],
  ['enquiries', 'Enquiries', 'Create and manage commercial enquiries.'],
  ['quotes', 'Quotes', 'Create and manage commercial quotes.'],
  ['transactions', 'Company Transactions', 'View and manage company transactions.'],
  ['shop', 'Digital Branch', 'Create, edit, and publish the storefront.'],
  ['staff', 'Staff and Permissions', 'Manage the company team and authority.'],
] as const;

const commercialActions = [
  ['view', 'View'],
  ['edit', 'Edit'],
  ['analyze', 'Analyze'],
  ['authorize', 'Authorize'],
] as const;

const roleResources = {
  supplier: commercialResources.filter(([resource]) => ['supplierMall', 'postProducts', 'enquiries', 'quotes', 'wallet', 'billing', 'transactions', 'shop'].includes(resource)),
  transporter: commercialResources.filter(([resource]) => ['loads', 'postLoads', 'transporterMall', 'postTransport', 'enquiries', 'quotes', 'wallet', 'billing', 'transactions', 'shop'].includes(resource)),
  finance: commercialResources.filter(([resource]) => ['financeMall', 'postFinance', 'enquiries', 'quotes', 'wallet', 'billing', 'transactions'].includes(resource)),
} as const;
type CommercialRole = keyof typeof roleResources;

const permissionsSchema = z.object(Object.fromEntries(
  commercialResources.map(([resource]) => [resource, z.array(z.string()).optional()])
) as Record<string, z.ZodOptional<z.ZodArray<z.ZodString>>>);
type PermissionsFormValues = z.infer<typeof permissionsSchema>;

export function PermissionsDialog({ staffMember, onSave }: { staffMember: any; onSave: () => void }) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [activeRole, setActiveRole] = useState<CommercialRole>('transporter');
  const form = useForm<PermissionsFormValues>({ resolver: zodResolver(permissionsSchema), defaultValues: {} });

  const parsePermissions = (permissions: string[] = [], role: CommercialRole = activeRole) => {
    const resources = roleResources[role];
    const values: Record<string, string[]> = Object.fromEntries(resources.map(([resource]) => [resource, []]));
    permissions.forEach(permission => {
      const [action, resource] = permission.split(':');
      if (values[resource] && commercialActions.some(([id]) => id === action)) values[resource].push(action);
    });
    return values;
  };

  useEffect(() => {
    if (open) {
      const rolePermissions = staffMember.permissionsByRole?.[activeRole] || staffMember.permissions || [];
      form.reset(parsePermissions(rolePermissions, activeRole));
    }
  }, [open, staffMember, form, activeRole]);

  const watched = form.watch();
  const allSelected = useMemo(() => roleResources[activeRole].every(([resource]) => commercialActions.every(([action]) => watched[resource]?.includes(action))), [watched, activeRole]);
  const selectAll = (checked: boolean) => roleResources[activeRole].forEach(([resource]) => form.setValue(resource, checked ? commercialActions.map(([action]) => action) : []));

  const save = async (values: PermissionsFormValues) => {
    setIsSaving(true);
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Authentication failed.');
      const permissions = Object.entries(values).flatMap(([resource, actions]) => (actions || []).map(action => `${action}:${resource}`));
      const permissionsByRole = { ...(staffMember.permissionsByRole || {}), [activeRole]: permissions };
      const path = staffMember.type === 'platform' ? `platformStaff/${staffMember.id}` : `companies/${staffMember.companyId}/staff/${staffMember.id}`;
      const response = await fetch('/api/updateUserDoc', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ path, data: { permissions, permissionsByRole } }) });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to save permissions.');
      toast({ title: 'Permissions Updated', description: `Commercial permissions for ${staffMember.firstName} were saved.` });
      onSave();
      setOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="outline" size="sm" title="Manage Permissions"><ShieldCheck className="mr-2 h-4 w-4" />Permissions</Button></DialogTrigger>
    <DialogContent className="sm:max-w-5xl max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Edit Authority: {staffMember.firstName} {staffMember.lastName}</DialogTitle><DialogDescription>Set this staff member's commercial account access. The existing View, Edit, Analyze, and Authorize columns are retained.</DialogDescription></DialogHeader>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><Label>Portal Role</Label><Select value={activeRole} onValueChange={value => setActiveRole(value as CommercialRole)}><SelectTrigger className="mt-1 w-[220px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="supplier">Supplier Portal</SelectItem><SelectItem value="transporter">Transporter Portal</SelectItem><SelectItem value="finance">Finance Portal</SelectItem></SelectContent></Select></div><label className="flex items-center gap-2"><Checkbox id="select-all-commercial" checked={allSelected} onCheckedChange={checked => selectAll(!!checked)} /><span>Authorize All Capabilities</span></label></div>
      <Form {...form}><form onSubmit={form.handleSubmit(save)}><div className="overflow-x-auto rounded-md border"><div className="min-w-[720px]"><div className="grid grid-cols-[2fr_repeat(4,1fr)] gap-2 border-b bg-muted p-4 text-xs font-bold uppercase"><span>Commercial Account Capabilities</span>{commercialActions.map(([, label]) => <span key={label} className="text-center">{label}</span>)}</div>{roleResources[activeRole].map(([resource, label, description]) => <FormField key={resource} control={form.control} name={resource} render={({ field }) => <div className="grid grid-cols-[2fr_repeat(4,1fr)] items-center gap-2 border-b p-4"><div><p className="font-semibold">{label}</p><p className="text-xs text-muted-foreground">{description}</p></div>{commercialActions.map(([action]) => <div key={action} className="flex justify-center"><Checkbox checked={field.value?.includes(action)} onCheckedChange={checked => field.onChange(checked ? [...(field.value || []), action] : (field.value || []).filter(value => value !== action))} /></div>)}</div>} />)}</div></div></form></Form>
      <DialogFooter><Button type="button" onClick={form.handleSubmit(save)} disabled={isSaving}><Save className="mr-2 h-4 w-4" />{isSaving ? 'Saving...' : 'Save Permissions'}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

export default function PermissionsContent() {
  return <div className="p-8"><h1 className="text-3xl font-bold flex items-center gap-3"><Lock className="h-8 w-8 text-primary" />Commercial Account Permissions</h1><p className="mt-2 text-muted-foreground">Open Staff, Roles &amp; Permissions from the company account to assign authority to a staff member.</p></div>;
}
