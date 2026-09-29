export type PrimaryBusinessDomain = 'supplier' | 'transporter' | 'broker' | 'warehouseManager' | 'lender' | 'dealer' | 'distributor';
export type MarketPosition = 'buyer' | 'provider';
export type MarketId = 'supplier' | 'transporter' | 'warehouse' | 'finance' | 'loads' | 'buy-sell' | 'distribution';

const legacyDomainMap: Record<string, PrimaryBusinessDomain> = {
  supplier: 'supplier',
  vendor: 'supplier',
  transporter: 'transporter',
  broker: 'broker',
  warehousemanager: 'warehouseManager',
  lender: 'lender',
  finance: 'lender',
  dealer: 'dealer',
  distributor: 'distributor',
};

export function getPrimaryBusinessDomain(source: any): PrimaryBusinessDomain | null {
  const candidates = [
    source?.companyData?.primaryBusinessDomain,
    source?.primaryBusinessDomain,
    source?.companyData?.declaredRole,
    source?.declaredRole,
    source?.companyData?.shopType,
    source?.shopType,
    source?.declaredPosition,
  ];

  for (const candidate of candidates) {
    const normalizedCandidate = String(candidate || '').toLowerCase();
    if (legacyDomainMap[normalizedCandidate]) return legacyDomainMap[normalizedCandidate];
  }

  return null;
}

export function canUseMarketPosition(domain: PrimaryBusinessDomain | null, mall: MarketId, position: MarketPosition): boolean {
  if (!domain) return false;
  if (position === 'provider') {
    return (domain === 'supplier' && mall === 'supplier') ||
      (domain === 'transporter' && mall === 'transporter') ||
      (domain === 'broker' && mall === 'loads') ||
      (domain === 'warehouseManager' && mall === 'warehouse') ||
      (domain === 'lender' && mall === 'finance') ||
      (domain === 'dealer' && mall === 'buy-sell') ||
      (domain === 'distributor' && mall === 'distribution');
  }

  if (domain === 'lender') return false;
  return true;
}

export const domainLabels: Record<PrimaryBusinessDomain, string> = {
  supplier: 'Vendor',
  transporter: 'Transporter',
  broker: 'Transport Broker',
  warehouseManager: 'Warehouse Manager',
  lender: 'Lender',
  dealer: 'Auto Dealer',
  distributor: 'Distributor',
};
