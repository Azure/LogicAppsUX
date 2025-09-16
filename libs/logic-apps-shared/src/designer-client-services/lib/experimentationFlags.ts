import { ExperimentationService } from './experimentation';

export const EXP_FLAGS = {
  ENABLE_PARSE_DOCUMENT_WITH_METADATA: 'enable-parse-document-with-metadata',
  ENABLE_ACA_SESSION: 'enable-aca-session',
  ENABLE_FOUNDRY_SERVICE_CONNECTION: 'enable-foundry-service-connection',
  ENABLE_NESTED_AGENT: 'enable-nested-agent',
  ENABLE_DYNAMIC_CONNECTIONS: 'enable-dynamic-connections',
  DISABLE_CHANNELS_AGENT_LOOP: 'disable-channels-agentloop',
  ENABLE_AGENTLOOP_STATEFUL: 'enable-agentloop-stateful',
  ENABLE_AGENTLOOP_CONSUMPTION: 'enable-agentloop-consumption',
};

export async function enableParseDocumentWithMetadata(): Promise<boolean> {
  return ExperimentationService().isFeatureEnabled(EXP_FLAGS.ENABLE_PARSE_DOCUMENT_WITH_METADATA);
}
