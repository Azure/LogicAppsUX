import { ExperimentationService } from './experimentation';

export const EXP_FLAGS = {
  ENABLE_PARSE_DOCUMENT_WITH_METADATA: 'enable-parse-document-with-metadata',
  ENABLE_AGENT_CONSUMPTION: 'enable-agentloop-consumption',
  ENABLE_MANUAL_ENTRY_IN_AGENT_CONNECTOR: 'enable-manual-entry-in-agent-connector',
};

export async function enableParseDocumentWithMetadata(): Promise<boolean> {
  return ExperimentationService().isFeatureEnabled(EXP_FLAGS.ENABLE_PARSE_DOCUMENT_WITH_METADATA);
}

export async function enableAgentConsumption(): Promise<boolean> {
  return ExperimentationService().isFeatureEnabled(EXP_FLAGS.ENABLE_AGENT_CONSUMPTION);
}

export async function enableManualEntryInAgentConnector(): Promise<boolean> {
  return ExperimentationService().isFeatureEnabled(EXP_FLAGS.ENABLE_MANUAL_ENTRY_IN_AGENT_CONNECTOR);
}
