'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, FileText, CheckCircle2, Scale } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TermsOfServicePage() {
    return (
        <div className="bg-background min-h-screen py-16 px-4">
            <div className="container mx-auto max-w-4xl space-y-8 text-left">
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest">
                        <Scale className="h-4 w-4" /> Commercial Terms of Service
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black font-headline tracking-tight text-slate-900">
                        Terms of Service
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium max-w-xl mx-auto">
                        Standard operational boundaries and fiduciary terms governing platform membership, digital node activation, and marketplace handshakes within the Logistics Flow ecosystem.
                    </p>
                </div>

                <Card className="border-2 shadow-xl bg-white text-left">
                    <CardHeader className="border-b bg-slate-50/50 p-8">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" /> Fiduciary Terms & Node Rules
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6 text-slate-700 leading-relaxed text-sm">
                        <section className="space-y-3">
                            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> 1. Platform Membership & Node Activation
                            </h3>
                            <p>
                                By creating an account or activating a commercial node on Logistics Flow, you warrant that you are an authorized representative of your registered company. Node activation fees, transaction memberships, and secondary role fees are billed according to your selected monthly or annual cycle.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> 2. Handshake Verification & Wallet Transactions
                            </h3>
                            <p>
                                Wallet debits authorized by members for node activations, ad broadcasts, or membership plans are final. All financial movements generate an automatic computer-generated tax invoice and running account statement accessible within your Billing terminal.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> 3. Data Accuracy & Commercial Conduct
                            </h3>
                            <p>
                                Members agree to publish accurate operational capacity, vehicle equipment specs, and pricing. Fraudulent listings, unverified claims, or intentional misrepresentation of transport assets may result in immediate node suspension.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> 4. Limitation of Liability
                            </h3>
                            <p>
                                Logistics Flow acts as a digital matching engine and clearing house platform. Direct agreements, freight contracts, and funding terms entered into between independent members remain governed by their respective bilateral contracts.
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
