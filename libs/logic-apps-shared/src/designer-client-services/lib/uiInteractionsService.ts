import type { UiInteractionData } from '../../utils/src/lib/models/uiInteractionData';
import { AssertionErrorCode, AssertionException } from '../../utils/src';
import type { TopLevelDropdownMenuItem } from '../../utils/src/lib/models/topLevelDropdownMenuItem';

export interface IDesignerUiInteractionsService {
  getAddButtonMenuItems?: (previousNodeData: UiInteractionData | undefined) => TopLevelDropdownMenuItem[];
  getNodeContextMenuItems?: (nodeData: UiInteractionData | undefined) => TopLevelDropdownMenuItem[];
}
let service: IDesignerUiInteractionsService;

export const InitUiInteractionsService = (uiInteractionsService: IDesignerUiInteractionsService): void => {
  service = uiInteractionsService;
};

export const UiInteractionsService = (): IDesignerUiInteractionsService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'UiInteractionsService needs to be initialized before using');
  }

  return service;
};

export const isUiInteractionsServiceEnabled = (): boolean => {
  return !!service;
};
