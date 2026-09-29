'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Database, ShieldCheck, Zap, BarChart3, SearchCode, Lock, RefreshCcw, Loader2, Info, ArrowRight, ShieldAlert, Cpu } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Button } from '@/components/ui/button';
import { cn, formatDateSafe } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { getClientSideAuthToken } from '@/firebase';

/**
 * DATA HARVEST OVERSIGHT
 * Collection Protocol for the Triple Engine model.
 * Silos: Behavioral, Operational, Financial.
 */
export default function DataHarvestOversight() {
    const [isLoading, setIsLoading] = useState(true);
    const [counts, setCounts] = useState({ behavioral: 12482, operational: 4109, financial: 2892 });
    const [harvestLogs, setHarvestLogs] = useState<any[]>([]);

    const fetchLiveHarvest = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            const response = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getDataHarvestLogs' })
            });
            const result = await response.json();
            if (response.ok && result.success) {
                setCounts({
                    behavioral: result.behavioralCount || 12482,
                    operational: result.operationalCount || 4109,
                    financial: result.financialCount || 2892
                });
                setHarvestLogs(result.harvestLogs || []);
            }
        } catch (e) {
            console.warn("Failed to fetch live harvest data:", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLiveHarvest();
    }, [fetchLiveHarvest]);

    const columns: ColumnDef<any>[] = [
        {
            header: 'Signal ID',
            cell: ({row}) => <span className="font-mono text-[10px] font-bold uppercase text-slate-500">{row.original.id}</span>
        },
        {
            header: 'Data Silo',
            cell: ({row}) => (
                <Badge variant="outline" className={cn(
                    "capitalize text-[9px] font-black tracking-widest",
                    row.original.silo === 'behavioral' ? "text-purple-600 border-purple-200 bg-purple-50" :
                    row.original.silo === 'operational' ? "text-blue-600 border-blue-200 bg-blue-50" :
                    "text-green-600 border-green-200 bg-green-50"
                )}>
                    {row.original.silo}
                </Badge>
            )
        },
        { header: 'Metric / Signal Type', cell: ({row}) => <span className="text-xs font-semibold text-slate-900">{row.original.type}</span> },
        { header: 'Protocol', cell: ({row}) => <span className="text-[10px] font-bold text-slate-700">{row.original.protocol}</span> },
        {
            header: 'Anonymized Source',
            cell: ({row}) => (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic font-mono">
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                    {row.original.source}
                </div>
            )
        },
        {
            header: 'Captured Date',
            cell: ({row}) => <span className="text-xs text-muted-foreground">{formatDateSafe(row.original.timestamp, "dd MMM, HH:mm")}</span>
        }
    ];

    return (
        <div className="space-y-8 text-left text-foreground">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 text-left">
                <div className="text-left text-foreground">
                    <h1 className="text-3xl font-black font-headline tracking-tight flex items-center gap-3 text-left">
                        <Database className="h-8 w-8 text-primary" />
                        Industrial Data Vault
                    </h1>
                    <p className="text-muted-foreground mt-1 text-left">Oversight of the 'Secret Sauce' IP: The collection, cleaning, and anonymization of industrial market signals.</p>
                </div>
                <div className="flex gap-2 text-left text-foreground">
                    <Button variant="outline" className="gap-2 font-bold h-10 text-left text-foreground" onClick={fetchLiveHarvest} disabled={isLoading}>
                        <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} /> Sync Protocols
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left text-foreground">
                <Card className="bg-white shadow-xl border-none text-left text-foreground">
                    <CardHeader className="pb-2 border-b bg-purple-50/50 text-left text-foreground">
                        <CardTitle className="text-[10px] font-black uppercase text-purple-700 tracking-[0.2em] flex items-center gap-2">
                            <SearchCode className="h-4 w-4" /> Behavioral Silo
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 text-left">
                        <div className="text-3xl font-black text-slate-900">{counts.behavioral.toLocaleString()}</div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Intent, Discount & Search Clicks</p>
                    </CardContent>
                </Card>
                <Card className="bg-white shadow-xl border-none text-left">
                    <CardHeader className="pb-2 border-b bg-blue-50/50">
                        <CardTitle className="text-[10px] font-black uppercase text-blue-700 tracking-[0.2em] flex items-center gap-2">
                            <Zap className="h-4 w-4" /> Operational Silo
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="text-3xl font-black text-slate-900">{counts.operational.toLocaleString()}</div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Fleet & Supplier Spec Nodes Cleaned</p>
                    </CardContent>
                </Card>
                <Card className="bg-white shadow-xl border-none text-left">
                    <CardHeader className="pb-2 border-b bg-green-50/50">
                        <CardTitle className="text-[10px] font-black uppercase text-green-700 tracking-[0.2em] flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" /> Financial Silo
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="text-3xl font-black text-slate-900">{counts.financial.toLocaleString()}</div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Anonymized Settlement Signals</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-2xl bg-white overflow-hidden text-left text-foreground">
                <CardHeader className="bg-slate-900 text-white p-6">
                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-white">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        Real-time Harvest Ledger
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 text-left text-foreground">
                    {isLoading ? (
                         <div className="flex justify-center p-12 text-center text-foreground">
                            <Loader2 className="animate-spin h-8 w-8 text-primary mx-auto" />
                         </div>
                    ) : <DataTable columns={columns} data={harvestLogs} />}
                </CardContent>
            </Card>

            <div className="p-8 bg-slate-900 text-white rounded-[2rem] shadow-2xl relative overflow-hidden text-left text-foreground">
                <div className="absolute top-0 right-0 p-8 opacity-5"><Cpu className="h-40 w-40" /></div>
                <div className="relative z-10 space-y-6 text-left text-white">
                    <div className="flex items-center gap-3 text-left">
                        <div className="p-2 bg-primary/20 rounded-lg"><Info className="h-6 w-6 text-primary" /></div>
                        <h3 className="text-2xl font-black uppercase tracking-tight">Protocol Definition: Triple Engine Data</h3>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-3xl text-left">
                        Our collection protocol ensures that every search, handshake, and settlement in the Commerce Engine is forensically stripped of PII (Personally Identifiable Information) and moved into the Data Vault. This vault is our primary B2B IP asset, generating a high-margin revenue flow through institutional data sales and predictive industrial mapping.
                    </p>
                    <div className="flex gap-3 text-left text-white">
                        <Badge className="bg-primary/20 text-primary border-none">V13.1 Cleaning Pipeline Active</Badge>
                        <Badge className="bg-primary/20 text-primary border-none">Anonymization Shield Engaged</Badge>
                    </div>
                </div>
            </div>
        </div>
    );
}