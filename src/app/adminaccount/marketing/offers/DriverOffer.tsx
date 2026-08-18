
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShieldCheck, Briefcase, Zap, CheckCircle } from "lucide-react";
import React from "react";

export default function DriverOffer() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">The Driver Empowerment Offer</h1>
                <p className="text-lg text-muted-foreground mt-2">
                    Professional recognition and career stability for the backbone of the industry.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <Card className="flex flex-col border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <Briefcase className="h-6 w-6 text-primary" />
                            Premium Jobs Board
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-3">
                        <li className="flex items-start">
                            <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-1 flex-shrink-0" />
                            <span className="text-sm">Access verified vacancies from our nationwide network of hauliers.</span>
                        </li>
                        <li className="flex items-start">
                            <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-1 flex-shrink-0" />
                            <span className="text-sm">Direct introductions to fleet owners—bypass generic agency filters.</span>
                        </li>
                    </CardContent>
                </Card>

                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <ShieldCheck className="h-6 w-6 text-primary" />
                            Verified Driver Profile
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-3">
                        <li className="flex items-start">
                            <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-1 flex-shrink-0" />
                            <span className="text-sm">Build a professional digital resume that showcases your years of experience and clean track record.</span>
                        </li>
                        <li className="flex items-start">
                            <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-1 flex-shrink-0" />
                            <span className="text-sm">Secure storage for your license, PDP, and training certificates.</span>
                        </li>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <Zap className="h-6 w-6 text-primary" />
                        A Community for Drivers
                    </CardTitle>
                    <CardDescription>Why every driver needs a Logistics Flow membership.</CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                    <p>For just R100/month, you gain more than just job access. You become a recognized professional in a community that values your skill. Unlock exclusive discounts on personal insurance, funeral cover, and legal assistance tailored specifically for long-distance drivers.</p>
                </CardContent>
            </Card>
        </div>
    );
}
