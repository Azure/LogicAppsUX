import type { IIse, IIseData, ISubscription, ISubscriptionsData } from '../../../run-service';

export const parseSubscriptionsData = (subscriptionsData: { subscriptions: Array<ISubscription> }): Array<ISubscriptionsData> => {
  const { subscriptions } = subscriptionsData;
  return subscriptions.reduce((acc: any, current: ISubscription) => {
    return [...acc, { key: current.subscriptionId, text: current.subscriptionName }];
  }, []);
};

export const parseIseData = (iseData: { ise: Array<IIse> }): Array<IIseData> => {
  const { ise } = iseData;
  return ise.reduce((acc: any, current: IIse) => {
    return [...acc, { key: current.id, text: current.iseName }];
  }, []);
};
