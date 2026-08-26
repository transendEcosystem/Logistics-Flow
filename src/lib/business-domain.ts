export type PrimaryBusinessDomain = 'supplier' | 'transporter' | 'lender';
export type MarketPosition = 'buyer' | 'provider';
export type MarketId = 'supplier' | 'transporter' | 'warehouse' | 'finance' | 'loads' | 'buy-sell';

const legacyDomainMap: Record<string, PrimaryBusinessDomain> = {
  supplier: 'supplier',
  vendor: 'supplier',
  transporter: 'transporter',
  lender: 'lender',
  finance: 'lender',
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
      (domain === 'lender' && mall === 'finance');
  }

  if (domain === 'lender') return false;
  return true;
}

export const domainLabels: Record<PrimaryBusinessDomain, string> = {
  supplier: 'Supplier',
  transporter: 'Transporter',
  lender: 'Lender',
};
