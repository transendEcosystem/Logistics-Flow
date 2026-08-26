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
  SidebarTrigger,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  LogOut,
  LayoutDashboard,
  User,
  Building,
  Store,
  Wallet,
  Activity,
  Handshake,
  Landmark,
  Users,
  Warehouse,
  Network,
  PackageSearch,
  ShoppingCart,
  Search,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Loader2,
  Truck,
  Box,
  Fingerprint,
  Video,
  Share2,
  ClipboardList,
  Mic,
  Palette,
  Target,
  TrendingUp
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import React from 'react';
import AIChatWidget from '@/components/ai-chat-widget';

// Component Imports
import AccountDashboard from './dashboard';
import StaffContent from './staff-content';
import ProfileContent from './profile-content';
import CompanyContent from './company-content';
import WalletContent from './wallet-content';
import BillingContent from './billing-content';
import ActivityFeed from './activity-feed';
import NetworkContent from './network-content';
import SupportChatContent from './support-chat';
import LoyaltyPlanPage from '@/app/connect/loyalty/page';
import RewardsPlanPage from '@/app/connect/rewards/page';
import ActionsPlanPage from '@/app/connect/actions/page';
import IntelligenceHistory from './intelligence-history';
import MarketingStudio from './marketing-studio';
import MyFacilitiesContent from './facilities-content';
import ShopContent from './shop-content';
import TrustIdentityContent from './trust-identity-content';
import HumanCapitalContent from './human-capital-content';
import PerformanceContent from './performance-content';
import EarningsContent from './earnings-content';
import MallOnboardingContent from './mall-onboarding-content';
import QuestionnairesContent from './questionnaires-content';
import LoadBoardContent from './load-board-content';
import FleetContent from './fleet-content';
import BusinessDomainContent from './business-domain-content';
import { getPrimaryBusinessDomain } from '@/lib/business-domain';
import { usePermissions } from '@/hooks/use-permissions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Mall Gate Components
import { MallGate } from './malls/MallGate';

