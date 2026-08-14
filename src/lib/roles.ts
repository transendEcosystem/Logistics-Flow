import { ShoppingCart, Truck, Handshake, Briefcase, Bot, Users, Code, Share2, Landmark, ShieldCheck } from "lucide-react";
import * as React from "react";
import data from '@/lib/placeholder-images.json';

const { placeholderImages } = data;

const roleImages = {
    vendor: placeholderImages.find(p => p.id === 'mall-division')!,
    transporter: placeholderImages.find(p => p.id === 'marketplace-division')!,
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
        id: "vendor",
        icon: ShoppingCart,
        title: "Vendors",
        description: "Sell parts, equipment, and services directly to a targeted market of transport professionals.",
        cta: "Become a Vendor",
        longDescription: "As a vendor, you gain direct access to a dedicated marketplace of transport businesses actively seeking parts, equipment, and essential services. Showcase your products, reach qualified buyers, and grow your business by becoming a trusted supplier within the Logistics Flow ecosystem.",
        image: roleImages.vendor
    },
    {
        id: "transporter",
        icon: Truck,
        title: "Transporters",
        description: "Sell transport services. Source parts, services and products to buy from a trusted community network",
        cta: "Become a Transporter",
        longDescription: "As a transporter, you can efficiently source high-quality vehicles, parts, and services from a network of vetted vendors and fellow transporters, while also marketing your own transport services to the community. Leverage our marketplace to find competitive pricing, reliable partners, and new customers, ensuring your fleet stays on the road and operates efficiently.",
        image: roleImages.transporter
    },
    {
        id: "lender",
        icon: Landmark,
        title: "Lenders",
        description: "Configure your lending criteria, reach qualified borrowers, and fund more deals.",
        cta: "Become a Lender",
        longDescription: "As a lender, you can define your specific credit appetite—from asset finance to working capital. Our matching engine delivers high-fidelity leads that fit your exact parameters, allowing you to focus on deployment and yield rather than cold origination.",
        image: roleImages.lender
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