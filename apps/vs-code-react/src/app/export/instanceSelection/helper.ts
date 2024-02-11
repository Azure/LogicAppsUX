import type { IIse, IRegion, ISubscription, IDropDownOption } from '../../../run-service';

/**
 * Parse the subscriptions list as dropdown options.
 * @param {Array<ISubscription>} subscriptions - List pf subscriptions.
 * @returns {Array<IDropDownOption>} List of subscriptions as dropdown opton.
 */
export const parseSubscriptionsList = (subscriptions: Array<ISubscription>): Array<IDropDownOption> => {
  return subscriptions.map((subscription: ISubscription) => {
    return { key: subscription.subscriptionId, text: subscription.subscriptionName };
  });
};

export const parseIseData = (iseData: { ise: Array<IIse> }): Array<IDropDownOption> => {
  return iseData.ise.map((iseInstance: IIse) => {
    return { key: `ise:${iseInstance.id}`, text: iseInstance.iseName, data: iseInstance.location };
  });
};

export function parseRegionData(regionData: Array<IRegion>): Array<IDropDownOption> {
  return regionData.map((region: IRegion) => {
    return { key: `region:${region.name}`, text: `${region.displayName}`, data: region.name };
  });
}

export const getDropdownPlaceholder = (
  isLoading: boolean,
  itemsLength: number,
  defaultText: string,
  emptyText: string,
  loadingText: string
): string => {
  if (isLoading) {
    return loadingText;
  }
  return itemsLength ? defaultText : emptyText;
};
