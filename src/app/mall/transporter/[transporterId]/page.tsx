
'use client';

import React, { useMemo, useState } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Truck, CheckCircle, MapPin, Loader2, ArrowLeft, Globe, Phone, Mail, ShieldCheck, Handshake, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notFound, useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken } from '@/firebase';

export default function TransporterProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const transporterId = params?.transporterId as string;
    const firestore = useFirestore();
    const [isEngaging, setIsEngaging] = useState(false);

    const partnerRef = useMemoFirebase(() => {
        if (!firestore || !transporterId) return null;
        return doc(firestore, 'partners', transporterId);
    }, [firestore, transporterId]);

    const leadRef = useMemoFirebase(() => {
        if (!firestore || !transporterId) return null;
        return doc(firestore, 'leads', transporterId);
    }, [firestore, transporterId]);

    const { data: partner, isLoading: isPartnerLoading } = useDoc(partnerRef);
    const { data: lead, isLoading: isLeadLoading } = useDoc(leadRef);

    const transporter = partner || lead;
    const isLoading = isPartnerLoading || isLeadLoading;
    const isActuallyNotFound = !isLoading && !transporter;

    const handleInitiateHandshake = async () => {
        if (!transporter) return;
        setIsEngaging(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) {
                router.push(`/signin?redirect=/mall/transporter/${transporterId}`);
                return;
            }

            const response = await fetch('/api/recordEngagement', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    targetId: transporterId, 
                    targetName: transporter.companyName || 'Haulier',
                    targetType: partner ? 'partner' : 'lead'
                })
            });

            if (!response.ok) throw new Error("Handshake failed.");

            toast({ 
                title: "Handshake Initiated!", 
                description: "The haulier has been notified and the connection is logged in your dashboard." 
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setIsEngaging(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4 bg-slate-50">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Retrieving Forensic Node...</p>
            </div>
        );
    }

    if (isActuallyNotFound) {
        notFound();
    }
    
    if (!transporter) return null;

    const name = transporter.companyName || `${transporter.firstName || ''} ${transporter.lastName || ''}`.trim() || 'Industrial Record';
    const email = transporter.email || transporter.marketingManager?.email || transporter.ceo?.email;
    const phone = transporter.phone || transporter.mobile || transporter.marketingManager?.mobile || transporter.ceo?.mobile;
    const address = transporter.address || transporter.physicalAddress || 'Operational Hub Verified';
    
    return (
        <div className="bg-slate-50 min-h-screen py-16 md:py-24 text-left text-foreground">
             <div className="container mx-auto px-4">
                <Button variant="ghost" onClick={() => router.back()} className="mb-6 gap-2 text-muted-foreground hover:text-primary">
                    <ArrowLeft className="h-4 w-4" /> Back to Results
                </Button>

                <div className="max-w-6xl mx-auto border-none rounded-[2rem] overflow-hidden shadow-2xl bg-white text-left">
                    <div className="relative h-64 md:h-80 bg-slate-900">
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent z-10" />
                        <div className="absolute bottom-0 left-0 p-8 md:p-12 z-20 w-full text-white">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                <div className="flex items-center gap-6">
                                    <div className="bg-white p-4 rounded-3xl shadow-xl">
                                        <Truck className="h-12 w-12 text-primary" />
                                    </div>
                                    <div className="space-y-1">
                                        <Badge className="bg-primary text-white border-none uppercase font-black text-[10px] tracking-widest px-3 mb-2">Verified Haulier</Badge>
                                        <h1 className="text-3xl md:text-5xl font-black text-white font-headline leading-none uppercase">{name}</h1>
                                        <div className="flex items-center gap-2 text-slate-300 font-bold text-sm">
                                            <MapPin className="h-4 w-4" /> {address}
                                        </div>
                                    </div>
                                </div>
                                <Button 
                                    className="h-14 px-10 font-black uppercase tracking-tight shadow-xl shadow-primary/20 text-white" 
                                    size="lg"
                                    onClick={handleInitiateHandshake}
                                    disabled={isEngaging}
                                >
                                    {isEngaging ? <Loader2 className="mr-2 animate-spin" /> : <Handshake className="mr-2 h-6 w-6" />}
                                    Initiate Handshake
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 md:p-12 grid md:grid-cols-3 gap-12 text-left">
                        <div className="md:col-span-2 space-y-10 text-left text-foreground">
                            <div className="space-y-4">
                                <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                                    <ShieldCheck className="h-6 w-6 text-primary" />
                                    Technical Profile
                                </h2>
                                <p className="text-lg leading-relaxed text-slate-600 whitespace-pre-wrap italic">
                                    {transporter.minedServiceWording || transporter.notes || "Professional haulier established in the South African logistics grid. Full service profile undergoing forensic verification."}
                                </p>
                            </div>

                            <Separator />

                            <div className="space-y-6">
                                <h3 className="text-lg font-black uppercase tracking-tight">Verified Capability</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Card className="bg-slate-50 border-none shadow-inner p-4 flex items-center gap-4">
                                        <CheckCircle className="h-6 w-6 text-green-600 shrink-0" />
                                        <div className="text-left">
                                            <p className="text-[10px] font-black uppercase text-muted-foreground">Primary Sector</p>
                                            <p className="font-bold">{transporter.industrial_category || transporter.role || 'Transport'}</p>
                                        </div>
                                    </Card>
                                    <Card className="bg-slate-50 border-none shadow-inner p-4 flex items-center gap-4">
                                        <CheckCircle className="h-6 w-6 text-green-600 shrink-0" />
                                        <div className="text-left">
                                            <p className="text-[10px] font-black uppercase text-muted-foreground">Compliance</p>
                                            <p className="font-bold">RC1 Standard Verified</p>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8 text-left text-foreground">
                            <Card className="shadow-lg border-primary/10 overflow-hidden bg-white">
                                <CardHeader className="bg-slate-50 border-b p-6">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest text-left">Contact Node</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    <div className="space-y-1 text-left">
                                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">MD / Decision Maker</p>
                                        <p className="font-bold text-foreground">{transporter.marketingManager?.name || transporter.ceo?.name || transporter.contactPerson || 'Identity Protected'}</p>
                                    </div>
                                    {email && (
                                        <div className="space-y-1 text-left">
                                            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Direct E-mail</p>
                                            <div className="flex items-center gap-2 text-xs font-bold text-primary">
                                                <Mail className="h-3.5 w-3.5" /> {email}
                                            </div>
                                        </div>
                                    )}
                                    {phone && (
                                        <div className="space-y-1 text-left">
                                            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Direct Line</p>
                                            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                                                <Phone className="h-3.5 w-3.5" /> {phone}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="bg-slate-50 border-t p-6">
                                    <Button className="w-full font-black uppercase text-xs tracking-widest gap-2" variant="outline" onClick={handleInitiateHandshake}>
                                        <Zap className="h-3.5 w-3.5 text-primary" /> Activate Node
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                </div>
             </div>
        </div>
    );
}
