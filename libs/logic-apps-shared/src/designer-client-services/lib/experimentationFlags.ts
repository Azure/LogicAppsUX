import { ExperimentationService } from './experimentation';

export const EXP_FLAGS = {
  ENABLE_PARSE_DOCUMENT_WITH_METADATA: 'enable-parse-document-with-metadata',
  ENABLE_ACA_SESSION: 'enable-aca-session',
  ENABLE_FOUNDRY_SERVICE_CONNECTION: 'enable-foundry-service-connection',
  ENABLE_NESTED_AGENT: 'enable-nested-agent',
  ENABLE_DYNAMIC_CONNECTIONS: 'enable-dynamic-connections',
};

export async function enableParseDocumentWithMetadata(): Promise<boolean> {
  return ExperimentationService().isFeatureEnabled(EXP_FLAGS.ENABLE_PARSE_DOCUMENT_WITH_METADATA);
}

export async function enableACASession(): Promise<boolean> {
  return ExperimentationService().isFeatureEnabled(EXP_FLAGS.ENABLE_ACA_SESSION);
}

export async function enableFoundryServiceConnection(): Promise<boolean> {
  return ExperimentationService().isFeatureEnabled(EXP_FLAGS.ENABLE_FOUNDRY_SERVICE_CONNECTION);
}

export async function enableNestedAgent(): Promise<boolean> {
  return ExperimentationService().isFeatureEnabled(EXP_FLAGS.ENABLE_NESTED_AGENT);
}

export async function enableDynamicConnections(): Promise<boolean> {
  return ExperimentationService().isFeatureEnabled(EXP_FLAGS.ENABLE_DYNAMIC_CONNECTIONS);
}
