
'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Lock, PackageSearch, Search, ShieldCheck, Store, Truck } from 'lucide-react';
import data from '@/lib/placeholder-images.json';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser, getClientSideAuthToken } from '@/firebase';
import { formatCurrency } from '@/lib/utils';
import { LoadResponseDialog } from '@/app/account/loads/load-response-dialog';
import { useSearchParams } from 'next/navigation';
import { provinces } from '@/lib/geodata';

const { placeholderImages } = data;
const techImage = placeholderImages.find(image => image.id === 'tech-home');

function LoadShopSearch() {
    const [shops, setShops] = useState<any[]>([]);
    const [query, setQuery] = useState('');
    const [province, setProvince] = useState('all');
    const [city, setCity] = useState('all');
    const [suburb, setSuburb] = useState('all');
    const [shopType, setShopType] = useState('all');
    const [searched, setSearched] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadShops = async () => {
            try {
                const response = await fetch('/api/getApprovedShops');
                const result = await response.json();
                const loadShops = (result.data || []).filter((shop: any) => {
                    const profile = `${shop.shopType || ''} ${shop.category || ''} ${shop.shopDescription || ''}`.toLowerCase();
                    return ['transporter', 'loads', 'load', 'broker', 'freight', 'transport'].some(term => profile.includes(term));
                });
                setShops(loadShops);
            } finally {
                setLoading(false);
            }
        };
        loadShops();
    }, []);

    const selectedProvince = provinces.find(item => item.name === province);
    const selectedCity = selectedProvince?.cities.find(item => item.name === city);

    const results = useMemo(() => shops.filter(shop => {
        const profile = `${shop.shopName || ''} ${shop.category || ''} ${shop.shopType || ''} ${shop.shopDescription || ''} ${shop.province || ''} ${shop.city || ''} ${shop.suburb || ''} ${shop.streetAddress || ''} ${shop.address || ''} ${(shop.routeRates || []).map((rate: any) => `${rate.origin} ${rate.destination}`).join(' ')}`.toLowerCase();
        const matchesKeyword = !query || profile.includes(query.toLowerCase());
        const matchesProvince = province === 'all' || profile.includes(province.toLowerCase());
        const matchesCity = city === 'all' || profile.includes(city.toLowerCase());
        const matchesSuburb = suburb === 'all' || profile.includes(suburb.toLowerCase());
        const matchesShopType = shopType === 'all' || (shop.shopType || '').toLowerCase() === shopType;
        return matchesKeyword && matchesProvince && matchesCity && matchesSuburb && matchesShopType;
    }), [shops, query, province, city, suburb, shopType]);

    const changeProvince = (value: string) => { setProvince(value); setCity('all'); setSuburb('all'); };
    const changeCity = (value: string) => { setCity(value); setSuburb('all'); };

    return <div className="bg-background py-14 md:py-20"><div className="container mx-auto max-w-6xl space-y-8 px-4">
        <div className="max-w-3xl"><Badge className="mb-4">Provider Discovery</Badge><h1 className="flex items-center gap-3 font-headline text-4xl font-black"><Store className="h-8 w-8 text-primary" />Search Load Shops</h1><p className="mt-3 text-lg text-muted-foreground">Find verified freight providers, brokers and transport businesses. Query by location, shop type, provider name, operating lane, equipment or service capability, then inspect the Shop before engaging.</p></div>
        <Card><CardContent className="grid gap-4 p-5 md:grid-cols-2 lg:grid-cols-4"><div className="space-y-2 lg:col-span-2"><Label>Provider, lane, equipment or service</Label><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="e.g. Durban to Gauteng, tautliner or freight broker" /></div><div className="space-y-2"><Label>Shop type</Label><Select value={shopType} onValueChange={setShopType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Any shop type</SelectItem><SelectItem value="transporter">Transporter</SelectItem><SelectItem value="loads">Load provider</SelectItem><SelectItem value="broker">Freight broker</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Province</Label><Select value={province} onValueChange={changeProvince}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All provinces</SelectItem>{provinces.map(item => <SelectItem key={item.name} value={item.name}>{item.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>City or town</Label><Select value={city} onValueChange={changeCity}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All cities</SelectItem>{selectedProvince?.cities.map(item => <SelectItem key={item.name} value={item.name}>{item.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Suburb or industrial hub</Label><Select value={suburb} onValueChange={setSuburb}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All suburbs</SelectItem>{selectedCity?.suburbs.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><div className="flex items-end"><Button className="w-full" onClick={() => setSearched(true)}><Search className="mr-2 h-4 w-4" />Search Load Shops</Button></div></CardContent></Card>
        {loading && <div className="py-16 text-center text-muted-foreground">Loading verified Load Shops...</div>}
        {!loading && !searched && <div className="rounded-md border border-dashed py-16 text-center text-muted-foreground">Enter a query to find and compare verified Load Shops.</div>}
        {!loading && searched && results.length === 0 && <div className="rounded-md border border-dashed py-16 text-center text-muted-foreground">No Load Shops match this query. Try widening the location, shop type, lane or equipment filters.</div>}
        {!loading && searched && results.length > 0 && <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{results.map(shop => <Card key={shop.id} className="flex flex-col"><CardHeader><CardTitle>{shop.shopName}</CardTitle><CardDescription>{shop.category || 'Verified freight provider'}</CardDescription></CardHeader><CardContent className="flex-1"><p className="line-clamp-3 text-sm text-muted-foreground">{shop.shopDescription || 'View this Shop to inspect its operating offer and commercial terms.'}</p></CardContent><CardFooter><Button asChild className="w-full"><Link href={`/shops/${shop.id}`}>View Load Shop</Link></Button></CardFooter></Card>)}</div>}
        <div className="flex justify-center"><Button asChild variant="outline"><Link href="/mall/loads?mode=intelligence">Explore Loads Intelligence instead</Link></Button></div>
    </div></div>;
}

function LoadsMallContent() {
    const params = useSearchParams();
    const { user, isUserLoading } = useUser();
    const [records, setRecords] = useState<any[]>([]);
    const [unlocked, setUnlocked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [routeQuery, setRouteQuery] = useState('');
    const [equipmentQuery, setEquipmentQuery] = useState('');

    const loadRecords = useCallback(async () => {
        setLoading(true);
        try {
            const token = user ? await getClientSideAuthToken() : null;
            const response = await fetch('/api/loadsIntelligence', { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: 'no-store' });
            const result = await response.json();
            if (response.ok && result.success) {
                setRecords(result.records || []);
                setUnlocked(Boolean(result.unlocked));
            }
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { if (!isUserLoading) loadRecords(); }, [isUserLoading, loadRecords]);

    const visibleRecords = useMemo(() => records.filter(record => {
        const route = `${record.origin} ${record.destination}`.toLowerCase();
        const equipment = (record.requiredEquipment || []).join(' ').toLowerCase();
        return route.includes(routeQuery.toLowerCase()) && equipment.includes(equipmentQuery.toLowerCase());
    }), [records, routeQuery, equipmentQuery]);
    const unlockHref = !user ? '/join?redirect=/mall/loads' : '/checkout/loads_intelligence';

    if (params.get('mode') === 'shops') return <LoadShopSearch />;

    return <div>
        <section className="relative min-h-[360px] bg-card">
            {techImage && <Image src={techImage.imageUrl} alt="Loads Intelligence" fill className="object-cover" priority data-ai-hint={techImage.imageHint} />}
            <div className="absolute inset-0 bg-black/70" />
            <div className="relative container mx-auto flex min-h-[360px] max-w-5xl flex-col justify-center px-4 text-primary-foreground">
                <Badge className="mb-5 w-fit bg-primary text-primary-foreground">Commercial Intelligence</Badge>
                <h1 className="font-headline text-4xl font-black md:text-5xl">Loads Intelligence</h1>
                <p className="mt-4 max-w-3xl text-lg leading-relaxed text-primary-foreground/90">Unlock verified live freight records, validate the originating load provider and respond to opportunities matched to your fleet, route and operating capacity.</p>
                {!unlocked && <Button asChild className="mt-7 w-fit"><Link href={unlockHref}>{user ? 'Unlock Loads Intelligence' : 'Create an account to unlock records'}</Link></Button>}
            </div>
        </section>

        <section className="bg-background py-12 md:py-16"><div className="container mx-auto max-w-6xl space-y-7 px-4">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><h2 className="flex items-center gap-2 text-2xl font-black"><PackageSearch className="h-6 w-6 text-primary" />Available freight opportunities</h2><p className="mt-1 text-muted-foreground">{unlocked ? 'Search complete commercial records and respond from the opportunity.' : 'Preview the opportunity market. Activate Loads Intelligence to unlock full records and responses.'}</p></div>{unlocked && <Button asChild variant="outline"><Link href="/account?view=load-board">Manage postings and assignments</Link></Button>}</div>
            <div className="grid gap-3 rounded-md border bg-muted/20 p-4 md:grid-cols-2"><Input value={routeQuery} onChange={event => setRouteQuery(event.target.value)} placeholder="Search origin or destination" /><Input value={equipmentQuery} onChange={event => setEquipmentQuery(event.target.value)} placeholder="Search required equipment" /></div>
            {loading && <div className="py-20 text-center text-muted-foreground">Loading Loads Intelligence records...</div>}
            {!loading && visibleRecords.length === 0 && <div className="py-20 text-center text-muted-foreground">No active opportunities match these filters.</div>}
            <div className="grid gap-4 md:grid-cols-2">{visibleRecords.map(record => <Card key={record.id} className="flex flex-col"><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-lg"><Truck className="h-5 w-5 text-primary" />{record.origin} <span className="text-muted-foreground">to</span> {record.destination}</CardTitle><CardDescription className="mt-2">{record.cargoType}</CardDescription></div>{unlocked ? <Badge>Unlocked</Badge> : <Badge variant="secondary"><Lock className="mr-1 h-3 w-3" />Preview</Badge>}</div><div className="mt-3 flex flex-wrap gap-1">{record.requiredEquipment.map((item: string) => <Badge key={item} variant="outline">{item}</Badge>)}</div></CardHeader><CardContent className="space-y-2 text-sm"><p><span className="font-semibold">Load provider:</span> {unlocked ? record.brokerName : 'Verified provider identity locked'}</p>{unlocked ? <><p><span className="font-semibold">Carrier payout:</span> {formatCurrency(record.haulierPayout)}</p><p><span className="font-semibold">Commercial terms:</span> {record.terms || 'Available when responding'}</p></> : <p className="text-muted-foreground">Full route information, carrier payout, provider validation and response capability are available with Loads Intelligence.</p>}</CardContent><CardFooter className="mt-auto">{unlocked ? <LoadResponseDialog load={record} /> : <Button asChild><Link href={unlockHref}><ShieldCheck className="mr-2 h-4 w-4" />Unlock record</Link></Button>}</CardFooter></Card>)}</div>
        </div></section>
    </div>;
}

export default function LoadsMallPage() {
    return <Suspense fallback={<div className="py-24 text-center text-muted-foreground">Loading Loads Mall...</div>}><LoadsMallContent /></Suspense>;
}
