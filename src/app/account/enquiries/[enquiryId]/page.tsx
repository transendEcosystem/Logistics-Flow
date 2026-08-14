'use client';

import { Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2, Landmark, FileText, User, Calendar, CircleHelp, HandCoins, Truck, Building, ArrowLeft, Globe, MapPin, Edit, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDateSafe, cn } from '@/lib/utils';

const fundingNeedsMap: { [key: string]: string } = {
    'business': 'My Business',
    'equipment': 'To finance equipment',
    'vehicles': 'To finance vehicles',
    'cashflow': 'Support my cashflow',
    'loan-pv-term': 'Working Capital',
    'installment-sale-term': 'Equipment Finance',
    'disclosed-confirmed-factoring': 'Factoring',
};

const statusColors: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  pending: 'secondary',
  under_review: 'outline',
  matched: 'default',
  rejected: 'destructive',
  funded: 'default'
};

function DetailItem({ label, value, icon }: { label: string; value?: string | number | null; icon?: React.ReactNode }) {
    if (!value) return null;
    return (
        <div className="flex flex-col text-left">
            <dt className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2 mb-1">{icon}{label}</dt>
            <dd className="text-sm font-bold text-foreground">{value}</dd>
        </div>
    );
}

function EnquiryDetail() {
    const params = useParams();
    const router = useRouter();
    const enquiryId = params.enquiryId as string;
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();

    const userDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    const { data: userData, isLoading: isUserDocLoading } = useDoc<{ companyId: string }>(userDocRef);

    const enquiryRef = useMemoFirebase(() => {
        if (!firestore || !userData?.companyId || !enquiryId) return null;
        return doc(firestore, `companies/${userData.companyId}/enquiries`, enquiryId);
    }, [firestore, userData, enquiryId]);

    const { data: enquiry, isLoading, error } = useDoc(enquiryRef);

    if (isLoading || isUserLoading || isUserDocLoading) {
        return (
            <div className="flex justify-center items-center h-full py-20 text-left">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (error) {
        return <div className="text-center py-20 text-destructive font-bold text-left">Error: {error.message}</div>
    }
    
    if (!enquiry) {
        return (
             <div className="text-center py-20 text-left">
                <h2 className="text-2xl font-bold">Enquiry Not Found</h2>
                <p className="text-muted-foreground mt-2">The requested enquiry could not be found.</p>
                <Button onClick={() => router.back()} className="mt-6" variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                </Button>
            </div>
        )
    }

    return (
        <Card className="w-full max-w-4xl mx-auto shadow-2xl border-none overflow-hidden text-left text-foreground">
            <CardHeader className="bg-slate-900 text-white p-8 text-left">
                <div className="flex justify-between items-start text-left">
                    <div className="text-left space-y-2">
                        <Badge variant="outline" className={cn(
                            "uppercase font-black text-[10px] tracking-widest px-3 border-primary/40 text-primary",
                            enquiry.originationType === 'direct' ? "bg-primary/5" : "bg-blue-500/10 text-blue-400 border-blue-500/40"
                        )}>
                            {enquiry.originationType === 'direct' ? <Landmark className="h-3 w-3 mr-1"/> : <Globe className="h-3 w-3 mr-1" />}
                            {enquiry.originationType === 'direct' ? 'In-House Direct Path' : 'Marketplace Broadcast'}
                        </Badge>
                        <CardTitle className="flex items-center gap-2 text-2xl font-black text-white text-left">
                           <FileText className="h-6 w-6 text-primary" /> Enquiry Reference: {enquiry.id.slice(-6).toUpperCase()}
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-left">
                            Submitted on {formatDateSafe(enquiry.createdAt, "dd MMMM yyyy")}
                        </CardDescription>
                    </div>
                    <Badge variant={statusColors[enquiry.status] || 'secondary'} className="capitalize text-sm font-black px-4 py-1 h-auto text-left">
                        {enquiry.status.replace(/_/g, ' ')}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-8 space-y-10 bg-white text-foreground text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start text-left">
                    <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed text-left">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Total Requested Capital</p>
                        <h3 className="font-black text-4xl text-primary text-left">{formatCurrency(enquiry.amountRequested)}</h3>
                        <p className="text-xs text-muted-foreground mt-2 italic text-left">Preferred Term: {enquiry.preferredTerm || 'N/A'}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6 text-left">
                        <DetailItem label="Funding Need" value={fundingNeedsMap[enquiry.fundingNeed] || enquiry.fundingNeed} icon={<Landmark className="h-3 w-3"/>} />
                        <DetailItem label="Origin Region" value={enquiry.primaryRegion || 'National'} icon={<MapPin className="h-3 w-3"/>} />
                        <DetailItem label="Entity Class" value={enquiry.entityType} icon={<Building className="h-3 w-3"/>} />
                        <DetailItem label="Business Age" value={`${enquiry.yearsInBusiness} Years`} icon={<Calendar className="h-3 w-3"/>} />
                    </div>
                </div>

                <div className="space-y-4 text-left">
                     <h4 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                         <CircleHelp className="h-4 w-4 text-primary" /> Purpose of Funds
                     </h4>
                     <div className="p-5 bg-muted/30 rounded-xl italic text-muted-foreground leading-relaxed text-sm text-left">
                         "{enquiry.purpose}"
                     </div>
                </div>

                {enquiry.assets && enquiry.assets.length > 0 && (
                    <div className="space-y-4 text-left">
                         <h4 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                             <Truck className="h-4 w-4 text-primary" /> Asset Portfolio Specification
                         </h4>
                         <div className="grid gap-4">
                            {enquiry.assets.map((asset: any, idx: number) => (
                                <div key={idx} className="p-4 border rounded-xl bg-slate-50/50 grid grid-cols-1 md:grid-cols-3 gap-4 text-left text-foreground">
                                    <div className="space-y-1 text-left">
                                        <p className="text-[9px] font-black uppercase text-muted-foreground">Asset {idx + 1}</p>
                                        <p className="text-sm font-bold text-left">{asset.vehicleYear || asset.assetYear} {asset.vehicleMake || asset.assetBrand} {asset.vehicleModel || asset.assetModel}</p>
                                    </div>
                                    <div className="space-y-1 text-left">
                                        <p className="text-[9px] font-black uppercase text-muted-foreground">Class / Category</p>
                                        <p className="text-xs font-medium text-left">{asset.vehicleClass || asset.assetCategory}</p>
                                    </div>
                                    <div className="space-y-1 text-left">
                                        <p className="text-[9px] font-black uppercase text-muted-foreground">Identifier (VIN/Serial)</p>
                                        <p className="text-xs font-mono text-left">{asset.vehicleVin || asset.assetSerialNumber || 'N/A'}</p>
                                    </div>
                                </div>
                            ))}
                         </div>
                    </div>
                )}
            </CardContent>
             <CardFooter className="bg-slate-900 p-8 flex justify-between items-center text-white text-left">
                 <div className="space-y-1 text-left">
                    <p className="text-xs font-bold text-primary flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" /> Professional Oversight Active
                    </p>
                    <p className="text-[10px] text-slate-400 text-left">A funding specialist is reviewing your forensic data profile.</p>
                 </div>
                 <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10 font-bold h-12 text-left">
                    <Link href={`/funding/apply?enquiryId=${enquiryId}`}>
                        <Edit className="mr-2 h-4 w-4" /> Refine Application
                    </Link>
                 </Button>
            </CardFooter>
        </Card>
    )
}


export default function EnquiryDetailPage() {
    return (
         <div className="container mx-auto px-4 py-20 text-left bg-slate-50 min-h-screen">
            <Suspense fallback={<div className="flex justify-center items-center h-[50vh] text-left"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
                <EnquiryDetail />
            </Suspense>
        </div>
    )
}
