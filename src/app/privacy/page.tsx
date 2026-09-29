'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Lock, Eye, FileText, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicyPage() {
    return (
        <div className="bg-background min-h-screen py-16 px-4">
            <div className="container mx-auto max-w-4xl space-y-8 text-left">
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest">
                        <ShieldCheck className="h-4 w-4" /> POPI & SARS Compliant Privacy Policy
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black font-headline tracking-tight text-slate-900">
                        Privacy Policy
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium max-w-xl mx-auto">
                        Logistics Flow (Pty) Ltd is committed to safeguarding client data, company registries, and personal information in strict adherence to South Africa's Protection of Personal Information Act (POPIA).
                    </p>
                </div>

                <Card className="border-2 shadow-xl bg-white text-left">
                    <CardHeader className="border-b bg-slate-50/50 p-8">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <Lock className="h-5 w-5 text-primary" /> Data Collection & Processing Boundaries
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6 text-slate-700 leading-relaxed text-sm">
                        <section className="space-y-3">
                            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> 1. Information We Collect
                            </h3>
                            <p>
                                To operate South Africa&apos;s digital transport and logistics ecosystem, we collect company profile details, CIPC registration numbers, contact numbers, email addresses, operational capacity specs, and financial transaction metadata when you interact with our platform.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> 2. Purpose of Data Processing
                            </h3>
                            <p>
                                Your information is processed exclusively to:
                            </p>
                            <ul className="list-disc pl-6 space-y-1">
                                <li>Enable verified commercial matching across Ecosystem Malls (Loads, Transporter, Supplier, Warehouse, Finance, etc.).</li>
                                <li>Issue SARS-compliant tax invoices, receipts, and running account statements.</li>
                                <li>Calculate loyalty points, data dividend incentives, and referral commissions.</li>
                                <li>Fulfill forensic identity verification and prevent commercial fraud.</li>
                            </ul>
                        </section>

                        <section className="space-y-3">
                            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> 3. Data Protection & Security (POPIA)
                            </h3>
                            <p>
                                All stored data is encrypted in transit and at rest using enterprise-grade Firebase and Google Cloud security infrastructure. Personally Identifiable Information (PII) is forensically isolated and never sold to third-party advertisers.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> 4. Your Rights
                            </h3>
                            <p>
                                Under POPIA, you retain the right to request access to your stored company records, request corrections, or request node deactivation by contacting our compliance office at <span className="font-bold text-slate-900">support@logisticsflow.co.za</span>.
                            </p>
                        </section>
                    </CardContent>
                </Card>

                <div className="text-center pt-4">
                    <Button asChild size="lg" className="font-bold uppercase tracking-wider">
                        <Link href="/">Return to Home Page</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
