import { ExperimentationService } from './experimentation';

export const EXP_FLAGS = {
  ENABLE_PARSE_DOCUMENT_WITH_METADATA: 'enable-parse-document-with-metadata',
  ENABLE_APIM_GEN_AI_GATEWAY: 'enable-apim-gen-ai-gateway',
};

export async function enableParseDocumentWithMetadata(): Promise<boolean> {
  return ExperimentationService().isFeatureEnabled(EXP_FLAGS.ENABLE_PARSE_DOCUMENT_WITH_METADATA);
}

export async function enableAPIMGatewayConnection(): Promise<boolean> {
  return ExperimentationService().isFeatureEnabled(EXP_FLAGS.ENABLE_APIM_GEN_AI_GATEWAY);
}
