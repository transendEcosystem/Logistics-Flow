
'use client';

import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { roles } from '@/lib/roles';
import * as gtag from '@/lib/gtag';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HomeIntentModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function HomeIntentModal({ isOpen, onOpenChange }: HomeIntentModalProps) {
    const router = useRouter();

    const handleNavigation = (roleId: string, intent: string) => {
        if (process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID) {
            gtag.event({
                action: 'homepage_intent_selection',
                category: 'Engagement',
                label: intent,
                value: 1
            });
        }
        router.push(`/join?role=${roleId}`);
        onOpenChange(false);
    }

    // Filter out isa-agent for the general public selection as it's an elite/invitation tier
    const publicRoles = roles.filter(r => r.id !== 'isa-agent');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Declare Your Position</DialogTitle>
          <DialogDescription>
            Join the digital ecosystem. Select the role that best describes your business or individual goal.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                {publicRoles.map((role) => {
                    const Icon = role.icon;
                    return (
                        <Button 
                            key={role.id}
                            onClick={() => handleNavigation(role.id, role.id)} 
                            className="w-full h-auto min-h-[100px] text-lg justify-start px-6 gap-4 border-2 hover:border-primary transition-all" 
                            variant="outline"
                        >
                            <div className="bg-primary/10 p-3 rounded-full shrink-0">
                                <Icon className="h-6 w-6 text-primary"/>
                            </div>
                            <div className="text-left py-2">
                                <p className="font-bold">{role.title}</p>
                                <p className="text-[10px] font-normal text-muted-foreground leading-tight mt-1">
                                    {role.description}
                                </p>
                            </div>
                        </Button>
                    );
                })}
            </div>
        </ScrollArea>
        <DialogFooter className="sm:justify-center border-t pt-4">
             <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                I'm just browsing for now
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
