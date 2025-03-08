export const isSuccessResponse = (statusCode: number): boolean => {
  return statusCode >= 200 && statusCode <= 299;
};
