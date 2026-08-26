
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowRight, Building2, Truck, Landmark, PackageSearch, Store, Network, Warehouse, Scale, Zap, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import data from "@/lib/placeholder-images.json";
import { Badge } from "@/components/ui/badge";
import * as React from "react";
import { useState } from 'react';
import { IntentModal, type ModalConfig, type IncentiveStep } from "./intent-modal";
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import * as gtag from '@/lib/gtag';

const { placeholderImages } = data;

const mallHeroImage = placeholderImages.find(p => p.id === 'mall-division');
const fundingImage = placeholderImages.find(p => p.id === 'funding-division')!;
const marketplaceImage = placeholderImages.find(p => p.id === 'marketplace-division')!;
const techImage = placeholderImages.find(p => p.id === 'tech-division')!;
const saAuctionMallImage = placeholderImages.find(p => p.id === 'sa-auction-mall')!;
const partsImage = placeholderImages.find(p => p.id === 'mall-division')!;
const efficientWarehouseImage = placeholderImages.find(p => p.id === 'value-efficiency')!;
const courierImage = placeholderImages.find(p => p.id === 'distribution-courier')!;

const malls = [
    {
        name: "Loads Mall",
        description: "Pain: Every empty return mile is a direct hit to your profit. Solution: Access the national clearing house to find or post freight, ensuring your fleet is always earning.",
        icon: PackageSearch,
        href: "/mall/loads",
        id: "loads",
        image: techImage!,
        badge: "Clearing House"
    },
    {
        name: "Warehouse Mall",
        description: "Pain: Paying for empty storage space is a waste of capital. Solution: Map community storage nodes to monetize your idle floor space or source overflow capacity instantly.",
        icon: Warehouse,
        href: "/mall/warehouse",
        id: "warehouse",
        image: efficientWarehouseImage,
        badge: "Storage Nodes"
    },
    {
        name: "Transport Mall",
        description: "Pain: Subcontracting to unverified fleets creates massive operational risk. Solution: Access a forensic haulier registry to connect with verified capacity for arterial routes.",
        icon: Truck,
        href: "/mall/transporter",
        id: "transporter",
        image: placeholderImages.find(p => p.id === 'hero-home')!,
        badge: "Arterial Spokes"
    },
    {
        name: "Distribution Mall",
        description: "Pain: Final-mile delivery in urban centers is slow and expensive. Solution: Utilize inner-city fixed-body courier networks for specialized local collection and delivery.",
        icon: Network,
        href: "/mall/distribution",
        id: "distribution",
        image: courierImage!,
        badge: "Urban Spokes"
    },
    {
        name: "Supplier Mall",
        description: "Pain: Paying retail prices for parts and tires makes you uncompetitive. Solution: Leverage collective buying power to secure 'Syndicate Rates' from verified industry vendors.",
        icon: Building2,
        href: "/mall/supplier",
        id: "supplier",
        image: partsImage,
        badge: "Truck Parts"
    },
    {
        name: "Finance Mall",
        description: "Pain: Traditional banks fail to see the real pulse of your business. Solution: Connect with 85+ specialized lenders who use platform data to approve your funding requests.",
        icon: Landmark,
        href: "/mall/finance",
        id: "finance",
        image: fundingImage!,
    },
    {
        name: "Buy & Sell Mall",
        description: "Pain: Liquidating or sourcing used assets is a slow, manual process. Solution: Trade vehicles and equipment in a secure, peer-to-peer ecosystem with identity verification.",
        icon: Store,
        href: "/marketplace",
        id: "buy-sell",
        image: marketplaceImage!,
    },
    {
        name: "SA Auction Mall",
        description: "Pain: Missing out on high-value salvage and bank-repo deals. Solution: Gain exclusive access to live industrial auctions from the SA Auction Group network.",
        icon: Scale,
        href: "/mall/sa-auction",
        id: "sa-auction",
        image: saAuctionMallImage,
    },
]

