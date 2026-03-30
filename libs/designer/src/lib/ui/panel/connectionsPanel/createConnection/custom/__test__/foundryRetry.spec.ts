import { describe, expect, it } from 'vitest';
import { isFoundryAuthError } from '../useCognitiveService';

describe('isFoundryAuthError', () => {
  it('returns false for null/undefined/non-object values', () => {
    expect(isFoundryAuthError(null)).toBe(false);
    expect(isFoundryAuthError(undefined)).toBe(false);
    expect(isFoundryAuthError('string error')).toBe(false);
    expect(isFoundryAuthError(42)).toBe(false);
  });

  it.each([
    { property: 'httpStatusCode', status: 401 },
    { property: 'httpStatusCode', status: 403 },
    { property: 'status', status: 401 },
    { property: 'statusCode', status: 403 },
  ])('detects $status via $property', ({ property, status }) => {
    expect(isFoundryAuthError({ [property]: status })).toBe(true);
  });

  it('returns false for non-auth status codes', () => {
    expect(isFoundryAuthError({ httpStatusCode: 400 })).toBe(false);
    expect(isFoundryAuthError({ httpStatusCode: 404 })).toBe(false);
    expect(isFoundryAuthError({ httpStatusCode: 500 })).toBe(false);
  });

  it('detects "Unauthorized" in error code', () => {
    expect(isFoundryAuthError({ code: 'Unauthorized' })).toBe(true);
    expect(isFoundryAuthError({ Code: 'Unauthorized' })).toBe(true);
  });

  it('detects "PermissionDenied" in error code', () => {
    expect(isFoundryAuthError({ code: 'PermissionDenied' })).toBe(true);
  });

  it('detects "Forbidden" in error message', () => {
    expect(isFoundryAuthError({ message: 'Encountered an error (Forbidden) from extensions API.' })).toBe(true);
  });

  it('detects "PermissionDenied" in error message', () => {
    expect(
      isFoundryAuthError({
        message: 'The principal lacks the required data action Microsoft.CognitiveServices/accounts/AIServices/deployments/read',
        code: 'PermissionDenied',
      })
    ).toBe(true);
  });

  it('returns false for generic errors without auth indicators', () => {
    expect(isFoundryAuthError({ message: 'Network timeout' })).toBe(false);
    expect(isFoundryAuthError({ code: 'InternalError', message: 'Something went wrong' })).toBe(false);
    expect(isFoundryAuthError({})).toBe(false);
  });

  it('handles real-world HAR error shapes', () => {
    // Shape from HAR: proxy 400 response
    expect(
      isFoundryAuthError({
        Code: 'Unauthorized',
        Message: 'Encountered an error (Forbidden) from extensions API.',
      })
    ).toBe(true);

    // Shape from HAR: proxy 401 response
    expect(
      isFoundryAuthError({
        code: 'PermissionDenied',
        message: 'Principal does not have access to API/Operation.',
      })
    ).toBe(true);
  });
});
