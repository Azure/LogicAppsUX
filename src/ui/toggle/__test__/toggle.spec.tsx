import { IIconProps } from '@fluentui/react/lib/Icon';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { Toggle, ToggleProps } from '..';

describe('ui/toggle', () => {
  let minimal: ToggleProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      expanded: false,
      trackEvent: jest.fn(),
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render a custom button CSS class', () => {
    const buttonClassName = 'custom-css-class';
    renderer.render(<Toggle {...minimal} buttonClassName={buttonClassName} />);

    const toggle = renderer.getRenderOutput();
    expect(toggle.props.className).toBe(buttonClassName);
  });

  it('should render custom icon styles', () => {
    const iconProps: IIconProps = {
      styles: {
        root: {
          paddingLeft: 5,
        },
      },
    };
    renderer.render(<Toggle {...minimal} iconProps={iconProps} />);

    const toggle = renderer.getRenderOutput();
    expect(toggle.props.iconProps.styles).toEqual(iconProps.styles);
  });

  it('should fire a click event when clicked', () => {
    const onClick = jest.fn();
    renderer.render(<Toggle {...minimal} onClick={onClick} />);

    const toggle = renderer.getRenderOutput();
    toggle.props.onClick();
    expect(onClick).toHaveBeenCalled();
  });

  describe('Collapsed', () => {
    it('should render as collapsed', () => {
      renderer.render(<Toggle {...minimal} />);

      const toggle = renderer.getRenderOutput();
      expect(toggle.props['aria-pressed']).toBe(minimal.expanded);
      expect(toggle.props.className).toBe(Toggle.defaultProps.buttonClassName);
      expect(toggle.props.iconProps.styles.root.marginLeft).toBe(5);
      expect(toggle.props.iconProps.iconName).toBe('ChevronDown');

      const [text]: any[] = React.Children.toArray(toggle.props.children); // tslint:disable-line: no-any
      expect(text.props.defaultMessage).toBe('Show advanced options');
    });

    it('should render custom expand icon', () => {
      const expandIcon: IIconProps = {
        iconName: 'ChevonDownMed',
      };
      renderer.render(<Toggle {...minimal} expandIcon={expandIcon} />);

      const toggle = renderer.getRenderOutput();
      expect(toggle.props.iconProps.iconName).toBe(expandIcon.iconName);
    });

    it('should render custom expand text', () => {
      const expandText = 'Show more';
      renderer.render(<Toggle {...minimal} expandText={expandText} />);

      const toggle = renderer.getRenderOutput();
      const [text]: any[] = React.Children.toArray(toggle.props.children); // tslint:disable-line: no-any
      expect(text).toBe(expandText);
    });
  });

  describe('Expanded', () => {
    it('should render as expanded', () => {
      renderer.render(<Toggle {...minimal} expanded={true} />);

      const toggle = renderer.getRenderOutput();
      expect(toggle.props['aria-pressed']).toBeTruthy();
      expect(toggle.props.iconProps.iconName).toBe('ChevronUp');

      const [text]: any[] = React.Children.toArray(toggle.props.children); // tslint:disable-line: no-any
      expect(text.props.defaultMessage).toBe('Hide advanced options');
    });

    it('should render custom collapse icon', () => {
      const collapseIcon: IIconProps = {
        iconName: 'ChevronUpMed',
      };
      renderer.render(<Toggle {...minimal} expanded={true} collapseIcon={collapseIcon} />);

      const toggle = renderer.getRenderOutput();
      expect(toggle.props.iconProps.iconName).toBe(collapseIcon.iconName);
    });

    it('should render custom collapse text', () => {
      const collapseText = 'Show less';
      renderer.render(<Toggle {...minimal} expanded={true} collapseText={collapseText} />);

      const toggle = renderer.getRenderOutput();
      const [text]: any[] = React.Children.toArray(toggle.props.children); // tslint:disable-line: no-any
      expect(text).toBe(collapseText);
    });
  });
});
