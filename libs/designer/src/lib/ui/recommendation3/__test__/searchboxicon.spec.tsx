import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { Spinner } from '@fluentui/react/lib/Spinner';

import { SearchBoxIcon, SearchBoxIconProps } from '../searchboxicon';
import { ShowMode } from '../models';

describe('ui/recommendation3/_searchboxicon', () => {
  const classNames = {
    searchBoxButton: 'msla-search-box-button',
    searchBoxIcon: 'msla-search-box-icon',
  };

  let minimal: SearchBoxIconProps, onBackClick: any, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    onBackClick = jest.fn();

    minimal = {
      isLoading: false,
      showMode: ShowMode.Both,
      onBackClick,
    };

    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render as a spinner when loading', () => {
    renderer.render(<SearchBoxIcon {...minimal} isLoading={true} />);

    const spinner = renderer.getRenderOutput();
    expect(spinner.props.className).toBe(classNames.searchBoxIcon);
    expect(spinner.type).toBe(Spinner);
    expect(spinner.props.role).toBe('presentation');
  });

  it('should render as an icon', () => {
    renderer.render(<SearchBoxIcon {...minimal} />);

    const icon = renderer.getRenderOutput();
    expect(icon.props.className).toBe(classNames.searchBoxIcon);
    expect(icon.props.iconName).toBe('Search');
    expect(icon.props.role).toBe('presentation');
  });

  it('should render as a button', () => {
    renderer.render(<SearchBoxIcon {...minimal} showMode={ShowMode.Connectors} />);

    const tooltipHost = renderer.getRenderOutput();
    expect(tooltipHost.props.content).toBe('Go back');

    const button = React.Children.only(tooltipHost.props.children);
    expect(button.props.className).toBe(classNames.searchBoxButton);
    expect(button.props.disabled).toBeFalsy();
    expect(button.props.iconProps).toEqual({
      ariaLabel: 'Go back',
      iconName: 'Back',
    });
  });
});
