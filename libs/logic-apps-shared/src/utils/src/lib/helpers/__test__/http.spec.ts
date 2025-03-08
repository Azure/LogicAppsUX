import { parseErrorMessage } from '../http';
import { describe, it, expect } from 'vitest';

const mockError = {
  message: 'Request failed with status code 400',
  name: 'AxiosError',
  stack: 'AxiosError: Request failed with status code 400',
  code: 'ERR_BAD_REQUEST',
  status: 400,
};

describe('parseErrorMessage', () => {
  it('Should return the same error message from error object when has a message property', () => {
    expect(parseErrorMessage(mockError)).toEqual(mockError.message);
  });

  it('Should return the same error message from error object when is inside data.error property', () => {
    expect(parseErrorMessage({ data: { error: mockError } })).toEqual(mockError.message);
  });

  it('Should return the same error message when error object is string and is inside responseText property', () => {
    const stringError = JSON.stringify(mockError);
    expect(parseErrorMessage({ responseText: stringError })).toEqual(mockError.message);
  });

  it('Should return the same error string when parameter is send as string', () => {
    expect(parseErrorMessage(mockError.message)).toEqual(mockError.message);
  });

  it('Should return Unknown error when parameter is undefined or null and there is no default error message', () => {
    expect(parseErrorMessage(undefined)).toEqual('Unknown error');
    expect(parseErrorMessage(null)).toEqual('Unknown error');
  });

  it('Should return Could not parse error message. when string is does not have a json structure inside responseText property', () => {
    expect(parseErrorMessage({ responseText: '{' })).toEqual('Could not parse error message.');
  });

  it('Should return the default error message sent as param when error is empty string, null or undefined', () => {
    const defaultErrorMessage = 'Default error message';
    expect(parseErrorMessage('', defaultErrorMessage)).toEqual(defaultErrorMessage);
    expect(parseErrorMessage(undefined, defaultErrorMessage)).toEqual(defaultErrorMessage);
    expect(parseErrorMessage(null, defaultErrorMessage)).toEqual(defaultErrorMessage);
  });
});
