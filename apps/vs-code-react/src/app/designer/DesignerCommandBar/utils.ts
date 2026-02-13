export const getRelativeTimeString = (
  savedTime: Date,
  messages: {
    secondsAgo: string;
    minutesAgo: string;
    oneHourAgo: string;
    hoursAgo: (values?: Record<string, any>) => string;
  }
) => {
  const now = new Date();
  const diffMs = now.getTime() - savedTime.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours > 0) {
    return diffHours === 1 ? messages.oneHourAgo : messages.hoursAgo({ count: diffHours });
  }
  if (diffMinutes > 0) {
    return messages.minutesAgo;
  }
  return messages.secondsAgo;
};
