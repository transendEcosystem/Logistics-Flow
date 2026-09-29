export type LendingDocumentRequirement = {
  id: string;
  label: string;
  category: 'company' | 'person' | 'financial' | 'asset' | 'facility';
  required: boolean;
  appliesTo?: string[];
  uploadKey: string;
};

export const STANDARD_LENDING_DOCUMENT_REQUIREMENTS: LendingDocumentRequirement[] = [
  { id: 'cipc-certificate', label: 'CIPC certificate / founding statement', category: 'company', required: true, uploadKey: 'registrationDocUrl' },
  { id: 'primary-rsa-id', label: 'Primary applicant RSA ID or passport', category: 'person', required: true, uploadKey: 'userIdUrl' },
  { id: 'director-rsa-id', label: 'RSA ID or passport for each director', category: 'person', required: true, uploadKey: 'directors[].rsaIdUrl' },
  { id: 'director-proof-address', label: 'Proof of address for each director', category: 'person', required: true, uploadKey: 'directors[].proofOfAddressUrl' },
  { id: 'shareholder-rsa-id', label: 'RSA ID or passport for each shareholder', category: 'person', required: true, uploadKey: 'shareholders[].rsaIdUrl' },
  { id: 'shareholder-proof-address', label: 'Proof of address for each shareholder', category: 'person', required: true, uploadKey: 'shareholders[].proofOfAddressUrl' },
  { id: 'employee-rsa-id', label: 'RSA ID or passport for each relevant employee', category: 'person', required: false, uploadKey: 'employees[].rsaIdUrl' },
  { id: 'employee-proof-address', label: 'Proof of address for each relevant employee', category: 'person', required: false, uploadKey: 'employees[].proofOfAddressUrl' },
  { id: 'bank-statements', label: 'Last 3 months bank statements', category: 'financial', required: true, uploadKey: 'bankStatementUrls[]' },
  { id: 'management-accounts', label: 'Latest management accounts', category: 'financial', required: true, uploadKey: 'managementAccountsUrl' },
  { id: 'annual-financial-statements', label: 'Latest annual financial statements (AFS)', category: 'financial', required: true, uploadKey: 'afsDocUrl' },
  { id: 'vehicle-rc1', label: 'Vehicle RC1 certificate', category: 'asset', required: true, appliesTo: ['vehicle', 'asset-finance'], uploadKey: 'assetDocuments[].rc1Url' },
  { id: 'vehicle-license-disk', label: 'Vehicle license disk', category: 'asset', required: true, appliesTo: ['vehicle', 'asset-finance'], uploadKey: 'assetDocuments[].licenseDiskUrl' },
  { id: 'vehicle-proforma-invoice', label: 'Vehicle pro forma invoice', category: 'asset', required: true, appliesTo: ['vehicle', 'asset-finance'], uploadKey: 'assetDocuments[].proformaInvoiceUrl' },
];

export function getStandardLendingDocumentRequirements(facilityType?: string): LendingDocumentRequirement[] {
  const normalizedType = String(facilityType || '').toLowerCase();
  return STANDARD_LENDING_DOCUMENT_REQUIREMENTS.filter((requirement) => !requirement.appliesTo || requirement.appliesTo.some((value) => normalizedType.includes(value)));
}