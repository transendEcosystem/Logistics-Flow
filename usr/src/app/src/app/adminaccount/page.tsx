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
  User,
  LayoutDashboard,
  Mail,
  Target,
  Bot,
  Sparkles,
  Settings,
  Mic,
  Shield,
  Activity,
  Wrench,
  Banknote,
  FileSignature,
  UserPlus,
  BookOpen,
  UserCheck2,
  Code2,
  Ship,
  DollarSign,
  Lock,
  Star,
  Award,
  Gift,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense, useCallback } from 'react';

import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import React from 'react';

// Static Imports for reliability in prototype environment
import AdminDashboardContent from '@/app/backend/dashboard-content';
import ActivityFeed from '@/app/backend/activity-feed';
import LeadsAgent from '@/app/adminaccount/leads-agent';
import LeadsDatabase from '@/app/adminaccount/leads-database';
import MarketingPage from '@/app/adminaccount/marketing/MarketingPage';
import BrandingStudio from '@/app/adminaccount/branding-studio';
import TTSStudio from '@/app/adminaccount/tts-studio';
import AssetGallery from '@/app/adminaccount/asset-gallery';
import SalesRoadmap from '@/app/account/sales-roadmap';
import TargetsPage from '@/app/account/targets';
import FinancialProjections from '@/app/backend/financial-projections';
import FinancialsGeneralSettings from '@/app/adminaccount/financials-general-settings';
import FinancialSetup from '@/app/account/financial-setup';
import BudgetPage from '@/app/account/budget/page';
import SalaryForecastPage from '@/app/backend/salary-forecast';
import PermissionsContent from '@/app/backend/permissions-content';
import PricingManagement from '@/app/backend/revenue/pricing-management';
import ConnectPlanPricing from '@/app/backend/revenue/connect-plan-pricing';
import TechPricing from '@/app/backend/revenue/tech-pricing';
import MarketplaceFees from '@/app/backend/revenue/marketplace-fees';
import MallCommissions from '@/app/backend/revenue/mall-commissions';
import ISAPitchSettings from '@/app/backend/revenue/isa-pitch-settings';
import SalesIncentives from '@/app/backend/revenue/sales-incentives';
import ActionPlanSettings from '@/app/backend/loyalty-settings';
import TierBenefits from '@/app/backend/tier-benefits';
import RewardsManagement from '@/app/backend/rewards-management';
import PlatformTasks from '@/app/backend/platform-tasks';
import PlatformSettingsContent from '@/app/backend/platform-settings';

