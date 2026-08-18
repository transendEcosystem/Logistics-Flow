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
  LayoutDashboard,
  Shield,
  Activity,
  UserPlus,
  BookOpen,
  DollarSign,
  Handshake,
  Truck,
  Building,
  Users,
  FileText,
  Landmark,
  Sparkles,
  TrendingUp,
  Settings,
  Star,
  Award,
  Gift,
  Wrench,
  Share2,
  Facebook,
  Linkedin,
  Instagram,
  Music,
  Lock,
  Banknote,
  Search,
  ShoppingCart,
  Eye,
  Globe,
  ClipboardList,
  Warehouse,
  Network,
  HelpCircle,
  PackageSearch,
  Zap,
  Database,
  SearchCode
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense, useCallback } from 'react';

import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import React from 'react';

// Component Imports
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
import FinancialSetup from '@/app/account/financial-setup';
import BudgetPage from '@/app/account/budget/page';
import SalaryForecastPage from '@/app/backend/salary-forecast';
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
import UnifiedDirectory from '@/app/adminaccount/unified-directory';
import PlatformStaffManagement from '@/app/adminaccount/platform-staff';
import AssociateOversight from '@/app/adminaccount/associate-oversight';
import AdminGuides from '@/app/adminaccount/guides';
import AdsOversight from '@/app/adminaccount/ads-oversight';
import SocialStudio from '@/app/adminaccount/social-studio';
import EngagementPipeline from '@/app/adminaccount/marketing/EngagementPipeline';
import DividendManagement from '@/app/adminaccount/dividend-management';
import HandshakeOversight from '@/app/adminaccount/handshake-oversight';

