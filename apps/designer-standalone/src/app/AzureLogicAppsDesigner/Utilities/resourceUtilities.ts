import { format } from '@microsoft/utils-logic-apps';

export const validateResourceId = (resourceId: string): string => {
  if (!resourceId) {
    throw new Error(format('Invalid Resource ID', resourceId));
  }

  return resourceId.startsWith('/') ? resourceId : `/${resourceId}`;
};
