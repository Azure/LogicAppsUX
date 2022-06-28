import type { ISubscription, ISubscriptionsData } from '../../../run-service';

export const parseSubscriptionsData = (subscriptionsData: { subscriptions: Array<ISubscription> }): Array<ISubscriptionsData> => {
  const { subscriptions } = subscriptionsData;
  return subscriptions.reduce((acc: any, current: ISubscription) => {
    return [...acc, { key: current.subscriptionId, text: current.subscriptionName }];
  }, []);
};
