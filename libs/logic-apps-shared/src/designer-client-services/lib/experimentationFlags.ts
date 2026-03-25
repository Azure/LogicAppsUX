import { ExperimentationService } from './experimentation';

export const EXP_FLAGS = {
  ENABLE_APIM_GEN_AI_GATEWAY: 'enable-apim-gen-ai-gateway',
  ENABLE_CODE_INTERPRETER_CONSUMPTION: 'enable-code-interpreter-consumption',
  ENABLE_CODE_INTERPRETER_STANDARD: 'enable-code-interpreter-standard',
};

export async function enableAPIMGatewayConnection(): Promise<boolean> {
  return ExperimentationService().isFeatureEnabled(EXP_FLAGS.ENABLE_APIM_GEN_AI_GATEWAY);
}

export async function enableCodeInterpreterConsumption(): Promise<boolean> {
  return ExperimentationService().isFeatureEnabled(EXP_FLAGS.ENABLE_CODE_INTERPRETER_CONSUMPTION);
}

export async function enableCodeInterpreterStandard(): Promise<boolean> {
  return ExperimentationService().isFeatureEnabled(EXP_FLAGS.ENABLE_CODE_INTERPRETER_STANDARD);
}
