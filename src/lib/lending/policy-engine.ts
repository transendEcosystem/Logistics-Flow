export interface AgreementPolicyRule {
  id: string;
  label: string;
  agreementType: string;
  maxAmount?: number;
  maxTermMonths?: number;
  allowedProvinces?: string[];
  allowedCities?: string[];
}

export interface LendingPolicyConfig {
  agreementRules?: AgreementPolicyRule[];
}

export interface AgreementPolicySubject {
  type?: string;
  totalAdvanced?: number;
  numberOfInstallments?: number;
  province?: string;
  city?: string;
}

export const DEFAULT_AGREEMENT_POLICY_RULES: AgreementPolicyRule[] = [
  {
    id: 'loan-working-capital-default',
    label: 'Loan / Working Capital default authority',
    agreementType: 'loan-pv-term',
    maxAmount: 100000,
    maxTermMonths: 24,
    allowedProvinces: ['Western Cape', 'Western Province'],
    allowedCities: ['Beaufort West', 'Baufortwest Wes'],
  },
];

function normalize(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function matchesList(value: unknown, allowedValues?: string[]) {
  if (!allowedValues?.length) return true;
  const normalizedValue = normalize(value);
  if (!normalizedValue) return false;
  return allowedValues.some((allowedValue) => normalize(allowedValue) === normalizedValue);
}

export function getAgreementPolicyRules(config: LendingPolicyConfig = {}) {
  return Array.isArray(config.agreementRules) && config.agreementRules.length > 0
    ? config.agreementRules
    : DEFAULT_AGREEMENT_POLICY_RULES;
}

export function validateAgreementAgainstPolicies(agreement: Record<string, any>, config: LendingPolicyConfig = {}) {
  const rules = getAgreementPolicyRules(config).filter((rule) => normalize(rule.agreementType) === normalize(agreement.type));
  if (rules.length === 0) return [];

  const matchingTerritoryRule = rules.find((rule) => matchesList(agreement.province, rule.allowedProvinces) && matchesList(agreement.city, rule.allowedCities));
  const rule = matchingTerritoryRule || rules[0];
  const violations: string[] = [];
  const amount = Number(agreement.totalAdvanced || 0);
  const termMonths = Number(agreement.numberOfInstallments || 0);

  if (rule.maxAmount !== undefined && amount > Number(rule.maxAmount)) {
    violations.push(`${rule.label}: amount ${amount} exceeds maximum ${rule.maxAmount}.`);
  }
  if (rule.maxTermMonths !== undefined && termMonths > Number(rule.maxTermMonths)) {
    violations.push(`${rule.label}: term ${termMonths} months exceeds maximum ${rule.maxTermMonths} months.`);
  }
  if (rule.allowedProvinces?.length && !matchesList(agreement.province, rule.allowedProvinces)) {
    violations.push(`${rule.label}: province must be one of ${rule.allowedProvinces.join(', ')}.`);
  }
  if (rule.allowedCities?.length && !matchesList(agreement.city, rule.allowedCities)) {
    violations.push(`${rule.label}: city must be one of ${rule.allowedCities.join(', ')}.`);
  }

  return violations;
}

export function toAgreementPolicySubject(input: Record<string, any>): AgreementPolicySubject {
  return {
    type: input.type || input.facilityAgreementType || input.agreementType,
    totalAdvanced: Number(input.totalAdvanced ?? input.amountRequested ?? input.agreementFacilityLimit ?? 0),
    numberOfInstallments: Number(input.numberOfInstallments ?? input.termMonths ?? 0),
    province: input.province || input.workProvince || input.workAddress?.province,
    city: input.city || input.workCity || input.workAddress?.city,
  };
}