export default function MallPage() {
    const { user } = useUser();
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);
    const [incentiveStep, setIncentiveStep] = useState<IncentiveStep | null>(null);
    const [showIncentiveStep, setShowIncentiveStep] = useState(false);
    const [selectedMallImage, setSelectedMallImage] = useState<any>(null);

    const showIncentive = (href: string, role: string) => {
        setIncentiveStep({
            title: `Join the ${role} Network`,
            description: "By creating your professional node, you gain access to targeted market flow. Help us grow by contributing your verified data during onboarding.",
            cta: "Begin Profile Creation",
            action: () => {
                setIsModalOpen(false);
                setShowIncentiveStep(false);
                router.push(href);
            }
        });
        setShowIncentiveStep(true);
    }

    const createModalConfig = (mallId: string, mallHref: string): ModalConfig => {
        const shopNodeTypes: Record<string, string> = { transporter: 'transport', distribution: 'transport', loads: 'loads', supplier: 'supplier', warehouse: 'warehouse', finance: 'finance', 'buy-sell': 'buy-sell', 'sa-auction': 'buy-sell' };
        const shopNodeType = shopNodeTypes[mallId] || 'default';
        const openShopAction = () => router.push(user ? `/account?view=shop&nodeType=${shopNodeType}` : `/join?redirect=/account?view=shop&nodeType=${shopNodeType}`);

        let config: Partial<ModalConfig> = {};

        const buyerAction = () => {
            setIsModalOpen(false);
            router.push(user ? `/account?view=mall-onboarding&mall=${mallId}&role=buyer` : mallHref);
        }

        switch(mallId) {
            case 'warehouse':
                config = {
                    title: "Warehouse Mall Discovery",
                    description: "Choose whether you want to search storage and handling records through Warehouse Intelligence or find and evaluate verified Warehouse Shops.",
                    primary: { label: "Explore Warehouse Intelligence", description: "Search storage, handling and capacity records matched to your operating requirement.", action: () => router.push('/intelligence') },
                    secondary: { label: "Search Warehouse Shops", description: "Query verified warehouse providers before inspecting their public Shop and terms.", action: () => router.push('/mall/warehouse') }
                };
                break;
            case 'distribution':
                config = {
                    title: "Distribution Mall Discovery",
                    description: "Choose whether you want to explore final-mile delivery intelligence or search and compare verified Distribution Shops.",
                    primary: { label: "Explore Distribution Intelligence", description: "Search delivery capability and service records for local and urban distribution needs.", action: () => router.push('/intelligence') },
                    secondary: { label: "Search Distribution Shops", description: "Find verified courier and distribution providers before inspecting their public Shop.", action: () => router.push('/shops?mall=distribution') }
                };
                break;
            case 'transporter':
                 config = {
                    title: "Transport Mall Discovery",
                    description: "Choose whether you want to search verified fleet and capacity records through Transport Intelligence or find and evaluate Transport Shops.",
                    primary: { label: "Explore Transport Intelligence", description: "Search fleet, equipment, lane and capacity records for your transport requirement.", action: () => router.push('/intelligence/transporter') },
                    secondary: { label: "Search Transport Shops", description: "Query verified haulier businesses before inspecting their public Shop and service offer.", action: () => router.push('/mall/transporter') }
                };
                break;
            case 'loads':
                config = {
                    title: "Loads Mall Intent",
                    description: "Choose whether you want to search live freight opportunities on the Loads Board or find and evaluate verified Load Shops before engaging a provider.",
                    primary: { label: "Explore Loads Intelligence", description: "Search the live Loads Board, where verified load providers publish available freight opportunities for suitably matched transporters.", action: () => router.push('/mall/loads?mode=intelligence') },
                    secondary: { label: "Search Load Shops", description: "Query verified freight providers, brokers and transport businesses.", action: () => router.push('/mall/loads?mode=shops') }
                };
                break;
            case 'supplier':
                config = {
                    title: "Supplier Mall Discovery",
                    description: "Choose whether you want to search product and service records through Supplier Intelligence or find and evaluate verified Supplier Shops.",
                    primary: { label: "Explore Supplier Intelligence", description: "Search supplier, product and service records matched to your operational requirement.", action: () => router.push('/intelligence/supplier') },
                    secondary: { label: "Search Supplier Shops", description: "Query verified suppliers before inspecting their public Shop, catalogue and terms.", action: () => router.push('/mall/supplier') }
                };
                break;
            case 'finance':
                config = {
                    title: "Finance Mall Discovery",
                    description: "Choose whether you want to search funding-product records through Finance Intelligence or find and evaluate verified Finance Shops.",
                    primary: { label: "Explore Finance Intelligence", description: "Search lender products, funding criteria and finance records matched to your requirement.", action: () => router.push('/intelligence/finance') },
                    secondary: { label: "Search Finance Shops", description: "Query verified finance providers before inspecting their public Shop and lending offer.", action: () => router.push('/shops?mall=finance') }
                };
                break;
            case 'buy-sell':
                config = {
                    title: "Buy & Sell Mall Discovery",
                    description: "Choose whether you want to search individual asset listings through Marketplace Intelligence or find and evaluate verified seller Shops.",
                    primary: { label: "Explore Buy & Sell Intelligence", description: "Search verified vehicle and equipment records by specification, condition and location.", action: () => router.push('/mall/buy-sell') },
                    secondary: { label: "Search Seller Shops", description: "Query verified asset sellers before inspecting their public Shop and trading terms.", action: () => router.push('/shops?mall=buy-sell') }
                };
                break;
            case 'sa-auction':
                config = {
                    title: "SA Auction Mall Discovery",
                    description: "Choose whether you want to search live auction listings or find and evaluate verified auction and salvage provider Shops.",
                    primary: { label: "Explore Auction Intelligence", description: "Search current auction opportunities and asset records available to the network.", action: () => router.push('/mall/sa-auction') },
                    secondary: { label: "Search Auction Shops", description: "Query verified auction and salvage providers before inspecting their public Shop.", action: () => router.push('/shops?mall=sa-auction') }
                };
                break;
            default:
                config = {
                    title: "Mall Discovery",
                    description: "Choose whether you want to search commercial records through Intelligence or find and evaluate verified member Shops.",
                    primary: { label: "Explore Intelligence", description: "Search commercial records matched to your requirement.", action: () => router.push(mallHref) },
                    secondary: { label: "Search Shops", description: "Query verified member Shops before engaging a provider.", action: () => router.push('/shops') }
                };
        }

        const wrapAction = (originalAction: () => void, intent: string) => () => {
            if (process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID) {
                gtag.event({ action: 'intent_capture', category: 'Mall Navigation', label: `${mallId}_${intent}`, value: 1 });
            }
            originalAction();
        };
        
        config.primary!.action = wrapAction(config.primary!.action, 'primary');
        config.secondary!.action = wrapAction(config.secondary!.action, 'secondary');
        const shopLabelByMall: Record<string, string> = { 'buy-sell': 'I want to open a Buy & Sell Shop', 'sa-auction': 'I want to open an SA Auction Shop' };
        config.shop = {
            label: shopLabelByMall[mallId] || 'I want to open a shop',
            description: 'Create a public commercial Shop for this Mall. Sign-in, a valid role and Transaction membership are required.',
            action: wrapAction(openShopAction, 'open_shop'),
        };

        return config as ModalConfig;
    }

    const handleExploreClick = (mall: any) => {
        const config = createModalConfig(mall.id, mall.href);
        setSelectedMallImage(mall.image);
        setModalConfig(config);
        setIsModalOpen(true);
        setShowIncentiveStep(false);
    };

    return (
        <div className="text-left text-foreground bg-slate-50">
            <IntentModal 
                isOpen={isModalOpen}
                onOpenChange={setIsModalOpen}
                config={modalConfig}
                incentiveStep={incentiveStep}
                showIncentiveStep={showIncentiveStep}
                setShowIncentiveStep={setShowIncentiveStep}
                headerImage={selectedMallImage}
            />

            <section className="relative w-full h-80 bg-slate-900">
                {mallHeroImage && (
                    <Image
                        src={mallHeroImage.imageUrl}
                        alt="Ecosystem Malls"
                        fill
                        className="object-cover opacity-50"
                        priority
                        data-ai-hint="warehouse industrial"
                    />
                )}
                <div className="relative h-full flex flex-col items-center justify-center text-center text-white z-10 p-4">
                    <Badge className="bg-primary/20 text-primary border-primary/30 mb-4 px-4 py-1 uppercase font-black text-[10px] tracking-widest">Digital Grid</Badge>
                    <h1 className="text-4xl md:text-5xl font-black font-headline text-center uppercase tracking-tight">The Industrial Malls</h1>
                    <p className="mt-4 text-lg md:text-xl max-w-3xl text-center text-slate-300">Breaking the constraints of fragmented commerce through Hub & Spoke connectivity.</p>
                </div>
            </section>

             <section id="malls-grid" className="py-16 md:py-24 bg-background text-left">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 text-left">
                        {malls.map((mall) => {
                            const Icon = mall.icon;
                            // Parse description to highlight pain/solution
                            const parts = mall.description.split('Solution:');
                            const pain = parts[0].replace('Pain:', '').trim();
                            const solution = parts[1]?.trim();

                            return (
                                <div key={mall.name} className="grid md:grid-cols-2 gap-8 items-stretch border-2 p-8 rounded-3xl hover:shadow-2xl transition-all bg-card group text-left overflow-hidden">
                                    <div className="relative h-48 md:h-full rounded-2xl overflow-hidden bg-muted flex items-center justify-center shadow-inner">
                                        <Image
                                            src={mall.image.imageUrl}
                                            alt={mall.name}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                                            data-ai-hint={mall.image.imageHint}
                                        />
                                        {mall.badge && (
                                            <div className="absolute top-3 left-3">
                                                <Badge className="bg-slate-900/90 text-white border-none text-[9px] font-black uppercase tracking-widest px-3">{mall.badge}</Badge>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-4 flex flex-col justify-between text-left">
                                        <div className="space-y-4 text-left">
                                            <div className="flex items-center gap-3 text-left">
                                                <div className="p-2 bg-primary/10 rounded-lg"><Icon className="h-6 w-6 text-primary" /></div>
                                                <h3 className="text-2xl font-black font-headline text-left uppercase">{mall.name}</h3>
                                            </div>
                                            <div className="space-y-3 text-left">
                                                <p className="text-xs leading-relaxed text-left">
                                                    <span className="font-black text-destructive uppercase tracking-widest block text-[9px] mb-1">The Constraint</span>
                                                    <span className="text-muted-foreground italic">"{pain}"</span>
                                                </p>
                                                <p className="text-xs leading-relaxed text-left">
                                                    <span className="font-black text-primary uppercase tracking-widest block text-[9px] mb-1">The Solution</span>
                                                    <span className="font-medium text-foreground">{solution}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <Button onClick={() => handleExploreClick(mall)} className="w-full h-11 font-bold shadow-md mt-4">
                                            Enter Mall <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>
        </div>
    )
}
