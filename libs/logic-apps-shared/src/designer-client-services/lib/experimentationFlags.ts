import { ExperimentationService } from './experimentation';

export const EXP_FLAGS = {
  ENABLE_PARSE_DOCUMENT_WITH_METADATA: 'enable-parse-document-with-metadata',
  ENABLE_ACA_SESSION: 'enable-aca-session',
};

export async function enableParseDocumentWithMetadata(): Promise<boolean> {
  return ExperimentationService().isFeatureEnabled(EXP_FLAGS.ENABLE_PARSE_DOCUMENT_WITH_METADATA);
}

export async function enableACASession(): Promise<boolean> {
  return ExperimentationService().isFeatureEnabled(EXP_FLAGS.ENABLE_ACA_SESSION);
}
