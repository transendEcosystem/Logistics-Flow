
'use client';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
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
  Map,
  Sheet as FinancialSheetIcon,
  Presentation,
  User,
  LayoutDashboard,
  Mail,
  Calculator,
  Target,
  Info,
  Bot,
  Database,
  ImageIcon,
  Briefcase,
  Scale,
  Handshake,
  DollarSign,
  Sparkles,
  Settings,
  Users,
  Mic,
  LineChart,
  Shield,
  Activity,
  Wrench,
  Wallet,
  ListTodo,
  Store,
  Lock,
  Star,
  Award,
  Banknote,
  FileText,
  Landmark,
  Truck,
  ShieldCheck,
  Repeat,
  FileSignature,
  Building,
  FileSearch,
  UserPlus,
  Filter,
  ClipboardList,
  MessageSquare,
  Code,
  Gift,
  BookOpen,
  UserCheck2,
  Code2,
  Ship,
  Network,
  ShoppingCart,
  ShieldAlert,
  Package,
  BrainCircuit,
  CalendarCheck,
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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// --- Dynamic Imports for Business Components ---

// Dashboard
const AdminDashboardContent = dynamic(() => import('@/app/backend/dashboard-content'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });

// Operations
const MembersList = dynamic(() => import('@/app/backend/members-list'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const UsersList = dynamic(() => import('@/app/backend/users-list'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const MemberWallet = dynamic(() => import('@/app/backend/wallet/[memberId]/member-wallet'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const WalletTransactionsList = dynamic(() => import('@/app/backend/wallet-transactions-list'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const ShopsList = dynamic(() => import('@/app/backend/shops-list'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const ReconciliationPage = dynamic(() => import('@/app/backend/reconciliation/page'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const ContributionsList = dynamic(() => import('@/app/backend/contributions-list'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const ActivityFeed = dynamic(() => import('@/app/backend/activity-feed'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const CommunicationsContent = dynamic(() => import('@/app/backend/communications-content'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const SupportChatInbox = dynamic(() => import('@/app/backend/support-chat-inbox'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const CommercialNegotiations = dynamic(() => import('@/app/backend/commercial-negotiations'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const MarketingPage = dynamic(() => import('@/app/adminaccount/marketing/MarketingPage'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });

// Platform Settings
const PermissionsContent = dynamic(() => import('@/app/backend/permissions-content'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const PricingManagement = dynamic(() => import('@/app/backend/revenue/pricing-management'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const TechPricing = dynamic(() => import('@/app/backend/revenue/tech-pricing'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const PlatformTasks = dynamic(() => import('@/app/backend/platform-tasks'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const PlatformSettingsContent = dynamic(() => import('@/app/backend/platform-settings'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const MallCommissions = dynamic(() => import('@/app/backend/revenue/mall-commissions'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const ConnectPlanPricing = dynamic(() => import('@/app/backend/revenue/connect-plan-pricing'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const MarketplaceFees = dynamic(() => import('@/app/backend/revenue/marketplace-fees'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const SalesIncentives = dynamic(() => import('@/app/backend/revenue/sales-incentives'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const ActionPlanSettings = dynamic(() => import('@/app/backend/loyalty-settings'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const TierBenefits = dynamic(() => import('@/app/backend/tier-benefits'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const ISAPitchSettings = dynamic(() => import('@/app/backend/revenue/isa-pitch-settings'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const RewardsManagement = dynamic(() => import('@/app/backend/rewards-management'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });

function AdminAuthGuard({ children }: { children: React.ReactNode }) {
    const { user, isUserLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (isUserLoading) {
            return;
        }

        if (!user) {
            router.replace('/signin?redirect=/backend');
        } else if (user.email !== 'mkoton100@gmail.com' && user.email !== 'beyondtransport@gmail.com') {
            router.replace('/account'); 
        }
    }, [user, isUserLoading, router]);

    if (isUserLoading || !user || (user.email !== 'mkoton100@gmail.com' && user.email !== 'beyondtransport@gmail.com')) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Verifying admin credentials...</p>
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
    if (activeView.startsWith('marketing-')) {
        const audience = activeView.split('-')[1] as "partners" | "isa" | "transporters" | "suppliers" | "investors" | "developers";
        return <MarketingPage audience={audience} />;
    }
    switch (activeView) {
      // Dashboard
      case 'dashboard': return <AdminDashboardContent />;
      case 'commercial-negotiations': return <CommercialNegotiations />;
      
      // Operations
      case 'members': return <MembersList />;
      case 'users': return <UsersList />;
      case 'wallet': return memberId ? <MemberWallet memberId={memberId} /> : <WalletTransactionsList />;
      case 'wallet-transactions': return <WalletTransactionsList />;
      case 'shops': return <ShopsList />;
      case 'reconciliation': return <ReconciliationPage />;
      case 'contributions': return <ContributionsList />;
      case 'activity': return <ActivityFeed />;
      case 'communications': return <CommunicationsContent />;
      case 'support-inbox': return <SupportChatInbox />;
      
      // Platform Settings
      case 'permissions': return <PermissionsContent />;
      case 'action-plan': return <ActionPlanSettings />;
      case 'loyalty-plan': return <TierBenefits />;
      case 'rewards-plan': return <RewardsManagement />;
      case 'pricing-memberships': return <PricingManagement />;
      case 'pricing-connect': return <ConnectPlanPricing />;
      case 'pricing-tech': return <TechPricing />;
      case 'pricing-marketplace': return <MarketplaceFees />;
      case 'commissions-malls': return <MallCommissions />;
      case 'commissions-isa': return <ISAPitchSettings />;
      case 'incentives-sales': return <SalesIncentives />;
      case 'tasks': return <PlatformTasks />;
      case 'settings-bank': return <PlatformSettingsContent />;

      default: return <AdminDashboardContent />;
    }
  }, [activeView, memberId]);
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "AD";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  if (isUserLoading || !user) {
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  const navigate = (view: string) => router.push(`/adminaccount?view=${view}`, { scroll: false });
  
  const isOperationsActive = ['members', 'users', 'wallet', 'wallet-transactions', 'shops', 'reconciliation', 'contributions', 'activity', 'communications', 'support-inbox', 'commercial-negotiations'].includes(activeView);
  const isRevenueActive = [
    'pricing-memberships', 'pricing-connect', 'pricing-tech', 'pricing-marketplace',
    'commissions-malls', 'commissions-isa', 'incentives-sales'
  ].includes(activeView);
  const isPlatformSettingsActive = [
    'permissions', 'action-plan', 'loyalty-plan', 'rewards-plan', 'tasks', 'settings-bank'
  ].includes(activeView);
  const isMarketingActive = activeView.startsWith('marketing-');

  return (
    <AdminAuthGuard>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h2 className="text-lg font-semibold text-sidebar-foreground">
                App Backend
              </h2>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
                <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Dashboard" isActive={activeView === 'dashboard'} onClick={() => navigate('dashboard')}>
                        <LayoutDashboard /><span>Dashboard</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Operations" isActive={isOperationsActive}><Wrench /><span>Operations</span></SidebarMenuButton>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'activity'} onClick={() => navigate('activity')}><Activity />Activity Feed</SidebarMenuSubButton></SidebarMenuSubItem>
                    <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'communications'} onClick={() => navigate('communications')}><MessageSquare />Agent Chats</SidebarMenuSubButton></SidebarMenuSubItem>
                    <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'support-inbox'} onClick={() => navigate('support-inbox')}><MessageSquare />Support Inbox</SidebarMenuSubButton></SidebarMenuSubItem>
                    <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'members'} onClick={() => navigate('members')}><Users />Members</SidebarMenuSubButton></SidebarMenuSubItem>
                    <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'users'} onClick={() => navigate('users')}><Users />All Users</SidebarMenuSubButton></SidebarMenuSubItem>
                    <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'wallet-transactions'} onClick={() => navigate('wallet-transactions')}><Wallet />Wallet Transactions</SidebarMenuSubButton></SidebarMenuSubItem>
                    <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'contributions'} onClick={() => navigate('contributions')}><ListTodo />Contributions</SidebarMenuSubButton></SidebarMenuSubItem>
                    <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'shops'} onClick={() => navigate('shops')}><Store />Shops</SidebarMenuSubButton></SidebarMenuSubItem>
                    <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'reconciliation'} onClick={() => navigate('reconciliation')}><Scale />Bank Reconciliation</SidebarMenuSubButton></SidebarMenuSubItem>
                    <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'commercial-negotiations'} onClick={() => navigate('commercial-negotiations')}><Handshake />Commercials</SidebarMenuSubButton></SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>

                <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Marketing" isActive={isMarketingActive}><BookOpen /><span>Marketing</span></SidebarMenuButton>
                    <SidebarMenuSub>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'marketing-partners'} onClick={() => navigate('marketing-partners')}><Handshake/>Partners</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'marketing-isa'} onClick={() => navigate('marketing-isa')}><UserCheck2/>ISA Agents</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'marketing-suppliers'} onClick={() => navigate('marketing-suppliers')}><Building/>Suppliers</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'marketing-transporters'} onClick={() => navigate('marketing-transporters')}><Truck/>Transporters</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'marketing-investors'} onClick={() => navigate('marketing-investors')}><DollarSign/>Investors</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'marketing-developers'} onClick={() => navigate('marketing-developers')}><Code2/>Developers</SidebarMenuSubButton></SidebarMenuSubItem>
                    </SidebarMenuSub>
                </SidebarMenuItem>

                <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Revenue & Pricing" isActive={isRevenueActive}><DollarSign /><span>Revenue & Pricing</span></SidebarMenuButton>
                    <SidebarMenuSub>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'pricing-memberships'} onClick={() => navigate('pricing-memberships')}>Membership Pricing</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'pricing-connect'} onClick={() => navigate('pricing-connect')}>Connect Plan Pricing</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'pricing-tech'} onClick={() => navigate('pricing-tech')}>Tech SaaS Pricing</SidebarMenuSubButton></SidebarMenuSubItem>
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
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
          {user && (
              <div className="flex items-center gap-3 p-2 rounded-md bg-sidebar-accent">
              <Avatar className="h-10 w-10">
                  <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col truncate">
                  <span className="text-sm font-medium text-sidebar-foreground truncate">
                  {user.displayName || 'Super Admin'}
                  </span>
                  <span className="text-xs text-sidebar-foreground/70 truncate">
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
            <div className="p-6">
                <Suspense fallback={<Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" />}>
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
    <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
      <BackendContent />
    </Suspense>
  );
}
