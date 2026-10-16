import { describe, expect, it } from 'vitest';
import { getCodeViewRequestOptionsValidationErrors } from '../workflow';

const expectedComposeError =
  "The request options timeout parameter is not supported for action 'Compose' of type 'Compose'. Actions of type 'HTTP' are supported.";

describe('getCodeViewRequestOptionsValidationErrors', () => {
  it('reports the original unsupported Compose timeout error', () => {
    expect(
      getCodeViewRequestOptionsValidationErrors({
        actions: {
          Compose: {
            type: 'Compose',
            runtimeConfiguration: { requestOptions: { timeout: 'PT24H' } },
          },
        },
      })
    ).toEqual([expectedComposeError]);
  });

  it('allows request timeouts on HTTP actions', () => {
    expect(
      getCodeViewRequestOptionsValidationErrors({
        actions: {
          HTTP: {
            type: 'Http',
            runtimeConfiguration: { requestOptions: { timeout: 'PT1S' } },
          },
        },
      })
    ).toEqual([]);
  });

  it('finds unsupported request timeouts in nested actions', () => {
    expect(
      getCodeViewRequestOptionsValidationErrors({
        actions: {
          Scope: {
            type: 'Scope',
            actions: {
              Compose: {
                type: 'Compose',
                runtimeConfiguration: { requestOptions: { timeout: 'PT24H' } },
              },
            },
          },
        },
      })
    ).toEqual([expectedComposeError]);
  });

  it('finds unsupported request timeouts in agent condition actions', () => {
    expect(
      getCodeViewRequestOptionsValidationErrors({
        actions: {
          Agent: {
            type: 'Agent',
            tools: {
              Condition: {
                type: 'AgentCondition',
                actions: {
                  Compose: {
                    type: 'Compose',
                    runtimeConfiguration: { requestOptions: { timeout: 'PT24H' } },
                  },
                },
              },
            },
          },
        },
      })
    ).toEqual([expectedComposeError]);
  });

  it('ignores request options without a timeout and malformed definitions', () => {
    expect(
      getCodeViewRequestOptionsValidationErrors({
        actions: {
          Compose: {
            type: 'Compose',
            runtimeConfiguration: { requestOptions: { chunkedTransferMode: true } },
          },
        },
      })
    ).toEqual([]);
    expect(getCodeViewRequestOptionsValidationErrors(undefined)).toEqual([]);
  });
});
