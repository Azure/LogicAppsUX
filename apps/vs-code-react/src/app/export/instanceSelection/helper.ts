import type { IIse, IRegion, ISubscription, IDropDownOption } from '../../../run-service';

export const parseSubscriptionsData = (subscriptionsData: { subscriptions: Array<ISubscription> }): Array<IDropDownOption> => {
  const { subscriptions } = subscriptionsData;

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
    return { key: `region:${region.name}`, text: `${region.displayName} (${region.count})`, data: region.name };
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
