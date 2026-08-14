
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ArrowRight, ShieldCheck, Truck, Users, Lock, CheckCircle, Info, Landmark, MapPin, AlertTriangle, Gavel, FileSignature, FileText } from 'lucide-react';
import { getClientSideAuthToken, useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, serverTimestamp, setDoc } from 'firebase/firestore';
import { formatCurrency, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { LoadInstructionView } from './load-instruction-view';

interface TakeLoadWizardProps {
    load: any;
    onComplete: () => void;
    onCancel: () => void;
}

export function TakeLoadWizard({ load, onComplete, onCancel }: TakeLoadWizardProps) {
    const { user } = useUser();
    const { toast } = useToast();
    const firestore = useFirestore();
    
    const [isLoading, setIsLoading] = useState(false);
    const [isAccepted, setIsAccepted] = useState(false);
    const [noCircumventionAccepted, setNoCircumventionAccepted] = useState(false);
    const [acceptedLoadData, setAcceptedLoadData] = useState<any>(null);

    // 1. INTELLIGENCE AUDIT: Check for paid membership
    const isIntelligenceMember = user?.companyData?.membershipId && user.companyData.membershipId !== 'free';

    // 2. FLEET COMPLIANCE AUDIT: Check verified profile data
    const hasRequiredAsset = useMemo(() => {
        if (!user?.companyData?.fleet) return false;
        const { poweredUnits = [], trailers = [] } = user.companyData.fleet;
        
        if (load.requiredEquipment?.length > 0) {
            return load.requiredEquipment.some((req: string) => 
                trailers.includes(req) || poweredUnits.includes(req)
            );
        }
        return poweredUnits.length > 0;
    }, [user, load]);

    // 3. DRIVER AUDIT: Check workforce roster
    const staffQuery = useMemoFirebase(() => {
        if (!firestore || !user?.companyId) return null;
        return query(collection(firestore, `companies/${user.companyId}/staff`), where('status', '==', 'confirmed'));
    }, [firestore, user?.companyId]);
    const { data: staff, isLoading: isStaffLoading } = useCollection(staffQuery);

    const hasConfirmedDriver = useMemo(() => {
        if (!staff) return false;
        return staff.some(s => ['logistics', 'operations', 'driver', 'contractor'].includes(s.role?.toLowerCase()));
    }, [staff]);

    const handleAcceptLoad = async () => {
        if (!noCircumventionAccepted) {
            toast({ variant: 'destructive', title: 'Action Required', description: 'Accept non-circumvention terms.' });
            return;
        }

        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;

            const instructionNumber = `INS-${Date.now().toString().slice(-6)}`;
            const update = {
                status: 'assigned',
                takerId: user!.companyId,
                takerName: user?.companyData?.companyName || 'Verified Haulier',
                instructionNumber,
                instructionDate: serverTimestamp(),
                acceptedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const loadRef = doc(firestore, `companies/${load.brokerId}/loads/${load.id}`);
            await setDoc(loadRef, update, { merge: true });

            setAcceptedLoadData({ ...load, ...update });
            setIsAccepted(true);
            toast({ title: "Load Secured", description: "Instruction document issued." });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Acceptance Failed", description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    if (isAccepted && acceptedLoadData) {
        return (
            <div className="space-y-6 text-left">
                <Alert className="bg-green-50 border-green-200 text-left">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div className="text-left ml-2">
                        <AlertTitle className="font-bold text-left">Transaction Confirmed</AlertTitle>
                        <AlertDescription className="text-left">The formal instruction has been issued. You can view or print it below.</AlertDescription>
                    </div>
                </Alert>
                <LoadInstructionView load={acceptedLoadData} onBack={onComplete} />
            </div>
        );
    }

    if (isStaffLoading) {
        return <div className="py-32 text-center flex flex-col items-center gap-4"><Loader2 className="animate-spin h-12 w-12 text-primary" /><p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Compliance Audit in Progress...</p></div>;
    }

    return (
        <div className="animate-in fade-in duration-500 text-left text-foreground">
            <Card className="max-w-4xl mx-auto shadow-2xl border-none overflow-hidden text-left bg-white">
                <CardHeader className="bg-slate-900 text-white p-10 text-left">
                    <div className="flex justify-between items-start text-left">
                        <div className="text-left text-white">
                            <CardTitle className="text-3xl font-black font-headline flex items-center gap-3 text-white">
                                <ShieldCheck className="h-10 w-10 text-primary" />
                                Registry Compliance Audit
                            </CardTitle>
                            <CardDescription className="text-slate-400 text-lg mt-2 text-left">Verifying haulier node for: <strong>{load.origin}</strong> to <strong>{load.destination}</strong></CardDescription>
                        </div>
                        <Badge variant="outline" className="border-primary text-primary">OFFER REF: {load.id?.slice(-4)}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-10 space-y-10 bg-white text-left text-foreground">
                    <div className="p-8 rounded-3xl border-2 border-primary bg-primary/5 shadow-sm text-left">
                        <div className="flex justify-between items-start mb-6 text-left">
                            <div className="text-left">
                                <h3 className="font-black text-xl flex items-center gap-2"><Gavel className="h-6 w-6 text-primary" /> 1. Trust Binding</h3>
                                <p className="text-sm text-muted-foreground">You are acting as a Subcontractor to <strong>{load.brokerName}</strong>.</p>
                            </div>
                            <Badge className="bg-primary text-white font-black uppercase text-[10px] tracking-widest">Required</Badge>
                        </div>
                        <div className="p-6 bg-white rounded-2xl border border-primary/20 space-y-4 shadow-inner text-left">
                             <div className="flex items-start gap-4 text-left">
                                <Checkbox id="cc-check" checked={noCircumventionAccepted} onCheckedChange={(c) => setNoCircumventionAccepted(!!c)} className="mt-1 h-5 w-5" />
                                <Label htmlFor="cc-check" className="text-sm font-medium leading-relaxed cursor-pointer text-left">
                                    I hereby agree to the **Non-Circumvention Clause**. I am prohibited from directly approaching or engaging the Debtor ({load.providerName || 'The Client'}) for this load or future work without written consent from the Primary Contractor.
                                </Label>
                             </div>
                        </div>
                    </div>

                    <div className={cn("p-8 rounded-3xl border-2 transition-all shadow-sm text-left", !isIntelligenceMember ? "border-amber-200 bg-amber-50" : "border-green-100 bg-green-50")}>
                        <div className="flex justify-between items-start text-left">
                            <div className="text-left">
                                <h3 className="font-black text-xl flex items-center gap-2"><Landmark className="h-6 w-6 text-primary" /> 2. Intelligence Activation</h3>
                                <p className="text-sm text-muted-foreground">Only authorized nodes can engage in commercial handshakes.</p>
                            </div>
                            {isIntelligenceMember ? <CheckCircle className="h-8 w-8 text-green-600" /> : <Lock className="h-8 w-8 text-amber-600" />}
                        </div>
                        {!isIntelligenceMember && (
                            <div className="mt-8 p-6 bg-white rounded-2xl border border-amber-200 space-y-4 shadow-inner text-left">
                                <p className="text-sm font-medium text-amber-800 leading-relaxed text-left">
                                    This load has a verified payout of **{formatCurrency(load.haulierPayout)}**. To accept and start earning, activate your **Loads Intelligence** node.
                                </p>
                                <Button asChild size="lg" className="w-full bg-amber-600 hover:bg-amber-700 font-bold h-14"><Link href="/checkout/loads_intelligence">Unlock Earning Power <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                            </div>
                        )}
                    </div>

                    <div className={cn("p-8 rounded-3xl border-2 transition-all shadow-sm text-left", !hasRequiredAsset ? "border-destructive/20 bg-destructive/5" : "border-green-100 bg-green-50")}>
                        <div className="flex justify-between items-start text-left">
                            <div className="text-left">
                                <h3 className="font-black text-xl flex items-center gap-2"><Truck className="h-6 w-6 text-primary" /> 3. Verified Fleet Asset</h3>
                                <p className="text-sm text-muted-foreground">Required: {load.requiredEquipment?.join(', ')}</p>
                            </div>
                            {hasRequiredAsset ? <CheckCircle className="h-8 w-8 text-green-600" /> : <AlertTriangle className="h-8 w-8 text-destructive" />}
                        </div>
                        {!hasRequiredAsset && (
                            <div className="mt-6 p-6 bg-white rounded-2xl border border-destructive/20 space-y-4 shadow-inner text-left">
                                <p className="text-xs text-muted-foreground leading-relaxed text-left">You have not registered the required verified **RC1 assets** in your node. Forensic proof of capacity is required before engagement.</p>
                                <Button asChild variant="outline" size="lg" className="w-full border-destructive/20 text-destructive font-bold h-12 text-left"><Link href="/account?view=fleet">Complete Fleet Profile</Link></Button>
                            </div>
                        )}
                    </div>

                    <div className={cn("p-8 rounded-3xl border-2 transition-all shadow-sm text-left", !hasConfirmedDriver ? "border-destructive/20 bg-destructive/5" : "border-green-100 bg-green-50")}>
                        <div className="flex justify-between items-start text-left">
                            <div className="text-left">
                                <h3 className="font-black text-xl flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> 4. Confirmed Workforce</h3>
                                <p className="text-sm text-muted-foreground">Valid PrDP Driver required.</p>
                            </div>
                            {hasConfirmedDriver ? <CheckCircle className="h-8 w-8 text-green-600" /> : <AlertTriangle className="h-8 w-8 text-destructive" />}
                        </div>
                        {!hasConfirmedDriver && (
                            <div className="mt-6 p-6 bg-white rounded-2xl border border-destructive/20 space-y-4 shadow-inner text-left text-foreground">
                                <p className="text-xs text-muted-foreground leading-relaxed text-left">No confirmed driver found in your roster. Onboard your logistics staff to satisfy compliance.</p>
                                <Button asChild variant="outline" size="lg" className="w-full border-destructive/20 text-destructive font-bold h-12 text-left"><Link href="/account?view=staff">Manage Staff</Link></Button>
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="p-10 bg-slate-50 border-t flex flex-col md:flex-row justify-between items-center gap-6 text-left text-foreground">
                    <Button variant="ghost" onClick={onCancel} className="font-bold text-muted-foreground text-left">Cancel Transaction</Button>
                    <Button onClick={handleAcceptLoad} disabled={!isIntelligenceMember || !hasRequiredAsset || !hasConfirmedDriver || !noCircumventionAccepted || isLoading} className="h-16 px-16 text-lg font-black uppercase tracking-tight shadow-2xl bg-primary hover:bg-primary/90 text-white text-left">
                        {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : "Accept & Issue Instruction"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
