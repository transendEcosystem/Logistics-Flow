'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, formatCurrency } from '@/lib/utils';
import { DEFAULT_BRANDING, generateLoanPvPack, LoanPvMergeData } from '@/lib/lending/document-templates';
import { renderDocumentPackHtml } from '@/lib/lending/document-renderer';
import { FileText, Landmark, Printer, ExternalLink, CheckCircle2, Clock } from 'lucide-react';

const SAMPLE: LoanPvMergeData = {
  trackingRef: 'SFI-LPV-2026-SAMPLE',
  documentDate: new Date().toISOString().slice(0, 10),
  clientName: 'Sample Transport (Pty) Ltd',
  clientRegistrationNumber: '2019/443512/07',
  clientAddress: '14 Diesel Road, Isando, Kempton Park, Gauteng, 1600',
  clientContact: 'Thandi Mokoena | 082 555 0101 | accounts@sample.co.za',
  clientSignatoryName: 'Thandi Mokoena',
  clientSignatoryIdNumber: '8203155009083',
  ncaStatus: 'Juristic person – falls outside the National Credit Act',
  loanPurpose: 'They require the loan to repair various vehicles in order to make them ready for long distance work.',
  principal: 850000,
  annualRatePercent: 16.5,
  numberOfInstalments: 60,
  firstInstalmentDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  facilityDate: new Date().toISOString().slice(0, 10),
  approvalAssumptions: ['Clean ITC check for the various individuals and companies involved in this transaction'],
  suspensiveConditions: ['Signing of all agreements', 'Comprehensive insurance with lender interest noted', 'Notarial bond over financed asset'],
  specialConditions: [],
  signedAtPlace: 'Kempton Park',
};

const TEMPLATES = [
  { id: 'loan-pv', name: 'Loan (PV)', status: 'ready', description: 'Present value loan with acknowledgement of debt and amortisation addendum.', sections: 7 },
  { id: 'installment-sale', name: 'Instalment Sale', status: 'pending', description: 'Awaiting template. Needs deposit, balloon/residual and ownership-on-full-payment handling.', sections: 0 },
  { id: 'lease', name: 'Lease / Rental', status: 'pending', description: 'Awaiting template. Needs residual treatment and VAT on rentals.', sections: 0 },
  { id: 'factoring', name: 'Factoring / Discounting', status: 'pending', description: 'Awaiting template. Discount charge on invoice value, advance rate and retention.', sections: 0 },
];

export default function TemplatesContent() {
  const [selectedId, setSelectedId] = useState('loan-pv');
  const [principal, setPrincipal] = useState('850000');
  const [rate, setRate] = useState('16.5');
  const [term, setTerm] = useState('60');

  const pack = useMemo(() => generateLoanPvPack({
    ...SAMPLE,
    principal: Number(principal) || 0,
    annualRatePercent: Number(rate) || 0,
    numberOfInstalments: Number(term) || 0,
  }), [principal, rate, term]);

  const openPreview = () => {
    const preview = window.open('', '_blank');
    if (!preview) return;
    preview.document.write(renderDocumentPackHtml(pack));
    preview.document.close();
  };

  const selected = TEMPLATES.find((template) => template.id === selectedId);
  const isReady = selected?.status === 'ready';

  return (
    <div className="space-y-6 text-left text-foreground">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3"><FileText className="h-8 w-8 text-primary" /> Document Templates</h1>
        <p className="text-muted-foreground mt-1">Agreement document packs by product. Preview renders with sample data — no client record is affected.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <Card className="border-none shadow-lg h-fit">
          <CardHeader className="border-b bg-muted/10"><CardTitle className="text-base">Template library</CardTitle></CardHeader>
          <CardContent className="p-3 space-y-2">
            {TEMPLATES.map((template) => (
              <button key={template.id} onClick={() => setSelectedId(template.id)} className={cn('w-full rounded-xl border-2 p-3 text-left transition-all', selectedId === template.id ? 'border-primary bg-primary/5' : 'bg-white hover:bg-slate-50')}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-sm">{template.name}</span>
                  {template.status === 'ready'
                    ? <Badge className="bg-emerald-600 text-white text-[9px] font-black uppercase gap-1"><CheckCircle2 className="h-3 w-3" /> Ready</Badge>
                    : <Badge variant="outline" className="text-[9px] font-black uppercase gap-1 border-amber-400 text-amber-700 bg-amber-50"><Clock className="h-3 w-3" /> Awaiting</Badge>}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{template.description}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {!isReady ? (
            <Card className="border-dashed border-2"><CardContent className="py-20 text-center space-y-2">
              <Landmark className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <p className="font-bold">{selected?.name} template not loaded yet</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">{selected?.description}</p>
            </CardContent></Card>
          ) : (
            <>
              <Card className="border-none shadow-lg">
                <CardHeader className="border-b bg-muted/10">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div><CardTitle className="text-lg">Loan (PV) — 7 page pack</CardTitle><CardDescription>Adjust the sample figures to see how the calculations flow through the pack.</CardDescription></div>
                    <Button onClick={openPreview} className="gap-2 font-bold text-white"><ExternalLink className="h-4 w-4" /> Open full preview</Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1"><Label className="text-xs">Loan amount</Label><Input value={principal} onChange={(event) => setPrincipal(event.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Rate (% pa fixed)</Label><Input value={rate} onChange={(event) => setRate(event.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs"># Instalments</Label><Input value={term} onChange={(event) => setTerm(event.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Instalment', value: formatCurrency(pack.calculation.instalment), accent: true },
                      { label: 'Total repayable', value: formatCurrency(pack.calculation.totalRepayable) },
                      { label: 'Total interest', value: formatCurrency(pack.calculation.totalInterest) },
                      { label: 'Tracking ref', value: pack.trackingRef },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl border bg-slate-50 p-3">
                        <span className="block text-[9px] font-black uppercase text-muted-foreground tracking-widest">{item.label}</span>
                        <span className={cn('font-black text-sm', item.accent && 'text-primary')}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardHeader className="border-b bg-muted/10"><CardTitle className="text-base">Pack contents</CardTitle><CardDescription>Every page carries the logo, tracking reference, recipient block and footer.</CardDescription></CardHeader>
                <CardContent className="pt-6 space-y-2">
                  {pack.sections.map((section, index) => (
                    <div key={section.id} className="flex items-center gap-3 rounded-lg border bg-white p-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-black text-white">{index + 1}</span>
                      <div className="min-w-0 flex-1"><span className="text-sm font-bold">{section.title}</span></div>
                      <Badge variant="outline" className="text-[9px] font-black uppercase">{section.blocks.length} blocks</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardHeader className="border-b bg-muted/10"><CardTitle className="text-base flex items-center gap-2"><Printer className="h-4 w-4 text-primary" /> Inline preview</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <iframe title="Template preview" srcDoc={renderDocumentPackHtml(pack)} className="w-full h-[820px] border-0 rounded-b-xl" />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
