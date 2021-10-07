import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { UserVoice, UserVoiceProps, UserVoiceSegment, UserVoiceSegmentProps } from '../uservoice';

describe('ui/recommendation3/_uservoice', () => {
  const classNames = {
    userVoice: 'msla-uservoice',
    userVoiceIcon: 'msla-uservoice-icon',
    userVoiceLink: 'msla-uservoice-link',
  };

  let minimal: UserVoiceProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      segments: [],
    };

    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<UserVoice {...minimal} />);

    const userVoice = renderer.getRenderOutput();
    expect(userVoice).toBeNull();
  });

  it('should render segments', () => {
    const segments: UserVoiceSegmentProps[] = [
      { text: 'Help us decide which connectors and triggers to add next with ' },
      { href: 'https://aka.ms/logicapps-wish', text: 'UserVoice' },
    ];

    renderer.render(<UserVoice {...minimal} segments={segments} />);

    const userVoice = renderer.getRenderOutput();
    expect(userVoice.props.className).toBe(classNames.userVoice);

    const [header, link] = React.Children.toArray(userVoice.props.children) as React.ReactElement[];
    expect(header.props.children).toBe("Don't see what you need?");
    expect(link.props.className).toBe(classNames.userVoiceLink);

    const [icon, ...userVoiceSegments] = React.Children.toArray(link.props.children) as React.ReactElement[];
    expect(icon.props.className).toBe(classNames.userVoiceIcon);
    expect(icon.props.iconName).toBe('Emoji2');
    expect(segments.length).toBe(2);

    const [textSegment, linkSegment] = userVoiceSegments;
    expect(textSegment.props.text).toBe(segments[0].text);
    expect(linkSegment.props.href).toBe(segments[1].href);
    expect(linkSegment.props.text).toBe(segments[1].text);
  });

  describe('UserVoiceSegment', () => {
    it('should call openWindow callback if set', () => {
      const openWindow = jest.fn().mockResolvedValue(true);
      const props: UserVoiceSegmentProps = {
        href: 'https://aka.ms/logicapps-wish',
        openWindow,
        text: 'UserVoice',
      };

      renderer.render(<UserVoiceSegment {...props} />);

      const segment = renderer.getRenderOutput();
      expect(segment.props.onClick).toBeDefined();

      segment.props.onClick();
      expect(openWindow).toHaveBeenCalled();
    });
  });
});
