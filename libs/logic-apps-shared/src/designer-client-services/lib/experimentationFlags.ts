import { ExperimentationService } from './experimentation';

export const EXP_FLAGS = {
  ENABLE_PARSE_DOCUMENT_WITH_METADATA: 'enable-parse-document-with-metadata',
  HIDE_AGENT_REQUEST_TRIGGER_CONSUMPTION: 'hide-agent-request-trigger-consumption',
};

export async function enableParseDocumentWithMetadata(): Promise<boolean> {
  return ExperimentationService().isFeatureEnabled(EXP_FLAGS.ENABLE_PARSE_DOCUMENT_WITH_METADATA);
}

export async function hideAgentRequestTriggerConsumption(): Promise<boolean> {
  return ExperimentationService().isFeatureEnabled(EXP_FLAGS.HIDE_AGENT_REQUEST_TRIGGER_CONSUMPTION);
}
