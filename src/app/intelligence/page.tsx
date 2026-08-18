'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { provinces } from '@/lib/geodata';
import { 
    Database, Search, MapPin, ShieldCheck, Loader2, ArrowRight, Lock, Navigation, 
    Sparkles, Info, Landmark, Truck, Building2, Table as TableIcon, ThumbsUp, ShieldAlert, Zap, CheckCircle2 
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useUser, getClientSideAuthToken } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn, formatCurrency } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supplierCategories } from '@/app/adminaccount/marketing/discovery-engine';
import Image from 'next/image';

const servicesMap = [
    { id: 'all', label: 'All Services' },
    { id: 'container', label: 'Container Transport' },
    { id: 'reefer-container', label: 'Refrigerated Containers' },
    { id: 'general-freight', label: 'General Freight' },
    { id: 'bulk-aggregates', label: 'Bulk / Aggregates' },
    { id: 'abnormal-loads', label: 'Abnormal Loads' },
];

const financeCategories = ["Asset Finance", "Working Capital", "Debt Funders", "Niche Lenders", "Bridging", "Insurance"];

function RegistrySearch({ type }: { type: 'transporter' | 'supplier' | 'finance' }) {
    const { user } = useUser();
    const { toast } = useToast();
    const router = useRouter();
    
    const [selectedProvince, setSelectedProvince] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedSuburb, setSelectedSuburb] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isVouching, setIsVouching] = useState<string | null>(null);
    const [isClaiming, setIsClaiming] = useState<string | null>(null);
    const [isEngaging, setIsEngaging] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        handleSearch();
    }, [type]);
    
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
                    type,
                    province: selectedProvince,
                    city: selectedCity,
                    suburb: selectedSuburb,
                    category: selectedCategory === 'all' ? '' : selectedCategory
                }),
            });
            const result = await response.json();
            
            if (!response.ok) throw new Error(result.error || "Search failed.");
            setResults(result.data || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEngage = async (res: any) => {
        if (!user) {
            router.push('/signin?redirect=/intelligence');
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
            
            toast({ title: "Engagement Logged", description: "Direct communication node established." });
            
            if (type === 'transporter') router.push(`/mall/transporter/${res.id}`);
            else if (type === 'supplier') router.push(`/mall/supplier/${res.id}`);
            else if (type === 'finance') router.push(`/funding/apply?origination=market&type=${res.entryType}`);
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

    const categories = type === 'supplier' ? supplierCategories : (type === 'finance' ? financeCategories : servicesMap.map(s => s.label));

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-left">
            <Card className="shadow-xl border-none text-left">
                <CardHeader className="bg-slate-50 border-b p-6 text-left">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-600 flex items-center gap-2">
                        <Navigation className="h-4 w-4" /> Filter Variables
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-left">
                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Province</Label>
                        <Select value={selectedProvince} onValueChange={setSelectedProvince}>
                            <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="All Provinces" /></SelectTrigger>
                            <SelectContent>
                                {provinces.map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">City</Label>
                        <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedProvince}>
                            <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="All Cities" /></SelectTrigger>
                            <SelectContent>
                                {cities.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Industrial Hub</Label>
                        <Select value={selectedSuburb} onValueChange={setSelectedSuburb} disabled={!selectedCity}>
                            <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="All Suburbs" /></SelectTrigger>
                            <SelectContent>
                                {suburbs.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Sector Class</Label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="Select Class" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Classes</SelectItem>
                                {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
                <CardFooter className="bg-slate-50 border-t flex justify-center p-4">
                    <Button className="h-11 px-10 font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg" onClick={handleSearch} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4" />}
                        Scan Registry
                    </Button>
                </CardFooter>
            </Card>

            {!hasSearched ? (
                <div className="text-center py-20 opacity-20 border-2 border-dashed rounded-3xl">
                    <Database className="h-16 w-16 mx-auto mb-4" />
                    <p className="text-sm font-black uppercase tracking-widest text-center">Standby: Select Variables to Begin Search</p>
                </div>
            ) : isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Mapping Forensic Data Points...</p>
                </div>
            ) : (
                <div className="space-y-6 text-left">
                    <div className="flex justify-between items-center px-2 text-left">
                        <h2 className="text-xl font-black flex items-center gap-2">
                            <TableIcon className="h-5 w-5 text-primary" />
                            Forensic Ledger ({results.length} Matches)
                        </h2>
                        {!isPaid && (
                            <Badge variant="secondary" className="gap-1.5 py-1 px-3 border border-amber-200 text-amber-700 bg-amber-50 font-black uppercase text-[9px]">
                                <Lock className="h-3 w-3" /> Tier Masking Active
                            </Badge>
                        )}
                    </div>

                    <Card className="border-none shadow-xl overflow-hidden bg-white text-left">
                        <Table>
                            <TableHeader className="bg-slate-900 hover:bg-slate-900">
                                <TableRow className="border-none">
                                    <TableHead className="text-white font-bold uppercase text-[9px] tracking-widest py-4 text-left">Entity Identity</TableHead>
                                    <TableHead className="text-white font-bold uppercase text-[9px] tracking-widest py-4 text-left">Operational Hub</TableHead>
                                    <TableHead className="text-white font-bold uppercase text-[9px] tracking-widest py-4 text-left">Stakeholder Lead</TableHead>
                                    <TableHead className="text-white font-bold uppercase text-[9px] tracking-widest py-4 text-right">Handshake</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.map((res) => (
                                    <TableRow key={res.id} className="group hover:bg-slate-50 transition-colors text-left">
                                        <TableCell className="py-4">
                                            <div className="flex flex-col text-left">
                                                <span className="font-black text-sm text-slate-900">{res.companyName}</span>
                                                <Badge variant="outline" className="w-fit text-[8px] h-3.5 mt-1 border-primary/20 text-primary uppercase font-bold">{res.entryType || 'Record'}</Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                                                <MapPin className="h-3 w-3" />
                                                <span className="truncate max-w-[150px]">{res.address || 'RSA Hub Verified'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={cn("text-xs font-bold", !isPaid && "blur-sm select-none opacity-40")}>
                                                {res.contactPerson || 'Verified Authority'}
                                            </span>
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
                                <div className="bg-primary/20 p-4 rounded-full w-fit mb-6"><Lock className="h-10 w-10 text-primary" /></div>
                                <h3 className="text-3xl font-black font-headline mb-4 uppercase leading-none text-white text-center">Unlock Absolute Transparency</h3>
                                <p className="text-slate-400 text-lg mb-8 leading-relaxed text-white text-center">
                                    You are viewing a restricted subset of the industrial grid. To remove data blurring and access direct MD/CEO lines for 22,000+ verified records, establish your Intelligence handshake.
                                </p>
                                <Button asChild size="lg" className="w-full h-14 px-12 text-lg font-black uppercase tracking-tight shadow-xl shadow-primary/20 text-white">
                                    <Link href={user ? "/checkout/intelligence" : "/join?redirect=/checkout/intelligence"}>
                                        Reveal Registry Contacts <ArrowRight className="ml-2 h-5 w-5"/>
                                    </Link>
                                </Button>
                            </div>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}

export default function IndustrialIntelligenceHub() {
    return (
        <div className="bg-slate-50 min-h-screen text-left text-foreground">
            <section className="bg-slate-900 text-white py-20 text-center">
                <div className="container mx-auto px-4 text-center">
                    <Badge className="mb-6 bg-primary/20 text-primary border-primary/30 py-1.5 px-6 text-[10px] font-black uppercase tracking-widest text-white">Master Intelligence Hub</Badge>
                    <h1 className="text-4xl md:text-7xl font-black font-headline text-white leading-none uppercase text-white">Industrial <br/><span className="text-primary">Intelligence</span>.</h1>
                    <p className="mt-6 text-xl text-slate-300 max-w-2xl mx-auto font-medium text-white">The central terminal for South African logistics data. Map capacity, suppliers, and capital through the forensic grid.</p>
                </div>
            </section>

            <section className="container mx-auto px-4 -mt-10 pb-24 text-left">
                <Tabs defaultValue="transporters" className="w-full max-w-6xl mx-auto text-left">
                    <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-white shadow-xl rounded-2xl border-none mb-10 overflow-hidden text-left">
                        <TabsTrigger value="transporters" className="py-4 gap-2 font-black uppercase tracking-widest text-[11px] data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                            <Truck className="h-4 w-4" /> Haulier Registry
                        </TabsTrigger>
                        <TabsTrigger value="suppliers" className="py-4 gap-2 font-black uppercase tracking-widest text-[11px] data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                            <Building2 className="h-4 w-4" /> Supplier Registry
                        </TabsTrigger>
                        <TabsTrigger value="finance" className="py-4 gap-2 font-black uppercase tracking-widest text-[11px] data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                            <Landmark className="h-4 w-4" /> Capital Registry
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="transporters"><RegistrySearch type="transporter" /></TabsContent>
                    <TabsContent value="suppliers"><RegistrySearch type="supplier" /></TabsContent>
                    <TabsContent value="finance"><RegistrySearch type="finance" /></TabsContent>
                </Tabs>
            </section>

            <section className="py-24 bg-white border-t">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-16 items-center text-left">
                        <div className="space-y-6 text-left text-foreground">
                            <div className="bg-primary/10 p-3 rounded-xl w-fit"><ShieldCheck className="h-8 w-8 text-primary" /></div>
                            <h3 className="text-3xl font-black uppercase font-headline text-slate-900">Verified Data Fidelity.</h3>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                Our data is reconstructed by stitching fragments from multiple directories, social hubs, and official CIPC records, providing the most accurate industrial map in South Africa.
                            </p>
                            <div className="flex flex-col gap-4 text-left">
                                <div className="flex items-center gap-3 text-sm font-bold uppercase text-slate-700 text-left"><CheckCircle2 className="h-5 w-5 text-primary" /> Multi-Source Cross-Reference</div>
                                <div className="flex items-center gap-3 text-sm font-bold uppercase text-slate-700 text-left"><CheckCircle2 className="h-5 w-5 text-primary" /> Direct Stakeholder Identity</div>
                                <div className="flex items-center gap-3 text-sm font-bold uppercase text-slate-700 text-left"><CheckCircle2 className="h-5 w-5 text-primary" /> Verified Mobile & Email Nodes</div>
                            </div>
                        </div>
                        <div className="relative aspect-square rounded-[3rem] overflow-hidden shadow-2xl border-8 border-slate-50">
                             <Image src="https://images.unsplash.com/photo-1578575437130-5278ce68f49a?auto=format&fit=crop&q=80&w=800" alt="Industrial Data" fill className="object-cover" data-ai-hint="container port" />
                             <div className="absolute inset-0 bg-primary/10 mix-blend-multiply" />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
