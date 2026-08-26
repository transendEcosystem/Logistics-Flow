'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, CheckCircle2, ClipboardList, Landmark, Loader2, PackageSearch, ShoppingCart, Store, Truck, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken, useUser } from '@/firebase';
import { canUseMarketPosition, getPrimaryBusinessDomain, type MarketId } from '@/lib/business-domain';

type Field = { key: string; label: string; kind: 'text' | 'number' | 'textarea' | 'multi'; options?: string[]; required?: boolean };
type MallRoleProfile = { title: string; description: string; icon: any; fields: Field[] };

const profiles: Record<string, Record<string, MallRoleProfile>> = {
  finance: {
    provider: {
      title: 'Finance Provider Profile', description: 'Describe the products, credit policy and applicant evidence your team needs to assess quality funding opportunities.', icon: Landmark,
      fields: [
        { key: 'financialProducts', label: 'Financial products offered', kind: 'multi', required: true, options: ['Vehicle or asset finance', 'Working capital', 'Invoice discounting', 'Bridging finance', 'Insurance', 'Fleet expansion'] },
        { key: 'applicantTypes', label: 'Applicant types and industries served', kind: 'textarea', required: true },
        { key: 'creditPolicy', label: 'Credit policy, affordability and underwriting criteria', kind: 'textarea', required: true },
        { key: 'lendingRange', label: 'Typical funding range and term', kind: 'text', required: true },
        { key: 'requiredEvidence', label: 'Required documents and operating evidence', kind: 'textarea', required: true },
        { key: 'geographicCoverage', label: 'Geographic coverage and exclusions', kind: 'textarea' },
      ],
    },
    buyer: {
      title: 'Borrower Funding Profile', description: 'Tell us what you need and the operating evidence lenders use to match your application.', icon: Landmark,
      fields: [
        { key: 'fundingPurpose', label: 'What will the funding be used for?', kind: 'multi', required: true, options: ['Vehicle or asset finance', 'Working capital', 'Invoice discounting', 'Bridging finance', 'Insurance', 'Fleet expansion'] },
        { key: 'amountRequired', label: 'Funding amount required (ZAR)', kind: 'number', required: true },
        { key: 'preferredTerm', label: 'Preferred repayment term', kind: 'text', required: true },
        { key: 'annualTurnover', label: 'Annual turnover (ZAR)', kind: 'number', required: true },
        { key: 'yearsTrading', label: 'Years trading', kind: 'number', required: true },
        { key: 'securityAvailable', label: 'Available security or collateral', kind: 'textarea' },
        { key: 'fundingNarrative', label: 'Describe the opportunity and how repayment will be supported', kind: 'textarea', required: true },
      ],
    },
  },
  transporter: {
    provider: {
      title: 'Fleet & Route Profile', description: 'Map the fleet, equipment and corridors you can reliably serve before publishing capacity.', icon: Truck,
      fields: [
        { key: 'fleetClasses', label: 'Fleet and equipment available', kind: 'multi', required: true, options: ['Horse and trailer', 'Interlink', 'Rigid truck', 'Refrigerated', 'Tautliner', 'Side tipper', 'Lowbed', 'Container carrier'] },
        { key: 'serviceRoutes', label: 'Regular routes and corridors', kind: 'textarea', required: true },
        { key: 'fleetSize', label: 'Available powered units', kind: 'number', required: true },
        { key: 'cargoCapabilities', label: 'Cargo types accepted', kind: 'textarea', required: true },
        { key: 'serviceRegions', label: 'Operating regions', kind: 'multi', options: ['Gauteng', 'KwaZulu-Natal', 'Western Cape', 'Eastern Cape', 'Free State', 'Mpumalanga', 'Limpopo', 'Cross-border'] },
      ],
    },
    buyer: {
      title: 'Transport Requirement Profile', description: 'Define your lanes, cargo and service expectations so we can match appropriate fleet capacity.', icon: Truck,
      fields: [
        { key: 'requiredRoutes', label: 'Collection and delivery routes', kind: 'textarea', required: true },
        { key: 'cargoType', label: 'Cargo and handling requirements', kind: 'textarea', required: true },
        { key: 'loadFrequency', label: 'Expected frequency and volume', kind: 'text', required: true },
        { key: 'equipmentRequired', label: 'Required equipment', kind: 'multi', options: ['Tautliner', 'Refrigerated', 'Side tipper', 'Flat deck', 'Container carrier', 'Lowbed', 'Rigid truck'] },
        { key: 'serviceRequirements', label: 'Insurance, tracking, delivery or compliance requirements', kind: 'textarea' },
      ],
    },
  },
  warehouse: {
    provider: {
      title: 'Warehouse Capacity Profile', description: 'Capture your storage, handling and operating capability before publishing warehouse capacity.', icon: Warehouse,
      fields: [
        { key: 'storageTypes', label: 'Storage types', kind: 'multi', required: true, options: ['Ambient', 'Cold chain', 'Frozen', 'Bonded', 'Hazardous goods', 'Container yard', 'Cross-dock'] },
        { key: 'availableCapacity', label: 'Available pallet positions or floor area', kind: 'number', required: true },
        { key: 'handlingServices', label: 'Handling and value-added services', kind: 'textarea', required: true },
        { key: 'warehouseLocation', label: 'Location and access corridors', kind: 'textarea', required: true },
        { key: 'operatingHours', label: 'Operating hours and booking requirements', kind: 'text' },
      ],
    },
    buyer: {
      title: 'Storage Requirement Profile', description: 'Define your storage and handling need so we can match suitable facilities.', icon: Warehouse,
      fields: [
        { key: 'storageRequirement', label: 'Storage type and goods profile', kind: 'textarea', required: true },
        { key: 'capacityRequired', label: 'Required pallet positions or floor area', kind: 'number', required: true },
        { key: 'requiredLocation', label: 'Required location or corridor', kind: 'textarea', required: true },
        { key: 'handlingRequirements', label: 'Handling, compliance or temperature requirements', kind: 'textarea' },
        { key: 'duration', label: 'Expected storage duration', kind: 'text', required: true },
      ],
    },
  },
  supplier: {
    provider: {
      title: 'Supplier Capability Profile', description: 'Define the products, services, brands and fulfilment footprint your digital branch will represent.', icon: Building2,
      fields: [
        { key: 'productCategories', label: 'Product and service categories', kind: 'textarea', required: true },
        { key: 'brandsSupported', label: 'Brands supplied or serviced', kind: 'textarea' },
        { key: 'stockModel', label: 'Stock, lead-time and fulfilment model', kind: 'textarea', required: true },
        { key: 'deliveryRegions', label: 'Delivery or service regions', kind: 'multi', options: ['Gauteng', 'KwaZulu-Natal', 'Western Cape', 'Eastern Cape', 'Free State', 'Mpumalanga', 'Limpopo', 'National'] },
        { key: 'tradeTerms', label: 'Trade account, credit or warranty terms', kind: 'textarea' },
      ],
    },
    buyer: {
      title: 'Procurement Requirement Profile', description: 'Tell us what you buy, the brands you use and how you need suppliers to fulfil.', icon: Building2,
      fields: [
        { key: 'purchaseCategories', label: 'Parts, products or services required', kind: 'textarea', required: true },
        { key: 'brandsRequired', label: 'Required brands or specifications', kind: 'textarea' },
        { key: 'purchaseFrequency', label: 'Purchasing frequency and expected volume', kind: 'text', required: true },
        { key: 'deliveryLocation', label: 'Delivery location and lead-time expectation', kind: 'textarea', required: true },
        { key: 'procurementConstraints', label: 'Warranty, credit or supplier compliance requirements', kind: 'textarea' },
      ],
    },
  },
  loads: {
    provider: {
      title: 'Load Provider Profile', description: 'Define the freight you regularly place into the clearing house and its operating constraints.', icon: PackageSearch,
      fields: [
        { key: 'regularLanes', label: 'Regular origin and destination lanes', kind: 'textarea', required: true },
        { key: 'cargoProfile', label: 'Cargo profile and loading requirements', kind: 'textarea', required: true },
        { key: 'loadFrequency', label: 'Load frequency and typical tonnage', kind: 'text', required: true },
        { key: 'carrierRequirements', label: 'Carrier vetting and compliance requirements', kind: 'textarea' },
      ],
    },
    buyer: {
      title: 'Carrier Capacity Profile', description: 'Define the capacity and corridors you are seeking so freight can be matched before you bid.', icon: PackageSearch,
      fields: [
        { key: 'availableLanes', label: 'Available lanes and backhaul opportunities', kind: 'textarea', required: true },
        { key: 'availableEquipment', label: 'Available equipment and payload capability', kind: 'textarea', required: true },
        { key: 'availabilityPattern', label: 'Availability pattern and booking lead time', kind: 'text', required: true },
        { key: 'cargoRestrictions', label: 'Cargo restrictions or compliance limits', kind: 'textarea' },
      ],
    },
  },
  'buy-sell': {
    provider: {
      title: 'Asset Seller Profile', description: 'Define the assets, documentation and commercial terms you can list into the marketplace.', icon: ShoppingCart,
      fields: [
        { key: 'assetCategories', label: 'Asset categories offered', kind: 'multi', required: true, options: ['Truck', 'Trailer', 'Rigid truck', 'Plant', 'Parts', 'Tyres', 'Workshop equipment'] },
        { key: 'assetCondition', label: 'Condition, inspection and service-history approach', kind: 'textarea', required: true },
        { key: 'saleTerms', label: 'Sale, finance, warranty or trade-in terms', kind: 'textarea' },
        { key: 'collectionLocation', label: 'Viewing and collection location', kind: 'textarea', required: true },
      ],
    },
    buyer: {
      title: 'Asset Buyer Profile', description: 'Define the asset specification, budget and operating need behind your marketplace search.', icon: ShoppingCart,
      fields: [
        { key: 'assetRequirement', label: 'Asset type and specification required', kind: 'textarea', required: true },
        { key: 'budgetRange', label: 'Budget range and finance requirement', kind: 'text', required: true },
        { key: 'operatingUse', label: 'Intended operating use', kind: 'textarea', required: true },
        { key: 'locationPreference', label: 'Preferred location and delivery requirement', kind: 'textarea' },
      ],
    },
  },
};

