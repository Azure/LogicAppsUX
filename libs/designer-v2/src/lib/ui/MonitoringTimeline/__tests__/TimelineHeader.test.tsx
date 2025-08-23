import type { ComponentProps } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import renderer from 'react-test-renderer';
import { IntlProvider } from 'react-intl';
import TimelineHeader from '../TimelineHeader';

// Mock the styles
vi.mock('../monitoringTimeline.styles', () => ({
  useMonitoringTimelineStyles: () => ({
    timelineIcon: 'timeline-icon',
  }),
}));

type TimelineHeaderProps = ComponentProps<typeof TimelineHeader>;

describe('TimelineHeader', () => {
  let defaultProps: TimelineHeaderProps;
  const mockRefetchTimelineRepetitions = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps = {
      isExpanded: true,
      refetchTimelineRepetitions: mockRefetchTimelineRepetitions,
    };
  });

  const renderWithIntl = (props: TimelineHeaderProps) => {
    return renderer.create(
      <IntlProvider locale="en" defaultLocale="en">
        <TimelineHeader {...props} />
      </IntlProvider>
    );
  };

  it('should render with default props when expanded', () => {
    const tree = renderWithIntl(defaultProps).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render when collapsed', () => {
    const tree = renderWithIntl({
      ...defaultProps,
      isExpanded: false,
    }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should call refetchTimelineRepetitions when refresh button is clicked', () => {
    const component = renderWithIntl(defaultProps);

    // Find the refresh button
    const buttons = component.root.findAllByType('button');
    expect(buttons).toHaveLength(1);

    const refreshButton = buttons[0];

    // Click the refresh button
    refreshButton.props.onClick();

    expect(mockRefetchTimelineRepetitions).toHaveBeenCalledTimes(1);
  });

  it('should not render refresh button when collapsed', () => {
    const component = renderWithIntl({
      ...defaultProps,
      isExpanded: false,
    });

    // Should not find any buttons when collapsed
    expect(() => component.root.findByType('button')).toThrow();
  });

  it('should not render title text when collapsed', () => {
    const component = renderWithIntl({
      ...defaultProps,
      isExpanded: false,
    });

    // Should only find the icon, not any text elements
    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render timeline icon in both expanded and collapsed states', () => {
    // Test expanded
    const expandedComponent = renderWithIntl(defaultProps);
    const expandedIcons = expandedComponent.root.findAllByProps({ className: 'timeline-icon' });
    expect(expandedIcons).toHaveLength(1);

    // Test collapsed
    const collapsedComponent = renderWithIntl({
      ...defaultProps,
      isExpanded: false,
    });
    const collapsedIcons = collapsedComponent.root.findAllByProps({ className: 'timeline-icon' });
    expect(collapsedIcons).toHaveLength(1);
  });

  it('should have correct minimum width when expanded', () => {
    const component = renderWithIntl(defaultProps);
    const tree = component.toJSON();

    // Check that the root element has minWidth style when expanded
    expect(tree?.props?.style).toEqual(
      expect.objectContaining({
        minWidth: '200px',
      })
    );
  });

  it('should not have minimum width when collapsed', () => {
    const component = renderWithIntl({
      ...defaultProps,
      isExpanded: false,
    });
    const tree = component.toJSON();

    // Check that the root element doesn't have minWidth when collapsed
    expect(tree?.props?.style?.minWidth).toBeUndefined();
  });
});
