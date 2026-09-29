export type IntegrationProvider = 
  | 'accounting' 
  | 'credit_bureau' 
  | 'open_banking' 
  | 'cipc_registry' 
  | 'natis_vehicle_registry' 
  | 'sanctions_pep' 
  | 'custom_api';

export type IntegrationRunStatus = 'queued' | 'sent' | 'succeeded' | 'failed';

export interface IntegrationRunRecord {
  id?: string;
  provider: IntegrationProvider;
  operation: string;
  status: IntegrationRunStatus;
  idempotencyKey: string;
  externalReference?: string;
  requestData?: Record<string, unknown>;
  responseData?: Record<string, unknown>;
  responseStatus?: number;
  errorCode?: string;
  errorMessage?: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  initiatedBy: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export function isIntegrationProvider(value: unknown): value is IntegrationProvider {
  return [
    'accounting', 
    'credit_bureau', 
    'open_banking', 
    'cipc_registry', 
    'natis_vehicle_registry', 
    'sanctions_pep', 
    'custom_api'
  ].includes(String(value));
}

export function isIntegrationRunStatus(value: unknown): value is IntegrationRunStatus {
  return value === 'queued' || value === 'sent' || value === 'succeeded' || value === 'failed';
}
