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
  TrendingUp,
  LayoutDashboard,
  Settings,
  Users,
  Shield,
  Activity,
  Wrench,
  Wallet,
  Store,
  Lock,
  Award,
  Banknote,
  Handshake,
  DollarSign,
  MessageSquare,
  Gift,
  Zap,
  PieChart,
  Scale,
  Landmark,
  ArrowRightLeft,
  Globe,
  Truck,
  ShoppingCart,
  HelpCircle,
  Warehouse,
  Network,
  PackageSearch,
  Building,
  SearchCode,
  Database,
  ListTodo,
  Star
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense, useCallback } from 'react';

import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import dynamic from 'next/dynamic';
import React from 'react';
import Link from 'next/link';

// --- Static Imports ---
import AdminDashboardContent from '@/app/backend/dashboard-content';
import MemberWallet from '@/app/backend/wallet/[memberId]/member-wallet';
import WalletTransactionsList from '@/app/backend/wallet-transactions-list';
import ReconciliationPage from '@/app/backend/reconciliation/page';
import ContributionsList from '@/app/backend/contributions-list';
import ActivityFeed from '@/app/backend/activity-feed';
import MembersList from '@/app/backend/members-list';
import SupportChatInbox from '@/app/backend/support-chat-inbox';
import UsersList from '@/app/backend/users-list';
import CommercialNegotiations from '@/app/backend/commercial-negotiations';
import MemberLoyaltyStatus from '@/app/backend/member-loyalty-status';
import MemberSuccessEngine from '@/app/backend/member-success-engine';
import FundingDivisionContent from '@/app/backend/funding-division-content';
import ShopsList from '@/app/backend/shops-list';
import DividendManagement from '@/app/adminaccount/dividend-management';
import HandshakeOversight from '@/app/adminaccount/handshake-oversight';
import SearchIntelligence from '@/app/backend/search-intelligence';
import DataHarvestOversight from '@/app/backend/data-harvest-oversight';

