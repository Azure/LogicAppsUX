import { workflowCodeType } from '../../../constants';

export function workflowCodeTypeForTelemetry(isCodeless: boolean | undefined): string | undefined {
  if (isCodeless === undefined) {
    return undefined;
  }
  return isCodeless ? workflowCodeType.codeless : workflowCodeType.codeful;
}