function AccountPageContent() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const searchParams = useSearchParams();
  const initialView = searchParams.get('view') || 'dashboard';
  const nodeType = searchParams.get('nodeType');
  const [activeView, setActiveView] = useState(initialView);
  const primaryBusinessDomain = getPrimaryBusinessDomain(user);
  const availableRoles = Array.from(new Set([primaryBusinessDomain, ...(user?.companyData?.activeBusinessRoles || [])].filter(Boolean))) as string[];
  const requestedRole = searchParams.get('role');
  const activeRole = requestedRole && availableRoles.includes(requestedRole) ? requestedRole : primaryBusinessDomain || 'supplier';
  const { can: canAccess } = usePermissions(activeRole);

  useEffect(() => {
    window.localStorage.setItem('logistics-flow-active-role', activeRole);
    window.dispatchEvent(new CustomEvent('logistics-flow-role-changed', { detail: activeRole }));
  }, [activeRole]);

  useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/signin');
    }
  }, [user, isUserLoading, router]);

  const onLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/');
  };
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "AC";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const navigate = (view: string, nodeTypeParam?: string) => {
    const url = nodeTypeParam ? `/account?view=${view}&nodeType=${nodeTypeParam}` : `/account?view=${view}`;
    router.push(url, { scroll: false });
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex justify-center items-center py-40">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  const isAssociate = user.declaredPosition === 'associate' || user.role === 'associate';

  const switchRole = (role: string) => {
    const view = searchParams.get('view') || 'dashboard';
    window.localStorage.setItem('logistics-flow-active-role', role);
    router.push(`/account?view=${view}&role=${role}`, { scroll: false });
  };

  const renderContent = () => {
    if (activeView === 'mall-loads' || activeView === 'mall-warehouse' || activeView === 'mall-transporter' || activeView === 'mall-supplier' || activeView === 'mall-finance' || activeView === 'mall-buy-sell') {
        const mallId = activeView.replace('mall-', '');
        return <MallGate mallId={mallId} />;
    }
    
    switch (activeView) {
      case 'dashboard': return <AccountDashboard />;
      case 'profile': return <ProfileContent />;
      case 'company': return <CompanyContent />;
      case 'shop': return <ShopContent />;
      case 'staff': return <StaffContent />;
      case 'wallet': return <WalletContent />;
      case 'billing': return <BillingContent />;
      case 'activity': return <ActivityFeed />;
      case 'support-chat': return <SupportChatContent />;
      case 'network': return <NetworkContent />;
      case 'performance': return <PerformanceContent />;
      case 'earnings': return <EarningsContent />;
      case 'marketing-studio': return <MarketingStudio />;
      case 'my-facilities': return <MyFacilitiesContent />;
      case 'search-history': return <IntelligenceHistory />;
      case 'trust-identity': return <TrustIdentityContent />;
      case 'human-capital': return <HumanCapitalContent />;
      case 'mall-onboarding': return <MallOnboardingContent />;
      case 'questionnaires': return <QuestionnairesContent />;
      case 'load-board': return <LoadBoardContent />;
      case 'fleet-profile': return <FleetContent />;
      case 'business-domain': return <BusinessDomainContent />;
      case 'connect-loyalty': return <LoyaltyPlanPage />;
      case 'connect-rewards': return <RewardsPlanPage />;
      case 'connect-actions': return <ActionsPlanPage />;
      default: return <AccountDashboard />;
    }
  };

  return (
    <SidebarProvider>
      <AIChatWidget />
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <div className="bg-primary/10 p-2 rounded-full"><Box className="h-6 w-6 text-primary" /></div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-sidebar-foreground">{activeRole[0].toUpperCase() + activeRole.slice(1)} Portal</h2>
              {availableRoles.length > 1 && <Select value={activeRole} onValueChange={switchRole}><SelectTrigger className="h-7 border-0 bg-transparent p-0 text-xs text-sidebar-foreground/70"><SelectValue /></SelectTrigger><SelectContent>{availableRoles.map(role => <SelectItem key={role} value={role}>{role[0].toUpperCase() + role.slice(1)} Portal</SelectItem>)}</SelectContent></Select>}
            </div>
          </div>
          <Button variant="outline" size="sm" className="mx-2 mb-2" onClick={() => router.push('/account/additional-role?role=transporter')}>Add Role</Button>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Dashboard" isActive={activeView === 'dashboard'} onClick={() => navigate('dashboard')}><LayoutDashboard /><span>Dashboard</span></SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="My Network" isActive={activeView === 'network'} onClick={() => navigate('network')}><Handshake /><span>My Network</span></SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Network Performance" isActive={activeView === 'performance'} onClick={() => navigate('performance')}><TrendingUp /><span>Network Performance</span></SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="ISA Earnings" isActive={activeView === 'earnings'} onClick={() => navigate('earnings')}><Wallet /><span>ISA Earnings</span></SidebarMenuButton>
              </SidebarMenuItem>
          </SidebarGroup>

          {/* ASSOCIATE / CREATOR TOOLS SECTION */}
          {isAssociate && (
              <SidebarGroup>
                <SidebarGroupLabel>Creator Studio</SidebarGroupLabel>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton tooltip="AI Studio" isActive={activeView === 'marketing-studio'} onClick={() => navigate('marketing-studio')}><Palette /><span>AI Marketing Studio</span></SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton tooltip="Human Capital" isActive={activeView === 'human-capital'} onClick={() => navigate('human-capital')}><Users /><span>Human Capital logs</span></SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
          )}

          {!isAssociate && (
              <>
              <SidebarGroup>
                <SidebarGroupLabel>My Business</SidebarGroupLabel>
                <SidebarMenu>
                  <SidebarMenuItem><SidebarMenuButton tooltip="Business Profile" isActive={activeView === 'company'} onClick={() => navigate('company')}><Building /><span>Business Profile</span></SidebarMenuButton></SidebarMenuItem>
                  <SidebarMenuItem><SidebarMenuButton tooltip="Commercial Questionnaires" isActive={activeView === 'questionnaires'} onClick={() => navigate('questionnaires')}><ClipboardList /><span>Questionnaires</span></SidebarMenuButton></SidebarMenuItem>
                  {primaryBusinessDomain === 'supplier' && <>
                    <SidebarMenuItem><SidebarMenuButton tooltip="Supplier Storefront" isActive={activeView === 'shop' && nodeType === 'supplier'} onClick={() => navigate('shop', 'supplier')}><ShoppingCart /><span>My Storefront</span></SidebarMenuButton></SidebarMenuItem>
                  </>}
                  {primaryBusinessDomain === 'transporter' && <>
                    {canAccess('edit', 'postTransport' as any) && <SidebarMenuItem><SidebarMenuButton tooltip="Fleet and Routes" isActive={activeView === 'fleet-profile'} onClick={() => navigate('fleet-profile')}><Truck /><span>Fleet & Routes</span></SidebarMenuButton></SidebarMenuItem>}
                    {canAccess('edit', 'shop') && <SidebarMenuItem><SidebarMenuButton tooltip="Transport Storefront" isActive={activeView === 'shop' && nodeType === 'transport'} onClick={() => navigate('shop', 'transport')}><Store /><span>My Transport Storefront</span></SidebarMenuButton></SidebarMenuItem>}
                  </>}
                  {primaryBusinessDomain === 'lender' && <SidebarMenuItem><SidebarMenuButton tooltip="Lending Products and Criteria" isActive={activeView === 'shop' && nodeType === 'finance'} onClick={() => navigate('shop', 'finance')}><Landmark /><span>Lending Products & Criteria</span></SidebarMenuButton></SidebarMenuItem>}
                  {!primaryBusinessDomain && <SidebarMenuItem><SidebarMenuButton tooltip="Set Primary Business Domain" isActive={activeView === 'business-domain'} onClick={() => navigate('business-domain')}><Target /><span>Set Primary Business Domain</span></SidebarMenuButton></SidebarMenuItem>}
                </SidebarMenu>
              </SidebarGroup>

              <SidebarGroup>
                <SidebarGroupLabel>Commercial Malls</SidebarGroupLabel>
                <SidebarMenu>
                  <SidebarMenuItem><SidebarMenuButton tooltip="Loads Mall" isActive={activeView === 'mall-loads'} onClick={() => navigate('mall-loads')}><PackageSearch /><span>Loads Mall</span></SidebarMenuButton></SidebarMenuItem>
                  <SidebarMenuItem><SidebarMenuButton tooltip="Warehouse Mall" isActive={activeView === 'mall-warehouse'} onClick={() => navigate('mall-warehouse')}><Warehouse /><span>Warehouse Mall</span></SidebarMenuButton></SidebarMenuItem>
                  <SidebarMenuItem><SidebarMenuButton tooltip="Transport Mall" isActive={activeView === 'mall-transporter'} onClick={() => navigate('mall-transporter')}><Truck /><span>Transport Mall</span></SidebarMenuButton></SidebarMenuItem>
                  <SidebarMenuItem><SidebarMenuButton tooltip="Supplier Mall" isActive={activeView === 'mall-supplier'} onClick={() => navigate('mall-supplier')}><Building /><span>Supplier Mall</span></SidebarMenuButton></SidebarMenuItem>
                  <SidebarMenuItem><SidebarMenuButton tooltip="Finance Mall" isActive={activeView === 'mall-finance'} onClick={() => navigate('mall-finance')}><Landmark /><span>Finance Mall</span></SidebarMenuButton></SidebarMenuItem>
                  <SidebarMenuItem><SidebarMenuButton tooltip="Buy & Sell Mall" isActive={activeView === 'mall-buy-sell'} onClick={() => navigate('mall-buy-sell')}><ShoppingCart /><span>Buy & Sell Mall</span></SidebarMenuButton></SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
                </>
          )}

          <SidebarGroup>
              <SidebarGroupLabel>Administrative Terminal</SidebarGroupLabel>
              <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Company Profile" isActive={activeView === 'company'} onClick={() => navigate('company')}><Building /><span>Company Profile</span></SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Staff, Roles & Permissions" isActive={activeView === 'staff'} onClick={() => navigate('staff')}><Users /><span>Staff, Roles & Permissions</span></SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Billing" isActive={activeView === 'billing'} onClick={() => navigate('billing')}><Wallet /><span>Billing</span></SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Trust & Identity" isActive={activeView === 'trust-identity'} onClick={() => navigate('trust-identity')}><Fingerprint /><span>Trust & Identity</span></SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Wallet & Payouts" isActive={activeView === 'wallet'} onClick={() => navigate('wallet')}><Wallet /><span>Wallet & Payouts</span></SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Support Chat" isActive={activeView === 'support-chat'} onClick={() => navigate('support-chat')}><MessageSquare /><span>Support Chat</span></SidebarMenuButton>
                  </SidebarMenuItem>
              </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="flex w-full items-center gap-3 rounded-md bg-sidebar-accent p-2 text-left hover:bg-sidebar-accent/80">
                <Avatar className="h-10 w-10"><AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback></Avatar>
                <span className="flex min-w-0 flex-1 flex-col truncate">
                  <span className="truncate text-sm font-medium text-sidebar-foreground">{user?.displayName || 'Member'}</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">{user?.email}</span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-64">
              <DropdownMenuLabel>Switch Portal</DropdownMenuLabel>
              {availableRoles.map(role => <DropdownMenuItem key={role} onClick={() => switchRole(role)}>{role[0].toUpperCase() + role.slice(1)} Portal{role === activeRole ? ' (Active)' : ''}</DropdownMenuItem>)}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/account/additional-role?role=transporter')}><Target className="mr-2 h-4 w-4" />Add Role</DropdownMenuItem>
              <DropdownMenuItem onClick={onLogout}><LogOut className="mr-2 h-4 w-4" />Sign Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="p-4 md:p-8 text-left text-foreground">
            <SidebarTrigger className="md:hidden mb-4" />
            <Suspense fallback={<div className="flex justify-center items-center py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
                {renderContent()}
            </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={
        <div className="flex flex-col justify-center items-center py-40 gap-4">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Initializing Workspace...</p>
        </div>
    }>
      <AccountPageContent />
    </Suspense>
  );
}
