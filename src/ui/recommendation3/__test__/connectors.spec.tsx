import * as React from 'react';
import { FormattedMessage } from 'react-intl';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { Connectors, ConnectorsProps } from '../connectors';
import { ShowMode } from '../models';

describe('ui/recommendation3/_connectors', () => {
  const classNames = {
    noConnectors: 'msla-no-connectors',
    recentlyUsedConnectorsTitle: 'msla-recently-used-connectors-title',
  };

  let minimal: ConnectorsProps, onRenderConnector: any, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    onRenderConnector = jest.fn();

    minimal = {
      connectors: [],
      filterText: '',
      isLoading: false,
      isTrigger: false,
      noConnectorsProps: {
        segments: [],
      },
      selectedCategory: 'ALL',
      showMode: ShowMode.Both,
      visible: true,
      onRenderConnector,
    };

    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render the "No connectors" help panel if there are no connectors', () => {
    renderer.render(<Connectors {...minimal} />);

    const connectors = renderer.getRenderOutput();
    expect(connectors.props.className).toMatch(/msla-connectors/);

    const [noConnectors]: any[] = React.Children.toArray(connectors.props.children); // tslint:disable-line: no-any
    expect(noConnectors.props.count).toBe(minimal.connectors.length);
    expect(noConnectors.props.isTrigger).toBe(minimal.isTrigger);
    expect(noConnectors.props.filterText).toBe(minimal.filterText);
  });

  it('should render connectors only', () => {
    const props = { ...minimal, showMode: ShowMode.Connectors };
    renderer.render(<Connectors {...props} />);

    const connectors = renderer.getRenderOutput();
    expect(connectors.props.className).toMatch(/msla-connectors/);
    expect(connectors.props.className).toMatch(/msla-connectors-only/);
  });

  it('should render nothing when not visible', () => {
    const props = { ...minimal, visible: false };
    renderer.render(<Connectors {...props} />);

    const connectors = renderer.getRenderOutput();
    expect(connectors).toBeNull();
  });

  describe('For You', () => {
    it('should render the for you tab if the selected category is FOR_YOU', () => {
      renderer.render(<Connectors {...minimal} selectedCategory="FOR_YOU" />);

      const connectors = renderer.getRenderOutput();
      expect(connectors.props.className).toMatch(/msla-connectors msla-for-you/);

      const [title, clearButton]: any[] = React.Children.toArray(connectors.props.children); // tslint:disable-line: no-any
      expect(title.props.children).toEqual(
        <FormattedMessage
          defaultMessage="Recent"
          description="This is a header for a section that shows recently used connecters"
          id="XEdXNu"
        />
      );
      expect(title.props.className).toBe(classNames.recentlyUsedConnectorsTitle);
      expect(clearButton.type.name).toBe('ClearRecentlyUsedList');
    });

    it('should render the "No connectors" header if there are no recently used connectors', () => {
      renderer.render(<Connectors {...minimal} selectedCategory="FOR_YOU" />);

      const connectors = renderer.getRenderOutput();
      const [, , noConnectors]: any[] = React.Children.toArray(connectors.props.children); // tslint:disable-line: no-any
      expect(noConnectors.props.className).toBe(classNames.noConnectors);
    });
  });
});
