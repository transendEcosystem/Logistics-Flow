
'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Truck, ClipboardList, Handshake, Search, ArrowRight, ShieldCheck, Zap, Globe, Gavel, FileSignature, FileText, CheckCircle2, Banknote } from 'lucide-react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, collectionGroup, where } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PostLoadWizard } from './loads/post-load-wizard';
import { BrokerAppointmentWizard } from './loads/broker-appointment-wizard';
import { TakeLoadWizard } from './loads/take-load-wizard';
import { LoadInstructionView } from './loads/load-instruction-view';
import { FulfillmentWizard } from './loads/fulfillment-wizard';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

export default function LoadBoardContent() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [view, setView] = useState<'overview' | 'post-wizard' | 'broker-wizard' | 'take-wizard' | 'view-instruction' | 'fulfillment'>('overview');
    const [selectedLoad, setSelectedLoad] = useState<any | null>(null);

    // 1. Fetch ALL active loads on the platform (The Marketplace)
    const marketplaceQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collectionGroup(firestore, 'loads'),
            where('status', '==', 'active'),
            orderBy('createdAt', 'desc')
        );
    }, [firestore]);
    const { data: marketplaceLoads, isLoading: isMarketLoading } = useCollection(marketplaceQuery);

    // 2. Fetch verified broker agreements for THIS user
    const agreementsQuery = useMemoFirebase(() => {
        if (!firestore || !user?.companyId) return null;
        return query(
            collection(firestore, `companies/${user.companyId}/brokerAgreements`),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, user?.companyId]);
    const { data: agreements, isLoading: areAgreementsLoading } = useCollection(agreementsQuery);

    // 3. Fetch loads posted BY THIS user
    const myLoadsQuery = useMemoFirebase(() => {
        if (!firestore || !user?.companyId) return null;
        return query(
            collection(firestore, `companies/${user.companyId}/loads`),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, user?.companyId]);
    const { data: myLoads, isLoading: areMyLoadsLoading } = useCollection(myLoadsQuery);

    // 4. Fetch loads ASSIGNED TO this user as haulier
    const myAssignmentsQuery = useMemoFirebase(() => {
        if (!firestore || !user?.companyId) return null;
        return query(
            collectionGroup(firestore, 'loads'),
            where('takerId', '==', user.companyId),
            orderBy('updatedAt', 'desc')
        );
    }, [firestore, user?.companyId]);
    const { data: myAssignments, isLoading: areAssignmentsLoading } = useCollection(myAssignmentsQuery);

    const hasVerifiedAgreement = agreements?.some(a => a.status === 'verified');

    if (isUserLoading || areAgreementsLoading || areMyLoadsLoading || isMarketLoading || areAssignmentsLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="animate-spin h-12 w-12 text-primary" />
                <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Synchronizing Fulfillment Grid...</p>
            </div>
        );
    }

    if (view === 'post-wizard') {
        return <PostLoadWizard agreements={agreements || []} onComplete={() => setView('overview')} />;
    }

    if (view === 'broker-wizard') {
        return <BrokerAppointmentWizard onComplete={() => setView('overview')} />;
    }

    if (view === 'take-wizard' && selectedLoad) {
        return <TakeLoadWizard load={selectedLoad} onComplete={() => setView('overview')} onCancel={() => setView('overview')} />;
    }

    if (view === 'view-instruction' && selectedLoad) {
        return <LoadInstructionView load={selectedLoad} onBack={() => setView('overview')} />;
    }

    if (view === 'fulfillment' && selectedLoad) {
        return <FulfillmentWizard load={selectedLoad} onComplete={() => setView('overview')} onBack={() => setView('overview')} />;
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-left text-foreground">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div className="text-left">
                    <h1 className="text-3xl font-black font-headline tracking-tight flex items-center gap-3">
                        <Truck className="h-8 w-8 text-primary" />
                        Loads & Fulfillment
                    </h1>
                    <p className="text-muted-foreground mt-1 text-left">Control center for freight execution and financial settlement.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setView('broker-wizard')} className="gap-2 font-bold">
                        <Gavel className="h-4 w-4" /> Subcontractor Authorization
                    </Button>
                    <Button onClick={() => setView('post-wizard')} disabled={!hasVerifiedAgreement} className="gap-2 font-bold shadow-lg">
                        <PlusCircle className="h-4 w-4" /> Post New Load
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="marketplace" className="w-full">
                <TabsList className="bg-muted/30 p-1 h-auto flex-wrap justify-start border border-muted">
                    <TabsTrigger value="marketplace" className="gap-2 px-6 py-2.5 font-bold uppercase tracking-widest text-[10px]">
                        <Globe className="h-3.5 w-3.5" /> Haulier Board
                    </TabsTrigger>
                    <TabsTrigger value="assignments" className="gap-2 px-6 py-2.5 font-bold uppercase tracking-widest text-[10px]">
                        <FileText className="h-3.5 w-3.5" /> My Assignments
                    </TabsTrigger>
                    <TabsTrigger value="settlement" className="gap-2 px-6 py-2.5 font-bold uppercase tracking-widest text-[10px]">
                        <Banknote className="h-3.5 w-3.5" /> Settlement
                    </TabsTrigger>
                    <TabsTrigger value="my-loads" className="gap-2 px-6 py-2.5 font-bold uppercase tracking-widest text-[10px]">
                        <ClipboardList className="h-3.5 w-3.5" /> My Postings
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="marketplace" className="mt-8 space-y-6 text-left">
                    <Card className="border-none shadow-xl bg-white overflow-hidden text-left">
                        <CardContent className="pt-6">
                            {marketplaceLoads && marketplaceLoads.length > 0 ? (
                                <DataTable 
                                    data={marketplaceLoads.filter(l => l.brokerId !== user?.companyId)}
                                    columns={[
                                        { 
                                            header: 'Route & Technicals', 
                                            cell: ({row}) => (
                                                <div className="flex flex-col text-left">
                                                    <div className="font-bold flex items-center gap-2 text-sm">
                                                        {row.original.origin} <ArrowRight className="h-3 w-3 opacity-30" /> {row.original.destination}
                                                    </div>
                                                    <div className="flex gap-1 mt-1">
                                                        {row.original.requiredEquipment?.map((eq: string) => (
                                                            <Badge key={eq} variant="outline" className="text-[8px] h-4 uppercase border-primary/20 text-primary">{eq}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        },
                                        { accessorKey: 'cargoType', header: 'Cargo' },
                                        { 
                                            header: 'Payout', 
                                            cell: ({row}) => (
                                                <span className="font-black text-primary">{formatCurrency(row.original.haulierPayout)}</span>
                                            )
                                        },
                                        { 
                                            id: 'actions',
                                            header: <div className="text-right">Action</div>,
                                            cell: ({row}) => (
                                                <div className="text-right">
                                                    <Button size="sm" className="font-black uppercase text-[10px] tracking-widest h-9 px-6 gap-2" onClick={() => { setSelectedLoad(row.original); setView('take-wizard'); }}>
                                                        Accept Load <ArrowRight className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            )
                                        }
                                    ]}
                                />
                            ) : (
                                <div className="py-24 text-center space-y-4">
                                    <Search className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
                                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest italic text-center">Scanning national board for authorized freight...</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="assignments" className="mt-8 space-y-6 text-left">
                    <Card className="border-none shadow-xl bg-white overflow-hidden text-left">
                        <CardContent className="pt-6">
                            {myAssignments && myAssignments.length > 0 ? (
                                <DataTable 
                                    data={myAssignments.filter(l => l.status === 'assigned')}
                                    columns={[
                                        { header: 'Route', cell: ({row}) => <div className="font-bold flex items-center gap-2">{row.original.origin} <ArrowRight className="h-3 w-3 opacity-30" /> {row.original.destination}</div> },
                                        { accessorKey: 'instructionNumber', header: 'Instruction #' },
                                        { header: 'Payout', cell: ({row}) => <span className="font-bold text-green-700">{formatCurrency(row.original.haulierPayout)}</span> },
                                        { 
                                            id: 'actions',
                                            header: <div className="text-right">Mandate</div>,
                                            cell: ({row}) => (
                                                <div className="text-right flex justify-end gap-2">
                                                    <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest gap-2" onClick={() => { setSelectedLoad(row.original); setView('view-instruction'); }}>
                                                        <FileText className="h-3 w-3" /> View Mandate
                                                    </Button>
                                                    <Button size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest gap-2 bg-green-600 hover:bg-green-700" onClick={() => { setSelectedLoad(row.original); setView('fulfillment'); }}>
                                                        <CheckCircle2 className="h-3 w-3" /> Perform Work
                                                    </Button>
                                                </div>
                                            )
                                        }
                                    ]}
                                />
                            ) : (
                                <div className="py-20 text-center text-muted-foreground italic text-center">You have no active assignments awaiting execution.</div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="settlement" className="mt-8 space-y-6 text-left">
                     <Card className="border-none shadow-xl bg-white overflow-hidden text-left">
                        <CardHeader className="bg-slate-50 border-b">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <Banknote className="h-4 w-4 text-primary" />
                                Forensic Settlement Ledger
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {myAssignments && myAssignments.some(l => l.status === 'delivered' || l.status === 'completed') ? (
                                <DataTable 
                                    data={myAssignments.filter(l => l.status === 'delivered' || l.status === 'completed')}
                                    columns={[
                                        { header: 'Instruction', accessorKey: 'instructionNumber' },
                                        { header: 'Route', cell: ({row}) => <div className="font-bold">{row.original.origin} → {row.original.destination}</div> },
                                        { header: 'Net Payout', cell: ({row}) => <span className="font-black text-primary">{formatCurrency(row.original.haulierPayout)}</span> },
                                        { 
                                            header: 'Documents', 
                                            cell: ({row}) => (
                                                <div className="flex gap-2">
                                                    {row.original.podUrl && <Button variant="link" asChild className="p-0 h-auto text-[10px] uppercase font-bold"><a href={row.original.podUrl} target="_blank">View POD</a></Button>}
                                                </div>
                                            )
                                        },
                                        { header: 'Status', cell: ({row}) => <Badge variant={row.original.status === 'completed' ? 'default' : 'secondary'} className="capitalize text-[10px] font-black">{row.original.status}</Badge> }
                                    ]}
                                />
                            ) : (
                                <div className="py-20 text-center text-muted-foreground italic text-center">No settled or delivered loads recorded yet.</div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
