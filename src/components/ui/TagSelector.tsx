'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type TagSelectorProps = {
  value?: string;
  onValueChange?: (value: string) => void;
  options?: string[];
  placeholder?: string;
  label?: string;
  className?: string;
  registryType?: string;
};

export function extractRegistryTags(record: any): string[] {
  if (!record || typeof record !== 'object') return [];

  const tagKeys = [
    'industrial_tags',
    'registry_tags',
    'trade_tags',
    'specialized_tags',
    'specialization_tags',
    'specializedTags',
    'registryTags',
    'tradeTags',
    'tags',
    'tag',
    'labels',
    'label',
    'industry_tags',
    'service_tags',
    'serviceTags',
  ];

  const collected: string[] = [];
  const addRaw = (raw: unknown) => {
    if (raw == null) return;

    if (typeof raw === 'string') {
      raw.split(',').map((part) => part.trim()).filter(Boolean).forEach((part) => collected.push(part));
      return;
    }

    if (Array.isArray(raw)) {
      raw.forEach((item) => addRaw(item));
      return;
    }

    if (typeof raw === 'object') {
      const entry = raw as Record<string, unknown>;
      if (typeof entry.name === 'string') collected.push(entry.name.trim());
      if (typeof entry.value === 'string') collected.push(entry.value.trim());
      if (typeof entry.label === 'string') collected.push(entry.label.trim());
      if (typeof entry.tag === 'string') collected.push(entry.tag.trim());
    }
  };

  for (const key of tagKeys) {
    addRaw(record[key]);
  }

  const normalized = new Map<string, string>();
  for (const tag of collected) {
    const clean = tag.trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (!normalized.has(key)) normalized.set(key, clean);
  }

  return Array.from(normalized.values()).sort((a, b) => a.localeCompare(b));
}

export function extractRegistryCategories(record: any): string[] {
  if (!record || typeof record !== 'object') return [];

  const categoryKeys = [
    'industrial_category',
    'industry_category',
    'industrialCategory',
    'category',
    'category_name',
    'categoryName',
    'primaryCategory',
    'business_category',
    'businessCategory',
    'trade_category',
    'tradeCategory',
    'industry',
    'industryCategory',
    'sector',
    'subsector',
    'segment',
    'segments',
    'service_category',
    'serviceCategory',
    'commodity_category',
    'commodityCategory',
    'role',
    'type',
    'businessType',
    'business_type',
  ];

  const collected: string[] = [];
  const addRaw = (raw: unknown) => {
    if (raw == null) return;

    if (typeof raw === 'string') {
      raw.split(',').map((part) => part.trim()).filter(Boolean).forEach((part) => collected.push(part));
      return;
    }

    if (Array.isArray(raw)) {
      raw.forEach((item) => addRaw(item));
      return;
    }

    if (typeof raw === 'object') {
      const entry = raw as Record<string, unknown>;
      if (typeof entry.name === 'string') collected.push(entry.name.trim());
      if (typeof entry.label === 'string') collected.push(entry.label.trim());
      if (typeof entry.value === 'string') collected.push(entry.value.trim());
      if (typeof entry.category === 'string') collected.push(entry.category.trim());
      if (typeof entry.title === 'string') collected.push(entry.title.trim());
    }
  };

  for (const key of categoryKeys) {
    addRaw(record[key]);
  }

  const normalized = new Map<string, string>();
  for (const category of collected) {
    const clean = category.trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (!normalized.has(key)) normalized.set(key, clean);
  }

  return Array.from(normalized.values()).sort((a, b) => a.localeCompare(b));
}

export function TagSelector({
  value = 'all',
  onValueChange,
  options = [],
  placeholder = 'All Tags',
  label,
  className,
  registryType,
}: TagSelectorProps) {
  const [open, setOpen] = React.useState(false);

  const selectedLabel = value && value !== 'all' ? value : placeholder;
  const resolvedLabel = label || (registryType ? `${registryType.replace(/-/g, ' ')} Tag Filter` : 'Tag Filter');

  return (
    <div className="space-y-1 text-left text-foreground">
      {resolvedLabel && (
        <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5 text-left">
          {resolvedLabel}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn('w-full justify-between bg-white text-left text-xs font-medium', className)}
            type="button"
          >
            <span className="truncate">{selectedLabel}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-2 text-left text-foreground">
          <div className="space-y-1">
            <Button
              type="button"
              variant={value === 'all' ? 'secondary' : 'ghost'}
              className="w-full justify-start text-xs font-bold"
              onClick={() => {
                onValueChange?.('all');
                setOpen(false);
              }}
            >
              All Tags
            </Button>
            {options.map((tag) => (
              <Button
                key={tag}
                type="button"
                variant={value === tag ? 'secondary' : 'ghost'}
                className="w-full justify-start text-xs font-bold"
                onClick={() => {
                  onValueChange?.(tag);
                  setOpen(false);
                }}
              >
                {tag}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default TagSelector;
