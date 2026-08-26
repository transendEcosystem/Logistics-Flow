'use client';

import { useRouter } from 'next/navigation';
import { Building2, ClipboardList, Landmark, PackageSearch, Truck, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const questionnaires = [
  {
    mall: 'supplier',
    role: 'provider',
    title: 'Supplier Mall',
    description: 'Tell us about your products, customer segments, fulfilment and trade terms. We use this profile to build a useful shop, introduce relevant buyers and generate better-quality sales leads.',
    icon: Building2,
  },
  {
    mall: 'transporter',
    role: 'provider',
    title: 'Transport Mall',
    description: 'Share your fleet, equipment and service corridors. Accurate capacity helps us match suitable loads, surface funding opportunities and support vehicle or fleet-sale enquiries.',
    icon: Truck,
  },
  {
    mall: 'warehouse',
    role: 'provider',
    title: 'Warehouse Mall',
    description: 'Describe your storage capacity, handling services and location. This lets us connect you with suppliers needing storage, transporters moving stock and distributors serving local delivery.',
    icon: Warehouse,
  },
  {
    mall: 'finance',
    role: 'provider',
    title: 'Finance Mall',
    description: 'Set out the financial products, lending criteria and credit policies you offer. This improves applicant matching and gives your team higher-quality, decision-ready leads.',
    icon: Landmark,
  },
  {
    mall: 'loads',
    role: 'buyer',
    title: 'Loads Mall',
    description: 'Provide fleet availability, equipment and lanes. We use the detail to match loads to the right vehicle capacity, reduce unsuitable requests and improve utilisation.',
    icon: PackageSearch,
  },
];

export default function QuestionnairesContent() {
  const router = useRouter();

  return (
    <div className="max-w-6xl space-y-7 text-left">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-primary/10 p-3"><ClipboardList className="h-7 w-7 text-primary" /></div>
        <div>
          <h1 className="font-headline text-3xl font-black">Commercial Questionnaires</h1>
          <p className="mt-1 max-w-3xl text-muted-foreground">These profiles give the network the information needed to make accurate introductions, matches and leads. Keeping them current also records the commercial activity that supports your loyalty programme participation.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {questionnaires.map(({ mall, role, title, description, icon: Icon }) => (
          <Card key={mall} className="flex flex-col">
            <CardHeader>
              <div className="mb-2 w-fit rounded-md bg-primary/10 p-2"><Icon className="h-5 w-5 text-primary" /></div>
              <CardTitle>{title}</CardTitle>
              <CardDescription className="leading-relaxed">{description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button onClick={() => router.push(`/account?view=mall-onboarding&mall=${mall}&role=${role}`)}>
                Open questionnaire
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}