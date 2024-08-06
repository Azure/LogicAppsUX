import renderer from 'react-test-renderer';
import { OverviewProperties, type OverviewPropertiesProps } from '../overviewproperties';
import { describe, beforeEach, it, expect } from 'vitest';
import React from 'react';
import type { CallbackInfo, LogicAppsV2 } from '@microsoft/logic-apps-shared';

describe('lib/overview/overviewproperties', () => {
  let minimal: OverviewPropertiesProps;

  beforeEach(() => {
    minimal = {
      callbackInfo: {
        value: 'callbackInfo.value',
      },
      name: 'name',
      stateType: 'stateType',
    };
  });

  it('renders', () => {
    const tree = renderer.create(<OverviewProperties {...minimal} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders the operation options property', () => {
    const tree = renderer.create(<OverviewProperties {...minimal} operationOptions="operationOptions" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders the stateless run mode property', () => {
    const tree = renderer.create(<OverviewProperties {...minimal} statelessRunMode="statelessRunMode" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders the callback URL property', () => {
    const callbackInfo: CallbackInfo = {
      value: 'callbackInfo.value',
    };
    const requestDefinition: LogicAppsV2.WorkflowDefinition = {
      $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
      actions: {},
      contentVersion: '1.0.0.0',
      outputs: {},
      triggers: {
        When_a_HTTP_request_is_received: {
          kind: 'Http',
          type: 'Request',
        },
      },
    };

    const tree = renderer.create(<OverviewProperties {...minimal} callbackInfo={callbackInfo} definition={requestDefinition} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
