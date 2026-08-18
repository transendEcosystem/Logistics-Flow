'use client';

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
    Loader2, Camera, Zap, ShieldCheck, FileUp, Sparkles, Truck, CheckCircle2, 
    ArrowRight, User, Building, Landmark, Banknote, FileText, ChevronRight, Users, Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { runVisionOnboarding } from '@/ai/flows/vision-onboarding-flow';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface VisionOnboardingDialogProps {
    onExtractionComplete: (data: any) => void;
    trigger?: React.ReactNode;
    initialDocType?: string;
    stepId?: string;
}

const docTypes = [
    { id: 'rsa_id', label: 'RSA Identity Document', icon: User, description: 'Individual owner or director identification.' },
    { id: 'company_formation', label: 'Company Registration (CK)', icon: Building, description: 'CIPC registration and director lists.' },
    { id: 'rc1', label: 'Vehicle Registration (RC1)', icon: Truck, description: 'Asset verification and technical specs.' },
    { id: 'bank_statement', label: 'Bank Statement', icon: Banknote, description: 'Financial verification and account details.' },
    { id: 'trust_deed', label: 'Trust Deed', icon: Landmark, description: 'Legal standing for trusts.' },
    { id: 'partnership_agreement', label: 'Partnership Agreement', icon: Users, description: 'Contractual standing for partnerships.' },
    { id: 'invoice', label: 'Asset / Service Invoice', icon: FileText, description: 'Proof of purchase or valuation.' },
];

export function VisionOnboardingDialog({ onExtractionComplete, trigger, initialDocType, stepId }: VisionOnboardingDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'type_selection' | 'upload' | 'result'>('type_selection');
    const [selectedDocType, setSelectedDocType] = useState<string>(initialDocType || 'rc1');
    const [isProcessing, setIsProcessing] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [result, setResult] = useState<any>(null);
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setPreview(ev.target?.result as string);
            setView('upload');
        };
        reader.readAsDataURL(file);
    };

    const handleRunVision = async () => {
        if (!preview) return;
        setIsProcessing(true);
        try {
            const output = await runVisionOnboarding({ 
                photoDataUri: preview, 
                docType: selectedDocType as any 
            });
            setResult(output);
            setView('result');
            toast({ title: "Forensic Extraction Complete" });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Extraction Failed", description: e.message });
            setView('upload');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleApply = () => {
        onExtractionComplete(result.extraction);
        setIsOpen(false);
        resetState();
    };

    const resetState = () => {
        setView('type_selection');
        setPreview(null);
        setResult(null);
        setSelectedDocType(initialDocType || 'rc1');
    };

    return (
        <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if(!o) resetState(); }}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="w-full gap-2 font-black uppercase text-[10px] tracking-tight shadow-xl h-12 px-2">
                        <Sparkles className="h-4 w-4" /> AI Document Onboarding
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-3xl text-left text-foreground h-[80vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 border-b bg-muted/30 shrink-0 text-left">
                    <DialogTitle className="flex items-center gap-2 text-left font-black text-xl">
                        <Camera className="h-6 w-6 text-primary" />
                        Vision AI Gateway
                    </DialogTitle>
                    <DialogDescription className="text-left text-foreground">
                        Industrial document analysis terminal. Map high-fidelity data nodes instantly.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden p-6 text-left">
                    {view === 'type_selection' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col text-left">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1 text-left">Step 1: Select Document Context</Label>
                            <ScrollArea className="flex-1 -mx-2 pr-4 text-left">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2 text-left">
                                    {docTypes.map((type) => (
                                        <Button
                                            key={type.id}
                                            variant="outline"
                                            className={cn(
                                                "h-auto py-4 px-5 justify-start gap-4 border-2 transition-all whitespace-normal text-left",
                                                selectedDocType === type.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/50"
                                            )}
                                            onClick={() => setSelectedDocType(type.id)}
                                        >
                                            <div className="bg-muted p-2 rounded-lg shrink-0 text-left">
                                                <type.icon className={cn("h-5 w-5", selectedDocType === type.id ? "text-primary" : "text-muted-foreground")} />
                                            </div>
                                            <div className="flex-1 text-left text-foreground">
                                                <p className="font-bold text-sm leading-none mb-1 text-left">{type.label}</p>
                                                <p className="text-[10px] text-muted-foreground leading-tight text-left">{type.description}</p>
                                            </div>
                                        </Button>
                                    ))}
                                </div>
                            </ScrollArea>
                            <Button className="w-full h-12 font-bold gap-2 text-white" onClick={() => document.getElementById('vision-file-up')?.click()}>
                                Select File to Scan <ChevronRight className="h-4 w-4" />
                            </Button>
                            <input type="file" id="vision-file-up" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                        </div>
                    )}

                    {view === 'upload' && (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 h-full flex flex-col text-left text-foreground">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1 text-left">Step 2: Review & Execute Scan</Label>
                            <div className="flex-1 relative rounded-2xl border-2 overflow-hidden bg-black shadow-inner text-left">
                                {preview && <Image src={preview} alt="Upload Preview" fill className="object-contain opacity-90" />}
                                {isProcessing && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center gap-3 text-center">
                                        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                                        <p className="text-sm font-black text-white uppercase tracking-widest animate-pulse text-center">Crawling Document Nodes...</p>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3 shrink-0 text-left">
                                <Button variant="outline" className="flex-1 h-12 font-bold" onClick={() => setView('type_selection')}>Back</Button>
                                <Button className="flex-[2] h-12 font-black uppercase tracking-widest shadow-xl text-white" onClick={handleRunVision} disabled={isProcessing}>
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Zap className="mr-2 h-4 w-4" />}
                                    Execute Forensic Extraction
                                </Button>
                            </div>
                        </div>
                    )}

                    {view === 'result' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 h-full flex flex-col text-left text-foreground">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1 text-left">Step 3: Forensic Result Audit</Label>
                            <ScrollArea className="flex-1 border-2 border-dashed rounded-2xl bg-slate-50 p-6 text-left">
                                <div className="space-y-8 text-left">
                                    <div className="flex justify-between items-center text-left">
                                        <Badge className="bg-green-100 text-green-700 border-none uppercase font-black text-[9px] h-5 tracking-widest">
                                            Scan Confidence: {(result.confidence * 100).toFixed(0)}%
                                        </Badge>
                                        <Badge variant="outline" className="uppercase text-[9px] font-black border-slate-300">{selectedDocType.replace('_', ' ')}</Badge>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                                        {Object.entries(result.extraction).map(([key, value]) => {
                                            if (!value) return null;
                                            return (
                                                <div key={key} className="space-y-1 text-left">
                                                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-left">{key.replace(/([A-Z])/g, ' $1')}</Label>
                                                    <p className="text-sm font-bold text-slate-900 border-b pb-1 truncate text-left">{String(value)}</p>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <Separator />

                                    <div className="space-y-3 text-left">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 text-left">
                                            <Info className="h-3 w-3" /> Audit Summary
                                        </h4>
                                        <p className="text-xs text-muted-foreground leading-relaxed italic text-left">"{result.summary}"</p>
                                    </div>
                                </div>
                            </ScrollArea>
                            
                            <div className="flex gap-3 shrink-0 text-left">
                                <Button variant="outline" className="flex-1 h-12 font-bold" onClick={() => setView('upload')}>Scan Again</Button>
                                <Button className="flex-[2] h-12 font-black uppercase tracking-widest shadow-xl text-white bg-green-600 hover:bg-green-700" onClick={handleApply}>
                                    Commit to Forensic Registry <CheckCircle2 className="ml-2 h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
