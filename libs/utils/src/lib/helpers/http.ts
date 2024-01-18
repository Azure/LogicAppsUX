export type HTTP_METHODS = (typeof HTTP_METHODS)[keyof typeof HTTP_METHODS];
export const HTTP_METHODS = {
  GET: 'GET',
  PUT: 'PUT',
  POST: 'POST',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const;

export const parseErrorMessage = (error: any, defaultErrorMessage?: string): string =>
  error?.message ??
  error?.Message ??
  error?.error?.message ??
  error.content.message ??
  error?.responseText ??
  defaultErrorMessage ??
  'Unknown error';
