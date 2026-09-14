import renderer from 'react-test-renderer';
import { OverviewProperties, type OverviewPropertiesProps } from '../overviewproperties';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import React from 'react';
import type { CallbackInfo, LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { IntlProvider } from 'react-intl';
import { Customizer, createTheme } from '@fluentui/react';

describe('lib/overview/overviewproperties', () => {
  let minimal: OverviewPropertiesProps;
  const renderComponent = (props: OverviewPropertiesProps) =>
    renderer.create(
      <Customizer settings={{ theme: createTheme() }}>
        <IntlProvider locale="en" messages={{}}>
          <OverviewProperties {...props} />
        </IntlProvider>
      </Customizer>
    );

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
    const tree = renderComponent(minimal).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders the operation options property', () => {
    const tree = renderComponent({ ...minimal, operationOptions: 'operationOptions' }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders the stateless run mode property', () => {
    const tree = renderComponent({ ...minimal, statelessRunMode: 'statelessRunMode' }).toJSON();
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

    const tree = renderComponent({ ...minimal, callbackInfo, definition: requestDefinition }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('invokes callback URL copy when the copy action is available', () => {
    const onCopyCallbackUrl = vi.fn();
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
    const component = renderComponent({ ...minimal, definition: requestDefinition, onCopyCallbackUrl });

    const copyButton = component.root.find((node) => node.props['aria-label'] === 'Copy callback URL');
    copyButton.props.onClick();

    expect(onCopyCallbackUrl).toHaveBeenCalledOnce();
  });
});
