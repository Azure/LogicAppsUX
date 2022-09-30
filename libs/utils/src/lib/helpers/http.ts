export type HTTP_METHODS = typeof HTTP_METHODS[keyof typeof HTTP_METHODS];
export const HTTP_METHODS = {
  GET: 'GET',
  PUT: 'PUT',
  POST: 'POST',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const;
