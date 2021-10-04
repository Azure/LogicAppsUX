import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { CardV1, CardProps } from '../card';

describe('ui/recommendation3/_card', () => {
  const classNames = {
    cardBody: 'msla-card-body',
    cardClose: 'msla-card-close',
    cardHeader: 'msla-card-header',
    cardHeaderTitle: 'msla-card-header-title',
    cardTitleButtonGroup: 'msla-card-title-button-group',
  };

  let minimal: CardProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      icon: 'icon',
      selected: false,
      title: 'title',
      trackEvent: jest.fn(),
    };

    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  describe('CardV1', () => {
    it('should render an action card', () => {
      renderer.render(<CardV1 {...minimal} />);
      const card = renderer.getRenderOutput();
      expect(card.props.className).toEqual(expect.stringMatching(/msla-card/));
      expect(card.props.className).toEqual(expect.stringMatching(/msla-card-fixed-width/));
      expect(card.props.className).toEqual(expect.stringMatching(/msla-recommendation/));

      const [header, body] = React.Children.toArray(card.props.children) as React.ReactElement[];
      expect(header.props.className).toBe(classNames.cardHeader);
      expect(header.props.style).toEqual({
        backgroundColor: 'rgba(71,71,71, 0.15)',
      });
      expect(body.props.className).toBe(classNames.cardBody);

      const [headerGroup, buttonGroup] = React.Children.toArray(header.props.children) as React.ReactElement[];
      const [logo, title] = React.Children.toArray(headerGroup.props.children) as React.ReactElement[];
      expect(logo.props.hideHeaderLogo).toBeFalsy();
      expect(logo.props.icon).toBe(minimal.icon);
      expect(title.props.className).toBe(classNames.cardHeaderTitle);
      expect(title.props.text).toBe(minimal.title);
      expect(title.props.trackEvent).toEqual(minimal.trackEvent);
      expect(buttonGroup.props.className).toBe(classNames.cardTitleButtonGroup);

      const [tooltipHost, helpIcon] = React.Children.toArray(buttonGroup.props.children) as React.ReactElement[];
      expect(tooltipHost.props.content).toBe('Cancel');
      expect(helpIcon).toBe(undefined);
      const icon = React.Children.only(tooltipHost.props.children);
      expect(icon.props.ariaLabel).toBe('Cancel');
      expect(icon.props.className).toBe(classNames.cardClose);
      expect(icon.props.iconProps.iconName).toBe('Cancel');
    });

    it('should render an action card with renderCardviewHeader', () => {
      minimal = {
        icon: 'icon',
        selected: false,
        title: 'title',
        trackEvent: jest.fn(),
        renderCardViewHeader: getCardViewHeader(),
      };
      renderer.render(<CardV1 {...minimal} />);
      const card = renderer.getRenderOutput();
      expect(card.props.className).toEqual(expect.stringMatching(/msla-card/));
      expect(card.props.className).toEqual(expect.stringMatching(/msla-card-fixed-width/));
      expect(card.props.className).toEqual(expect.stringMatching(/msla-recommendation/));

      const [header, body] = React.Children.toArray(card.props.children) as React.ReactElement[];
      expect(header.props.className).toBe(classNames.cardHeader);
      expect(header.props.style).toEqual({
        backgroundColor: 'rgba(71,71,71, 0.15)',
      });
      expect(body.props.className).toBe(classNames.cardBody);

      const [headerGroup, buttonGroup] = React.Children.toArray(header.props.children) as React.ReactElement[];
      const [logo, title] = React.Children.toArray(headerGroup.props.children) as React.ReactElement[];
      expect(logo.props.hideHeaderLogo).toBeFalsy();
      expect(logo.props.icon).toBe(minimal.icon);
      expect(title.props.className).toBe(classNames.cardHeaderTitle);
      expect(title.props.text).toBe(minimal.title);
      expect(title.props.trackEvent).toEqual(minimal.trackEvent);
      expect(buttonGroup.props.className).toBe(classNames.cardTitleButtonGroup);
      expect(buttonGroup.props.children.length).toBe(2);
      const [cardViewheader, tooltipHost] = React.Children.toArray(buttonGroup.props.children) as React.ReactElement[];
      expect(tooltipHost.props.content).toBe('Cancel');
      expect(cardViewheader).toBeDefined();
      const [cardViewHeaderTitle] = React.Children.toArray(cardViewheader.props.children);
      expect(cardViewHeaderTitle).toBe('title');
      const icon = React.Children.only(tooltipHost.props.children);
      expect(icon.props.ariaLabel).toBe('Cancel');
      expect(icon.props.className).toBe(classNames.cardClose);
      expect(icon.props.iconProps.iconName).toBe('Cancel');
    });
  });

  function getCardViewHeader(): JSX.Element {
    return <div>title</div>;
  }
});
