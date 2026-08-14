
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
import { ArrowRight, ShieldCheck } from 'lucide-react';
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
        <div className="flex flex-col sm:flex-row gap-4 py-4">
            <Button onClick={config.primary.action} className="w-full h-24 text-lg flex-col items-center justify-center border-2 hover:border-primary transition-all bg-white" variant="outline">
                <span className="font-bold">{config.primary.label}</span>
                <span className="text-[10px] font-normal text-muted-foreground mt-1 text-center whitespace-normal leading-tight px-2">{config.primary.description}</span>
            </Button>
            <Button onClick={config.secondary.action} className="w-full h-24 text-lg flex-col items-center justify-center shadow-lg">
                <span className="font-bold">{config.secondary.label}</span>
                 <span className="text-[10px] font-normal text-primary-foreground/80 mt-1 text-center whitespace-normal leading-tight px-2">{config.secondary.description}</span>
            </Button>
        </div>
        <DialogFooter className="sm:justify-center border-t pt-4">
             <Button type="button" variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground" onClick={config.primary.action}>
                Skip to Source Only
            </Button>
        </DialogFooter>
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
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
        <div className="p-8">
            {content}
        </div>
      </DialogContent>
    </Dialog>
  );
}

