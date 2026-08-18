import { supplierCategories } from '@/app/adminaccount/marketing/discovery-engine';
import { transporterCategories } from '@/app/adminaccount/marketing/transporter-discovery';
import { financeCategories } from '@/app/adminaccount/marketing/finance-discovery';
import { investorClasses } from '@/app/adminaccount/marketing/investor-discovery';
import { extractRegistryCategories } from '@/components/ui/TagSelector';

export const registryCategoryOptions: Record<string, string[]> = {
  supplier: [...supplierCategories],
  transporter: [...transporterCategories],
  transporters: [...transporterCategories],
  haulier: [...transporterCategories],
  hauliers: [...transporterCategories],
  finance: [...financeCategories],
  financiers: [...financeCategories],
  investor: investorClasses.map((item) => item.id),
  investors: investorClasses.map((item) => item.id),
};

export function getRegistryCategoryOptions(registryType?: string, records: any[] = []): string[] {
  const normalized = (registryType || '').toLowerCase();
  const canonicalOptions = registryCategoryOptions[normalized] || [];
  const extractedOptions = records.flatMap((record) => extractRegistryCategories(record));

  return Array.from(new Set([...canonicalOptions, ...extractedOptions]))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}
