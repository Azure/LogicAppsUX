import Constants from '../../common/constants';
import type { Settings } from '../actions/bjsworkflow/settings';

export function hasSecureOutputs(nodeType: string, allSettings: Settings | undefined): boolean {
  const { secureInputs, secureOutputs } = allSettings || {};
  return isSecureOutputsLinkedToInputs(nodeType) ? !!secureInputs?.value : !!secureOutputs?.value;
}

export function isSecureOutputsLinkedToInputs(nodeType: string): boolean {
  switch (nodeType.toLowerCase()) {
    case Constants.NODE.TYPE.COMPOSE:
    case Constants.NODE.TYPE.PARSE_JSON:
    case Constants.NODE.TYPE.RESPONSE:
      return true;

    default:
      return false;
  }
}