// Admin oversight components
const LoadsOversight = dynamic(() => import('@/app/adminaccount/loads-oversight'), { ssr: false, loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const BuySellOversight = dynamic(() => import('@/app/backend/buy-sell-oversight'), { ssr: false, loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const WarehouseOversight = dynamic(() => import('@/app/backend/warehouse-oversight'), { ssr: false, loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const TransportOversight = dynamic(() => import('@/app/backend/transport-oversight'), { ssr: false, loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const DistributionOversight = dynamic(() => import('@/app/backend/distribution-oversight'), { ssr: false, loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });

// Settings
import PermissionsContent from '@/app/backend/permissions-content';
import PricingManagement from '@/app/backend/revenue/pricing-management';
import ConnectPlanPricing from '@/app/backend/revenue/connect-plan-pricing';
import TechPricing from '@/app/backend/revenue/tech-pricing';
import AdPricingSettings from '@/app/backend/revenue/ad-pricing-settings';
import MarketplaceFees from '@/app/backend/revenue/marketplace-fees';
import MallCommissions from '@/app/backend/revenue/mall-commissions';
import ISAPitchSettings from '@/app/backend/revenue/isa-pitch-settings';
import SalesIncentives from '@/app/backend/revenue/sales-incentives';
import ActionPlanSettings from '@/app/backend/loyalty-settings';
import TierBenefits from '@/app/backend/tier-benefits';
import RewardsManagement from '@/app/backend/rewards-management';
import PlatformTasks from '@/app/backend/platform-tasks';
import PlatformSettingsContent from '@/app/backend/platform-settings';
import AdminGuides from '../adminaccount/guides';
import EngagementPipeline from '@/app/adminaccount/marketing/EngagementPipeline';

function AdminAuthGuard({ children }: { children: React.ReactNode }) {
    const { user, isUserLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (isUserLoading) return;
        if (!user) {
            router.replace('/signin?redirect=/backend');
        } else if (
          user.email !== 'mkoton100@gmail.com' && 
          user.email !== 'beyondtransport@gmail.com' &&
          user.email !== 'michael@logisticsflow.co.za'
        ) {
            router.replace('/account'); 
        }
    }, [user, isUserLoading, router]);

    if (isUserLoading || !user || (user.email !== 'mkoton100@gmail.com' && user.email !== 'beyondtransport@gmail.com' && user.email !== 'michael@logisticsflow.co.za')) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[calc(100vh-8rem)] text-foreground text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <p className="mt-4 text-muted-foreground font-black uppercase text-[10px] tracking-widest">Verifying Admin Permissions...</p>
            </div>
        );
    }
    return <>{children}</>;
}

function BackendContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialView = searchParams.get('view') || 'dashboard';
  const memberId = searchParams.get('memberId');
  const [activeView, setActiveView] = useState(initialView);
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  
  useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  const onLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/');
  };

  const renderContent = useCallback(() => {
    switch (activeView) {
      case 'dashboard': return <AdminDashboardContent />;
      case 'members': return <MembersList />;
      case 'users': return <UsersList />;
      case 'wallet': return memberId ? <MemberWallet memberId={memberId} /> : <WalletTransactionsList />;
      case 'wallet-transactions': return <WalletTransactionsList />;
      case 'activity': return <ActivityFeed />;
      case 'support-inbox': return <SupportChatInbox />;
      case 'finance-mall': return <FundingDivisionContent mode="market" />;
      case 'loads-oversight': return <LoadsOversight />;
      case 'handshake-oversight': return <HandshakeOversight />;
      case 'search-intelligence': return <SearchIntelligence />;
      case 'data-harvest': return <DataHarvestOversight />;
      case 'supplier-mall': return <ShopsList />;
      case 'transport-oversight': return <TransportOversight />;
      case 'distribution-oversight': return <DistributionOversight />;
      case 'buy-sell-oversight': return <BuySellOversight />;
      case 'warehouse-oversight': return <WarehouseOversight />;
      case 'success-engine': return <MemberSuccessEngine />;
      case 'loyalty-overview': return <MemberLoyaltyStatus />;
      case 'contributions': return <ContributionsList />;
      case 'commercial-negotiations': return <CommercialNegotiations />;
      case 'reconciliation': return <ReconciliationPage />;
      case 'permissions': return <PermissionsContent />;
      case 'action-plan': return <ActionPlanSettings />;
      case 'loyalty-plan': return <TierBenefits />;
      case 'rewards-plan': return <RewardsManagement />;
      case 'pricing-memberships': return <PricingManagement />;
      case 'pricing-dividend': return <DividendManagement />;
      case 'pricing-connect': return <ConnectPlanPricing />;
      case 'pricing-tech': return <TechPricing />;
      case 'pricing-ads': return <AdPricingSettings />;
      case 'pricing-marketplace': return < MarketplaceFees />;
      case 'commissions-malls': return <MallCommissions />;
      case 'commissions-isa': return <ISAPitchSettings />;
      case 'incentives-sales': return <SalesIncentives />;
      case 'tasks': return <PlatformTasks />;
      case 'settings-bank': return <PlatformSettingsContent />;
      case 'guides': return <AdminGuides />;
      case 'engagement-pipeline': return <EngagementPipeline />;
      default: return <AdminDashboardContent />;
    }
  }, [activeView, memberId]);
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "AD";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  if (isUserLoading || !user) {
    return (
        <div className="flex justify-center items-center py-20">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }
  
  const navigate = (view: string) => router.push(`/backend?view=${view}`, { scroll: false });

  const isOperationsActive = ['dashboard', 'activity', 'members', 'users', 'wallet', 'wallet-transactions', 'reconciliation', 'support-inbox'].includes(activeView);
  const isMallsActive = ['finance-mall', 'loads-oversight', 'supplier-mall', 'transport-oversight', 'distribution-oversight', 'warehouse-oversight', 'buy-sell-oversight', 'success-engine'].includes(activeView);
  const isSuccessActive = ['loyalty-overview', 'contributions', 'commercial-negotiations'].includes(activeView);
  const isRevenueActive = [
    'pricing-memberships', 'pricing-dividend', 'pricing-connect', 'pricing-tech', 'pricing-ads', 'pricing-marketplace',
    'commissions-malls', 'commissions-isa', 'incentives-sales'
  ].includes(activeView);
  const isPlatformSettingsActive = ['permissions', 'action-plan', 'loyalty-plan', 'rewards-plan', 'tasks', 'settings-bank'].includes(activeView);
  const isIntelligenceActive = ['handshake-oversight', 'search-intelligence', 'data-harvest'].includes(activeView);

  return (
    <AdminAuthGuard>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2 p-2 text-left text-foreground">
              <Shield className="h-6 w-6 text-primary" />
              <h2 className="text-lg font-semibold text-sidebar-foreground text-left">Admin Center</h2>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
                <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Dashboard" isActive={activeView === 'dashboard'} onClick={() => navigate('dashboard')}>
                        <LayoutDashboard /><span>Overview</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Operations" isActive={isOperationsActive}><Wrench /><span>Operations</span></SidebarMenuButton>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'activity'} onClick={() => navigate('activity')}><Activity />Activity Feed</SidebarMenuSubButton></SidebarMenuSubItem>
                    <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'support-inbox'} onClick={() => navigate('support-inbox')}><MessageSquare />Support Inbox</SidebarMenuSubButton></SidebarMenuSubItem>
                    <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'members'} onClick={() => navigate('members')}><Users />Member Roster</SidebarMenuSubButton></SidebarMenuSubItem>
                    <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'wallet-transactions'} onClick={() => navigate('wallet-transactions')}><Wallet />Wallet Ledger</SidebarMenuSubButton></SidebarMenuSubItem>
                    <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'reconciliation'} onClick={() => navigate('reconciliation')}><Scale />Bank Reconciliation</SidebarMenuSubButton></SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>
            </SidebarGroup>

            <SidebarGroup>
                <SidebarGroupLabel>Forensic Intelligence</SidebarGroupLabel>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton tooltip="Handshake Oversight" isActive={activeView === 'handshake-oversight'} onClick={() => navigate('handshake-oversight')}>
                            <Handshake className="text-primary" /><span>Deal introductions</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton tooltip="Search Intelligence" isActive={activeView === 'search-intelligence'} onClick={() => navigate('search-intelligence')}>
                            <SearchCode className="text-primary" /><span>Search Analytics</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton tooltip="The Data Vault" isActive={activeView === 'data-harvest'} onClick={() => navigate('data-harvest')}>
                            <Database className="text-primary" /><span>Data Harvest IP</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
                <SidebarGroupLabel>Platform Malls</SidebarGroupLabel>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton tooltip="Finance Mall" isActive={activeView === 'finance-mall' || activeView === 'success-engine'}><Landmark /><span>Finance Mall</span></SidebarMenuButton>
                        <SidebarMenuSub>
                             <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'finance-mall'} onClick={() => navigate('finance-mall')}><Globe />Market Origination</SidebarMenuSubButton></SidebarMenuSubItem>
                             <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'success-engine'} onClick={() => navigate('success-engine')}><PieChart />Conversion Engine</SidebarMenuSubButton></SidebarMenuSubItem>
                        </SidebarMenuSub>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton tooltip="Loads Mall" isActive={activeView === 'loads-oversight'} onClick={() => navigate('loads-oversight')}><PackageSearch /><span>Loads Mall</span></SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton tooltip="Supplier Mall" isActive={activeView === 'supplier-mall'} onClick={() => navigate('supplier-mall')}><Building /><span>Supplier Mall</span></SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton tooltip="Transport Mall" isActive={activeView === 'transport-oversight'} onClick={() => navigate('transport-oversight')}><Truck /><span>Transport Mall</span></SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton tooltip="Distribution Mall" isActive={activeView === 'distribution-oversight'} onClick={() => navigate('distribution-oversight')}><Network /><span>Distribution Mall</span></SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton tooltip="Warehouse Mall" isActive={activeView === 'warehouse-oversight'} onClick={() => navigate('warehouse-oversight')}><Warehouse /><span>Warehouse Mall</span></SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton tooltip="Buy & Sell Mall" isActive={activeView === 'buy-sell-oversight'} onClick={() => navigate('buy-sell-oversight')}><ShoppingCart /><span>Buy & Sell Mall</span></SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
                <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Member Success" isActive={isSuccessActive}><TrendingUp /><span>Engagement</span></SidebarMenuButton>
                    <SidebarMenuSub>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'loyalty-overview'} onClick={() => navigate('loyalty-overview')}><Award />Loyalty & Tiers</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'contributions'} onClick={() => navigate('contributions')}><ListTodo />Data Contributions</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'commercial-negotiations'} onClick={() => navigate('commercial-negotiations')}><Handshake />Commercials</SidebarMenuSubButton></SidebarMenuSubItem>
                    </SidebarMenuSub>
                </SidebarMenuItem>

                <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Revenue & Pricing" isActive={isRevenueActive}><DollarSign /><span>Revenue & Pricing</span></SidebarMenuButton>
                    <SidebarMenuSub>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'pricing-memberships'} onClick={() => navigate('pricing-memberships')}>Membership Pricing</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'pricing-dividend'} onClick={() => navigate('pricing-dividend')}>Dividend Rewards</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'pricing-connect'} onClick={() => navigate('pricing-connect')}>Connect Plan Pricing</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'pricing-tech'} onClick={() => navigate('pricing-tech')}>Tech SaaS Pricing</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'pricing-ads'} onClick={() => navigate('pricing-ads')}>Ad Engine Pricing</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'pricing-marketplace'} onClick={() => navigate('pricing-marketplace')}>Marketplace Fees</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'commissions-malls'} onClick={() => navigate('commissions-malls')}>Mall Commissions</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'commissions-isa'} onClick={() => navigate('commissions-isa')}>ISA Commissions</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'incentives-sales'} onClick={() => navigate('incentives-sales')}>Sales Incentives</SidebarMenuSubButton></SidebarMenuSubItem>
                    </SidebarMenuSub>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Platform Settings" isActive={isPlatformSettingsActive}><Settings /><span>Platform Settings</span></SidebarMenuButton>
                  <SidebarMenuSub>
                     <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'permissions'} onClick={() => navigate('permissions')}><Lock />Permissions</SidebarMenuSubButton></SidebarMenuSubItem>
                     <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'action-plan'} onClick={() => navigate('action-plan')}><Star />Action Plan</SidebarMenuSubButton></SidebarMenuSubItem>
                     <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'loyalty-plan'} onClick={() => navigate('loyalty-plan')}><Award />Loyalty Plan</SidebarMenuSubButton></SidebarMenuSubItem>
                     <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'rewards-plan'} onClick={() => navigate('rewards-plan')}><Gift />Rewards Plan</SidebarMenuSubButton></SidebarMenuSubItem>
                     <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'settings-bank'} onClick={() => navigate('settings-bank')}><Banknote />Bank Details</SidebarMenuSubButton></SidebarMenuSubItem>
                     <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'tasks'} onClick={() => navigate('tasks')}><Wrench />Platform Tasks</SidebarMenuSubButton></SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>

                <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Help & Guides" isActive={activeView === 'guides'} onClick={() => navigate('guides')}>
                        <HelpCircle /><span>Help & Guides</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
          <div className="border-t p-2">
            <Button variant="outline" className="w-full justify-start gap-2 h-9 text-xs" asChild>
                <Link href="/adminaccount">
                    <ArrowRightLeft className="h-3.5 w-3.5" /> Admin Portal
                </Link>
            </Button>
          </div>
          {user && (
              <div className="flex items-center gap-3 p-2 rounded-md bg-sidebar-accent text-left text-foreground">
              <Avatar className="h-10 w-10">
                  <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col truncate text-left text-foreground text-left text-foreground">
                  <span className="text-sm font-medium text-sidebar-foreground truncate text-left">
                  {user.displayName || 'Admin'}
                  </span>
                  <span className="text-xs text-sidebar-foreground/70 truncate text-left">
                  {user.email}
                  </span>
              </div>
              <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto"
                  onClick={onLogout}
                  title="Sign Out"
              >
                  <LogOut className="h-5 w-5" />
              </Button>
              </div>
          )}
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
            <div className="p-6 text-left">
                <Suspense fallback={<div className="flex justify-center items-center py-20 text-left"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
                    {renderContent()}
                </Suspense>
            </div>
        </SidebarInset>
      </SidebarProvider>
    </AdminAuthGuard>
  );
}

export default function BackendPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-8rem)] text-left"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
      <BackendContent />
    </Suspense>
  );
}
