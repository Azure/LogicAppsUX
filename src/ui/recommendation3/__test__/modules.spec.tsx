import { Callout } from '@fluentui/react/lib/Callout';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { Modules, ModulesProps } from '../modules';

describe('ui/recommendation3/_modules', () => {
  const classNames = {
    modules: 'msla-modules',
  };

  let minimal: ModulesProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      modules: [
        {
          description: 'd',
          id: 'id',
          image: '',
          title: '',
        },
      ],
      visible: true,
      onRenderModule: jest.fn(),
    };

    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<Modules {...minimal} />);

    const modules = renderer.getRenderOutput();
    expect(modules.props.className).toBe(classNames.modules);

    const [list]: any[] = React.Children.toArray(modules.props.children); // tslint:disable-line: no-any
    expect(list.props.items.length).toBe(1);
    expect(list.props.items[0]).toEqual(expect.objectContaining(minimal.modules[0]));
    expect(list.props.onRenderCell).toEqual(minimal.onRenderModule);
  });

  it('should render a callout when one is specified', () => {
    const props = {
      ...minimal,
      moduleCalloutProps: {},
    };
    renderer.render(<Modules {...props} />);

    const modules = renderer.getRenderOutput();
    expect(modules.props.className).toBe(classNames.modules);

    const [, callout]: any[] = React.Children.toArray(modules.props.children); // tslint:disable-line: no-any
    expect(callout.type).toEqual(Callout);
  });

  it('should not render when not visible', () => {
    const props = { ...minimal, visible: false };
    renderer.render(<Modules {...props} />);

    const modules = renderer.getRenderOutput();
    expect(modules).toBeNull();
  });
});
