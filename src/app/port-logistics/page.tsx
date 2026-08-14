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
} from '@/components/ui/sidebar';
import {
  LogOut,
  Loader2,
  LayoutDashboard,
  User,
  Shield,
  Truck,
  Package,
  Building,
  BarChart3,
  Network,
  ShoppingCart,
  ShieldAlert,
  Ship,
  FileText,
  BrainCircuit,
  CalendarCheck,
  Landmark,
  ShieldCheck,
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
import { PremiumFeaturePrompt } from '@/components/PremiumFeaturePrompt';

// Dynamically import content components
const DashboardContent = dynamic(() => import('./dashboard'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const MarketplaceContent = dynamic(() => import('./marketplace'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const AiMatchingContent = dynamic(() => import('./ai-matching'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const WorkflowContent = dynamic(() => import('./workflow'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const TbsIntegrationContent = dynamic(() => import('./tbs-integration'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const NavisIntegrationContent = dynamic(() => import('./navis-integration'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });
const GateOptimizationContent = dynamic(() => import('./gate-optimization'), { loading: () => <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto my-20" /> });


function PortLogisticsPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialView = searchParams.get('view') || 'dashboard';
  const [activeView, setActiveView] = useState(initialView);
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  
  useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

   useEffect(() => {
    if (!isUserLoading && !user) {
        router.replace('/signin?redirect=/port-logistics');
    }
  }, [isUserLoading, user, router]);

  const onLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/');
  };

  const isAdmin = user?.claims?.admin === true || user?.email === 'mkoton100@gmail.com' || user?.email === 'beyondtransport@gmail.com';
  const hasPremiumPlan = user?.companyData?.membershipId && user.companyData.membershipId !== 'free';

  const renderContent = useCallback(() => {
    // Allow dashboard view for all WCTA members
    if (activeView === 'dashboard') {
      return <DashboardContent />;
    }
    
    // For all other views, require a paid plan or admin status
    if (!isAdmin && !hasPremiumPlan) {
      switch (activeView) {
        case 'marketplace':
            return <PremiumFeaturePrompt icon={ShoppingCart} title="Real-time Marketplace" description="This feature provides a live marketplace with upfront pricing and instant booking to eliminate negotiation delays." />;
        case 'ai-matching':
            return <PremiumFeaturePrompt icon={BrainCircuit} title="AI Matching" description="Connect the right truck to the right container based on proximity, capacity, and other criteria using AI." />;
        case 'workflow':
            return <PremiumFeaturePrompt icon={FileText} title="Digital Workflow" description="Eliminate paperwork by managing digital Bills of Lading (BOL) and Proofs of Delivery (POD) directly on the platform." />;
        case 'tbs-integration':
            return <PremiumFeaturePrompt icon={CalendarCheck} title="TBS Integration" description="Directly integrate with the Transnet Truck Booking System for real-time slot availability and one-click bookings." />;
        case 'navis-integration':
            return <PremiumFeaturePrompt icon={Landmark} title="Navis N4 Connectivity" description="Automate container validation and receive real-time status updates from the terminal operating system." />;
        case 'gate-optimization':
            return <PremiumFeaturePrompt icon={ShieldCheck} title="Gate-In Optimization" description="Reduce terminal turnaround times and eliminate manual paperwork with digital gate passes and pre-gate validation." />;
        default:
            return <DashboardContent />;
      }
    }
    
    // User is authorized, show the content
    switch (activeView) {
      case 'marketplace': return <MarketplaceContent />;
      case 'ai-matching': return <AiMatchingContent />;
      case 'workflow': return <WorkflowContent />;
      case 'tbs-integration': return <TbsIntegrationContent />;
      case 'navis-integration': return <NavisIntegrationContent />;
      case 'gate-optimization': return <GateOptimizationContent />;
      default: return <DashboardContent />;
    }
  }, [activeView, isAdmin, hasPremiumPlan]);
  
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
  
  const navigate = (view: string) => router.push(`/port-logistics?view=${view}`, { scroll: false });

  return (
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <Ship className="h-6 w-6 text-primary" />
              <h2 className="text-lg font-semibold text-sidebar-foreground">
                Port Logistics
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
                    <SidebarMenuButton tooltip="Marketplace" isActive={activeView === 'marketplace'} onClick={() => navigate('marketplace')}>
                        <ShoppingCart /><span>Marketplace</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                    <SidebarMenuButton tooltip="AI Matching" isActive={activeView === 'ai-matching'} onClick={() => navigate('ai-matching')}>
                        <BrainCircuit /><span>AI Matching</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Digital Workflow" isActive={activeView === 'workflow'} onClick={() => navigate('workflow')}>
                        <FileText /><span>Digital Workflow</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                    <SidebarMenuButton tooltip="TBS Integration" isActive={activeView === 'tbs-integration'} onClick={() => navigate('tbs-integration')}>
                        <CalendarCheck /><span>TBS Integration</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Navis N4" isActive={activeView === 'navis-integration'} onClick={() => navigate('navis-integration')}>
                        <Landmark /><span>Navis N4 Connectivity</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Gate-In Optimization" isActive={activeView === 'gate-optimization'} onClick={() => navigate('gate-optimization')}>
                        <ShieldCheck /><span>Gate-In Optimization</span>
                    </SidebarMenuButton>
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
                  {user.displayName || 'Admin'}
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
  );
}

export default function PortLogisticsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
      <PortLogisticsPortalContent />
    </Suspense>
  );
}
