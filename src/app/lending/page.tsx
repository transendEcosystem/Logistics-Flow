'use client';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import {
  LogOut,
  Loader2,
  LayoutDashboard,
  Landmark,
  FileSignature,
  ClipboardList,
  Users,
  Handshake,
  Truck,
  Paperclip,
  Settings,
  ArrowRightLeft,
  Globe,
  Database,
  SearchCode,
  Zap,
  Sparkles,
  ShieldCheck,
  Lock,
  UserCheck,
  ListChecks,
  Scale,
  Wrench,
  FileText,
  TrendingUp,
  Gavel,
  History,
  Archive,
  User,
  ShoppingBag,
  Building,
  ArrowLeft,
  Wallet,
  Banknote,
  Briefcase
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';

import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';

import dynamic from 'next/dynamic';
import React from 'react';

// --- Dynamic Imports ---
const ClientsContent = dynamic(() => import('@/app/lending/clients-content'), { ssr: false, loading: () => <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div> });
const DebtorsContent = dynamic(() => import('@/app/lending/debtors-content'), { ssr: false });
const SuppliersContent = dynamic(() => import('@/app/lending/suppliers-content'), { ssr: false });
const AgreementsContent = dynamic(() => import('@/app/lending/agreements-content'), { ssr: false });
const AssetRegisterContent = dynamic(() => import('@/app/lending/asset-register-content'), { ssr: false });
const FacilitiesContent = dynamic(() => import('@/app/lending/facilities-content'), { ssr: false });
const LenderDeskContent = dynamic(() => import('@/app/lending/lender-desk-content'), { ssr: false });
const PaymentsContent = dynamic(() => import('@/app/lending/payments-content'), { ssr: false });
const DocumentVaultContent = dynamic(() => import('@/app/lending/documents-content'), { ssr: false });
const SecurityVaultContent = dynamic(() => import('@/app/lending/security-content'), { ssr: false });
const CollateralContent = dynamic(() => import('@/app/lending/collateral-content'), { ssr: false });
const PlatformStaffManagement = dynamic(() => import('@/app/adminaccount/platform-staff'), { ssr: false });
const PermissionsContent = dynamic(() => import('@/app/backend/permissions-content'), { ssr: false });

function LendingPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialView = searchParams.get('view') || 'desk';
  const [activeView, setActiveView] = useState(initialView);
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  
  useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  useEffect(() => {
    if (!isUserLoading && !user) {
        router.replace('/signin?redirect=/lending');
    }
  }, [isUserLoading, user, router]);

  const onLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/');
  };

  const renderContent = useCallback(() => {
    switch (activeView) {
      case 'desk': return <LenderDeskContent />;
      case 'clients': return <ClientsContent />;
      case 'debtors': return <DebtorsContent />;
      case 'suppliers': return <SuppliersContent />;
      case 'agreements': return <AgreementsContent />;
      case 'assets': return <AssetRegisterContent />;
      case 'payments': return <PaymentsContent />;
      case 'facilities-clients': return <FacilitiesContent mode="client-global" />;
      case 'facilities-debtors': return <FacilitiesContent mode="debtor" />;
      case 'facilities-suppliers': return <FacilitiesContent mode="facilities-suppliers" />;
      case 'documents': return <DocumentVaultContent />;
      case 'security-vault': return <SecurityVaultContent />;
      case 'collateral': return <CollateralContent />;
      case 'staff': return <PlatformStaffManagement />;
      case 'permissions': return <PermissionsContent />;
      default: return <LenderDeskContent />;
    }
  }, [activeView]);

  const navigate = (view: string) => router.push(`/lending?view=${view}`, { scroll: false });

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "AD";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  if (isUserLoading || !user) {
    return (
        <div className="flex flex-col justify-center items-center py-40 gap-4 text-center text-foreground">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Authenticating Portal...</p>
        </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2 text-left">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Landmark className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-lg font-black uppercase tracking-tight text-sidebar-foreground">Lending Desk</h2>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Admin Ledger" isActive={activeView === 'desk'} onClick={() => navigate('desk')}>
                  <ListChecks />
                  <span>Master Action Ledger</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Portfolios" isActive={['clients', 'debtors', 'suppliers', 'agreements', 'assets', 'payments'].includes(activeView)}>
                  <ClipboardList />
                  <span>Lending Portfolios</span>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'clients'} onClick={() => navigate('clients')}>Clients</SidebarMenuSubButton></SidebarMenuSubItem>
                  <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'debtors'} onClick={() => navigate('debtors')}>Debtors</SidebarMenuSubButton></SidebarMenuSubItem>
                  <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'suppliers'} onClick={() => navigate('suppliers')}>Suppliers</SidebarMenuSubButton></SidebarMenuSubItem>
                  <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'agreements'} onClick={() => navigate('agreements')}>Agreements</SidebarMenuSubButton></SidebarMenuSubItem>
                  <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'assets'} onClick={() => navigate('assets')}>Asset Register</SidebarMenuSubButton></SidebarMenuSubItem>
                  <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'payments'} onClick={() => navigate('payments')}><Banknote className="h-3.5 w-3.5 mr-2 text-primary" />Disbursements</SidebarMenuSubButton></SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Facilities" isActive={activeView.startsWith('facilities-')}>
                  <Scale />
                  <span>Facilities</span>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'facilities-clients'} onClick={() => navigate('facilities-clients')}>Client facility</SidebarMenuSubButton></SidebarMenuSubItem>
                  <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'facilities-debtors'} onClick={() => navigate('facilities-debtors')}>Debtor facility</SidebarMenuSubButton></SidebarMenuSubItem>
                  <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'facilities-suppliers'} onClick={() => navigate('facilities-suppliers')}>Supplier facility</SidebarMenuSubButton></SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Vaults" isActive={['documents', 'security-vault', 'collateral'].includes(activeView)}>
                  <Lock />
                  <span>Registry Vaults</span>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'documents'} onClick={() => navigate('documents')}>Document Register</SidebarMenuSubButton></SidebarMenuSubItem>
                  <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'security-vault'} onClick={() => navigate('security-vault')}>Security Vault</SidebarMenuSubButton></SidebarMenuSubItem>
                  <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'collateral'} onClick={() => navigate('collateral')}>Collateral Register</SidebarMenuSubButton></SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Oversight</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem><SidebarMenuButton tooltip="Staff" isActive={activeView === 'staff'} onClick={() => navigate('staff')}><UserCheck /><span>Internal Team</span></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuButton tooltip="Security" isActive={activeView === 'permissions'} onClick={() => navigate('permissions')}><Lock /><span>Security Matrix</span></SidebarMenuButton></SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-3 p-2 rounded-md bg-sidebar-accent">
            <Avatar className="h-10 w-10">
                <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col truncate text-left">
                <span className="text-sm font-medium text-sidebar-foreground truncate text-left">{user?.displayName || 'Admin'}</span>
                <span className="text-xs text-sidebar-foreground/70 truncate text-left">{user?.email}</span>
            </div>
            <Button variant="ghost" size="icon" className="ml-auto" onClick={onLogout} title="Sign Out">
                <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="p-8 text-left text-foreground">
            <Suspense fallback={<div className="py-20 text-center text-foreground"><Loader2 className="animate-spin h-10 w-10 text-primary mx-auto" /></div>}>
                {renderContent()}
            </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function LendingPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen text-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
      <LendingPortalContent />
    </Suspense>
  );
}
