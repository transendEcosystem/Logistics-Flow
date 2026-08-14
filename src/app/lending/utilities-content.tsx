'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Wrench, Zap, RefreshCcw, FileText, Banknote, ShieldAlert, Loader2, Info, ArrowRight, Clock, CheckCircle2, ListChecks, History, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken } from '@/firebase';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatDateSafe, cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function UtilitiesContent() {
    const { toast } = useToast();
    const [isRunning, setIsRunning] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([
        { id: 'H1', label: 'Prime Rate Sync', timestamp: new Date(Date.now() - 3600000 * 24), user: 'System Auto', status: 'success', impact: '42 Agreements Updated' },
        { id: 'H2', label: 'Mass Statement Dispatch', timestamp: new Date(Date.now() - 3600000 * 48), user: 'Staff: John D', status: 'success', impact: '114 Emails Sent' },
    ]);

    const handleRunUtility = async (id: string, label: string) => {
        setIsRunning(id);
        try {
            // Simulated delay for high-velocity backend task
            await new Promise(res => setTimeout(res, 2000));
            
            const newLog = {
                id: `H${Date.now()}`,
                label,
                timestamp: new Date(),
                user: 'Admin (Manual)',
                status: 'success',
                impact: 'Batch Processed Successfully'
            };
            
            setHistory(prev => [newLog, ...prev]);
            toast({ title: "Utility Execution Complete", description: `${label} task has been successfully processed and logged.` });
        } catch (e) {
            toast({ variant: 'destructive', title: "Process Error" });
        } finally {
            setIsRunning(null);
        }
    };

    const tools = [
        { id: 'prime_update', label: 'Prime Rate Syncer', icon: Banknote, desc: 'Recalculate all active interest-linked schedules based on latest Prime Rate policy.', color: 'text-blue-600' },
        { id: 'install_raise', label: 'Raise Installments', icon: Clock, desc: 'Manually trigger the monthly installment raising cycle for the current period.', color: 'text-primary' },
        { id: 'arrear_interest', label: 'Raise Arrear Interest', icon: Zap, desc: 'Batch process all overdue accounts and apply compound penalty interest.', color: 'text-amber-500' },
        { id: 'mass_statements', label: 'Mass Statement Dispatch', icon: FileText, desc: 'Generate and email monthly statements to all active debtors.', color: 'text-slate-600' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-left text-foreground">
            <div className="text-left">
                <h1 className="text-3xl font-black font-headline tracking-tight flex items-center gap-3 text-left">
                    <Wrench className="h-8 w-8 text-primary" />
                    Global Lending Utilities
                </h1>
                <p className="text-muted-foreground mt-1 text-left">Operational maintenance tools for high-velocity ledger management and interest raising.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left text-foreground">
                <div className="lg:col-span-2 space-y-6 text-left">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                        {tools.map((tool) => (
                            <Card key={tool.id} className="border-none shadow-xl bg-white hover:shadow-2xl transition-all group overflow-hidden text-left">
                                <CardHeader className="p-8 pb-4 text-left">
                                    <div className={cn("bg-muted p-3 rounded-2xl w-fit group-hover:bg-slate-900 group-hover:text-white transition-colors", tool.color)}>
                                        <tool.icon className="h-6 w-6" />
                                    </div>
                                    <CardTitle className="text-xl font-bold mt-4 text-left">{tool.label}</CardTitle>
                                    <CardDescription className="text-sm leading-relaxed mt-2 text-left">{tool.desc}</CardDescription>
                                </CardHeader>
                                <CardFooter className="p-8 pt-0 text-left">
                                    <Button 
                                        className="w-full h-11 font-black uppercase text-[10px] tracking-widest gap-2 text-white shadow-md" 
                                        onClick={() => handleRunUtility(tool.id, tool.label)}
                                        disabled={!!isRunning}
                                    >
                                        {isRunning === tool.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                                        {isRunning === tool.id ? 'Executing Task...' : `Run ${tool.label}`}
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>

                    <Card className="bg-slate-900 text-white border-none shadow-2xl p-8 rounded-[2.5rem] relative overflow-hidden text-left">
                        <div className="absolute top-0 right-0 p-12 opacity-5"><ShieldAlert className="h-40 w-40 text-primary" /></div>
                        <div className="relative z-10 space-y-4 text-left text-white">
                            <div className="flex items-center gap-4 text-left">
                                <div className="p-3 bg-primary/20 rounded-2xl"><Info className="h-8 w-8 text-primary" /></div>
                                <h3 className="text-2xl font-black uppercase tracking-tight text-left">Operational Warning</h3>
                            </div>
                            <p className="text-slate-400 text-base leading-relaxed max-w-2xl text-left">
                                Utility execution is immutable and impacts all financial ledgers. Ensure a Full Registry Export has been performed before initiating mass interest or installment raising cycles.
                            </p>
                        </div>
                    </Card>
                </div>

                <div className="space-y-6 text-left">
                    <Card className="shadow-lg border-none text-left">
                        <CardHeader className="text-left border-b bg-muted/20">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-foreground">
                                <History className="h-4 w-4 text-primary" />
                                Execution Ledger
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 text-left">
                            <ScrollArea className="h-[600px] text-left">
                                <div className="divide-y text-left">
                                    {history.map(log => (
                                        <div key={log.id} className="p-5 space-y-2 hover:bg-slate-50 transition-colors text-left">
                                            <div className="flex justify-between items-start text-left">
                                                <div className="space-y-1 text-left">
                                                    <p className="text-xs font-black uppercase text-foreground">{log.label}</p>
                                                    <p className="text-[10px] text-muted-foreground">{formatDateSafe(log.timestamp, "dd MMM yyyy, HH:mm")}</p>
                                                </div>
                                                <Badge className="bg-green-100 text-green-700 border-none text-[8px] uppercase font-black">Success</Badge>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-primary font-bold text-left">
                                                <CheckCircle2 className="h-3 w-3" />
                                                {log.impact}
                                            </div>
                                            <p className="text-[9px] text-muted-foreground italic text-left">Triggered by: {log.user}</p>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
