import { ExperimentationService } from './experimentation';

export const EXP_FLAGS = {
  ENABLE_APIM_GEN_AI_GATEWAY: 'enable-apim-gen-ai-gateway',
  ENABLE_CODE_INTERPRETER_CONSUMPTION: 'enable-code-interpreter-consumption',
};

export async function enableAPIMGatewayConnection(): Promise<boolean> {
  return ExperimentationService().isFeatureEnabled(EXP_FLAGS.ENABLE_APIM_GEN_AI_GATEWAY);
}

export async function enableCodeInterpreterConsumption(): Promise<boolean> {
  return ExperimentationService().isFeatureEnabled(EXP_FLAGS.ENABLE_CODE_INTERPRETER_CONSUMPTION);
}
