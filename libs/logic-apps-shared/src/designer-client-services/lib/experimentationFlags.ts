import { ExperimentationService } from './experimentation';

export const EXP_FLAGS = {
  ENABLE_APIM_GEN_AI_GATEWAY: 'enable-apim-gen-ai-gateway',
};

export async function enableAPIMGatewayConnection(): Promise<boolean> {
  return ExperimentationService().isFeatureEnabled(EXP_FLAGS.ENABLE_APIM_GEN_AI_GATEWAY);
}
