'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { provinces } from '@/lib/geodata';

export default function FundingApplyPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    companyName: 'Acme Transport (Pty) Ltd',
    registrationNumber: '2021/456789/07',
    contactPerson: 'Michael Koton',
    email: 'michael@simplyfiflow.com',
    phone: '+27 82 123 4567',
    province: 'Gauteng',
    fundingAmount: 'R2,500,000',
    assetType: 'Fleet Expansion (Heavy Commercial)',
    acceptTerms: false,
    shareData: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="container mx-auto py-10 max-w-3xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Logistics Asset Funding Application</h1>
        <p className="text-muted-foreground mt-2">
          Secure growth capital and asset-backed credit facilities for your transport enterprise.
        </p>
      </div>

      {!submitted ? (
        <Card>
          <CardHeader>
            <CardTitle>Application Form</CardTitle>
            <CardDescription>Step {step} of 2: Enterprise & Funding Details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {step === 1 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="registrationNumber">Registration Number</Label>
                      <Input
                        id="registrationNumber"
                        value={formData.registrationNumber}
                        onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactPerson">Contact Person</Label>
                      <Input
                        id="contactPerson"
                        value={formData.contactPerson}
                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="province">Province</Label>
                      <select
                        id="province"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={formData.province}
                        onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                      >
                        {provinces.map((prov) => (
                          <option key={prov.name} value={prov.name}>
                            {prov.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="button" onClick={() => setStep(2)}>
                      Next Step <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="fundingAmount">Requested Funding Amount</Label>
                    <Input
                      id="fundingAmount"
                      value={formData.fundingAmount}
                      onChange={(e) => setFormData({ ...formData, fundingAmount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assetType">Asset / Project Purpose</Label>
                    <Input
                      id="assetType"
                      value={formData.assetType}
                      onChange={(e) => setFormData({ ...formData, assetType: e.target.value })}
                      required
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="shareData" className="flex flex-col space-y-1">
                        <span>Share Telematics & Financial Grid Data</span>
                        <span className="text-xs font-normal text-muted-foreground">
                          Allows faster credit scoring via the Logistics Flow registry network.
                        </span>
                      </Label>
                      <Switch
                        id="shareData"
                        checked={formData.shareData}
                        onCheckedChange={(checked) => setFormData({ ...formData, shareData: checked })}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="acceptTerms"
                        checked={formData.acceptTerms}
                        onCheckedChange={(checked) => setFormData({ ...formData, acceptTerms: checked === true })}
                        required
                      />
                      <label
                        htmlFor="acceptTerms"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        I agree to terms, conditions, and credit verification protocols.
                      </label>
                    </div>
                  </div>

                  <Alert>
                    <AlertTitle>Secure Submission</AlertTitle>
                    <AlertDescription>
                      Your application will be routed directly to verified institutional lenders on the network.
                    </AlertDescription>
                  </Alert>

                  <div className="flex justify-between pt-4">
                    <Button type="button" variant="outline" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button type="submit">Submit Application</Button>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-600" />
            <h2 className="text-2xl font-bold">Application Successfully Submitted</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Thank you, {formData.contactPerson}. Your funding request for {formData.fundingAmount} has been registered and is undergoing preliminary AI underwriting.
            </p>
            <Button onClick={() => setSubmitted(false)} variant="outline" className="mt-4">
              Submit Another Application
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}