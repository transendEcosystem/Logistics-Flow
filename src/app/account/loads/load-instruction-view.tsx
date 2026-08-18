
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, MapPin, Package, Clock, Truck, ShieldCheck, Printer, ArrowLeft, Building, User, Navigation, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDateSafe } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface LoadInstructionViewProps {
    load: any;
    onBack: () => void;
}

export function LoadInstructionView({ load, onBack }: LoadInstructionViewProps) {
    const handlePrint = () => window.print();

    return (
        <div className="space-y-6 text-left text-foreground print:bg-white print:p-0">
            <div className="flex justify-between items-center print:hidden">
                <Button variant="ghost" onClick={onBack} className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back to Board
                </Button>
                <div className="flex gap-2">
                    <Button onClick={handlePrint} variant="outline" className="gap-2">
                        <Printer className="h-4 w-4" /> Print Instruction
                    </Button>
                </div>
            </div>

            <Card className="max-w-4xl mx-auto shadow-2xl border-2 border-slate-900 print:shadow-none print:border-slate-200 text-left">
                <CardHeader className="bg-slate-900 text-white p-10 flex flex-row justify-between items-center rounded-t-lg text-left">
                    <div className="text-left">
                        <div className="flex items-center gap-3 mb-2 text-left">
                            <Truck className="h-8 w-8 text-primary" />
                            <h1 className="text-3xl font-black font-headline tracking-tight text-white">FORMAL INSTRUCTION</h1>
                        </div>
                        <Badge className="bg-primary text-white border-none uppercase font-black text-[10px] tracking-widest">Authorized Execution</Badge>
                    </div>
                    <div className="text-right space-y-1">
                        <p className="text-xs font-black uppercase text-slate-500 tracking-widest">Instruction #</p>
                        <p className="text-2xl font-mono font-bold text-white">{load.instructionNumber || 'PENDING'}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Date: {formatDateSafe(load.instructionDate || load.acceptedAt, "dd MMM yyyy")}</p>
                    </div>
                </CardHeader>

                <CardContent className="p-10 space-y-10 bg-white text-left">
                    {/* Parties Section */}
                    <div className="grid grid-cols-2 gap-12 text-left">
                        <div className="space-y-3 text-left">
                            <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest border-b pb-2">From: Primary Contractor</h3>
                            <div className="flex items-center gap-3 text-left">
                                <div className="bg-muted p-2 rounded-lg text-left"><Building className="h-5 w-5 text-primary" /></div>
                                <p className="font-black text-lg text-left">{load.brokerName || 'Verified Member'}</p>
                            </div>
                            <p className="text-[10px] text-muted-foreground font-mono">NODE ID: {load.brokerId}</p>
                        </div>
                        <div className="space-y-3 text-left">
                            <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest border-b pb-2">To: Subcontractor</h3>
                            <div className="flex items-center gap-3 text-left">
                                <div className="bg-muted p-2 rounded-lg text-left"><User className="h-5 w-5 text-primary" /></div>
                                <p className="font-black text-lg text-left">{load.takerName || 'Assigned Haulier'}</p>
                            </div>
                            <p className="text-[10px] text-muted-foreground font-mono">NODE ID: {load.takerId}</p>
                        </div>
                    </div>

                    <Separator />

                    {/* Logistics Section */}
                    <div className="grid grid-cols-2 gap-12 text-left">
                        <div className="space-y-4 text-left">
                            <h3 className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                                <MapPin className="h-4 w-4" /> Collection Details
                            </h3>
                            <div className="space-y-2 text-left">
                                <p className="text-sm font-bold text-muted-foreground">DATE: {formatDateSafe(load.collectionDate, "dd MMM yyyy")}</p>
                                <div className="p-4 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                    <p className="text-sm font-medium leading-relaxed">{load.collectionDetails}</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4 text-left">
                            <h3 className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                                <Navigation className="h-4 w-4" /> Delivery Details
                            </h3>
                            <div className="space-y-2 text-left">
                                <p className="text-sm font-bold text-muted-foreground">DATE: {formatDateSafe(load.deliveryDate, "dd MMM yyyy")}</p>
                                <div className="p-4 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                    <p className="text-sm font-medium leading-relaxed">{load.deliveryDetails}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Goods Section */}
                    <div className="p-6 bg-slate-900 rounded-2xl text-white flex justify-between items-center text-left">
                        <div className="flex items-center gap-4 text-left">
                            <div className="bg-white/10 p-3 rounded-xl"><Package className="h-8 w-8 text-primary" /></div>
                            <div className="text-left">
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Goods Description</p>
                                <h3 className="text-2xl font-bold">{load.cargoType}</h3>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Total Weight</p>
                            <p className="text-2xl font-bold">{load.weight} Tons</p>
                        </div>
                    </div>

                    {/* Penalties Section */}
                    <div className="space-y-3 text-left">
                        <h3 className="text-[10px] font-black uppercase text-destructive tracking-widest flex items-center gap-2 text-left">
                            <Clock className="h-4 w-4" /> Demurrage & Standing Terms
                        </h3>
                        <p className="text-sm font-medium leading-relaxed italic p-4 bg-destructive/5 border border-destructive/20 rounded-xl text-left">
                            "{load.demurrageConditions || 'Standard platform standing terms apply.'}"
                        </p>
                    </div>

                    <Separator />

                    {/* Trust Binding Reminder */}
                    <div className="bg-muted/30 p-6 rounded-2xl flex items-start gap-4 text-left">
                        <ShieldCheck className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                        <div className="text-left">
                            <p className="text-sm font-bold">Trust & Integrity Acknowledgement</p>
                            <p className="text-xs text-muted-foreground leading-relaxed mt-1 text-left">
                                This instruction is issued under the master platform agreement. By proceeding with this load, the haulier confirms adherence to the Non-Circumvention clause protecting the Primary Contractor's relationship with the original Debtor.
                            </p>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="bg-slate-50 border-t p-10 flex justify-between items-baseline text-left">
                    <div className="text-left">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-left">Platform Ref #</p>
                        <p className="text-sm font-mono font-bold text-left">{load.id}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-black text-primary">{formatCurrency(load.haulierPayout)}</p>
                        <p className="text-[10px] font-black uppercase text-muted-foreground">Authorized Disbursement</p>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
