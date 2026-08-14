
'use client';

import { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

interface DataContributionModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const contributionOptions = [
  { id: 'fleet', label: 'Upload Fleet Details' },
  { id: 'suppliers', label: 'List Your Suppliers' },
  { id: 'clients', label: 'Describe Your Clients' },
];

export function DataContributionModal({ isOpen, onOpenChange }: DataContributionModalProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const { toast } = useToast();
  const router = useRouter();

  const handleCheckboxChange = (optionId: string, checked: boolean) => {
    setSelectedOptions((prev) =>
      checked ? [...prev, optionId] : prev.filter((id) => id !== optionId)
    );
  };

  const handleConfirm = () => {
    if (selectedOptions.length > 0) {
      toast({
        title: 'Thank You for Contributing!',
        description: "We'll guide you through the next steps shortly. Your contribution helps the whole community.",
      });
      onOpenChange(false);
      router.push('/contribute'); // Redirect to the new contribution page
    } else {
        onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>You Have the Power to Increase These Savings</DialogTitle>
          <DialogDescription>
            The more we understand our members' collective needs, the stronger our negotiating power. By providing some anonymous data, you help us secure bigger discounts for the entire TransConnect community.
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <div className="grid gap-4 py-4">
          <p className="text-sm font-medium">I would like to help by providing:</p>
          <div className="space-y-3">
            {contributionOptions.map((option) => (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox
                  id={option.id}
                  onCheckedChange={(checked) => handleCheckboxChange(option.id, !!checked)}
                  checked={selectedOptions.includes(option.id)}
                />
                <Label htmlFor={option.id} className="cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={selectedOptions.length === 0}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
