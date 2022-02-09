import React from 'react';
import ReactShallowRenderer from 'react-test-renderer/shallow';
import { CallbackInfo } from '../overview';
import { OverviewProperties, OverviewPropertiesProps } from '../overviewproperties';

describe('lib/overview/overviewproperties', () => {
  let minimal: OverviewPropertiesProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      callbackInfo: {
        value: 'callbackInfo.value',
      },
      name: 'name',
      stateType: 'stateType',
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('renders correctly', () => {
    renderer.render(<OverviewProperties {...minimal} />);

    const root = renderer.getRenderOutput();
    const pivotItem = React.Children.only(root.props.children);
    expect(pivotItem.props.headerText).toBe('Workflow Properties');

    const properties = React.Children.only(pivotItem.props.children);
    expect(properties.props.className).toBe('msla-workflow-properties');

    const [name, stateType]: any[] = React.Children.toArray(properties.props.children);
    const [nameKey, nameValue]: any[] = React.Children.toArray(name.props.children);
    expect(nameKey.props.children).toBe('Name:');
    expect(nameValue.props.children).toBe('name');

    const [stateTypeKey, stateTypeValue]: any[] = React.Children.toArray(stateType.props.children);
    expect(stateTypeKey.props.children).toBe('State type:');
    expect(stateTypeValue.props.children).toBe('stateType');
  });

  it('renders the operation options property', () => {
    renderer.render(<OverviewProperties {...minimal} operationOptions="operationOptions" />);

    const root = renderer.getRenderOutput();
    const pivotItem = React.Children.only(root.props.children);
    const properties = React.Children.only(pivotItem.props.children);
    const [, , operationOptions]: any[] = React.Children.toArray(properties.props.children);
    const [operationOptionsKey, operationOptionsValue]: any[] = React.Children.toArray(operationOptions.props.children);
    expect(operationOptionsKey.props.children).toBe('Operation options:');
    expect(operationOptionsValue.props.children).toBe('operationOptions');
  });

  it('renders the stateless run mode property', () => {
    renderer.render(<OverviewProperties {...minimal} statelessRunMode="statelessRunMode" />);

    const root = renderer.getRenderOutput();
    const pivotItem = React.Children.only(root.props.children);
    const properties = React.Children.only(pivotItem.props.children);
    const [, , statelessRunMode]: any[] = React.Children.toArray(properties.props.children);
    const [statelessRunModeKey, statelessRunModeValue]: any[] = React.Children.toArray(statelessRunMode.props.children);
    expect(statelessRunModeKey.props.children).toBe('Stateless run mode:');
    expect(statelessRunModeValue.props.children).toBe('statelessRunMode');
  });

  it('renders the callback URL property', () => {
    const callbackInfo: CallbackInfo = {
      value: 'callbackInfo.value',
    };
    renderer.render(<OverviewProperties {...minimal} callbackInfo={callbackInfo} />);

    const root = renderer.getRenderOutput();
    const pivotItem = React.Children.only(root.props.children);
    const properties = React.Children.only(pivotItem.props.children);
    const [, , callbackUrl]: any[] = React.Children.toArray(properties.props.children);
    const [callbackUrlKey, callbackUrlValueContainer]: any[] = React.Children.toArray(callbackUrl.props.children);
    expect(callbackUrlKey.props.children).toBe('Callback URL:');

    const callbackUrlValue = React.Children.only(callbackUrlValueContainer.props.children);
    expect(callbackUrlValue.props.children).toBe(callbackInfo.value);
  });
});