function AdminAuthGuard({ children }: { children: React.ReactNode }) {
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    
    const uid = user?.uid;
    const email = user?.email;

    useEffect(() => {
        if (isUserLoading) return;
        if (!uid) {
            router.replace('/signin?redirect=/adminaccount');
        } else if (
          email !== 'mkoton100@gmail.com' && 
          email !== 'beyondtransport@gmail.com' &&
          email !== 'michael@logisticsflow.co.za'
        ) {
            router.replace('/account'); 
        }
    }, [uid, email, isUserLoading, router]);

    if (isUserLoading || !uid || (email !== 'mkoton100@gmail.com' && email !== 'beyondtransport@gmail.com' && email !== 'michael@logisticsflow.co.za')) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[calc(100vh-8rem)] text-foreground text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <p className="mt-4 text-muted-foreground text-sm font-bold uppercase tracking-widest text-center">Verifying Admin Permissions...</p>
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
    if (activeView.startsWith('social-')) {
        const platform = activeView.split('-')[1] as any;
        return <SocialStudio platform={platform} />;
    }
    if (activeView.startsWith('marketing-')) {
        const audience = activeView.replace('marketing-', '') as any;
        return <MarketingPage audience={audience} />;
    }
    switch (activeView) {
      case 'dashboard': return <AdminDashboardContent />;
      case 'unified-directory': return <UnifiedDirectory />;
      case 'handshake-oversight': return <HandshakeOversight />;
      case 'activity': return <ActivityFeed />;
      case 'leads-agent': return <LeadsAgent />;
      case 'leads-database': return <LeadsDatabase />;
      case 'branding-studio': return <BrandingStudio />;
      case 'tts-studio': return <TTSStudio />;
      case 'asset-gallery': return <AssetGallery />;
      case 'sales-roadmap': return <SalesRoadmap />;
      case 'targets': return <TargetsPage />;
      case 'financial-projections': return <FinancialProjections />;
      case 'financial-setup': return <FinancialSetup />;
      case 'budget': return <BudgetPage />;
      case 'salary-forecast': return <SalaryForecastPage />;
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
      case 'platform-staff': return <PlatformStaffManagement />;
      case 'associate-oversight': return <AssociateOversight />;
      case 'ads-oversight': return <AdsOversight />;
      case 'guides': return <AdminGuides />;
      case 'engagement-pipeline': return <EngagementPipeline />;
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
  
  const isSocialActive = activeView.startsWith('social-');
  const isMarketingActive = activeView.startsWith('marketing-');

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2 text-left text-foreground">
            <Shield className="h-6 w-6 text-primary" />
            <h2 className="text-lg font-semibold text-sidebar-foreground text-left">Admin Portal</h2>
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
                  <SidebarMenuButton tooltip="Handshake Oversight" isActive={activeView === 'handshake-oversight'} onClick={() => navigate('handshake-oversight')}>
                      <Handshake className="text-primary" /><span>Handshake Oversight</span>
                  </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Activity" isActive={activeView === 'activity'} onClick={() => navigate('activity')}>
                      <Activity /><span>Activity</span>
                  </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Leads" isActive={activeView.includes('leads') || activeView === 'unified-directory'}><UserPlus /><span>Leads & CRM</span></SidebarMenuButton>
                  <SidebarMenuSub>
                      <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'unified-directory'} onClick={() => navigate('unified-directory')}>Unified Directory</SidebarMenuSubButton></SidebarMenuSubItem>
                      <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'associate-oversight'} onClick={() => navigate('associate-oversight')}><Eye className="h-3.5 w-3.5 mr-2"/>Associate Monitoring</SidebarMenuSubButton></SidebarMenuSubItem>
                      <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'leads-agent'} onClick={() => navigate('leads-agent')}>Leads Agent</SidebarMenuSubButton></SidebarMenuSubItem>
                      <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'leads-database'} onClick={() => navigate('leads-database')}>Leads Database</SidebarMenuSubButton></SidebarMenuSubItem>
                      <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'platform-staff'} onClick={() => navigate('platform-staff')}>Platform Staff</SidebarMenuSubButton></SidebarMenuSubItem>
                  </SidebarMenuSub>
              </SidebarMenuItem>

              <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Automation" isActive={activeView === 'engagement-pipeline'} onClick={() => navigate('engagement-pipeline')}>
                      <Zap className="text-primary fill-primary/20" /><span>Auto-Pilot</span>
                  </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Marketing" isActive={isMarketingActive}><BookOpen /><span>Marketing Library</span></SidebarMenuButton>
                  <SidebarMenuSub>
                      <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'marketing-partners'} onClick={() => navigate('marketing-partners')}>Strategic Partners</SidebarMenuSubButton></SidebarMenuSubItem>
                      <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'marketing-isa'} onClick={() => navigate('marketing-isa')}>ISA Agents</SidebarMenuSubButton></SidebarMenuSubItem>
                      <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'marketing-associates'} onClick={() => navigate('marketing-associates')}>Digital Associates</SidebarMenuSubButton></SidebarMenuSubItem>
                      <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'marketing-suppliers'} onClick={() => navigate('marketing-suppliers')}>Suppliers</SidebarMenuSubButton></SidebarMenuSubItem>
                      <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'marketing-transporters'} onClick={() => navigate('marketing-transporters')}>Transporters</SidebarMenuSubButton></SidebarMenuSubItem>
                      <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'marketing-finance'} onClick={() => navigate('marketing-finance')}>Finance Co</SidebarMenuSubButton></SidebarMenuSubItem>
                      <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'marketing-investors'} onClick={() => navigate('marketing-investors')}>Investors</SidebarMenuSubButton></SidebarMenuSubItem>
                  </SidebarMenuSub>
              </SidebarMenuItem>

              <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Social" isActive={isSocialActive}><Share2 /><span>Social Studio</span></SidebarMenuButton>
                  <SidebarMenuSub>
                      <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'social-facebook'} onClick={() => navigate('social-facebook')}><Facebook className="h-4 w-4"/>Facebook</SidebarMenuSubButton></SidebarMenuSubItem>
                      <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'social-linkedin'} onClick={() => navigate('social-linkedin')}><Linkedin className="h-4 w-4"/>LinkedIn</SidebarMenuSubButton></SidebarMenuSubItem>
                      <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'social-instagram'} onClick={() => navigate('social-instagram')}><Instagram className="h-4 w-4"/>Instagram</SidebarMenuSubButton></SidebarMenuSubItem>
                      <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'social-tiktok'} onClick={() => navigate('social-tiktok')}><Music className="h-4 w-4"/>TikTok</SidebarMenuSubButton></SidebarMenuSubItem>
                  </SidebarMenuSub>
              </SidebarMenuItem>

              <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Revenue" isActive={activeView === 'ads-oversight' || activeView.includes('pricing')}><Zap /><span>Revenue Oversight</span></SidebarMenuButton>
                  <SidebarMenuSub>
                      <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'ads-oversight'} onClick={() => navigate('ads-oversight')}><Sparkles className="h-3.5 w-3.5 mr-2" />Visibility Campaigns</SidebarMenuSubButton></SidebarMenuSubItem>
                      <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'pricing-memberships'} onClick={() => navigate('pricing-memberships')}><Users className="h-3.5 w-3.5 mr-2" />Membership Plans</SidebarMenuSubButton></SidebarMenuSubItem>
                      <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'pricing-dividend'} onClick={() => navigate('pricing-dividend')}><Gift className="h-3.5 w-3.5 mr-2" />Dividend Rewards</SidebarMenuSubButton></SidebarMenuSubItem>
                      <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'pricing-ads'} onClick={() => navigate('pricing-ads')}><DollarSign className="h-3.5 w-3.5 mr-2" />Ad Pricing Settings</SidebarMenuSubButton></SidebarMenuSubItem>
                  </SidebarMenuSub>
              </SidebarMenuItem>

              <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Content" isActive={['branding-studio', 'tts-studio', 'asset-gallery'].includes(activeView)}><Sparkles /><span>Content Studio</span></SidebarMenuButton>
                  <SidebarMenuSub>
                      <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'branding-studio'} onClick={() => navigate('branding-studio')}>Branding Studio</SidebarMenuSubButton></SidebarMenuSubItem>
                      <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'tts-studio'} onClick={() => navigate('tts-studio')}>TTS Studio</SidebarMenuSubButton></SidebarMenuSubItem>
                      <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'asset-gallery'} onClick={() => navigate('asset-gallery')}>Asset Gallery</SidebarMenuSubButton></SidebarMenuSubItem>
                  </SidebarMenuSub>
              </SidebarMenuItem>

              <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Financials" isActive={activeView.includes('financial') || activeView === 'budget'}><FileText /><span>Financials</span></SidebarMenuButton>
                  <SidebarMenuSub>
                      <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'financial-projections'} onClick={() => navigate('financial-projections')}>Projections</SidebarMenuSubButton></SidebarMenuSubItem>
                      <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'budget'} onClick={() => navigate('budget')}>Budget</SidebarMenuSubButton></SidebarMenuSubItem>
                  </SidebarMenuSub>
              </SidebarMenuItem>

              <SidebarMenuItem>
              <SidebarMenuButton tooltip="Platform Settings" isActive={activeView === 'settings-bank' || activeView === 'permissions' || activeView === 'guides'}><Settings /><span>Platform Settings</span></SidebarMenuButton>
              <SidebarMenuSub>
                 <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'permissions'} onClick={() => navigate('permissions')}>Permissions</SidebarMenuSubButton></SidebarMenuSubItem>
                 <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'settings-bank'} onClick={() => navigate('settings-bank')}>Bank Details</SidebarMenuSubButton></SidebarMenuSubItem>
                 <SidebarMenuSubItem><SidebarMenuSubButton isActive={activeView === 'guides'} onClick={() => navigate('guides')}><HelpCircle className="h-3.5 w-3.5 mr-2" />Help & Guides</SidebarMenuSubButton></SidebarMenuSubItem>
              </SidebarMenuSub>
            </SidebarMenuItem>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
          <div className="flex items-center gap-3 p-2 rounded-md bg-sidebar-accent text-left text-foreground">
            <Avatar className="h-10 w-10">
                <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col truncate text-left text-foreground text-left text-foreground">
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
        <div className="p-6 text-left text-foreground">
            {renderContent()}
        </div>
    </SidebarInset>
    </SidebarProvider>
  );
}

export default function AdminAccountPage() {
  return (
    <AdminAuthGuard>
        <Suspense fallback={<div className="flex justify-center items-center py-20 text-left"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
            <AdminAccountContent />
        </Suspense>
    </AdminAuthGuard>
  );
}
