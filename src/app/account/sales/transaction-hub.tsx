'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    Loader2, Landmark, ArrowLeft, ArrowRight, MessageSquare, 
    FileCheck, ShieldCheck, Scale, FileText, Send, Building, Info, CheckCircle, Banknote, Zap, Download, Lock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateSafe, cn } from '@/lib/utils';
import { useUser, useFirestore, useDoc, useMemoFirebase, getClientSideAuthToken, useCollection } from '@/firebase';
import { doc, collection, query, orderBy, serverTimestamp, setDoc } from 'firebase/firestore';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

const steps = [
    { id: 'negotiation', title: 'Handshake & Price', icon: MessageSquare },
    { id: 'funding', title: 'Financial Lock', icon: Landmark },
    { id: 'legal', title: 'Document Vault', icon: FileCheck },
    { id: 'fulfillment', title: 'Delivery & Release', icon: CheckCircle },
];

export function SalesTransactionHub({ vehicle, onBack }: { vehicle: any, onBack: () => void }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [chatMessage, setChatMessage] = useState('');
    const [offerAmount, setOfferAmount] = useState(vehicle.price);

    const isSeller = user?.companyId === vehicle.companyId;

    // 1. Establish/Fetch the Sale Handshake
    const saleId = `SALE_${vehicle.id}_${user?.companyId}`;
    const saleRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'sales', saleId);
    }, [firestore, saleId]);
    const { data: sale, isLoading: isSaleLoading } = useDoc(saleRef);

    // 2. Fetch Messages
    const msgsQuery = useMemoFirebase(() => {
        if (!firestore || !saleId) return null;
        return query(collection(firestore, `sales/${saleId}/messages`), orderBy('timestamp', 'asc'));
    }, [firestore, saleId]);
    const { data: messages } = useCollection(msgsQuery);

    const currentStatus = sale?.status || 'negotiating';

    // Step Resolution
    useEffect(() => {
        if (currentStatus === 'negotiating') setCurrentStep(0);
        else if (currentStatus === 'finance_pending') setCurrentStep(1);
        else if (currentStatus === 'paid') setCurrentStep(2);
        else if (currentStatus === 'delivered' || currentStatus === 'concluded') setCurrentStep(3);
    }, [currentStatus]);

    const handleSendMessage = async () => {
        if (!chatMessage.trim()) return;
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            
            await fetch('/api/addUserDoc', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    collectionPath: `sales/${saleId}/messages`, 
                    data: { text: chatMessage, senderId: user.uid, senderName: user.displayName, timestamp: { _methodName: 'serverTimestamp' } }
                })
            });
            setChatMessage('');
        } catch (e) { toast({ variant: 'destructive', title: "Message Failed" }); }
    };

    const handleAction = async (action: string) => {
        setIsProcessing(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth failed.");
            
            const data: any = { updatedAt: serverTimestamp() };
            
            if (action === 'negotiate') {
                data.agreedPrice = Number(offerAmount);
                data.status = 'finance_pending';
                data.buyerId = user.companyId;
                data.buyerName = user.companyData?.companyName || 'Buyer';
                data.sellerId = vehicle.companyId;
                data.sellerName = vehicle.sellerName || 'Seller';
                data.vehicleId = vehicle.id;
                data.vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
                data.commissionRate = 2.5; // Platform Standard
                data.createdAt = serverTimestamp();
            } else if (action === 'confirm_delivery') {
                data.status = 'delivered';
            }

            await setDoc(saleRef!, data, { merge: true });
            toast({ title: "Workflow Updated" });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Action Failed", description: e.message });
        } finally {
            setIsProcessing(false);
        }
    };

    if (isSaleLoading) return <div className="flex justify-center p-20 text-center text-foreground"><Loader2 className="animate-spin text-primary mx-auto" /><p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">Initializing Handshake...</p></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-left text-foreground">
            <div className="flex justify-between items-center text-left">
                <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground text-foreground text-left"><ArrowLeft className="h-4 w-4" /> Return to Mall</Button>
                <Badge variant="outline" className="h-7 px-4 border-primary text-primary font-black uppercase text-[10px] tracking-widest">
                    Live Handshake Terminal
                </Badge>
            </div>

            <Card className="shadow-2xl border-none overflow-hidden text-left bg-white text-foreground">
                <CardHeader className="bg-slate-900 text-white p-8 text-left">
                    <div className="flex justify-between items-start text-left text-white">
                        <div className="text-left text-white">
                            <CardTitle className="text-3xl font-black font-headline text-white">{vehicle.year} {vehicle.make} {vehicle.model}</CardTitle>
                            <CardDescription className="text-slate-400 mt-1">HANDSHAKE ID: <span className="font-mono">{saleId}</span></CardDescription>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Agreed Value</p>
                            <p className="text-3xl font-black text-primary">{formatCurrency(sale?.agreedPrice || vehicle.price)}</p>
                        </div>
                    </div>
                </CardHeader>
                
                <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] bg-white text-left">
                    <div className="border-r bg-slate-50/50 p-6 space-y-2 text-left">
                        {steps.map((step, i) => (
                            <div key={step.id} className={cn(
                                "flex items-center gap-3 p-4 rounded-xl transition-all",
                                currentStep === i ? "bg-white shadow-md ring-1 ring-primary/20" : "opacity-40"
                            )}>
                                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", currentStep >= i ? "bg-primary text-white" : "bg-muted")}>
                                    {React.createElement(step.icon, { className: "h-4 w-4" })}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">{step.title}</span>
                            </div>
                        ))}
                    </div>

                    <CardContent className="p-8 space-y-8 text-left text-foreground">
                        {currentStep === 0 && (
                            <div className="space-y-6 text-left text-foreground">
                                <div className="p-6 bg-primary/5 border-2 border-primary/20 rounded-3xl space-y-6 text-left">
                                    <div className="space-y-1 text-left text-foreground">
                                        <h3 className="font-black text-xl flex items-center gap-2 text-foreground text-left text-foreground"><Scale className="h-6 w-6 text-primary" /> 1. Commercial Negotiation</h3>
                                        <p className="text-sm text-muted-foreground text-left">Submit your offer to the seller. Locking the price initiates the legal documentation phase.</p>
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <Label className="font-black uppercase text-[10px] text-muted-foreground ml-1">Proposed Sales Price (Excl. VAT)</Label>
                                        <Input 
                                            type="number" 
                                            value={offerAmount} 
                                            onChange={e => setOfferAmount(Number(e.target.value))} 
                                            className="h-14 text-2xl font-black border-2 border-primary/20 focus-visible:ring-primary bg-white" 
                                        />
                                    </div>
                                    <Button className="w-full h-14 font-black uppercase tracking-tight text-lg shadow-lg" onClick={() => handleAction('negotiate')}>
                                        Lock Price & Initiate Handshake
                                    </Button>
                                </div>
                            </div>
                        )}

                        {currentStep === 1 && (
                            <div className="space-y-8 text-left text-foreground">
                                <Alert className="bg-amber-50 border-amber-200 p-6 rounded-2xl text-left">
                                    <Landmark className="h-6 w-6 text-amber-600" />
                                    <div className="ml-2 text-left">
                                        <AlertTitle className="font-black text-lg text-amber-900 text-left">Capital Commitment Required</AlertTitle>
                                        <AlertDescription className="text-sm text-amber-800 leading-relaxed mt-1 text-left">
                                            Price is locked at **{formatCurrency(sale.agreedPrice)}**. {isSeller ? 'Awaiting buyer payment or finance approval.' : 'Finalize payment or trigger a finance mall enquiry to move to documentation.'}
                                        </AlertDescription>
                                    </div>
                                </Alert>
                                {!isSeller && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                                        <Link href={`/funding/apply?type=vehicles&amount=${sale.agreedPrice}&vehicleId=${vehicle.id}&origination=market`} className="text-left no-underline block">
                                            <Card className="border-2 border-primary/20 hover:border-primary transition-colors cursor-pointer h-full bg-white text-left">
                                                <CardContent className="p-6 space-y-2 text-left text-foreground">
                                                    <div className="bg-primary/10 p-2 rounded-lg w-fit transition-colors text-left"><Landmark className="h-5 w-5" /></div>
                                                    <p className="font-black text-sm uppercase text-left">Apply for Finance</p>
                                                    <p className="text-xs text-muted-foreground leading-tight text-left">Broadcast this transaction to our specialized lending network.</p>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                        <div className="h-full text-left cursor-pointer" onClick={() => toast({ title: "Simulation: Payment Logged", description: "In production, this triggers a wallet debit." })}>
                                            <Card className="border-2 border-slate-100 hover:border-slate-900 transition-colors h-full bg-white text-left">
                                                <CardContent className="p-6 space-y-2 text-left text-foreground">
                                                    <div className="bg-slate-100 p-2 rounded-lg w-fit text-left text-foreground"><Banknote className="h-5 w-5" /></div>
                                                    <p className="font-black text-sm uppercase text-left">Pay with Wallet</p>
                                                    <p className="text-xs text-muted-foreground leading-tight text-left">Use available funds for immediate asset release.</p>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {currentStep >= 2 && (
                            <div className="space-y-6 text-left text-foreground">
                                <div className="space-y-4 text-left text-foreground">
                                    <h3 className="font-black text-xl flex items-center gap-2 text-foreground text-left"><FileCheck className="h-6 w-6 text-primary" /> Transaction Document Vault</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left text-foreground">
                                        <Button variant="outline" className="h-16 justify-start gap-4 px-6 border-2 bg-white" onClick={() => toast({ title: "OTP Generated", description: "Offer to Purchase is ready for download." })}>
                                            <div className="bg-blue-100 p-2 rounded-lg text-left"><FileText className="h-5 w-5 text-blue-600" /></div>
                                            <div className="text-left"><p className="font-black text-xs uppercase text-left">Offer to Purchase</p><p className="text-[10px] text-muted-foreground text-left">Legally Binding Contract</p></div>
                                        </Button>
                                        <Button variant="outline" className="h-16 justify-start gap-4 px-6 border-2 bg-white" onClick={() => toast({ title: "Invoice Generated", description: "VAT Invoice has been isolated." })}>
                                            <div className="bg-green-100 p-2 rounded-lg text-left"><Banknote className="h-5 w-5 text-green-600" /></div>
                                            <div className="text-left text-foreground text-left"><p className="font-black text-xs uppercase text-left">Pro-forma Invoice</p><p className="text-[10px] text-muted-foreground text-left">Financial Settlement Record</p></div>
                                        </Button>
                                    </div>
                                </div>
                                
                                {currentStatus === 'paid' && (
                                    <div className="p-6 bg-green-50 border-2 border-green-200 rounded-3xl space-y-4 text-left text-foreground">
                                        <div className="flex items-center gap-3 text-left">
                                            <ShieldCheck className="h-6 w-6 text-green-600" />
                                            <p className="font-black text-green-900 text-left">Funds Secured in Escrow</p>
                                        </div>
                                        <p className="text-sm text-green-800 leading-relaxed text-left text-foreground">The platform has secured the full amount. Seller must now coordinate delivery and the buyer must confirm receipt to release funds.</p>
                                        <Button className="w-full h-12 bg-green-600 font-bold" onClick={() => handleAction('confirm_delivery')}>Confirm Physical Delivery</Button>
                                    </div>
                                )}
                            </div>
                        )}

                        <Separator />

                        <div className="space-y-4 text-left text-foreground">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 text-left text-foreground">
                                <MessageSquare className="h-4 w-4 text-primary" />
                                Handshake Direct Chat
                            </h4>
                            <div className="bg-slate-50 border rounded-3xl p-6 h-80 flex flex-col shadow-inner text-left text-foreground">
                                <ScrollArea className="flex-1 pr-4 text-left">
                                    <div className="space-y-4 text-left">
                                        {messages?.map((msg: any) => (
                                            <div key={msg.id} className={cn("flex flex-col", msg.senderId === user.uid ? "items-end" : "items-start")}>
                                                <div className={cn("px-4 py-2 rounded-2xl text-sm shadow-sm", msg.senderId === user.uid ? "bg-primary text-white rounded-br-none" : "bg-white border rounded-bl-none")}>
                                                    <p className="font-black text-[9px] uppercase opacity-70 mb-1">{msg.senderName}</p>
                                                    <p>{msg.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                                <div className="mt-4 flex gap-2 pt-4 border-t text-left">
                                    <Input 
                                        placeholder="Discuss logistics or terms..." 
                                        value={chatMessage} 
                                        onChange={e => setChatMessage(e.target.value)} 
                                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()} 
                                        className="bg-white rounded-full h-11 px-6 shadow-sm flex-1" 
                                    />
                                    <Button size="icon" className="rounded-full h-11 w-11 shadow-md" onClick={handleSendMessage}><Send className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </div>

                <CardFooter className="bg-slate-50 border-t p-8 flex justify-between items-center text-left">
                    <div className="flex gap-4 text-left">
                        <Button variant="ghost" size="sm" className="gap-2 font-black text-[10px] uppercase tracking-widest text-muted-foreground text-left"><Info className="h-3.5 w-3.5"/> Handshake Integrity Shield Active</Button>
                    </div>
                    {currentStatus === 'concluded' && (
                        <Badge className="bg-green-600 text-white font-black uppercase py-2 px-8 rounded-full shadow-lg">Handshake Concluded</Badge>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
