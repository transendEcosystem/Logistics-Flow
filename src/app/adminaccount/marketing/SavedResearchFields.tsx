import { Textarea } from '@/components/ui/textarea';

function label(key: string) {
  return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
}

function researchText(value: unknown, depth = 0): string {
  if (value === null || value === undefined || value === '') return '';
  if (Array.isArray(value)) {
    return value.map(entry => researchText(entry, depth)).filter(Boolean).join('\n\n');
  }
  if (typeof value === 'object') {
    return Object.entries(value).map(([key, entry]) => {
      const text = researchText(entry, depth + 1);
      return text ? `${'  '.repeat(depth)}${label(key)}:\n${text}` : '';
    }).filter(Boolean).join('\n\n');
  }
  return String(value);
}

export function SavedResearchFields({ record }: { record: Record<string, unknown> }) {
  const legacyFindings = Object.fromEntries(
    ['companyName', 'website', 'address', 'email', 'phone', 'marketingManager', 'operationsManager',
      'technicalManager', 'ceo', 'minedServiceWording', 'socialProfiles', 'siteMap', 'otherStaff',
      'sourceUrls', 'contactability', 'emailVerification']
      .filter(key => record[key] !== undefined)
      .map(key => [key, record[key]])
  );
  const sections = [
    ['Gap analysis findings', record.forensicFindings || (record.forensicAppliedAt ? legacyFindings : null)],
    ['Harvested website wording', record.contentCorpus],
    ['Services and capabilities', record.serviceProfileFindings || record.serviceProfile],
    ['Company description', record.shopProfile],
    ['Campaign suggestions', record.campaignAngles],
    ['Deep-dive findings and engagement strategy', record.commercialProfile],
  ].map(([title, value]) => ({ title: String(title), text: researchText(value) }));

  return (
    <section className="space-y-4">
      <h4 className="text-xs font-black uppercase tracking-widest text-primary">Saved research</h4>
      <p className="text-sm text-muted-foreground">
        These sections show the saved research in full. Update them using Gap Analysis, Harvest or Deep Dive;
        use Profile details to edit the technical wording without changing the source research.
      </p>
      {!record.forensicFindings && Boolean(record.forensicAppliedAt) && (
        <p className="text-sm text-muted-foreground">
          Older gap analyses show the extracted record fields. New saves also retain the full original response.
        </p>
      )}
      {sections.map(({ title, text }) => (
        <details key={title} open={Boolean(text)} className="rounded-lg border p-4">
          <summary className="cursor-pointer text-sm font-semibold">{title}{!text ? ' (not yet saved)' : ''}</summary>
          {text ? (
            <Textarea aria-label={title} readOnly value={text} className="mt-3 min-h-[220px] bg-muted/20" />
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No saved information for this section.</p>
          )}
        </details>
      ))}
    </section>
  );
}
