'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Database, Zap, Fingerprint, Scale, ArrowRight, Search, Landmark, Truck, Building2, Users, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import React from "react";

const datasets = [
    { 
        id: 'transporter', 
        name: 'Haulier Registry', 
        icon: Truck, 
        description: '5,420+ verified transport entities categorized by fleet type and region.',
        href: '/intelligence/transporter'
    },
    { 
        id: 'supplier', 
        name: 'Supplier Registry', 
        icon: Building2, 
        description: 'Comprehensive database of verified parts, tires, and industrial service providers.',
        href: '/intelligence/supplier'
    },
    { 
        id: 'finance', 
        name: 'Capital Registry', 
        icon: Landmark, 
        description: 'Direct lines to 85+ specialized lenders, banks, and institutional finance partners.',
        href: '/intelligence/finance'
    },
    { 
        id: 'human-capital', 
        name: 'Human Capital', 
        icon: Users, 
        description: 'Scanned profile database for verified drivers, mechanics, and logistics leads.',
        href: '/intelligence/human-capital'
    },
];

const structuralResources = [
    {
        icon: <Fingerprint className="h-5 w-5 mr-3 text-primary" />,
        id: "node-ownership",
        title: "Node Ownership (Foundation)",
        content: (
            <div className="space-y-4 text-muted-foreground">
                <p>The foundation of the grid is your digital identity. For R10/mo, you "claim" your record in the forensic registry.</p>
                <div>
                    <h4 className="font-semibold text-foreground">Why own your node?</h4>
                    <p>Owning your node allows you to verify your direct contacts, manage your community reputation, and receive direct RFQs from members matching your trade. It is the mandatory starting point for building forensic trust.</p>
                </div>
            </div>
        )
    },
    {
        icon: <Database className="h-5 w-5 mr-3 text-primary" />,
        id: "registry-intelligence",
        title: "Registry Intelligence (The Map)",
        content: (
             <div className="space-y-4 text-muted-foreground">
                <p>Registry Intelligence is the "Map" of South African logistics. For R100/mo, you unlock absolute transparency across all datasets.</p>
                <div>
                    <h4 className="font-semibold text-foreground">What data is unlocked?</h4>
                    <p>Access the direct MD/CEO names, emails, and mobile numbers for over 22,000 verified industrial records. Stop dealing with gatekeepers and speak directly to the leadership of your next partner or customer.</p>
                </div>
            </div>
        )
    },
    {
        icon: <Zap className="h-5 w-5 mr-3 text-primary" />,
        id: "mall-intelligence",
        title: "Mall Intelligence Nodes",
        content: (
            <div className="space-y-4 text-muted-foreground">
                <p>Specialized nodes provide "Deep Data" access within specific industrial malls (Loads, Warehouse, Transport, etc.).</p>
                <div>
                    <h4 className="font-semibold text-foreground">How does it work?</h4>
                    <p>While Registry access gives you contacts, Mall Intelligence gives you technicals. See specific fleet specs (RC1), detailed product catalogs, available warehouse pallet positions, or real-time load board matches.</p>
                </div>
            </div>
        )
    },
    {
        icon: <Scale className="h-5 w-5 mr-3 text-primary" />,
        id: "transactional-app",
        title: "Transactional App Membership",
        content: (
             <div className="space-y-4 text-muted-foreground">
                <p>This is the "Engine." Transactional tiers (Basic, Standard, Premium) allow you to run your business operations on the platform.</p>
                <div>
                    <h4 className="font-semibold text-foreground">Commerce & Execution</h4>
                    <p>Operational memberships allow you to create digital branches, process commercial handshakes, use the fulfillment ledger (PODs/Invoicing), and access AI-powered operational tools.</p>
                </div>
            </div>
        )
    }
]

export default function ResourcesPage() {
  return (
    <div className="container mx-auto px-4 py-16 text-left text-foreground bg-slate-50 min-h-screen">
      <div className="text-center max-w-3xl mx-auto mb-20 space-y-4 text-center">
        <Badge variant="outline" className="border-primary/30 text-primary font-black uppercase text-[10px] tracking-widest px-4">Registry Landing Page</Badge>
        <h1 className="text-4xl md:text-6xl font-black font-headline uppercase tracking-tight text-center">Industrial Intelligence</h1>
        <p className="mt-4 text-lg text-muted-foreground text-center max-w-2xl mx-auto">
          Understand the 4-layer architecture of the grid. Access the forensic datasets below to scan the South African logistics landscape.
        </p>
      </div>

      {/* DATASET SPLIT SECTION */}
      <section className="mb-24 space-y-8">
        <div className="flex items-center gap-4 text-left border-l-4 border-primary pl-4">
            <div className="text-left">
                <h2 className="text-2xl font-black uppercase tracking-tight">Registry Datasets</h2>
                <p className="text-sm text-muted-foreground">Select a forensic node to begin your search.</p>
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {datasets.map((ds) => (
                <Card key={ds.id} className="border-none shadow-xl hover:shadow-2xl transition-all group bg-white text-left">
                    <CardHeader className="pb-2 text-left">
                        <div className="bg-primary/10 p-3 rounded-xl w-fit group-hover:bg-primary transition-colors text-left">
                            <ds.icon className="h-6 w-6 text-primary group-hover:text-white" />
                        </div>
                        <CardTitle className="text-lg font-black mt-4 uppercase text-left">{ds.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-6 text-left">
                        <p className="text-xs text-muted-foreground leading-relaxed text-left">{ds.description}</p>
                    </CardContent>
                    <CardFooter className="pt-0 text-left">
                        <Button asChild className="w-full h-10 font-bold gap-2 text-white">
                            <Link href={ds.href}>
                                <Search className="h-3.5 w-3.5" /> Scan Registry
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
      </section>

      {/* EXPLANATORY ARCHITECTURE SECTION */}
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center mb-10 text-center">
            <h3 className="text-xl font-black uppercase tracking-widest text-slate-900 text-center">The 4-Layer Protocol</h3>
            <p className="text-sm text-muted-foreground text-center">How information transforms into capital within the grid.</p>
        </div>
        <Accordion type="single" collapsible className="w-full text-left">
            {structuralResources.map((resource, index) => (
                <AccordionItem key={index} value={resource.id} className="border-2 rounded-2xl mb-4 bg-white overflow-hidden shadow-sm">
                    <AccordionTrigger className="text-lg font-bold hover:no-underline px-6 py-5 text-left">
                        <div className="flex items-center text-left">
                            {resource.icon}
                            {resource.title}
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6 pt-4 bg-slate-50/50 border-t text-left">
                        {resource.content}
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
      </div>
      
      <div className="mt-24 max-w-3xl mx-auto p-12 bg-slate-900 text-white rounded-[3rem] shadow-2xl relative overflow-hidden text-center flex flex-col items-center">
          <div className="absolute top-0 right-0 p-12 opacity-5"><Zap className="h-40 w-40 text-primary" /></div>
          <Info className="h-12 w-12 text-primary mb-6" />
          <h3 className="text-3xl font-black uppercase tracking-tight text-white">Need Setup assistance?</h3>
          <p className="text-slate-400 mt-4 mb-8 text-lg max-w-md mx-auto text-center text-white">Our Engagement Division is available for direct handshake verification and forensic node activation.</p>
          <Button asChild size="lg" className="h-14 px-12 font-black uppercase tracking-widest shadow-xl text-white">
              <Link href="/contact">Open Support Ticket</Link>
          </Button>
      </div>
    </div>
  );
}
