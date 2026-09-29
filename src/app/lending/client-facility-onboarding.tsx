'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale } from 'lucide-react';
import FacilitiesContent from './facilities-content';
import AgreementFacilityRegister from './agreement-facility-register';

export default function ClientFacilityOnboarding() {
  return (
    <div className="space-y-6 text-left text-foreground">
      <Card className="border-none bg-white shadow-xl">
        <CardHeader className="border-b bg-muted/10">
          <CardTitle className="flex items-center gap-2 text-2xl font-black">
            <Scale className="h-6 w-6 text-primary" />
            Client Facility Workspace
          </CardTitle>
          <CardDescription>
            Manage client master facilities and agreement-level facility allocations. Actual agreement contracts remain in Lending Portfolios &gt; Agreements.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="master-facilities" className="w-full">
            <TabsList className="h-auto flex-wrap justify-start border bg-muted/30 p-1">
              <TabsTrigger value="master-facilities" className="gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest">
                <Scale className="h-3.5 w-3.5" /> Master Facility Register
              </TabsTrigger>
              <TabsTrigger value="agreement-facilities" className="gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest">
                <Scale className="h-3.5 w-3.5" /> Agreement Facility Register
              </TabsTrigger>
            </TabsList>

            <TabsContent value="master-facilities" className="mt-6">
              <FacilitiesContent mode="client-global" />
            </TabsContent>

            <TabsContent value="agreement-facilities" className="mt-6">
              <AgreementFacilityRegister />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}