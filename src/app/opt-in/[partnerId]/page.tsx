'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, CheckCircle, Loader2, AlertCircle, Scale, FileText, Lock, Mail, Info, ArrowRight, Zap, Phone, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useFirestore, useMemoFirebase, getClientSideAuthToken } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function OptInPage() {
    const params = useParams();
    const partnerId = params.partnerId as string;
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [isRequestingPhone, setIsRequestingPhone] = useState(false);
    const [verificationPin, setVerificationPin] = useState<string | null>(null);
    const [completed, setCompleted] = useState(false);

    const [marketingConsent, setMarketingConsent] = useState(false);
    const [popiConsent, setPopiConsent] = useState(false);
    const [termsConsent, setTermsConsent] = useState(false);

    const partnerRef = useMemoFirebase(() => {
        if (!firestore || !partnerId) return null;
        return doc(firestore, 'partners', partnerId);
    }, [firestore, partnerId]);

    const leadRef = useMemoFirebase(() => {
        if (!firestore || !partnerId) return null;
        return doc(firestore, 'leads', partnerId);
    }, [firestore, partnerId]);

    const { data: partner, isLoading: isPartnerLoading } = useDoc(partnerRef);
    const { data: lead, isLoading: isLeadLoading } = useDoc(leadRef);

    const activeRecord = useMemo(() => partner || lead, [partner, lead]);
    const isLoading = isPartnerLoading && isLeadLoading;

    const canAccept = useMemo(() => {
        return marketingConsent && popiConsent && termsConsent;
    }, [marketingConsent, popiConsent, termsConsent]);

    const handleAction = async (status: 'accepted' | 'declined') => {
        if (status === 'accepted' && !canAccept) return;
        setIsProcessing(true);
        try {
            const response = await fetch('/api/recordConsent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ partnerId, status }),
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || "Failed.");
            toast({ title: status === 'accepted' ? "Handshake Established" : "Preferences Saved" });
            setCompleted(true);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRequestPhoneVerification = async () => {
        setIsRequestingPhone(true);
        try {
            const token = await getClientSideAuthToken();
            const response = await fetch('/api/requestVerification', {
                method: 'POST',
                headers: { 'Authorization': token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' },
                body: JSON.stringify({ partnerId, collection: partner ? 'partners' : 'leads' }),
            });
            const result = await response.json();
            if (result.success) {
                setVerificationPin(result.pin);
                toast({ title: "Request Logged", description: `Verification PIN generated: ${result.pin}` });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Request Failed" });
        } finally {
            setIsRequestingPhone(false);
        }
    };

    if (isLoading) return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

    if (!activeRecord && !isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen p-4">
                <Card className="max-w-md w-full text-center border-destructive/20 shadow-xl bg-white text-foreground">
                    <CardHeader>
                        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                        <CardTitle className="text-2xl font-black">Registry Record Not Found</CardTitle>
                    </CardHeader>
                    <CardFooter><Button className="w-full font-bold" asChild><a href="/">Visit Homepage</a></Button></CardFooter>
                </Card>
            </div>
        );
    }

    if (completed) {
        const signupUrl = `/join?email=${encodeURIComponent(activeRecord?.email || '')}&firstName=${encodeURIComponent(activeRecord?.firstName || '')}&lastName=${encodeURIComponent(activeRecord?.lastName || '')}&ref=${partnerId}`;
        return (
            <div className="flex justify-center items-center min-h-screen p-4 text-left text-foreground">
                <Card className="max-w-md w-full text-center border-green-50 bg-green-50 shadow-2xl">
                    <CardHeader><CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" /><CardTitle className="text-2xl font-black">Handshake Established</CardTitle></CardHeader>
                    <CardContent className="p-8 space-y-6 text-left">
                        <div className="bg-white p-4 rounded-xl border border-green-200 shadow-sm space-y-3">
                             <p className="text-[10px] font-black uppercase tracking-widest text-green-700 flex items-center gap-2 justify-center">
                                 <Zap className="h-3 w-3 fill-current"/> Immediate Next Step
                             </p>
                             <p className="text-sm font-medium text-foreground text-center leading-relaxed">
                                 Set up your secure dashboard to access the forensic registry and matching engine.
                             </p>
                        </div>
                        <Button asChild size="lg" className="w-full h-14 font-black uppercase shadow-xl text-white"><Link href={signupUrl}>Complete Profile <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex justify-center items-center min-h-screen p-4 bg-slate-50 text-left text-foreground">
            <Card className="max-w-xl w-full shadow-2xl overflow-hidden text-left bg-white">
                <CardHeader className="bg-slate-900 text-white p-8">
                    <ShieldCheck className="h-8 w-8 text-primary mx-auto mb-4" />
                    <CardTitle className="text-center font-black uppercase tracking-tight text-left text-white">Industrial Handshake</CardTitle>
                    <CardDescription className="text-center text-slate-400">Establish compliance for <strong>{activeRecord?.companyName}</strong>.</CardDescription>
                </CardHeader>
                
                <CardContent className="p-8 space-y-8 bg-white text-left">
                    <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed space-y-4 text-left">
                        <div className="flex items-center gap-2">
                             <ShieldAlert className="h-5 w-5 text-amber-600" />
                             <h4 className="font-bold text-sm uppercase tracking-tight">Security & Verification Shield</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            We understand the risk of digital fraud. If you are hesitant to click the verification buttons below, you can request a manual phone verification call from our Engagement Division.
                        </p>
                        {verificationPin ? (
                            <div className="p-3 bg-green-100 text-green-800 rounded-lg text-xs font-bold text-center">
                                ✅ Phone Verification Requested. Your Tracking PIN is: <span className="text-lg block mt-1">{verificationPin}</span>
                            </div>
                        ) : (
                            <Button 
                                variant="outline" 
                                className="w-full h-10 gap-2 font-bold border-amber-200 text-amber-700 hover:bg-amber-50"
                                onClick={handleRequestPhoneVerification}
                                disabled={isRequestingPhone}
                            >
                                {isRequestingPhone ? <Loader2 className="h-4 w-4 animate-spin"/> : <Phone className="h-4 w-4" />}
                                Request Phone Verification
                            </Button>
                        )}
                    </div>

                    <div className="space-y-4 text-left">
                        <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-slate-50 transition-colors text-left cursor-pointer" onClick={() => setMarketingConsent(!marketingConsent)}>
                            <input type="checkbox" className="mt-1 h-5 w-5 rounded border-gray-300" checked={marketingConsent} onChange={() => {}} />
                            <Label className="text-sm cursor-pointer text-left"><span className="font-bold block">Communication Opt-In</span>Receive matches and group savings alerts.</Label>
                        </div>
                        <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-slate-50 transition-colors text-left cursor-pointer" onClick={() => setPopiConsent(!popiConsent)}>
                            <input type="checkbox" className="mt-1 h-5 w-5 rounded border-gray-300" checked={popiConsent} onChange={() => {}} />
                            <Label className="text-sm cursor-pointer text-left"><span className="font-bold block">POPI Compliance</span>Authorize secure data processing for matching.</Label>
                        </div>
                        <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-slate-50 transition-colors text-left cursor-pointer" onClick={() => setTermsConsent(!termsConsent)}>
                            <input type="checkbox" className="mt-1 h-5 w-5 rounded border-gray-300" checked={termsConsent} onChange={() => {}} />
                            <Label className="text-sm cursor-pointer text-left"><span className="font-bold block">Master Terms</span>Accept the platform terms of engagement.</Label>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4 p-8 border-t bg-slate-50">
                    <Button className="w-full h-14 text-lg font-black uppercase shadow-lg text-white" size="lg" onClick={() => handleAction('accepted')} disabled={isProcessing || !canAccept}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4" />} Establish Handshake
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
