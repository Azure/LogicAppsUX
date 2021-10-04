import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { SearchBox, SearchBoxProps } from '../searchbox';
import { ShowMode } from '../models';

describe('ui/recommendation3/_searchbox', () => {
  const classNames = {
    searchBox: 'msla-search-box',
    searchBoxButton: 'msla-search-box-button',
    searchBoxIcon: 'msla-search-box-icon',
    searchBoxInput: 'msla-search-box-input',
  };

  let minimal: SearchBoxProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      isLoading: false,
      placeholder: 'placeholder',
      showMode: ShowMode.Both,
      value: '',
      onBackClick: jest.fn(),
      onChange: jest.fn(),
    };

    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render with an icon when showing both connectors and operations', () => {
    renderer.render(<SearchBox {...minimal} />);

    const searchBox = renderer.getRenderOutput();
    expect(searchBox.props.className).toBe(classNames.searchBox);

    const [icon, input]: any[] = React.Children.toArray(searchBox.props.children); // tslint:disable-line: no-any

    expect(icon.props.showMode).toBe(minimal.showMode);
    expect(input.props.className).toBe(classNames.searchBoxInput);
    expect(input.props.maxLength).toBe(64);
    expect(input.props.placeholder).toBe('placeholder');
    expect(input.props.title).toBe('placeholder');
    expect(input.props.type).toBe('search');
    expect(input.props.value).toBe('');
    expect(input.props.onChange).toEqual(minimal.onChange);
  });

  for (const showMode of [ShowMode.Connectors, ShowMode.Operations]) {
    it(`should render with an icon button (${ShowMode[showMode]})`, () => {
      const props = { ...minimal, showMode };
      renderer.render(<SearchBox {...props} />);

      const searchBox = renderer.getRenderOutput();
      const [iconButton]: any[] = React.Children.toArray(searchBox.props.children); // tslint:disable-line: no-any
      expect(iconButton.props.showMode).toBe(props.showMode);
      expect(iconButton.props.onBackClick).toEqual(props.onBackClick);
    });
  }
});