export default function MallOnboardingContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, isUserLoading, forceRefresh } = useUser();
  const { toast } = useToast();
  const mall = params.get('mall') || 'finance';
  const role = params.get('role') === 'provider' ? 'provider' : 'buyer';
  const profile = profiles[mall]?.[role];
  const [values, setValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const ProfileIcon = profile?.icon;

  const savedProfile = useMemo(() => user?.companyData?.mallOnboarding?.[mall]?.[role], [user, mall, role]);
  useEffect(() => {
    setValues(savedProfile || {});
  }, [savedProfile]);

  const primaryDomain = getPrimaryBusinessDomain(user);
  const roleMembership = user?.companyData?.roleMemberships?.[mall];
  const hasActiveRoleMembership = roleMembership?.status === 'active';
  const isAllowedPosition = canUseMarketPosition(primaryDomain, mall as MarketId, role) ||
    (role === 'provider' && hasActiveRoleMembership);

  if (isUserLoading) return <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  if (!profile) return <div className="py-20 text-center text-muted-foreground">This mall onboarding path is not available.</div>;
  if (!isAllowedPosition) return <div className="max-w-2xl py-20 text-center mx-auto"><ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-4" /><h1 className="text-xl font-black">This position is not part of your business profile</h1><p className="text-muted-foreground mt-2">Activate the {mall} role membership before completing this provider profile.</p></div>;

  const update = (key: string, value: any) => setValues(current => ({ ...current, [key]: value }));
  const save = async () => {
    const missing = profile.fields.filter(field => field.required && (!values[field.key] || (Array.isArray(values[field.key]) && !values[field.key].length)));
    if (missing.length) {
      toast({ variant: 'destructive', title: 'Complete required questions', description: missing.map(field => field.label).join(', ') });
      return;
    }
    setSaving(true);
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Session expired.');
      const response = await fetch('/api/updateUserDoc', {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: `companies/${user?.companyId}`, data: { mallOnboarding: { ...(user?.companyData?.mallOnboarding || {}), [mall]: { ...(user?.companyData?.mallOnboarding?.[mall] || {}), [role]: { ...values, completedAt: new Date().toISOString() } } } } }),
      });
      if (!response.ok) throw new Error('Could not save the questionnaire.');
      toast({ title: 'Questionnaire saved', description: 'Your matching profile is ready to be updated whenever your business changes.' });
      forceRefresh?.();
    } catch (error: any) { toast({ variant: 'destructive', title: 'Save failed', description: error.message }); }
    finally { setSaving(false); }
  };

  const shopUrl = `/account?view=shop&nodeType=${mall}`;
  return <div className="max-w-4xl space-y-6 text-left">
    <div className="flex items-start gap-4"><div className="bg-primary/10 p-3 rounded-lg">{ProfileIcon && <ProfileIcon className="h-7 w-7 text-primary" />}</div><div><h1 className="text-3xl font-black font-headline">{profile.title}</h1><p className="text-muted-foreground mt-1">{profile.description}</p></div></div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /> Matching questionnaire</CardTitle><CardDescription>Your answers stay in your account and can be updated as your operating position changes.</CardDescription></CardHeader><CardContent className="space-y-6">
      {profile.fields.map(field => <div key={field.key} className="space-y-2"><Label>{field.label}{field.required && <span className="text-destructive"> *</span>}</Label>{field.kind === 'textarea' ? <Textarea value={values[field.key] || ''} onChange={event => update(field.key, event.target.value)} className="min-h-24" /> : field.kind === 'multi' ? <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{field.options?.map(option => <label key={option} className="flex items-center gap-2 rounded-md border p-3 text-sm"><Checkbox checked={(values[field.key] || []).includes(option)} onCheckedChange={checked => update(field.key, checked ? [...(values[field.key] || []), option] : (values[field.key] || []).filter((item: string) => item !== option))} />{option}</label>)}</div> : <Input type={field.kind} value={values[field.key] || ''} onChange={event => update(field.key, event.target.value)} />}</div>)}
      <div className="flex flex-col sm:flex-row gap-3 pt-4"><Button onClick={save} disabled={saving} className="font-bold"><CheckCircle2 className="mr-2 h-4 w-4" />{saving ? 'Saving...' : 'Save Questionnaire'}</Button>{role === 'provider' && mall !== 'finance' && <Button variant="outline" onClick={() => router.push(shopUrl)}><Store className="mr-2 h-4 w-4" />Continue to Shop Setup</Button>}</div>
    </CardContent></Card>
  </div>;
}