function AdminAuthGuard({ children }: { children: React.ReactNode }) {
    const { user, isUserLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (isUserLoading) return;

        if (!user) {
            router.replace('/signin?redirect=/adminaccount');
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

function AdminAccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialView = searchParams.get('view') || 'dashboard';
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
      case 'dashboard': return <AdminDashboardContent />;
      case 'activity': return <ActivityFeed />;
      case 'leads-agent': return <LeadsAgent />;
      case 'leads-database': return <LeadsDatabase />;
      case 'branding-studio': return <BrandingStudio />;
      case 'tts-studio': return <TTSStudio />;
      case 'asset-gallery': return <AssetGallery />;
      case 'sales-roadmap': return <SalesRoadmap />;
      case 'targets': return <TargetsPage />;
      case 'financial-projections': return <FinancialProjections />;
      case 'financial-settings': return <FinancialsGeneralSettings />;
      case 'financial-setup': return <FinancialSetup />;
      case 'budget': return <BudgetPage />;
      case 'salary-forecast': return <SalaryForecastPage />;
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
  }, [activeView]);
  
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

  const navigate = (view: string) => router.push(`/adminaccount?view=${view}`, { scroll: false });
  
  const isMarketingActive = activeView.startsWith('marketing-');
  const isSalesActive = ['sales-roadmap', 'targets'].includes(activeView);
  const isFinancialActive = ['financial-projections', 'financial-settings', 'financial-setup', 'budget', 'salary-forecast'].includes(activeView);
  const isContentActive = ['branding-studio', 'tts-studio', 'asset-gallery'].includes(activeView);
  const isLeadsActive = ['leads-agent', 'leads-database'].includes(activeView);
  const isRevenueActive = [
    'pricing-memberships', 'pricing-connect', 'pricing-tech', 'pricing-marketplace',
    'commissions-malls', 'commissions-isa', 'incentives-sales'
  ].includes(activeView);
  const isPlatformSettingsActive = [
    'permissions', 'action-plan', 'loyalty-plan', 'rewards-plan', 'tasks', 'settings-bank'
  ].includes(activeView);

  return (
    <AdminAuthGuard>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h2 className="text-lg font-semibold text-sidebar-foreground">
                Admin Account
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
                    <SidebarMenuButton tooltip="Activity" isActive={activeView === 'activity'} onClick={() => navigate('activity')}>
                        <Activity /><span>Activity</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Marketing" isActive={isMarketingActive}><BookOpen /><span>Marketing Library</span></SidebarMenuButton>
                    <SidebarMenuSub>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'marketing-partners'} onClick={() => navigate('marketing-partners')}>Strategic Partners</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'marketing-isa'} onClick={() => navigate('marketing-isa')}>ISA Agents</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'marketing-suppliers'} onClick={() => navigate('marketing-suppliers')}>Suppliers</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'marketing-transporters'} onClick={() => navigate('marketing-transporters')}>Transporters</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'marketing-investors'} onClick={() => navigate('marketing-investors')}>Investors</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'marketing-developers'} onClick={() => navigate('marketing-developers')}>Developers</SidebarMenuSubButton></SidebarMenuSubItem>
                    </SidebarMenuSub>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Leads" isActive={isLeadsActive}><UserPlus /><span>Leads</span></SidebarMenuButton>
                    <SidebarMenuSub>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'leads-agent'} onClick={() => navigate('leads-agent')}>Leads Agent</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'leads-database'} onClick={() => navigate('leads-database')}>Leads Database</SidebarMenuSubButton></SidebarMenuSubItem>
                    </SidebarMenuSub>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Content" isActive={isContentActive}><Sparkles /><span>Content Studio</span></SidebarMenuButton>
                    <SidebarMenuSub>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'branding-studio'} onClick={() => navigate('branding-studio')}>Branding Studio</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'tts-studio'} onClick={() => navigate('tts-studio')}>TTS Studio</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'asset-gallery'} onClick={() => navigate('asset-gallery')}>Asset Gallery</SidebarMenuSubButton></SidebarMenuSubItem>
                    </SidebarMenuSub>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Sales" isActive={isSalesActive}><TrendingUp /><span>Sales</span></SidebarMenuButton>
                    <SidebarMenuSub>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'sales-roadmap'} onClick={() => navigate('sales-roadmap')}>Roadmap</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'targets'} onClick={() => navigate('targets')}>Targets</SidebarMenuSubButton></SidebarMenuSubItem>
                    </SidebarMenuSub>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Financials" isActive={isFinancialActive}><FinancialSheetIcon /><span>Financials</span></SidebarMenuButton>
                    <SidebarMenuSub>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'financial-projections'} onClick={() => navigate('financial-projections')}>Projections</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'budget'} onClick={() => navigate('budget')}>Budget</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'salary-forecast'} onClick={() => navigate('salary-forecast')}>Salaries</SidebarMenuSubButton></SidebarMenuSubItem>
                         <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'financial-setup'} onClick={() => navigate('financial-setup')}>Setup</SidebarMenuSubButton></SidebarMenuSubItem>
                        <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'financial-settings'} onClick={() => navigate('financial-settings')}>General Settings</SidebarMenuSubButton></SidebarMenuSubItem>
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
                {renderContent()}
            </div>
        </SidebarInset>
      </SidebarProvider>
    </AdminAuthGuard>
  );
}


export default function AdminAccountPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
      <AdminAccountContent />
    </Suspense>
  );
}
