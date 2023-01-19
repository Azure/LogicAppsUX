export function pathCombine(url: string, path: string): string {
  let pathUrl: string;

  if (!url || !path) {
    pathUrl = url || path;
    return pathUrl;
  }

  return `${trimUrl(url)}/${trimUrl(path)}`;
}

export function getClientRequestIdFromHeaders(headers: Headers | Record<string, string>): string {
  if (headers) {
    return headers instanceof Headers ? (headers.get('x-ms-client-request-id') as string) : (headers['x-ms-client-request-id'] as string);
  }

  return '';
}

export function trimUrl(url: string): string {
  let updatedUrl = url;
  if (updatedUrl[0] === '/') {
    updatedUrl = updatedUrl.substring(1, updatedUrl.length);
  }

  if (updatedUrl[updatedUrl.length - 1] === '/') {
    updatedUrl = updatedUrl.substring(0, updatedUrl.length - 1);
  }

  return updatedUrl;
}
