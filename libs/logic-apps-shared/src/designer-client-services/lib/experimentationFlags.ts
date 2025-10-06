import { ExperimentationService } from './experimentation';

export const EXP_FLAGS = {
  ENABLE_PARSE_DOCUMENT_WITH_METADATA: 'enable-parse-document-with-metadata',
  ENABLE_AGENTLOOP_CONSUMPTION: 'enable-agentloop-consumption',
  HIDE_AGENT_REQUEST_TRIGGER: 'hide-agent-request-trigger',
};

export async function enableParseDocumentWithMetadata(): Promise<boolean> {
  return ExperimentationService().isFeatureEnabled(EXP_FLAGS.ENABLE_PARSE_DOCUMENT_WITH_METADATA);
}

export async function hideAgentRequestTrigger(): Promise<boolean> {
  return ExperimentationService().isFeatureEnabled(EXP_FLAGS.HIDE_AGENT_REQUEST_TRIGGER);
}
