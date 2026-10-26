import { ExperimentationService } from './experimentation';

export const EXP_FLAGS = {
  ENABLE_APIM_GEN_AI_GATEWAY: 'enable-apim-gen-ai-gateway',
  ENABLE_OPERATION_SETTING_DEFAULTS: 'enable-operation-setting-defaults',
};

export async function enableAPIMGatewayConnection(): Promise<boolean> {
  return ExperimentationService().isFeatureEnabled(EXP_FLAGS.ENABLE_APIM_GEN_AI_GATEWAY);
}

/**
 * Gates the backend-driven operation setting defaults feature. This is a backend-dependent
 * feature (it calls new settingDefaults routes), so it stays off by default and is enabled
 * ring-by-ring as the backend rolls out. Doubles as a kill switch for the merge behavior.
 */
export async function enableOperationSettingDefaults(): Promise<boolean> {
  return ExperimentationService().isFeatureEnabled(EXP_FLAGS.ENABLE_OPERATION_SETTING_DEFAULTS);
}
