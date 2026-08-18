'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Info, Zap, Send, ClipboardCheck, Video, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateDeepOutreach } from '@/ai/flows/deep-outreach-flow';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export function DeepPersonalizationButton({ partner, audience }: { partner: any, audience: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<any>(null);
    const { toast } = useToast();

    const minedContent = partner.minedServiceWording || partner.notes || '';
    const name = partner.companyName || `${partner.firstName} ${partner.lastName}`;

    const handleGenerate = async () => {
        if (!minedContent) {
            toast({ variant: 'destructive', title: "Missing Evidence", description: "No mined technical data found for this record. Run Scavenger first." });
            return;
        }
        setIsGenerating(true);
        try {
            const output = await generateDeepOutreach({
                companyName: name,
                minedContent,
                audience
            });
            setResult(output);
            toast({ title: "Deep Narrative Generated" });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Generation Failed", description: e.message });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <>
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsOpen(true)} 
                title="Deep Personalization Agent"
                className={cn(minedContent ? "text-amber-500 animate-pulse" : "opacity-30")}
            >
                <Sparkles className="h-4 w-4" />
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col p-0 text-left text-foreground">
                    <DialogHeader className="p-6 border-b bg-amber-50">
                        <div className="flex items-center justify-between text-left">
                            <div className="text-left">
                                <DialogTitle className="flex items-center gap-2 font-black text-amber-700 text-left">
                                    <Sparkles className="h-5 w-5" />
                                    Deep Personalization Agent
                                </DialogTitle>
                                <DialogDescription className="text-left">Generating high-conversion narrative based on forensic evidence for <strong>{name}</strong>.</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden p-6 bg-white text-left">
                        {!result ? (
                            <div className="h-full flex flex-col items-center justify-center space-y-6 text-center">
                                <div className="bg-amber-100 p-8 rounded-full border-2 border-dashed border-amber-300">
                                    <Zap className="h-16 w-16 text-amber-600 opacity-50" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-foreground">Ready to Analyze Evidence</h3>
                                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">The agent will ingest the mined sitemap data to identify a specific pain point.</p>
                                </div>
                                <Button size="lg" className="bg-amber-600 hover:bg-amber-700 font-bold h-14 px-12 text-white" onClick={handleGenerate} disabled={isGenerating}>
                                    {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
                                    Analyze & Generate Deep Narrative
                                </Button>
                            </div>
                        ) : (
                            <Tabs defaultValue="email" className="h-full flex flex-col text-left">
                                <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-muted/50 mb-6">
                                    <TabsTrigger value="email" className="gap-2 py-2.5 font-bold uppercase text-[10px] tracking-widest">
                                        <Mail className="h-3.5 w-3.5" /> Personalized Email
                                    </TabsTrigger>
                                    <TabsTrigger value="video" className="gap-2 py-2.5 font-bold uppercase text-[10px] tracking-widest">
                                        <Video className="h-3.5 w-3.5" /> Video Script
                                    </TabsTrigger>
                                </TabsList>

                                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 mb-6 flex items-start gap-3 text-left">
                                    <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                    <div className="text-left">
                                        <p className="text-[10px] font-black uppercase text-amber-700 tracking-widest">Identified Industrial Constraint</p>
                                        <p className="text-sm font-bold text-slate-900">{result.keyPainPoint}</p>
                                    </div>
                                </div>

                                <ScrollArea className="flex-1 border rounded-xl p-6 bg-slate-50 font-mono text-sm leading-relaxed shadow-inner text-left">
                                    <TabsContent value="email" className="mt-0 text-left">
                                        <div className="space-y-4 text-left">
                                            <p className="font-bold text-primary">Subject: {result.personalizedEmail.subject}</p>
                                            <Separator />
                                            <div className="whitespace-pre-wrap">{result.personalizedEmail.body}</div>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="video" className="mt-0 text-left">
                                        <div className="whitespace-pre-wrap text-slate-700">{result.videoScript}</div>
                                    </TabsContent>
                                </ScrollArea>
                            </Tabs>
                        )}
                    </div>

                    <DialogFooter className="p-6 border-t bg-slate-50">
                        {result && (
                            <Button className="w-full h-12 font-bold gap-2 text-white" onClick={() => { navigator.clipboard.writeText(result.personalizedEmail.body); toast({ title: "Copied to Clipboard" }); }}>
                                <ClipboardCheck className="h-5 w-5" />
                                Copy Selected Narrative
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}