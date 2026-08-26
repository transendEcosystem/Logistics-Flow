
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowRight, ShieldCheck, Store } from 'lucide-react';
import * as gtag from '@/lib/gtag';
import Image from 'next/image';

export interface ModalConfig {
  title: string;
  description: string;
  primary: {
    label: string;
    description: string;
    action: () => void;
  };
  secondary: {
    label: string;
    description: string;
    action: () => void;
  };
  shop?: {
    label: string;
    description: string;
    action: () => void;
  };
}

export interface IncentiveStep {
    title: string;
    description: string;
    cta: string;
    action: () => void;
}


interface IntentModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  config: ModalConfig | null;
  incentiveStep?: IncentiveStep | null;
  showIncentiveStep: boolean;
  setShowIncentiveStep: (show: boolean) => void;
  headerImage?: { imageUrl: string, description: string, imageHint: string };
}

export function IntentModal({ isOpen, onOpenChange, config, incentiveStep, showIncentiveStep, setShowIncentiveStep, headerImage }: IntentModalProps) {
  
  if (!config) return null;

  const handleClose = () => {
    setShowIncentiveStep(false);
    onOpenChange(false);
  }

  const content = showIncentiveStep && incentiveStep ? (
    <>
        <DialogHeader>
            <DialogTitle>{incentiveStep.title}</DialogTitle>
            <DialogDescription>
                {incentiveStep.description}
            </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-between mt-4">
                <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
                Maybe Later
            </Button>
                <Button type="button" onClick={incentiveStep.action}>
                {incentiveStep.cta} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </DialogFooter>
    </>
  ) : (
    <>
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
          <Button onClick={config.primary.action} className="h-auto min-h-28 min-w-0 whitespace-normal px-3 py-4 text-center text-base flex-col items-center justify-center border-2 hover:border-primary transition-all bg-white" variant="outline">
            <span className="max-w-full break-words font-bold">{config.primary.label}</span>
            <span className="mt-2 max-w-full break-words px-1 text-center text-[10px] font-normal leading-tight text-muted-foreground">{config.primary.description}</span>
            </Button>
          <Button onClick={config.secondary.action} className="h-auto min-h-28 min-w-0 whitespace-normal px-3 py-4 text-center text-base flex-col items-center justify-center shadow-lg">
            <span className="max-w-full break-words font-bold">{config.secondary.label}</span>
             <span className="mt-2 max-w-full break-words px-1 text-center text-[10px] font-normal leading-tight text-primary-foreground/80">{config.secondary.description}</span>
            </Button>
        </div>
          {config.shop && <Button onClick={config.shop.action} variant="secondary" className="h-auto min-h-14 w-full whitespace-normal px-4 py-3 text-center"><Store className="mr-2 h-4 w-4 shrink-0" /><span className="font-bold">{config.shop.label}</span><span className="ml-2 text-xs font-normal text-muted-foreground">{config.shop.description}</span></Button>}
        <DialogFooter className="sm:justify-center border-t pt-4">
             <Button type="button" variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground" onClick={config.primary.action}>
                Skip to Source Only
            </Button>
        </DialogFooter>
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-2xl border-none p-0 shadow-2xl sm:rounded-3xl">
        {headerImage && (
            <div className="relative w-full h-40 bg-slate-900">
                <Image 
                    src={headerImage.imageUrl} 
                    alt={headerImage.description} 
                    fill 
                    className="object-cover opacity-60" 
                    data-ai-hint={headerImage.imageHint}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                <div className="absolute bottom-4 left-6">
                    <div className="flex items-center gap-2 bg-primary/20 backdrop-blur-md px-3 py-1 rounded-full border border-primary/30">
                        <ShieldCheck className="h-3 w-3 text-primary" />
                        <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Grid Secure</span>
                    </div>
                </div>
            </div>
        )}
        <div className="p-5 sm:p-8">
            {content}
        </div>
      </DialogContent>
    </Dialog>
  );
}

