'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken, useUser } from '@/firebase';
import { 
    Loader2, Zap, Gavel, Building, Truck, MapPin, 
    ShieldCheck, Info, CheckCircle2, ChevronRight, X, Ban, PlusCircle, Globe,
    Landmark, UserPlus, Banknote, ListChecks, ArrowLeft, ArrowRight
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchFromAdminAPI, formatCurrency } from '@/lib/utils';
import { provinces } from '@/lib/geodata';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface InitializeSubFacilityModalProps {
    parent: any;
    clients: any[];
    onComplete: () => void;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

const standardMakes = [
    "Scania", "Volvo", "Mercedes-Benz", "MAN", "DAF", "Iveco", "UD Trucks", 
    "Isuzu", "Hino", "Freightliner", "International", "FAW", "Fuso", 
    "Powerstar", "Henred Fruehauf", "Afrit", "Top Trailer", "Kearneys"
];

const discountingTypes = [
    { id: 'factoring', label: 'Factoring (Disclosed)' },
    { id: 'invoice_discounting', label: 'Invoice Discounting' },
    { id: 'rights_discounting', label: 'Rights Discounting' }
];

export function InitializeSubFacilityModal({ parent, clients, onComplete, isOpen, onOpenChange }: InitializeSubFacilityModalProps) {
    const { user } = useUser();
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    // --- FORM STATE ---
    const [type, setType] = useState('loan-pv-term'); 
    const [discountingSubType, setDiscountingSubType] = useState('factoring');
    const [limit, setLimit] = useState<string>('');
    const [associatedClientId, setAssociatedClientId] = useState<string>('');

    // Asset Vetting
    const [assetSelectionMode, setAssetSelectionMode] = useState<'allow_only' | 'exclude_selected'>('allow_only');
    const [makeList, setMakeList] = useState<string[]>([]);
    const [maxYear, setMaxYear] = useState('');
    const [condition, setCondition] = useState('used');

    // Geo Vetting
    const [geoSelectionMode, setGeoSelectionMode] = useState<'allow_only' | 'exclude_selected'>('allow_only');
    const [geoList, setGeoList] = useState<string[]>([]);
    const [selectedProvince, setSelectedProvince] = useState('');
    const [selectedCity, setSelectedCity] = useState('');

    const isDebtorMode = parent?.ownerType === 'debtor';
    const isAssetBased = type === 'installment-sale-term' || type === 'rental-term';
    const isDiscounting = type === 'discounting';

    const cities = useMemo(() => {
        const prov = provinces.find(p => p.name === selectedProvince);
        return prov ? prov.cities : [];
    }, [selectedProvince]);

    // --- WIZARD STEPS CONFIG ---
    const steps = useMemo(() => {
        const base = [
            { id: 'identity', title: '1. Identity', icon: isDebtorMode ? UserPlus : Landmark, fields: ['type', 'associatedClientId'] },
        ];
        if (isAssetBased) {
            base.push({ id: 'assets', title: '2. Asset Vetting', icon: Truck, fields: ['makeList'] });
        }
        if (isDiscounting) {
            base.push({ id: 'discounting', title: '2. Product Spec', icon: Banknote, fields: ['discountingSubType'] });
        }
        base.push({ id: 'geography', title: (isAssetBased || isDiscounting) ? '3. Regional Control' : '2. Regional Control', icon: Globe, fields: [] });
        base.push({ id: 'authorization', title: (isAssetBased || isDiscounting) ? '4. Authorization' : '3. Authorization', icon: Zap, fields: ['limit'] });
        base.push({ id: 'audit', title: 'Audit Summary', icon: ListChecks, fields: [] });
        return base;
    }, [isDebtorMode, isAssetBased, isDiscounting]);

    const handleAddMake = (val: string) => {
        if (!val || makeList.includes(val)) return;
        setMakeList(prev => [...prev, val]);
    };

    const handleAddGeoHub = () => {
        if (!selectedProvince) return;
        const hubLabel = selectedCity ? `${selectedProvince} - ${selectedCity}` : `${selectedProvince} - All Cities`;
        if (geoList.includes(hubLabel)) return;
        setGeoList(prev => [...prev, hubLabel]);
    };

    const handleSave = async () => {
        if (!limit || Number(limit) <= 0) {
            toast({ variant: 'destructive', title: "Limit Required" });
            return;
        }

        setIsSaving(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth failed");

            const payload = {
                parentId: parent.id,
                ownerType: parent.ownerType || 'client',
                facilityClass: 'sub',
                clientId: isDebtorMode ? associatedClientId : (parent.clientId || null),
                debtorId: parent.debtorId || null,
                sourceDealerId: parent.sourceDealerId || null,
                type: isDiscounting ? `Discounting: ${discountingSubType}` : type,
                associatedClientId: isDebtorMode ? associatedClientId : null,
                limit: Number(limit),
                status: 'active',
                createdByName: user?.displayName || 'Admin',
                vettingParams: {
                    assetVetting: isAssetBased ? {
                        selectionMode: assetSelectionMode,
                        makeList,
                        maxAge: maxYear ? Number(maxYear) : null,
                        condition,
                    } : null,
                    geoVetting: {
                        selectionMode: geoSelectionMode,
                        hubList: geoList
                    }
                },
                createdAt: { _methodName: 'serverTimestamp' }
            };

            await fetchFromAdminAPI(token, 'saveLendingFacility', { facility: payload });
            
            toast({ title: "Sub-Node Committed" });
            onComplete();
            onOpenChange(false);
            resetWizard();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Commit Failed", description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleNext = () => {
        if (currentStep < steps.length - 1) setCurrentStep(prev => prev + 1);
    };

    const resetWizard = () => {
        setCurrentStep(0);
        setLimit('');
        setAssociatedClientId('');
        setMakeList([]);
        setGeoList([]);
        setMaxYear('');
    };

    if (!parent) return null;

    const currentStepId = steps[currentStep]?.id;

    return (
        <Dialog open={isOpen} onOpenChange={(o) => { if(!isSaving) onOpenChange(o); }}>
            <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 overflow-hidden text-left text-foreground">
                <DialogHeader className="p-6 border-b bg-muted/30 shrink-0 text-left">
                    <div className="flex justify-between items-center text-left">
                        <div className="text-left text-foreground">
                            <DialogTitle className="flex items-center gap-2 font-black text-xl text-left text-foreground">
                                <Gavel className="h-6 w-6 text-primary" />
                                Sub-Facility Authorization Protocol
                            </DialogTitle>
                            <DialogDescription className="text-left text-foreground">Partitioning capital for {parent.ownerName || 'Master Node'}.</DialogDescription>
                        </div>
                        <Badge variant="outline" className="h-7 px-4 border-primary/30 text-primary font-black uppercase text-[10px] tracking-widest text-left text-foreground">
                            Ceiling: {formatCurrency(parent.limit)}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="flex-1 flex overflow-hidden text-left text-foreground">
                    <div className="w-64 border-r bg-slate-50 p-6 space-y-2 shrink-0 text-left">
                        {steps.map((step, i) => (
                            <Button 
                                key={step.id} 
                                variant={currentStep === i ? "secondary" : "ghost"} 
                                className={cn(
                                    "w-full justify-start gap-3 h-11 px-3 transition-all text-left",
                                    currentStep === i && "bg-white shadow-sm ring-1 ring-primary/20"
                                )}
                                onClick={() => i < currentStep && setCurrentStep(i)}
                            >
                                <div className={cn(
                                    "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black",
                                    currentStep >= i ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                                )}>{i+1}</div>
                                <step.icon className={cn("h-4 w-4", currentStep === i ? "text-primary" : "text-muted-foreground")} />
                                <span className={cn("text-[10px] font-black uppercase tracking-tight truncate text-left", currentStep === i ? "text-primary" : "text-muted-foreground")}>{step.title.split('. ')[1]}</span>
                            </Button>
                        ))}
                    </div>

                    <ScrollArea className="flex-1 bg-white p-10 text-left">
                        <div className="max-w-2xl mx-auto space-y-10 text-left text-foreground">
                            
                            {currentStepId === 'identity' && (
                                <div className="space-y-8 animate-in fade-in duration-500 text-left">
                                    <div className="space-y-3 text-left">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Agreement Protocol Type</Label>
                                        <Select value={type} onValueChange={setType}>
                                            <SelectTrigger className="h-12 border-2 bg-white font-bold text-left text-foreground"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="loan-pv-term">Loan / Working Capital</SelectItem>
                                                <SelectItem value="installment-sale-term">Installment Sale</SelectItem>
                                                <SelectItem value="rental-term">Lease / Rental</SelectItem>
                                                <SelectItem value="discounting">Discounting Products</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {isDebtorMode && (
                                        <div className="space-y-3 pt-4 text-left animate-in slide-in-from-top-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Member Client Allocation</Label>
                                            <Select value={associatedClientId} onValueChange={setAssociatedClientId}>
                                                <SelectTrigger className="h-12 border-2 bg-white font-bold text-left text-foreground text-foreground"><SelectValue placeholder="Choose borrower to bind..." /></SelectTrigger>
                                                <SelectContent>
                                                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>
                            )}

                            {currentStepId === 'assets' && (
                                <div className="space-y-8 animate-in fade-in duration-500 text-left text-foreground text-foreground">
                                    <div className="flex items-center justify-between text-left">
                                        <h3 className="font-black text-lg uppercase tracking-tight text-left">Asset Vetting Node</h3>
                                        <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-full border px-4 h-10 text-left">
                                            <Label className="text-[9px] font-black uppercase text-muted-foreground">Allow Only</Label>
                                            <Switch 
                                                checked={assetSelectionMode === 'exclude_selected'} 
                                                onCheckedChange={(checked) => setAssetSelectionMode(checked ? 'exclude_selected' : 'allow_only')} 
                                            />
                                            <Label className="text-[9px] font-black uppercase text-destructive">Exclude Selected</Label>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4 text-left">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Vetted Makes</Label>
                                        <Select onValueChange={handleAddMake}>
                                            <SelectTrigger className="h-11 border-2 bg-white text-left text-foreground"><SelectValue placeholder="Add Make to Register..." /></SelectTrigger>
                                            <SelectContent>{standardMakes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <div className="flex flex-wrap gap-2 p-4 min-h-[60px] bg-slate-50 border-2 border-dashed rounded-2xl text-left">
                                            {makeList.map(m => (
                                                <Badge key={m} className={cn("h-8 gap-2 pl-3 pr-1 text-xs font-bold transition-all text-white", assetSelectionMode === 'allow_only' ? "bg-primary" : "bg-destructive")}>
                                                    {m} <button onClick={() => setMakeList(prev => prev.filter(x => x !== m))}><X className="h-3 w-3" /></button>
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStepId === 'discounting' && (
                                <div className="space-y-6 animate-in fade-in duration-500 text-left text-foreground text-foreground">
                                     <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1 text-left">Discounting Sub-Type</Label>
                                     <RadioGroup value={discountingSubType} onValueChange={setDiscountingSubType} className="grid grid-cols-1 gap-4 text-left">
                                        {discountingTypes.map(dt => (
                                            <div key={dt.id} className={cn("flex items-center space-x-3 p-4 border-2 rounded-2xl cursor-pointer transition-all", discountingSubType === dt.id ? "border-primary bg-primary/5 shadow-md" : "bg-white")}>
                                                <RadioGroupItem value={dt.id} id={dt.id} />
                                                <Label htmlFor={dt.id} className="font-bold text-sm cursor-pointer text-left">{dt.label}</Label>
                                            </div>
                                        ))}
                                     </RadioGroup>
                                </div>
                            )}

                            {currentStepId === 'geography' && (
                                <div className="space-y-8 animate-in fade-in duration-500 text-left text-foreground text-foreground">
                                    <div className="flex items-center justify-between text-left">
                                        <h3 className="font-black text-lg uppercase tracking-tight text-left">Geographic Control</h3>
                                        <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-full border px-4 h-10 text-left">
                                            <Label className="text-[9px] font-black uppercase text-muted-foreground">Inclusion</Label>
                                            <Switch checked={geoSelectionMode === 'exclude_selected'} onCheckedChange={(c) => setGeoSelectionMode(c ? 'exclude_selected' : 'allow_only')} />
                                            <Label className="text-[9px] font-black uppercase text-destructive">Exclusion</Label>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-left">
                                        <Select value={selectedProvince} onValueChange={setSelectedProvince}>
                                            <SelectTrigger className="text-left text-foreground"><SelectValue placeholder="Province..." /></SelectTrigger>
                                            <SelectContent>{provinces.map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <div className="flex gap-2 text-left">
                                            <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedProvince}>
                                                <SelectTrigger className="flex-1 text-left text-foreground"><SelectValue placeholder="City..." /></SelectTrigger>
                                                <SelectContent>{cities.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <Button type="button" size="icon" className="shrink-0" onClick={handleAddGeoHub} disabled={!selectedProvince}><PlusCircle className="h-5 w-5"/></Button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 p-4 min-h-[60px] bg-slate-50 border-2 border-dashed rounded-2xl text-left">
                                        {geoList.map(g => (
                                            <Badge key={g} className={cn("h-8 gap-2 pl-3 pr-1 text-xs font-bold transition-all text-white", geoSelectionMode === 'allow_only' ? "bg-primary" : "bg-destructive")}>
                                                {g} <button onClick={() => setGeoList(prev => prev.filter(x => x !== g))}><X className="h-3 w-3" /></button>
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {currentStepId === 'authorization' && (
                                <div className="space-y-6 animate-in fade-in duration-500 text-left text-foreground text-foreground">
                                    <div className="space-y-3 p-8 bg-primary/5 border-2 border-primary/20 rounded-[2.5rem] text-left">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1 text-left">Authorized Limit Partition (ZAR)</Label>
                                        <Input 
                                            type="number" 
                                            value={limit} 
                                            onChange={e => setLimit(e.target.value)} 
                                            placeholder="0.00"
                                            className="h-16 border-none bg-transparent text-5xl font-black focus-visible:ring-0 p-0 text-left"
                                        />
                                        <p className="text-[11px] text-muted-foreground font-medium italic mt-2 text-left">Deducted from Master Ceiling node.</p>
                                    </div>
                                </div>
                            )}

                            {currentStepId === 'audit' && (
                                <div className="space-y-8 animate-in zoom-in-95 duration-500 text-left text-foreground">
                                    <div className="p-8 bg-slate-900 text-white rounded-3xl space-y-6 shadow-2xl text-left text-white">
                                        <div className="flex justify-between items-baseline text-left text-white">
                                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] text-left">Authorized Sub-Limit</span>
                                            <span className="text-4xl font-black text-primary text-right">{formatCurrency(limit)}</span>
                                        </div>
                                        <Separator className="bg-white/10" />
                                        <div className="grid grid-cols-2 gap-8 text-left text-white">
                                            <div className="space-y-1 text-left">
                                                <Label className="text-[9px] font-black uppercase text-slate-500 text-left">Agreement Node</Label>
                                                <p className="font-bold text-sm capitalize text-left">{type.replace(/-/g, ' ')}</p>
                                            </div>
                                            <div className="space-y-1 text-right text-left">
                                                <Label className="text-[9px] font-black uppercase text-slate-500 text-right">Master Identity</Label>
                                                <p className="font-bold text-sm text-right">{parent.ownerName}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </ScrollArea>
                </div>

                <DialogFooter className="bg-slate-50 p-6 border-t shrink-0 flex justify-between text-left">
                    <Button variant="ghost" onClick={() => currentStep > 0 ? setCurrentStep(prev => prev - 1) : onOpenChange(false)} disabled={isSaving} className="text-foreground">
                        <ArrowLeft className="mr-2 h-4 w-4" /> {currentStep === 0 ? 'Cancel' : 'Back'}
                    </Button>
                    {currentStep < steps.length - 1 ? (
                        <Button onClick={handleNext} className="px-10 font-black uppercase text-xs tracking-widest text-white shadow-lg h-12">
                            Next Stage <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={handleSave} disabled={isSaving || !limit} className="h-12 px-16 font-black uppercase tracking-tight shadow-xl text-white">
                            {isSaving ? <Loader2 className="mr-2 animate-spin h-4 w-4" /> : <ShieldCheck className="mr-2 h-5 w-5" />} 
                            Commit Authorization
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
