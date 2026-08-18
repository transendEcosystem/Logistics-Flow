'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, CheckCircle, FileUp, ShieldCheck, Banknote, FileText, Zap } from 'lucide-react';
import { getClientSideAuthToken, useUser, useFirestore } from '@/firebase';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { formatCurrency } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface FulfillmentWizardProps {
    load: any;
    onComplete: () => void;
    onBack: () => void;
}

export function FulfillmentWizard({ load, onComplete, onBack }: FulfillmentWizardProps) {
    const { user } = useUser();
    const { toast } = useToast();
    const firestore = useFirestore();
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [podUrl, setPodUrl] = useState<string | null>(load.podUrl || null);
    const [uploadProgress, setProgress] = useState(0);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setIsUploading(true);
        setProgress(10);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth failed.");
            
            const reader = new FileReader();
            const dataUri: string = await new Promise<string>(res => {
                reader.onload = () => res(reader.result as string);
                reader.readAsDataURL(file);
            });

            const response = await fetch('/api/uploadImageAsset', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    fileDataUri: dataUri, 
                    folder: `pods/${user.companyId}`, 
                    fileName: `POD_${load.instructionNumber || Date.now()}_${Date.now()}.pdf` 
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            
            setPodUrl(result.url);
            setProgress(100);
            toast({ title: "POD Uploaded Successfully" });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Upload Failed", description: e.message });
        } finally {
            setIsUploading(false);
        }
    };

    const handleConfirmFulfillment = async () => {
        if (!podUrl) return;
        setIsProcessing(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth failed.");

            const loadRef = doc(firestore, `companies/${load.brokerId}/loads/${load.id}`);
            
            await updateDoc(loadRef, {
                status: 'delivered',
                podUrl: podUrl,
                fulfillmentDate: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            toast({ title: "Fulfillment Recorded", description: "The load has been marked as delivered. Awaiting broker settlement." });
            onComplete();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Process Failed", description: e.message });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 text-left">
            <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground text-left text-foreground">
                <ArrowLeft className="h-4 w-4" /> Back to Instruction
            </Button>

            <Card className="shadow-2xl border-none overflow-hidden text-left bg-white">
                <CardHeader className="bg-slate-900 text-white p-10 text-left">
                    <div className="flex justify-between items-start text-left text-foreground">
                        <div className="text-left text-white">
                            <CardTitle className="text-3xl font-black font-headline flex items-center gap-3 text-white text-left">
                                <CheckCircle className="h-10 w-10 text-primary" />
                                Work Fulfillment Gateway
                            </CardTitle>
                            <CardDescription className="text-slate-400 text-lg mt-2 text-left">
                                Close the loop for Instruction <strong>{load.instructionNumber || 'REF-PENDING'}</strong>
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                
                <CardContent className="p-10 space-y-10 bg-white text-left text-foreground">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left text-foreground text-foreground">
                        <div className="space-y-6 text-left">
                            <h3 className="font-black text-xl flex items-center gap-2 text-foreground text-left text-foreground">
                                <FileUp className="h-6 w-6 text-primary" />
                                1. Proof of Delivery (POD)
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed text-left">
                                Fulfillment is only authorized once a clear scan or photo of the signed delivery note is uploaded to the platform ledger.
                            </p>
                            
                            <div className="p-8 border-2 border-dashed rounded-3xl bg-slate-50 flex flex-col items-center justify-center gap-4 text-center">
                                {podUrl ? (
                                    <div className="text-center space-y-2">
                                        <ShieldCheck className="h-12 w-12 text-green-600 mx-auto" />
                                        <p className="text-sm font-bold text-green-700 uppercase text-center">POD Captured</p>
                                        <Button variant="link" asChild className="text-xs text-center">
                                            <a href={podUrl} target="_blank" rel="noopener noreferrer">View Uploaded Doc</a>
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <div className="bg-white p-4 rounded-full shadow-sm mx-auto w-fit">
                                            <FileText className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                        <input type="file" id="pod-input" className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} />
                                        <Button onClick={() => document.getElementById('pod-input')?.click()} disabled={isUploading} className="mt-4 font-bold text-center">
                                            {isUploading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <FileUp className="mr-2 h-4 w-4" />}
                                            Upload Signed POD
                                        </Button>
                                    </div>
                                )}
                                {isUploading && <Progress value={uploadProgress} className="h-1.5 w-full max-w-[200px]" />}
                            </div>
                        </div>

                        <div className="space-y-6 text-left text-foreground text-foreground">
                            <h3 className="font-black text-xl flex items-center gap-2 text-foreground text-left">
                                <Banknote className="h-6 w-6 text-primary" />
                                2. Settlement Summary
                            </h3>
                            <div className="p-6 bg-slate-900 rounded-3xl text-white space-y-4 shadow-xl text-left">
                                <div className="space-y-1 text-left">
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] text-left">Expected Haulier Payout</p>
                                    <p className="text-4xl font-black text-primary text-left">{formatCurrency(load.haulierPayout)}</p>
                                </div>
                                <Separator className="bg-white/10" />
                                <div className="text-xs text-slate-400 leading-relaxed text-left">
                                    <p>Upon broker verification of the POD, these funds will be moved from "Pending" to "Available" in your wallet.</p>
                                </div>
                            </div>
                            
                            <Alert className="bg-blue-50 border-blue-200 text-left">
                                <Zap className="h-4 w-4 text-blue-600" />
                                <div className="text-left ml-2 text-foreground">
                                    <AlertTitle className="text-blue-900 font-bold text-left">Factoring Available</AlertTitle>
                                    <AlertDescription className="text-blue-800 text-xs mt-1 text-left">
                                        This load is **Factoring Ready**. Once POD is uploaded, you can request an immediate 75% advance from the Finance Division.
                                    </AlertDescription>
                                </div>
                            </Alert>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="p-10 bg-slate-50 border-t flex justify-between items-center text-left">
                    <Button variant="ghost" onClick={onBack} className="font-bold text-muted-foreground text-left">Return to Details</Button>
                    <Button 
                        onClick={handleConfirmFulfillment} 
                        disabled={!podUrl || isProcessing} 
                        className="h-16 px-12 text-lg font-black uppercase tracking-tight shadow-xl bg-primary hover:bg-primary/90 text-white"
                    >
                        {isProcessing ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : "Confirm Fulfillment"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
