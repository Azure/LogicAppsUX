export type HTTP_METHODS = (typeof HTTP_METHODS)[keyof typeof HTTP_METHODS];
export const HTTP_METHODS = {
  GET: 'GET',
  PUT: 'PUT',
  POST: 'POST',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const;

export const parseErrorMessage = (error: any, defaultErrorMessage?: string): string => {
  try {
    let message = error?.message ?? error?.Message ?? error?.error?.message ?? error?.content?.message ?? undefined;
    if (message) {
      return message;
    }

    message = error?.data?.error?.message;
    if (message) {
      return message;
    }

    // Response text needs to be parsed to get internal error message
    if (error?.responseText) {
      message = parseErrorMessage(JSON.parse(error.responseText), defaultErrorMessage);
    }

    return message ?? defaultErrorMessage ?? error ?? 'Unknown error';
  } catch (e) {
    return 'Could not parse error message.';
  }
};
