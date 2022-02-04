import { CheckboxVisibility, DetailsListLayoutMode, SelectionMode } from '@fluentui/react';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { KeyValuePairs } from '../keyvaluepairs';
import type { ValueProps } from '../types';

describe('ui/monitoring/values/_keyvaluepairs', () => {
  const classNames = {
    displayName: 'msla-trace-value-display-name',
    keyValuePairs: 'msla-trace-value-key-value-pairs',
    label: 'msla-trace-value-label',
    text: 'msla-trace-value-text',
  };

  let props: ValueProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    props = {
      displayName: 'Headers',
      value: {
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': '*',
        'Referrer-Policy': 'no-referred-when-downgrade',
      },
    };

    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<KeyValuePairs {...props} />);

    const section = renderer.getRenderOutput();
    expect(section.props.className).toBe(classNames.label);

    const [displayName, text]: any[] = React.Children.toArray(section.props.children);
    expect(displayName.props.className).toBe(classNames.displayName);
    expect(displayName.props.children).toBe(props.displayName);
    expect(text.props.className.split(' ')).toEqual(expect.arrayContaining([classNames.keyValuePairs, classNames.text]));

    const detailsList = React.Children.only(text.props.children);
    expect(detailsList.props.ariaLabel).toBe(props.displayName);
    expect(detailsList.props.ariaLabelForListHeader).toBe(props.displayName);
    expect(detailsList.props.checkboxVisibility).toBe(CheckboxVisibility.hidden);
    expect(detailsList.props.columns).toEqual([
      {
        ariaLabel: 'Key',
        fieldName: '$key',
        flexGrow: 1,
        key: '$key',
        isMultiline: true,
        isResizable: true,
        minWidth: 0,
        name: 'Key',
        targetWidthProportion: 1,
      },
      {
        ariaLabel: 'Value',
        fieldName: '$value',
        flexGrow: 1,
        key: '$value',
        isMultiline: true,
        isResizable: true,
        minWidth: 0,
        name: 'Value',
        targetWidthProportion: 1,
      },
    ]);
    expect(detailsList.props.compact).toBeTruthy();
    expect(detailsList.props.isHeaderVisible).toBeTruthy();
    expect(detailsList.props.items).toEqual([
      {
        $key: 'Access-Control-Allow-Credentials',
        $value: 'true',
      },
      {
        $key: 'Access-Control-Allow-Origin',
        $value: '*',
      },
      {
        $key: 'Referrer-Policy',
        $value: 'no-referred-when-downgrade',
      },
    ]);
    expect(detailsList.props.layoutMode).toBe(DetailsListLayoutMode.fixedColumns);
    expect(detailsList.props.selectionMode).toBe(SelectionMode.none);
  });
});
