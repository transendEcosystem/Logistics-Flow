
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { ShoppingCart, Mail, Phone, ImageIcon, ArrowRight, Truck, ShieldCheck, MapPin, Info, FileText, Lock } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from 'react';

const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) return 'R 0.00';
    const parts = amount.toFixed(2).toString().split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `R ${integerPart}.${parts[1]}`;
};

const themeColors: { [key: string]: { bg: string; text: string; primary: string } } = {
    'forest-green': { bg: 'bg-green-50', text: 'text-green-900', primary: 'text-green-600' },
    'ocean-blue': { bg: 'bg-blue-50', text: 'text-blue-900', primary: 'text-blue-600' },
    'industrial-grey': { bg: 'bg-gray-100', text: 'text-gray-900', primary: 'text-gray-600' },
    'sunset-orange': { bg: 'bg-orange-50', text: 'text-orange-900', primary: 'text-orange-600' },
};

export function ShopPreview({ shop, products }: { shop: any, products: any[] }) {
    const { addToCart } = useCart();
    const { toast } = useToast();
    const theme = themeColors[shop.theme] || themeColors['forest-green'];
    const isTransporter = shop.shopType === 'transporter';

    const handleAddToCart = (product: any) => {
        addToCart({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            shopId: shop.id,
            shopName: shop.shopName,
            sellerCompanyId: shop.companyId,
            imageUrl: product.imageUrls?.[0]
        });
        toast({ title: "Item Added to Cart" });
    };

    return (
        <div className={cn("w-full min-h-screen text-base", theme.bg, theme.text)}>
            <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-50 border-b">
                <div className="container mx-auto px-6 py-3 flex justify-between items-center">
                    <h1 className={cn("text-xl font-bold", theme.primary)}>{shop.shopName}</h1>
                    <div className="flex items-center gap-4">
                        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                            <a href="#home" className="hover:text-gray-900">Home</a>
                            <a href="#about" className="hover:text-gray-900">About</a>
                            <a href="#services" className="hover:text-gray-900">{isTransporter ? 'Lanes' : 'Shop'}</a>
                            {isTransporter && <a href="#fleet" className="hover:text-gray-900">Fleet</a>}
                        </nav>
                        {shop.websiteUrl && (
                            <Button asChild size="sm">
                                <a href={shop.websiteUrl} target="_blank" rel="noopener noreferrer">Visit Website</a>
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-12 space-y-24">
                {/* Hero Section */}
                <section id="home" className="relative w-full h-[500px] rounded-2xl overflow-hidden shadow-2xl">
                    {shop.heroBannerUrl ? (
                         <Image src={shop.heroBannerUrl} alt={shop.shopName} fill className="object-cover" />
                    ) : (
                        <div className="bg-slate-300 h-full w-full flex items-center justify-center">
                            <ImageIcon className="h-24 w-24 text-slate-400" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/50" />
                    <div className="relative h-full flex flex-col items-center justify-center text-center text-white z-10 p-8 max-w-4xl mx-auto">
                        <Badge className="mb-4 bg-primary text-white border-none uppercase tracking-widest">{shop.category}</Badge>
                        <h2 className="text-5xl font-black mb-6 leading-tight">{shop.homeHeading || shop.shopName}</h2>
                        <p className="text-xl text-white/90 leading-relaxed mb-8">{shop.homeSubheading || shop.shopDescription}</p>
                        <Button size="lg" className="bg-white text-black hover:bg-white/90 font-bold px-10 rounded-full" asChild>
                            <a href="#services">Explore Our {isTransporter ? 'Services' : 'Products'}</a>
                        </Button>
                    </div>
                </section>

                {/* About Section */}
                <section id="about" className="max-w-4xl mx-auto text-center space-y-6">
                    <h3 className="text-3xl font-bold font-headline flex items-center justify-center gap-3">
                        <Info className="h-8 w-8 text-primary" />
                        About {shop.shopName}
                    </h3>
                    <p className="text-lg leading-relaxed text-muted-foreground whitespace-pre-wrap">
                        {shop.aboutText || shop.shopDescription}
                    </p>
                </section>

                {/* Catalog/Services Section */}
                <section id="services">
                    <div className="text-center mb-12">
                        <h3 className="text-3xl font-bold font-headline">{isTransporter ? 'Verified Service Lanes' : 'Product Catalogue'}</h3>
                        <p className="text-muted-foreground mt-2">Transparent pricing and professional reliability guaranteed.</p>
                    </div>
                    {isTransporter ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {(products || []).map(route => (
                                <Card key={route.id} className="bg-white border-none shadow-lg hover:shadow-xl transition-all">
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <CardTitle className="text-xl flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> {route.name} to {route.destination}</CardTitle>
                                                <Badge variant="secondary" className="uppercase text-[10px] font-black">{route.vehicleType}</Badge>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-black text-primary">{formatCurrency(route.price)}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold">{route.rateType?.replace('-', ' ')}</p>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent><p className="text-sm text-muted-foreground leading-relaxed">{route.description}</p></CardContent>
                                    <CardFooter><Button className="w-full font-bold">Request Direct Booking</Button></CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {(products || []).map(product => (
                                <Card key={product.id} className="overflow-hidden bg-white shadow-lg border-none hover:-translate-y-1 transition-transform">
                                    <div className="relative aspect-square bg-slate-100">
                                        {(product.imageUrls && product.imageUrls[0]) ? 
                                            <Image src={product.imageUrls[0]} alt={product.name} fill className="object-cover" /> :
                                            <div className="w-full h-full flex items-center justify-center"><ShoppingCart className="h-12 w-12 text-slate-300"/></div>
                                        }
                                    </div>
                                    <CardHeader><CardTitle className="text-lg">{product.name}</CardTitle></CardHeader>
                                    <CardContent><p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p></CardContent>
                                    <CardFooter className="flex justify-between items-center pt-4 border-t">
                                        <p className="text-xl font-black text-primary">{formatCurrency(product.price)}</p>
                                        <Button size="sm" onClick={() => handleAddToCart(product)}>Add to Cart</Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </section>

                {/* Fleet Gallery for Transporters */}
                {isTransporter && (
                    <section id="fleet" className="space-y-12">
                         <div className="text-center">
                            <h3 className="text-3xl font-bold font-headline flex items-center justify-center gap-3">
                                <Truck className="h-8 w-8 text-primary" /> Verified Capacity
                            </h3>
                            <p className="text-muted-foreground mt-2">Ownership and compliance verified by platform RC1 registry.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {(shop.showcaseFleetIds || []).map((id: any) => (
                                <Card key={id} className="overflow-hidden border-none shadow-md bg-white relative">
                                    <div className="absolute top-3 right-3 z-10"><Badge className="bg-green-600 text-white font-bold"><ShieldCheck className="h-3 w-3 mr-1" /> Verified</Badge></div>
                                    <div className="aspect-video bg-slate-100 flex items-center justify-center"><Truck className="h-12 w-12 text-slate-300" /></div>
                                    <CardContent className="p-4"><p className="font-bold text-sm">RC1 Verified Asset {id.slice(-4)}</p></CardContent>
                                </Card>
                            ))}
                        </div>
                    </section>
                )}

                {/* Legal Tabs */}
                <section id="legal" className="pt-12 border-t">
                    <Tabs defaultValue="terms" className="max-w-4xl mx-auto">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="terms"><FileText className="h-4 w-4 mr-2"/> Terms & Conditions</TabsTrigger>
                            <TabsTrigger value="privacy"><Lock className="h-4 w-4 mr-2"/> Privacy Policy</TabsTrigger>
                        </TabsList>
                        <TabsContent value="terms" className="p-6 bg-white rounded-b-lg border shadow-inner text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {shop.termsText || "Standard platform terms apply."}
                        </TabsContent>
                        <TabsContent value="privacy" className="p-6 bg-white rounded-b-lg border shadow-inner text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {shop.privacyText || "Standard platform privacy policy applies."}
                        </TabsContent>
                    </Tabs>
                </section>
                
                {/* Contact Footer */}
                <section id="contact" className="py-12 bg-white rounded-3xl shadow-xl overflow-hidden border">
                     <div className="grid md:grid-cols-2 gap-12 p-8 md:p-16">
                        <div className="space-y-6">
                            <h3 className="text-4xl font-black">Get in Touch</h3>
                            <p className="text-lg text-muted-foreground leading-relaxed">Ready to discuss your requirements? Contact our professional team for prioritized assistance.</p>
                            <div className="space-y-4">
                                {shop.contactEmail && <div className="flex items-center gap-4 text-xl font-bold"><Mail className="h-6 w-6 text-primary"/> {shop.contactEmail}</div>}
                                {shop.contactPhone && <div className="flex items-center gap-4 text-xl font-bold"><Phone className="h-6 w-6 text-primary"/> {shop.contactPhone}</div>}
                            </div>
                        </div>
                        <Card className="bg-slate-50 border-none shadow-inner p-8 flex flex-col justify-center text-center">
                            <CardTitle className="mb-4">Verified Business Profile</CardTitle>
                            <CardDescription className="mb-8 text-base">This company is a registered and vetted member of the Logistics Flow community ecosystem.</CardDescription>
                            <Button size="lg" className="rounded-full font-bold">Request Official Quote</Button>
                        </Card>
                     </div>
                </section>
            </main>
            
            <footer className="bg-white/80 py-10 text-center text-xs text-slate-400 border-t mt-24">
                <p>&copy; {new Date().getFullYear()} {shop.shopName}. Member of TransConnect Logistics Flow.</p>
            </footer>
        </div>
    );
}
