"use client";

import * as React from 'react';
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Truck, Menu, ChevronDown, LogOut, ShoppingCart, Ship, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useUser, useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCart } from "@/context/CartContext";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const mainNavLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Membership" },
  { href: "/connect", label: "Connect" },
  { href: "/incentives", label: "Incentives" },
  { href: "/resources", label: "Resources" },
  { href: "/contact", label: "Contact Us" },
];

const divisionLinks = [
    { href: "/divisions", label: "All Divisions" },
    { href: "/funding", label: "Funding" },
    { href: "/mall", label: "Mall" },
    { href: "/marketplace", label: "Marketplace" },
    { href: "/tech", label: "Tech" },
]

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const { cartItems, isCartLoading } = useCart();

  const isPublicLandingPage = pathname?.startsWith('/opt-in/') || pathname === '/join' || pathname === '/signin';

  const handleSignOut = async () => {
    if (!auth) return;
    try {
        await signOut(auth);
        setIsSheetOpen(false);
        router.push('/');
    } catch (error) {
        console.error("Error signing out: ", error);
    }
  };

  const getInitials = (name: string | null | undefined, email?: string | null) => {
    if (name && name.trim()) {
      const parts = name.trim().split(' ').filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.trim().substring(0, 2).toUpperCase();
    }
    if (email && email.trim()) {
      return email.trim().substring(0, 2).toUpperCase();
    }
    return "LF";
  };

  const displayName = user?.displayName || user?.name || user?.fullName || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : null) || user?.email?.split('@')[0] || 'User';
  const avatarSrc = user?.photoURL || user?.avatarUrl || user?.profilePicture || user?.avatar || user?.companyData?.logoUrl || null;

  const isAdmin = user && (user.email === 'beyondtransport@gmail.com' || user.email === 'mkoton100@gmail.com');
  const isWctaMember = user?.claims?.wcta === true || user?.companyData?.referrerId === 'WCTA';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Logistics Flow</span>
          </Link>
        </div>

        {!isPublicLandingPage && (
            <nav className="hidden sm:flex items-center gap-1 text-sm font-medium">
                {mainNavLinks.map(({ href, label }) => (
                    <Link 
                        key={href}
                        href={href} 
                        className={cn("transition-colors hover:text-primary px-3 py-2 rounded-md text-left", pathname === href ? "text-primary font-semibold" : "text-muted-foreground")}
                    >
                        {label}
                    </Link>
                ))}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-1 px-3 py-2 text-sm font-medium hover:text-primary">
                            Divisions <ChevronDown className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        {divisionLinks.map(({ href, label }) => (
                            <DropdownMenuItem key={href} asChild>
                                <Link href={href}>{label}</Link>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </nav>
        )}

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {!isPublicLandingPage && (
              <>
                <Button asChild variant="ghost" size="icon">
                    <Link href="/cart">
                        <ShoppingCart className="h-5 w-5" />
                        {!isCartLoading && cartItems.length > 0 && (
                            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0">{cartItems.length}</Badge>
                        )}
                    </Link>
                </Button>
                
                {isUserLoading ? (
                  <Skeleton className="h-9 w-9 rounded-full ring-2 ring-primary/20" />
                ) : user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 overflow-hidden ring-2 ring-primary/40 hover:ring-primary focus:ring-primary transition-all opacity-100">
                        <Avatar className="h-9 w-9 bg-primary/10">
                            {avatarSrc && <AvatarImage src={avatarSrc} alt={displayName} className="object-cover h-full w-full" />}
                            <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs uppercase flex items-center justify-center h-full w-full opacity-100">
                              {getInitials(displayName, user?.email)}
                            </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-semibold leading-none text-slate-900">{displayName}</p>
                          <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                        <DropdownMenuItem asChild><Link href="/account">My Account</Link></DropdownMenuItem>
                        {(isAdmin || isWctaMember) && (
                            <>
                                <DropdownMenuItem asChild><Link href="/supply-chain">Supply Chain Portal</Link></DropdownMenuItem>
                                <DropdownMenuItem asChild><Link href="/port-logistics">Port Logistics Portal</Link></DropdownMenuItem>
                            </>
                        )}
                        {isAdmin && (
                            <>
                                <DropdownMenuSeparator/>
                                <DropdownMenuItem asChild><Link href="/adminaccount">Admin Account</Link></DropdownMenuItem>
                                <DropdownMenuItem asChild><Link href="/backend">App Backend</Link></DropdownMenuItem>
                                <DropdownMenuItem asChild><Link href="/lending">Lending Portal</Link></DropdownMenuItem>
                            </>
                        )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="hidden sm:flex items-center gap-2">
                    <Button asChild variant="ghost"><Link href="/signin">Sign In</Link></Button>
                    <Button asChild><Link href="/join">Join for Free</Link></Button>
                  </div>
                )}
              </>
            )}
          </div>
          
          {!isPublicLandingPage && (
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="sm:hidden">
                        <Menu className="h-6 w-6" />
                        <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex h-full flex-col p-0">
                    <SheetHeader className="p-6 pb-2 border-b">
                        <SheetTitle>
                            <Link href="/" className="flex items-center gap-2" onClick={() => setIsSheetOpen(false)}>
                                <Truck className="h-6 w-6 text-primary" />
                                <span className="font-bold text-lg text-left">Logistics Flow</span>
                            </Link>
                        </SheetTitle>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                        <nav className="flex flex-col gap-4 text-left">
                            {mainNavLinks.map(({ href, label }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    onClick={() => setIsSheetOpen(false)}
                                    className={cn("text-lg transition-colors hover:text-primary text-left", pathname === href ? "text-primary font-bold" : "text-muted-foreground")}
                                >
                                    {label}
                                </Link>
                            ))}
                            <div className="border-t pt-4 mt-2">
                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 text-left">Divisions</p>
                                {divisionLinks.map(({ href, label }) => (
                                    <Link
                                        key={href}
                                        href={href}
                                        onClick={() => setIsSheetOpen(false)}
                                        className="text-base transition-colors hover:text-primary block py-2 text-muted-foreground text-left"
                                    >
                                        {label}
                                    </Link>
                                ))}
                            </div>
                        </nav>
                    </div>
                    <SheetFooter className="p-4 border-t">
                        {user ? (
                            <div className='flex flex-col gap-2 w-full'>
                                <Button asChild className="w-full justify-start"><Link href="/account" onClick={() => setIsSheetOpen(false)}><User className="mr-2 h-5 w-5" /> My Account</Link></Button>
                                <Button onClick={handleSignOut} variant="outline" className="w-full justify-start"><LogOut className="mr-2 h-5 w-5" /> Sign Out</Button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 w-full">
                                <Button asChild className="w-full justify-start" variant="outline"><Link href="/signin" onClick={() => setIsSheetOpen(false)}>Sign In</Link></Button>
                                <Button asChild className="w-full justify-start"><Link href="/join" onClick={() => setIsSheetOpen(false)}>Join for Free</Link></Button>
                            </div>
                        )}
                    </SheetFooter>
                </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </header>
  );
}