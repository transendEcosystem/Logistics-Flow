'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { provinces } from '@/lib/geodata';
import { Truck, Search, MapPin, ShieldCheck, Loader2, ArrowRight, Lock, Navigation, Sparkles, Info, CheckCircle2, AlertCircle, Database, Table as TableIcon, ThumbsUp, ShieldAlert, Zap } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useUser, getClientSideAuthToken } from '@/firebase';
import * as gtag from '@/lib/gtag';
import { cn, formatCurrency } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const servicesMap = [
    { id: 'all', label: 'All Services' },
    { id: 'container', label: 'Container Transport' },
    { id: 'reefer-container', label: 'Refrigerated Containers' },
    { id: 'general-freight', label: 'General Freight' },
    { id: 'bulk-aggregates', label: 'Bulk / Aggregates' },
    { id: 'abnormal-loads', label: 'Abnormal Loads' },
];

export default function TransporterIntelligencePage() {
    const { user } = useUser();
    const { toast } = useToast();
    const router = useRouter();
    
    const [selectedProvince, setSelectedProvince] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedSuburb, setSelectedSuburb] = useState('');
    const [selectedService, setSelectedService] = useState('all');
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isVouching, setIsVouching] = useState<string | null>(null);
    const [isClaiming, setIsClaiming] = useState<string | null>(null);
    const [isEngaging, setIsEngaging] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        handleSearch();
    }, []);
    
    const isPaid = user?.companyData?.membershipId && user.companyData.membershipId !== 'free';

    const cities = useMemo(() => {
        const prov = provinces.find(p => p.name === selectedProvince);
        return prov ? prov.cities : [];
    }, [selectedProvince]);

    const suburbs = useMemo(() => {
        const city = cities.find(c => c.name === selectedCity);
        return city ? city.suburbs : [];
    }, [selectedCity, cities]);

    const handleSearch = async () => {
        setIsLoading(true);
        setHasSearched(true);
        setError(null);
        try {
            const token = await getClientSideAuthToken();
            const response = await fetch('/api/searchLeads', {
                method: 'POST',
                headers: { 
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    type: 'transporter',
                    province: selectedProvince,
                    city: selectedCity,
                    suburb: selectedSuburb,
                    service: selectedService === 'all' ? '' : selectedService
                }),
            });
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || "Search failed.");
            }

            setResults(result.data || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEngage = async (res: any) => {
        if (!user) {
            router.push('/signin?redirect=/intelligence/transporter');
            return;
        }
        if (!isPaid) {
            router.push('/checkout/intelligence');
            return;
        }

        setIsEngaging(res.id);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;

            await fetch('/api/recordEngagement', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    targetId: res.id, 
                    targetName: res.companyName,
                    targetType: res.isLead ? 'lead' : 'partner'
                })
            });
            
            toast({ title: "Haulier Engagement Logged", description: "Direct communication node established." });
            router.push(`/mall/transporter/${res.id}`);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setIsEngaging(null);
        }
    };

    const handleVouch = async (targetId: string) => {
        if (!user) {
            toast({ variant: 'destructive', title: "Sign-in Required", description: "Sign in to vouch for community data." });
            router.push('/signin');
            return;
        }
        setIsVouching(targetId);
        try {
            const token = await getClientSideAuthToken();
            const res = await fetch('/api/vouch', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetId, collection: 'partners' })
            });
            const result = await res.json();
            if (result.success) {
                toast({ title: "Verification Recorded" });
                handleSearch(); 
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Error" });
        } finally {
            setIsVouching(null);
        }
    };

    const handleClaim = async (targetId: string) => {
        if (!user) {
            toast({ variant: 'destructive', title: "Sign-in Required", description: "Sign in to claim your node." });
            router.push('/signin');
            return;
        }

        const balance = user.companyData?.availableBalance || 0;
        if (balance < 10) {
            toast({ variant: 'destructive', title: "Low Balance", description: "R10 required in wallet." });
            router.push('/account?view=wallet');
            return;
        }

        setIsClaiming(targetId);
        try {
            const token = await getClientSideAuthToken();
            const res = await fetch('/api/claimNode', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetId, collection: 'partners' })
            });
            const result = await res.json();
            if (result.success) {
                toast({ title: "Node Claimed!" });
                handleSearch();
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Claim Failed", description: e.message });
        } finally {
            setIsClaiming(null);
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen text-left text-foreground">
            <section className="bg-slate-900 text-white py-16 text-center text-white">
                <div className="container mx-auto px-4">
                    <Badge className="mb-4 bg-primary/20 text-primary border-primary/30 py-1.5 px-4 text-[10px] font-black uppercase tracking-widest text-center text-white">Forensic Registry</Badge>
                    <h1 className="text-4xl md:text-6xl font-black font-headline text-white text-center">Transporter intelligence</h1>
                    <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto text-center">Map the South African transport landscape. Find verified hauliers based on precise fleet capabilities.</p>
                </div>
            </section>

            <section className="container mx-auto px-4 -mt-12 text-left">
                <Card className="max-w-5xl mx-auto shadow-2xl border-none text-left text-foreground">
                    <CardHeader className="bg-white rounded-t-xl border-b text-left text-foreground">
                        <CardTitle className="flex items-center gap-2 text-left">
                            <Navigation className="h-5 w-5 text-primary" />
                            Specify Requirements
                        </CardTitle>
                        <CardDescription className="text-left">Select your location and the specific service type to match with verified capacity.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-left text-foreground">
                        <div className="space-y-2 text-left text-foreground">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Province</Label>
                            <Select value={selectedProvince} onValueChange={setSelectedProvince}>
                                <SelectTrigger className="h-11 border-2 bg-white text-left"><SelectValue placeholder="Select Province" /></SelectTrigger>
                                <SelectContent>
                                    {provinces.map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 text-left text-foreground">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">City</Label>
                            <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedProvince}>
                                <SelectTrigger className="h-11 border-2 bg-white text-left"><SelectValue placeholder="Select City" /></SelectTrigger>
                                <SelectContent>
                                    {cities.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 text-left text-foreground">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Hub</Label>
                            <Select value={selectedSuburb} onValueChange={setSelectedSuburb} disabled={!selectedCity}>
                                <SelectTrigger className="h-11 border-2 bg-white text-left"><SelectValue placeholder="Select Hub" /></SelectTrigger>
                                <SelectContent>
                                    {suburbs.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 text-left text-foreground">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Service Type</Label>
                            <Select value={selectedService} onValueChange={setSelectedService}>
                                <SelectTrigger className="h-11 border-2 bg-white text-left"><SelectValue placeholder="Select Service" /></SelectTrigger>
                                <SelectContent>
                                    {servicesMap.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50 border-t flex justify-center p-4">
                        <Button className="h-12 px-12 font-black uppercase text-xs tracking-widest gap-2 text-white" onClick={handleSearch} disabled={isLoading}>
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4" />}
                            Execute Search
                        </Button>
                    </CardFooter>
                </Card>
            </section>

            <section className="container mx-auto px-4 py-16 text-left">
                {!hasSearched && !error ? (
                    <div className="text-center py-20 opacity-20 text-center">
                        <Database className="h-24 w-24 mx-auto mb-4" />
                        <p className="text-xl font-bold uppercase tracking-widest text-center">Ready to Match Capacity</p>
                    </div>
                ) : isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <p className="font-bold text-muted-foreground uppercase tracking-widest text-center">Mapping intelligence Data...</p>
                    </div>
                ) : (
                    <div className="max-w-6xl mx-auto space-y-8 text-left text-foreground">
                        <div className="flex justify-between items-center px-4 border-l-4 border-primary text-left text-foreground">
                            <div className="text-left text-foreground">
                                <h2 className="text-2xl font-black text-left flex items-center gap-2">
                                    <TableIcon className="h-6 w-6 text-primary" />
                                    Forensic Results ({results.length})
                                </h2>
                                <p className="text-xs text-muted-foreground text-left">Vetted haulier matches for <strong>{selectedService}</strong> capacity.</p>
                            </div>
                            {!isPaid && (
                                <Badge variant="secondary" className="gap-1.5 py-1.5 px-4 border border-amber-200 text-amber-700 bg-amber-50 font-black uppercase text-[9px]">
                                    <Lock className="h-3 w-3" /> intelligence Tier Restricted
                                </Badge>
                            )}
                        </div>

                        <Card className="border-none shadow-xl overflow-hidden text-left bg-white text-foreground">
                            <Table>
                                <TableHeader className="bg-slate-900 hover:bg-slate-900 text-left text-white">
                                    <TableRow className="hover:bg-slate-900 border-none">
                                        <TableHead className="text-white font-bold uppercase text-[10px] tracking-widest py-4 text-left">Company Entity</TableHead>
                                        <TableHead className="text-white font-bold uppercase text-[10px] tracking-widest py-4 text-left">Trust Signals</TableHead>
                                        <TableHead className="text-white font-bold uppercase text-[10px] tracking-widest py-4 text-left">Fleet Head</TableHead>
                                        <TableHead className="text-white font-bold uppercase text-[10px] tracking-widest py-4 text-left">Direct Contacts</TableHead>
                                        <TableHead className="text-white font-bold uppercase text-[10px] tracking-widest py-4 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.map((res) => (
                                        <TableRow key={res.id} className="group hover:bg-slate-50 transition-colors text-left">
                                            <TableCell className="py-4 text-left">
                                                <div className="flex flex-col text-left">
                                                    <span className="font-black text-sm text-slate-900">{res.companyName}</span>
                                                    <Badge variant="outline" className="w-fit text-[8px] h-3.5 mt-1 border-primary/20 text-primary uppercase font-bold">{res.entryType || 'Haulier'}</Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-left text-foreground">
                                                <div className="flex flex-wrap gap-2 text-left">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className={cn("h-7 px-2 text-[10px] font-black uppercase gap-1", res.vouchCount > 0 ? "text-green-600 bg-green-50" : "text-muted-foreground")}
                                                        onClick={() => handleVouch(res.id)}
                                                        disabled={!!isVouching}
                                                    >
                                                        {isVouching === res.id ? <Loader2 className="h-3 w-3 animate-spin"/> : <ThumbsUp className="h-3 w-3" />}
                                                        Vouched ({res.vouchCount || 0})
                                                    </Button>
                                                    {res.isClaimed ? (
                                                        <Badge className="bg-primary text-white h-7 gap-1 border-none"><ShieldCheck className="h-3 w-3" /> Claimed Node</Badge>
                                                    ) : (
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="h-7 px-2 text-[10px] font-black uppercase gap-1 border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 text-left"
                                                            onClick={() => handleClaim(res.id)}
                                                            disabled={!!isClaiming}
                                                        >
                                                            {isClaiming === res.id ? <Loader2 className="h-3 w-3 animate-spin"/> : <ShieldAlert className="h-3 w-3" />}
                                                            Claim (R10)
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-left text-foreground">
                                                <span className={cn("text-xs font-bold text-left", !isPaid && "blur-sm select-none opacity-50")}>
                                                    {res.contactPerson || 'Forensic ID Verified'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-left text-foreground">
                                                <div className={cn("flex flex-col gap-1 text-left", !isPaid && "blur-sm select-none opacity-50")}>
                                                    <span className="text-[10px] font-mono text-primary font-bold">{res.email || 'locked@tc.co.za'}</span>
                                                    <span className="text-[10px] font-mono text-muted-foreground">{res.mobile || res.phone || '0XX XXX XXXX'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button 
                                                    size="sm" 
                                                    variant={isPaid ? "default" : "secondary"} 
                                                    className="h-8 text-[9px] font-black uppercase tracking-widest px-4 shadow-sm"
                                                    onClick={() => handleEngage(res)}
                                                    disabled={isEngaging === res.id}
                                                >
                                                    {isEngaging === res.id ? <Loader2 className="h-3 w-3 animate-spin"/> : isPaid ? "Select to Engage" : <><Lock className="h-2.5 w-2.5 mr-1" /> Unlock</>}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>

                        {!isPaid && results.length > 0 && (
                            <Card className="bg-slate-900 text-white border-none shadow-2xl p-10 text-center max-w-2xl mx-auto mt-12 overflow-hidden relative text-left">
                                <div className="absolute top-0 right-0 p-8 opacity-5"><ShieldCheck className="h-32 w-32" /></div>
                                <div className="relative z-10 flex flex-col items-center">
                                    <div className="bg-primary/20 p-4 rounded-full w-fit mb-6 text-center">
                                        <Lock className="h-10 w-10 text-primary" />
                                    </div>
                                    <h3 className="text-3xl font-black font-headline mb-4 uppercase leading-none text-white text-center">Complete Haulier transparency</h3>
                                    <p className="text-slate-400 text-lg mb-8 leading-relaxed text-center">
                                        You are viewing a restricted preview. To remove data blurring and see direct contact details for over **5,400+ verified hauliers**, upgrade to intelligence Access.
                                    </p>
                                    <Button asChild size="lg" className="w-full h-14 px-12 text-lg font-black uppercase tracking-tight shadow-xl shadow-primary/20 text-white">
                                        <Link href={user ? "/checkout/intelligence" : "/join?redirect=/checkout/intelligence"}>
                                            Reveal Registry Contacts <ArrowRight className="ml-2 h-5 w-5"/></Link>
                                    </Button>
                                </div>
                            </Card>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}

