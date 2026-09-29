'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken } from '@/firebase';
import { fetchFromAdminAPI, formatCurrency } from '@/lib/utils';
import { EditFacilityWizard } from './edit-facility';
import { FileSignature, Loader2, RefreshCcw, Scale, PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getOnboardingProgress, getOnboardingStageDefinition } from '@/lib/lending/onboarding-workflow';

export default function AgreementFacilityRegister() {
  const { toast } = useToast();
  const [facilities, setFacilities] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState<any | null>(null);
  const [isApplicationOpen, setIsApplicationOpen] = useState(false);
  const [application, setApplication] = useState({ clientId: '', masterFacilityId: '', type: '', amountRequested: '', termMonths: '60', description: '', fundingNeed: 'agreement-specific' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Authentication failed.');
      const [facilitiesResult, clientsResult, agreementsResult] = await Promise.all([
        fetchFromAdminAPI(token, 'getLendingData', { collectionName: 'facilities', limit: 250 }),
        fetchFromAdminAPI(token, 'getLendingData', { collectionName: 'lendingClients', limit: 250 }),
        fetchFromAdminAPI(token, 'getLendingData', { collectionName: 'agreements', limit: 250 }),
      ]);
      setFacilities(facilitiesResult.data || []);
      setClients(clientsResult.data || []);
      setAgreements(agreementsResult.data || []);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Register sync failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const clientMap = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const facilityMap = useMemo(() => new Map(facilities.map((facility) => [facility.id, facility])), [facilities]);
  const selectedClient = application.clientId ? clientMap.get(application.clientId) : null;
  const masterFacilities = useMemo(() => facilities.filter((facility) => facility.facilityClass === 'global' && facility.ownerType === 'client' && (facility.status === 'approved' || facility.status === 'active')), [facilities]);

  const rows = useMemo(() => {
    return facilities
      .filter((facility) => facility.facilityClass === 'sub' && facility.ownerType === 'client')
      .map((facility) => {
        const master = facilityMap.get(facility.parentId) || {};
        const client = clientMap.get(facility.clientId || master.clientId) || {};
        const bookedAmount = agreements
          .filter((agreement) => agreement.facilityId === facility.id)
          .reduce((sum, agreement) => sum + Number(agreement.totalAdvanced || 0), 0);
        const remainingCapacity = Math.max(Number(facility.limit || 0) - bookedAmount, 0);
        return {
          ...facility,
          clientName: client.name || 'Unknown client',
          masterLimit: Number(master.limit || 0),
          masterType: master.type || 'Global Ceiling',
          bookedAmount,
          remainingCapacity,
          agreementCount: agreements.filter((agreement) => agreement.facilityId === facility.id).length,
        };
      })
      .sort((first, second) => String(first.clientName).localeCompare(String(second.clientName)) || Number(second.limit || 0) - Number(first.limit || 0));
  }, [agreements, clientMap, facilities, facilityMap]);

  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      accessorKey: 'type',
      header: 'Agreement Facility',
      cell: ({ row }) => <Badge variant="outline" className="capitalize font-black">{String(row.original.type || 'Sub-facility').replace(/-/g, ' ')}</Badge>,
    },
    { accessorKey: 'clientName', header: 'Client' },
    {
      accessorKey: 'limit',
      header: 'Sub Limit',
      cell: ({ row }) => <span className="font-black text-primary">{formatCurrency(row.original.limit)}</span>,
    },
    {
      accessorKey: 'bookedAmount',
      header: 'Booked',
      cell: ({ row }) => <span className="font-bold">{formatCurrency(row.original.bookedAmount)}</span>,
    },
    {
      accessorKey: 'remainingCapacity',
      header: 'Remaining',
      cell: ({ row }) => <span className="font-black text-emerald-700">{formatCurrency(row.original.remainingCapacity)}</span>,
    },
    {
      accessorKey: 'masterLimit',
      header: 'Master Limit',
      cell: ({ row }) => formatCurrency(row.original.masterLimit),
    },
    {
      accessorKey: 'onboardingStage',
      header: 'Onboarding',
      cell: ({ row }) => {
        const stage = getOnboardingStageDefinition(row.original.onboardingStage);
        return <div className="flex flex-col gap-1"><Badge variant="outline" className="w-fit text-[9px] font-black uppercase text-primary border-primary/20">{stage.label}</Badge><span className="text-[9px] font-bold text-muted-foreground">{getOnboardingProgress(row.original.onboardingStage)}%</span></div>;
      },
    },
    {
      id: 'actions',
      header: <div className="text-right">Actions</div>,
      cell: ({ row }) => <div className="text-right"><Button size="sm" variant="outline" onClick={() => setSelectedFacility(row.original)} className="gap-2 font-bold"><FileSignature className="h-4 w-4" /> Continue</Button></div>,
    },
  ], []);

  const submitAgreementApplication = async () => {
    try {
      setIsSubmitting(true);
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Authentication failed.');
      const result = await fetchFromAdminAPI(token, 'createAgreementFacilityApplication', {
        application: { ...application, amountRequested: Number(application.amountRequested), termMonths: Number(application.termMonths) },
      });
      toast({ title: 'Agreement application submitted', description: `Pending agreement facility ${result.facilityId} is ready for product-specific credit evaluation.` });
      setIsApplicationOpen(false);
      setApplication({ clientId: '', masterFacilityId: '', type: '', amountRequested: '', termMonths: '60', description: '', fundingNeed: 'agreement-specific' });
      await loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Application failed', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (selectedFacility) {
    return (
      <EditFacilityWizard
        facility={selectedFacility}
        clients={clients}
        debtors={[]}
        suppliers={[]}
        onSave={() => { setSelectedFacility(null); loadData(); }}
        onBack={() => setSelectedFacility(null)}
        initialOwnerType="client"
        initialFacilityClass="sub"
      />
    );
  }

    return (
    <Card className="border-none bg-white shadow-xl">
        <Dialog open={isApplicationOpen} onOpenChange={setIsApplicationOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>New Agreement Application</DialogTitle><DialogDescription>Apply against an approved global facility. Final product terms and the agreement facility allocation remain subject to Credit and board approval.</DialogDescription></DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2"><Label>Borrower client</Label><Select value={application.clientId} onValueChange={(value) => setApplication((current) => ({ ...current, clientId: value, masterFacilityId: '' }))}><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger><SelectContent>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Approved global facility</Label><Select value={application.masterFacilityId} onValueChange={(value) => setApplication((current) => ({ ...current, masterFacilityId: value }))}><SelectTrigger><SelectValue placeholder="Select approved facility" /></SelectTrigger><SelectContent>{masterFacilities.filter((facility) => !application.clientId || facility.clientId === application.clientId).map((facility) => <SelectItem key={facility.id} value={facility.id}>{facility.type} - {formatCurrency(facility.limit)}</SelectItem>)}</SelectContent></Select></div>
              {selectedClient && <div className="md:col-span-2 rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-3"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-widest text-primary">Client application context</p><p className="font-black text-slate-900">{selectedClient.name}</p></div><Badge variant="outline" className="border-primary/30 text-primary">Read-only source</Badge></div><div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs"><div><span className="block text-[9px] font-black uppercase text-muted-foreground">Entity</span><span className="font-semibold">{selectedClient.entityType || 'Not captured'}</span></div><div><span className="block text-[9px] font-black uppercase text-muted-foreground">Registration</span><span className="font-semibold">{selectedClient.registrationId || 'Not captured'}</span></div><div><span className="block text-[9px] font-black uppercase text-muted-foreground">Declared vehicles</span><span className="font-semibold">{Array.isArray(selectedClient.vehicleAssets) ? selectedClient.vehicleAssets.length : 0}</span></div><div><span className="block text-[9px] font-black uppercase text-muted-foreground">Bank accounts</span><span className="font-semibold">{Array.isArray(selectedClient.bankAccounts) ? selectedClient.bankAccounts.length : 0}</span></div></div><p className="text-xs text-muted-foreground">The full client application, evidence, declarations, and verification findings will be read by Credit. Edit those details in Client Portfolio, not in this transaction application.</p></div>}
              <div className="space-y-2"><Label>Agreement type</Label><Select value={application.type} onValueChange={(value) => setApplication((current) => ({ ...current, type: value }))}><SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger><SelectContent><SelectItem value="loan-pv-term">Working capital loan</SelectItem><SelectItem value="installment-sale-term">Installment sale</SelectItem><SelectItem value="rental-term">Rental / lease</SelectItem><SelectItem value="discounting">Factoring / discounting</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Amount requested</Label><Input type="number" value={application.amountRequested} onChange={(event) => setApplication((current) => ({ ...current, amountRequested: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Requested term (months)</Label><Input type="number" value={application.termMonths} onChange={(event) => setApplication((current) => ({ ...current, termMonths: event.target.value }))} /></div>
              <div className="space-y-2 md:col-span-2"><Label>What does the applicant want to finance?</Label><Textarea value={application.description} onChange={(event) => setApplication((current) => ({ ...current, description: event.target.value }))} placeholder="Describe the asset, working-capital need, receivables, or transaction." /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsApplicationOpen(false)}>Cancel</Button><Button onClick={submitAgreementApplication} disabled={isSubmitting || !application.clientId || !application.masterFacilityId || !application.type || !application.amountRequested}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}Submit application</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/10">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg font-black"><Scale className="h-5 w-5 text-primary" /> Agreement Facility Register</CardTitle>
          <CardDescription>Flat view of agreement-level facilities across all clients, with booked and remaining sub-facility capacity.</CardDescription>
        </div>
        <div className="flex gap-2"><Button variant="outline" size="sm" onClick={loadData} disabled={isLoading} className="gap-2 font-bold">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />} Sync Register
        </Button><Button size="sm" onClick={() => setIsApplicationOpen(true)} className="gap-2 font-bold text-white"><PlusCircle className="h-4 w-4" /> New Agreement Application</Button></div>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : <DataTable columns={columns} data={rows} />}
      </CardContent>
    </Card>
  );
}