import type { IntegrationProvider } from './integration-run';

export interface IntegrationCredentialsReference {
  secretRef: string;
  authType: 'api_key' | 'oauth2' | 'basic' | 'service_account';
}

export interface IntegrationProviderConfig {
  id?: string;
  provider: IntegrationProvider;
  displayName: string;
  baseUrl: string;
  enabled: boolean;
  credentials: IntegrationCredentialsReference;
  createdAt?: string;
  updatedAt?: string;
  updatedBy: string;
}

export interface IntegrationRequestContext {
  idempotencyKey: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export interface IntegrationAdapterRequest<TPayload = Record<string, unknown>> {
  operation: string;
  payload: TPayload;
  context: IntegrationRequestContext;
}

export interface IntegrationAdapterResponse<TPayload = Record<string, unknown>> {
  externalReference?: string;
  responseStatus: number;
  payload?: TPayload;
}

export interface IntegrationProviderAdapter {
  readonly provider: IntegrationProvider;
  send<TRequest, TResponse>(request: IntegrationAdapterRequest<TRequest>): Promise<IntegrationAdapterResponse<TResponse>>;
}

export function containsRawCredential(payload: Record<string, unknown>): boolean {
  return ['secret', 'apiKey', 'api_key', 'accessToken', 'clientSecret', 'privateKey', 'password'].some((key) => Object.prototype.hasOwnProperty.call(payload, key));
}
