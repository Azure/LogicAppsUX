import { describe, expect, it } from 'vitest';
import { areQueriesEqual, shouldUpdateOverviewCallbackInfo } from '../overviewCallbackInfo';

describe('overviewCallbackInfo', () => {
  it('does not clear the last known callback info when the refresh result is undefined', () => {
    expect(
      shouldUpdateOverviewCallbackInfo(
        {
          method: 'POST',
          value: 'https://workflow.test/run',
        },
        undefined
      )
    ).toBe(false);
  });

  it('returns true when the callback URL changes', () => {
    expect(
      shouldUpdateOverviewCallbackInfo(
        {
          method: 'POST',
          value: 'https://workflow.test/run',
        },
        {
          method: 'POST',
          value: 'https://workflow.test/run?sig=new',
        }
      )
    ).toBe(true);
  });

  it('returns false when the callback info is unchanged', () => {
    expect(
      shouldUpdateOverviewCallbackInfo(
        {
          method: 'POST',
          value: 'https://workflow.test/run',
          queries: { 'api-version': '2018-11-01' },
        },
        {
          method: 'POST',
          value: 'https://workflow.test/run',
          queries: { 'api-version': '2018-11-01' },
        }
      )
    ).toBe(false);
  });

  it('treats query parameters as unchanged when only the key order differs', () => {
    expect(
      shouldUpdateOverviewCallbackInfo(
        {
          method: 'POST',
          value: 'https://workflow.test/run',
          queries: { 'api-version': '2018-11-01', sig: 'abc123', sv: '1.0' },
        },
        {
          method: 'POST',
          value: 'https://workflow.test/run',
          queries: { sv: '1.0', 'api-version': '2018-11-01', sig: 'abc123' },
        }
      )
    ).toBe(false);
  });

  it('returns true when a query parameter value changes', () => {
    expect(
      shouldUpdateOverviewCallbackInfo(
        {
          method: 'POST',
          value: 'https://workflow.test/run',
          queries: { 'api-version': '2018-11-01', sig: 'abc123' },
        },
        {
          method: 'POST',
          value: 'https://workflow.test/run',
          queries: { 'api-version': '2018-11-01', sig: 'def456' },
        }
      )
    ).toBe(true);
  });

  it('returns true when a query parameter is added', () => {
    expect(
      shouldUpdateOverviewCallbackInfo(
        {
          method: 'POST',
          value: 'https://workflow.test/run',
          queries: { 'api-version': '2018-11-01' },
        },
        {
          method: 'POST',
          value: 'https://workflow.test/run',
          queries: { 'api-version': '2018-11-01', sig: 'abc123' },
        }
      )
    ).toBe(true);
  });
});

describe('areQueriesEqual', () => {
  it('treats both undefined inputs as equal', () => {
    expect(areQueriesEqual(undefined, undefined)).toBe(true);
  });

  it('treats undefined and an empty object as equal', () => {
    expect(areQueriesEqual(undefined, {})).toBe(true);
    expect(areQueriesEqual({}, undefined)).toBe(true);
  });

  it('treats two empty objects as equal', () => {
    expect(areQueriesEqual({}, {})).toBe(true);
  });

  it('returns true when keys and values match', () => {
    expect(areQueriesEqual({ a: '1' }, { a: '1' })).toBe(true);
  });

  it('returns true regardless of key insertion order', () => {
    expect(areQueriesEqual({ a: '1', b: '2', c: '3' }, { c: '3', a: '1', b: '2' })).toBe(true);
  });

  it('returns false when key counts differ', () => {
    expect(areQueriesEqual({ a: '1' }, { a: '1', b: '2' })).toBe(false);
  });

  it('returns false when key counts match but the keys themselves differ', () => {
    expect(areQueriesEqual({ a: '1', b: '2' }, { a: '1', c: '2' })).toBe(false);
  });

  it('returns false when matching keys hold strictly inequal values (string vs number)', () => {
    expect(areQueriesEqual({ a: '1' }, { a: 1 })).toBe(false);
  });

  it('uses reference equality for non-primitive values rather than deep equality', () => {
    expect(areQueriesEqual({ a: { x: 1 } }, { a: { x: 1 } })).toBe(false);
  });

  it('treats an explicit undefined value as not equal to a missing key', () => {
    expect(areQueriesEqual({ a: undefined }, {})).toBe(false);
  });
});
