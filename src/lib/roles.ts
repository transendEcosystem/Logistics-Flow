import { ShoppingCart, Truck, Handshake, Briefcase, Bot, Users, Code, Share2, Landmark, ShieldCheck, Building2, Warehouse, Network, PackageSearch } from "lucide-react";
import * as React from "react";
import data from '@/lib/placeholder-images.json';

const { placeholderImages } = data;

const roleImages = {
    vendor: placeholderImages.find(p => p.id === 'mall-division')!,
    supplier: placeholderImages.find(p => p.id === 'mall-division')!,
    transporter: placeholderImages.find(p => p.id === 'marketplace-division')!,
    broker: placeholderImages.find(p => p.id === 'marketplace-division')!,
    warehouseManager: placeholderImages.find(p => p.id === 'mall-division')!,
    dealer: placeholderImages.find(p => p.id === 'marketplace-division')!,
    distributor: placeholderImages.find(p => p.id === 'tech-home')!,
    partner: placeholderImages.find(p => p.id === 'funding-division')!,
    associate: placeholderImages.find(p => p.id === 'value-integrity')!,
    'isa-agent': placeholderImages.find(p => p.id === 'tech-home')!,
    driver: placeholderImages.find(p => p.id === 'value-community')!,
    developer: placeholderImages.find(p => p.id === 'tech-division')!,
    lender: placeholderImages.find(p => p.id === 'funding-division')!,
    admin: placeholderImages.find(p => p.id === 'tech-division')!,
};


export const roles = [
    {
        id: "admin",
        icon: ShieldCheck,
        title: "Platform Admin",
        description: "Ecosystem platform oversight and master developer operations control.",
        cta: "Become an Admin",
        longDescription: "Master administrative operations and digital platform oversight across all ecosystem sub-portals.",
        image: roleImages.admin
    },
    {
        id: "ai-agent",
        icon: Bot,
        title: "AI Co-Pilot / Auditor",
        description: "Automated end-to-end testing, shop audits, and AI quality assurance across all malls.",
        cta: "Join as AI Co-Pilot",
        longDescription: "Specialized system role for AI-assisted platform verification, automated shop audits, and cross-mall testing.",
        image: roleImages['isa-agent']
    },
    {
        id: "supplier",
        icon: Building2,
        title: "Vendors",
        description: "Sell parts, equipment, products, and services directly to transport professionals.",
        cta: "Become a Vendor",
        longDescription: "As a vendor, you gain direct access to a dedicated marketplace of transport businesses actively seeking parts, equipment, and essential services.",
        image: roleImages.supplier
    },
    {
        id: "transporter",
        icon: Truck,
        title: "Transporters",
        description: "Sell long-haul transport services and manage fleet capacity across corridors.",
        cta: "Become a Transporter",
        longDescription: "As a transporter, efficiently market fleet capacity and connect with cargo owners needing long-haul freight movement.",
        image: roleImages.transporter
    },
    {
        id: "broker",
        icon: PackageSearch,
        title: "Transport Brokers",
        description: "Publish load requirements, source carriers, and manage freight matching.",
        cta: "Become a Transport Broker",
        longDescription: "As a transport broker, list loads, accept carrier bids, and coordinate transport capacity across cargo networks.",
        image: roleImages.broker
    },
    {
        id: "warehouseManager",
        icon: Warehouse,
        title: "Warehouse Managers",
        description: "Offer storage capacity, warehousing services, and pallet handling to logistics operators.",
        cta: "Become a Warehouse Manager",
        longDescription: "Publish available pallet spaces, rack storage, and warehouse facility services directly to logistics operators.",
        image: roleImages.warehouseManager
    },
    {
        id: "lender",
        icon: Landmark,
        title: "Lenders",
        description: "Configure lending criteria, reach qualified borrowers, and fund commercial transport deals.",
        cta: "Become a Lender",
        longDescription: "As a lender, define credit parameters for asset finance, working capital, and trade finance to match high-fidelity leads.",
        image: roleImages.lender
    },
    {
        id: "dealer",
        icon: ShoppingCart,
        title: "Auto Dealers",
        description: "List trucks, trailers, plant, and heavy equipment for sale or commercial lease.",
        cta: "Become an Auto Dealer",
        longDescription: "Publish commercial asset listings, manage buyer inquiries, and trade heavy-duty vehicles in the Buy & Sell Mall.",
        image: roleImages.dealer
    },
    {
        id: "distributor",
        icon: Network,
        title: "Distributors",
        description: "Provide local, urban, and last-mile parcel delivery across regional coverage zones.",
        cta: "Become a Distributor",
        longDescription: "Publish final-mile delivery capacity, suburban service zones, and local logistics solutions for regional buyers.",
        image: roleImages.distributor
    },
    {
        id: "partner",
        icon: Handshake,
        title: "Partners",
        description: "Collaborate with us as a strategic partner to enable growth and provide value-added services.",
        cta: "Become a Partner",
        longDescription: "Strategic partners are the enablers of our ecosystem. Whether you're in finance, insurance, or another value-added service, partnering with Logistics Flow allows you to offer your solutions to a captive audience of transport professionals, creating synergistic growth opportunities.",
        image: roleImages.partner
    },
    {
        id: "associate",
        icon: Share2,
        title: "Digital Partners",
        description: "Content creators and influencers. Use our AI studio to create 4K content and earn recurring revenue.",
        cta: "Become a Partner",
        longDescription: "The Digital Partner program is for content creators, influencers, and digital marketers. We provide you with the keys to our AI Marketing Studio—allowing you to generate 4K industrial videos and high-fidelity copy instantly. Build your own network and earn a recurring percentage of every transaction and membership fee generated through your influence.",
        image: roleImages.associate
    },
    {
        id: "isa-agent",
        icon: Bot,
        title: "ISA Agents (Elite)",
        description: "Top-performing referrers can achieve ISA status, unlocking higher commission tiers and exclusive bonuses.",
        cta: "Become an ISA Agent",
        longDescription: "The Independent Sales Agent (ISA) program is an elite tier for our most active and successful referrers. By consistently bringing new members and facilitating service sales, you can be invited to the ISA program, which grants access to higher commissions, performance bonuses, and a closer working relationship with the Logistics Flow team. It's the ultimate level for those who want to turn referrals into a significant revenue stream.",
        image: roleImages['isa-agent']
    },
    {
        id: "driver",
        icon: Users,
        title: "Drivers",
        description: "Find job opportunities, access resources, and connect with other professional drivers.",
        cta: "Become a Driver",
        longDescription: "Professional drivers are the backbone of the industry. As a driver member, you can find job opportunities, access training resources, and connect with a community of your peers. Whether you're an owner-operator or looking for your next role, Logistics Flow is your partner on the road.",
        image: roleImages.driver
    },
    {
        id: "developer",
        icon: Code,
        title: "Developers",
        description: "Integrate with our APIs and build innovative applications on top of the Logistics Flow platform.",
        cta: "Become a Developer",
        longDescription: "Innovate with us. As a developer, you can access Logistics Flow's powerful APIs to build new applications and integrations that serve the transport industry. Join our developer community to create the next generation of logistics technology.",
        image: roleImages.developer
    }
]