export const parseSubscriptionsData = (subscriptions: any[]) => {
  return subscriptions.reduce((acc, current) => {
    return [...acc, { key: current.id, text: current.displayName }];
  }, []);
};
