import { DocumentBlock, GeneratedDocumentPack } from './document-templates';
import { formatLongDate } from './loan-pv-calculations';

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function multiline(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br />');
}

function renderBlock(block: DocumentBlock): string {
  switch (block.kind) {
    case 'heading':
      return `<h2 class="doc-heading">${escapeHtml(block.text)}</h2>`;
    case 'paragraph':
      return `<p>${multiline(block.text)}</p>`;
    case 'list':
      return `<div class="doc-list">${block.items
        .map((item, index) => `<div class="doc-list-row"><span class="doc-list-num">${escapeHtml(block.numbering?.[index] || `${index + 1}.`)}</span><span>${multiline(item)}</span></div>`)
        .join('')}</div>`;
    case 'keyValueTable':
      return `<table class="doc-table"><tbody>${block.rows
        .map((row) => `<tr><th>${multiline(row.label)}</th><td>${multiline(row.value)}</td></tr>`)
        .join('')}</tbody></table>`;
    case 'table':
      return `<table class="doc-table"><thead><tr>${block.columns
        .map((column) => `<th>${escapeHtml(column)}</th>`)
        .join('')}</tr></thead><tbody>${block.rows
        .map((row) => `<tr>${row.map((cell) => `<td>${multiline(cell)}</td>`).join('')}</tr>`)
        .join('')}</tbody></table>`;
    case 'acceptance':
      return `<div class="doc-acceptance"><div class="doc-acceptance-title">${escapeHtml(block.title)}</div>${block.body
        .map((line) => (line ? `<p>${multiline(line)}</p>` : '<div class="doc-sign-line"></div>'))
        .join('')}</div>`;
    case 'signatureBlock':
      return `<div class="doc-signature"><div class="doc-signature-title">${escapeHtml(block.title)}</div>${block.fields
        .map((field) => `<p>${multiline(field)}</p>`)
        .join('')}</div>`;
    case 'spacer':
      return '<div class="doc-spacer"></div>';
    default:
      return '';
  }
}

export function renderDocumentPackHtml(pack: GeneratedDocumentPack): string {
  const { branding, recipient } = pack;

  const letterhead = (sectionTitle: string) => `
    <header class="doc-letterhead">
      <div class="doc-letterhead-top">
        <img src="${escapeHtml(branding.logoUrl)}" alt="${escapeHtml(branding.companyName)}" class="doc-logo" />
        <div class="doc-company">
          <div class="doc-company-name">${escapeHtml(branding.companyName)}</div>
          <div class="doc-company-meta">Reg ${escapeHtml(branding.registrationNumber)}</div>
          <div class="doc-company-meta">${branding.addressLines.map(escapeHtml).join(', ')}</div>
          <div class="doc-company-meta">${escapeHtml(branding.contactPhone)} &middot; ${escapeHtml(branding.contactEmail)}</div>
        </div>
      </div>
      <div class="doc-refbar">
        <div><span class="doc-label">Our ref</span> <strong>${escapeHtml(pack.trackingRef)}</strong></div>
        <div><span class="doc-label">Date</span> ${escapeHtml(formatLongDate(pack.documentDate))}</div>
        <div><span class="doc-label">Document</span> ${escapeHtml(sectionTitle)}</div>
      </div>
      <div class="doc-recipient">
        <div class="doc-label">Recipient</div>
        <div><strong>${escapeHtml(recipient.name)}</strong></div>
        <div>Reg ${escapeHtml(recipient.registrationNumber)}</div>
        ${recipient.addressLines.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}
        <div>Attention: ${escapeHtml(recipient.attention)}</div>
      </div>
    </header>`;

  const footer = (index: number, total: number) => `
    <footer class="doc-footer">
      <div>${escapeHtml(branding.companyName)} &middot; Reg ${escapeHtml(branding.registrationNumber)} &middot; ${escapeHtml(branding.websiteUrl)}</div>
      <div>Ref ${escapeHtml(pack.trackingRef)} &middot; Page ${index} of ${total} &middot; Client initial: ______</div>
    </footer>`;

  const pages = pack.sections
    .map((section, index) => `
      <section class="doc-page">
        ${letterhead(section.title)}
        <main class="doc-body">${section.blocks.map(renderBlock).join('')}</main>
        ${footer(index + 1, pack.sections.length)}
      </section>`)
    .join('');

  return `<!doctype html>
<html lang="en-ZA"><head><meta charset="utf-8" />
<title>${escapeHtml(pack.trackingRef)} – ${escapeHtml(recipient.name)}</title>
<style>
  :root { --ink:#0f172a; --muted:#64748b; --line:#cbd5e1; --accent:#166534; }
  * { box-sizing:border-box; }
  body { margin:0; background:#e2e8f0; font-family:Calibri,'Segoe UI',sans-serif; color:var(--ink); font-size:11pt; line-height:1.5; }
  .doc-page { background:#fff; width:210mm; min-height:297mm; margin:12mm auto; padding:16mm 18mm; display:flex; flex-direction:column; box-shadow:0 2px 12px rgba(15,23,42,.14); }
  .doc-letterhead { border-bottom:2px solid var(--accent); padding-bottom:8px; }
  .doc-letterhead-top { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; }
  .doc-logo { height:52px; object-fit:contain; }
  .doc-company { text-align:right; }
  .doc-company-name { font-weight:700; font-size:12pt; }
  .doc-company-meta { color:var(--muted); font-size:8.5pt; }
  .doc-refbar { display:flex; gap:24px; flex-wrap:wrap; margin-top:10px; padding:6px 0; border-top:1px solid var(--line); font-size:9pt; }
  .doc-label { color:var(--muted); text-transform:uppercase; font-size:7.5pt; letter-spacing:.08em; font-weight:700; }
  .doc-recipient { margin-top:10px; font-size:9.5pt; }
  .doc-body { flex:1; padding-top:14px; }
  .doc-heading { font-size:13pt; font-weight:700; text-transform:uppercase; letter-spacing:.02em; margin:0 0 12px; }
  .doc-body p { margin:0 0 10px; text-align:justify; }
  .doc-spacer { height:18px; }
  .doc-list { margin:0 0 12px; }
  .doc-list-row { display:flex; gap:10px; margin-bottom:8px; text-align:justify; }
  .doc-list-num { flex:0 0 44px; font-weight:600; }
  .doc-table { width:100%; border-collapse:collapse; margin:0 0 14px; font-size:9.5pt; }
  .doc-table th, .doc-table td { border:1px solid var(--line); padding:6px 8px; vertical-align:top; text-align:left; }
  .doc-table th { background:#f1f5f9; font-weight:600; width:34%; }
  .doc-table thead th { width:auto; background:#e2e8f0; }
  .doc-acceptance, .doc-signature { border:1px solid var(--line); padding:12px 14px; margin:14px 0; background:#f8fafc; }
  .doc-acceptance-title, .doc-signature-title { font-weight:700; text-transform:uppercase; font-size:9pt; letter-spacing:.06em; margin-bottom:8px; color:var(--accent); }
  .doc-acceptance p, .doc-signature p { margin:0 0 6px; font-size:9.5pt; text-align:left; }
  .doc-sign-line { border-bottom:1px solid var(--ink); height:22px; margin:10px 0 4px; max-width:70%; }
  .doc-footer { border-top:1px solid var(--line); padding-top:6px; margin-top:14px; display:flex; justify-content:space-between; gap:16px; color:var(--muted); font-size:8pt; }
  @media print { body { background:#fff; } .doc-page { margin:0; box-shadow:none; page-break-after:always; width:auto; min-height:auto; } }
</style></head>
<body>${pages}</body></html>`;
}
