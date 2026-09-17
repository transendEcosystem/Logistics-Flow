export const ENGAGEMENT_CONTENT_TYPES = [
  { id: 'deep-dive-strategy', label: 'Deep Dive', shortLabel: 'DD' },
  { id: 'company-profile', label: 'Company Profile', shortLabel: 'CP' },
  { id: 'pitch', label: 'The Pitch', shortLabel: 'P' },
  { id: 'digital-handshake', label: 'Digital Handshake', shortLabel: 'DH' },
  { id: 'strategic-intro', label: 'Strategic Intro', shortLabel: 'SI' },
  { id: 'platform-dm', label: 'Platform DM Script', shortLabel: 'DM' },
  { id: 'incentive-handshake', label: 'Welcome Incentive', shortLabel: 'WI' },
  { id: 'tech-architecture', label: 'Tech Architecture', shortLabel: 'TA' },
  { id: 'revenue-model', label: 'Revenue Model', shortLabel: 'RM' },
  { id: 'offer', label: 'The Offer', shortLabel: 'O' },
  { id: 'framework', label: 'The Framework', shortLabel: 'FW' },
  { id: 'sales-intelligence', label: 'Sales Intelligence', shortLabel: 'AI' },
  { id: 'supplier-value-prop', label: 'Supplier Value Proposition', shortLabel: 'SV' },
  { id: 'transporter-value-prop', label: 'Transporter Value Proposition', shortLabel: 'TV' },
  { id: 'the-wedge', label: 'The Wedge', shortLabel: 'W' },
  { id: 'the-signal', label: 'The Signal', shortLabel: 'S' },
  { id: 'the-elite-filter', label: 'The Elite Filter', shortLabel: 'EF' },
  { id: 'the-break-up', label: 'The Break-Up', shortLabel: 'BU' },
  { id: 'follow-up', label: 'Follow-up', shortLabel: 'FU' },
  { id: 'call', label: 'Call', shortLabel: 'C' },
  { id: 'whatsapp', label: 'WhatsApp', shortLabel: 'WA' },
  { id: 'social-dm', label: 'Social DM', shortLabel: 'DM' },
  { id: 'manual', label: 'Manual Engagement', shortLabel: 'M' },
] as const;

export const CORE_OUTREACH_CONTENT_TYPES = ['deep-dive-strategy', 'company-profile', 'pitch'] as const;

export function normalizeEngagementContentType(value: unknown, subject?: unknown, channel?: unknown): string {
  const normalized = String(value || '').trim().toLowerCase().replace(/[_\s]+/g, '-');
  const aliases: Record<string, string> = {
    'deep-dive': 'deep-dive-strategy',
    deepdive: 'deep-dive-strategy',
    profile: 'company-profile',
    'the-pitch': 'pitch',
    handshake: 'digital-handshake',
    email: 'manual',
  };
  const direct = aliases[normalized] || normalized;
  if (ENGAGEMENT_CONTENT_TYPES.some(type => type.id === direct)) return direct;

  const searchable = `${String(subject || '')} ${String(value || '')}`.toLowerCase();
  if (searchable.includes('deep dive') || searchable.includes('deep-dive')) return 'deep-dive-strategy';
  if (searchable.includes('company profile')) return 'company-profile';
  if (searchable.includes('the pitch') || /\bpitch\b/.test(searchable)) return 'pitch';
  if (searchable.includes('digital handshake')) return 'digital-handshake';
  if (searchable.includes('tech architecture')) return 'tech-architecture';
  if (searchable.includes('revenue model')) return 'revenue-model';
  if (searchable.includes('the offer') || /\boffer\b/.test(searchable)) return 'offer';
  if (searchable.includes('follow-up') || searchable.includes('follow up')) return 'follow-up';

  const normalizedChannel = String(channel || '').trim().toLowerCase();
  if (normalizedChannel.includes('whatsapp')) return 'whatsapp';
  if (normalizedChannel.includes('social')) return 'social-dm';
  if (normalizedChannel.includes('call') || normalizedChannel.includes('phone')) return 'call';
  return searchable.trim() || normalizedChannel ? 'manual' : '';
}

export function engagementContentLabel(contentType: unknown): string {
  const normalized = normalizeEngagementContentType(contentType);
  return ENGAGEMENT_CONTENT_TYPES.find(type => type.id === normalized)?.label || 'Manual Engagement';
}
