import type { IIse, ISubscription, IDropDownOption } from '../../../run-service';

export const parseSubscriptionsData = (subscriptionsData: { subscriptions: Array<ISubscription> }): Array<IDropDownOption> => {
  const { subscriptions } = subscriptionsData;

  return subscriptions.map((subscription: ISubscription) => {
    return { key: subscription.subscriptionId, text: subscription.subscriptionName };
  });
};

export const parseIseData = (iseData: { ise: Array<IIse> }): Array<IDropDownOption> => {
  const { ise } = iseData;
  return ise.map((iseInstance: IIse) => {
    return { key: iseInstance.id, text: iseInstance.iseName, data: iseInstance.location };
  });
};

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
