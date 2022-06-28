export const parseSubscriptionsData = (subscriptionsData: { subscriptions: any }) => {
  const { subscriptions } = subscriptionsData;
  return subscriptions.reduce((acc: any, current: { id: any; displayName: any }) => {
    return [...acc, { key: current.id, text: current.displayName }];
  }, []);
};
