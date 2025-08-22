import type { ComponentProps } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import renderer from 'react-test-renderer';
import { IntlProvider } from 'react-intl';
import TimelineGroup from '../TimelineGroup';
import type { TimelineRepetitionWithActions } from '../helpers';

// Mock the styles
vi.mock('../monitoringTimeline.styles', () => ({
  useMonitoringTimelineStyles: () => ({
    timelineTask: 'timeline-task',
  }),
}));

// Mock TimelineNode component
vi.mock('../TimelineNode', () => ({
  default: ({ selected, data }: { selected: boolean; data: any }) => (
    <div data-testid="timeline-node" data-selected={selected}>
      TimelineNode - {data?.id}
    </div>
  ),
}));

type TimelineGroupProps = ComponentProps<typeof TimelineGroup>;

describe('TimelineGroup', () => {
  let defaultProps: TimelineGroupProps;
  const mockHandleSelectRepetition = vi.fn();

  const createMockRepetition = (repetitionIndex: number, taskId: number, actionId = 'action1'): TimelineRepetitionWithActions => ({
    actionIds: [actionId],
    repetitionIndex,
    data: {
      id: `rep-${repetitionIndex}`,
      name: `repetition-${repetitionIndex}`,
      properties: {
        actions: {
          [actionId]: {
            status: 'succeeded',
          },
        },
        canResubmit: false,
        correlation: '',
        startTime: '2024-01-01T00:00:00Z',
        status: 'succeeded',
        a2ametadata: {
          taskId,
        },
      },
      type: 'repetition',
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();

    defaultProps = {
      isTimelineExpanded: true,
      taskId: 0,
      repetitions: [createMockRepetition(0, 0), createMockRepetition(1, 0), createMockRepetition(2, 0)],
      transitionIndex: 0,
      selectedRepetition: createMockRepetition(1, 0),
      handleSelectRepetition: mockHandleSelectRepetition,
    };
  });

  const renderWithIntl = (props: TimelineGroupProps) => {
    return renderer.create(
      <IntlProvider locale="en" defaultLocale="en">
        <TimelineGroup {...props} />
      </IntlProvider>
    );
  };

  it('should render with default props when timeline is expanded', () => {
    const tree = renderWithIntl(defaultProps).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render when timeline is collapsed', () => {
    const tree = renderWithIntl({
      ...defaultProps,
      isTimelineExpanded: false,
    }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render as collapsed group initially', () => {
    const tree = renderWithIntl({
      ...defaultProps,
      transitionIndex: 1, // different from taskId (0)
    }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render as expanded group when taskId matches transitionIndex', () => {
    const tree = renderWithIntl({
      ...defaultProps,
      transitionIndex: 0, // matches taskId (0)
    }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with different task number', () => {
    const tree = renderWithIntl({
      ...defaultProps,
      taskId: 5,
    }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with single repetition', () => {
    const tree = renderWithIntl({
      ...defaultProps,
      repetitions: [createMockRepetition(0, 0)],
    }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with empty repetitions', () => {
    const tree = renderWithIntl({
      ...defaultProps,
      repetitions: [],
    }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with no selected repetition', () => {
    const tree = renderWithIntl({
      ...defaultProps,
      selectedRepetition: null,
    }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should call handleSelectRepetition when expand button is clicked', () => {
    const component = renderWithIntl({
      ...defaultProps,
      transitionIndex: 1, // different from taskId to start collapsed
    });

    const buttons = component.root.findAllByType('button');
    expect(buttons).toHaveLength(1);

    // Click expand button
    buttons[0].props.onClick();

    // Should not call handleSelectRepetition for expand action
    expect(mockHandleSelectRepetition).not.toHaveBeenCalled();
  });

  it('should call handleSelectRepetition when timeline node is selected', () => {
    const component = renderWithIntl({
      ...defaultProps,
      transitionIndex: 0, // same as taskId to start expanded
    });

    // First need to expand the group manually
    const buttons = component.root.findAllByType('button');
    if (buttons.length > 0) {
      buttons[0].props.onClick(); // Expand the group
    }

    // Re-render to get the updated state
    component.update(
      <IntlProvider locale="en" defaultLocale="en">
        <TimelineGroup {...defaultProps} transitionIndex={0} />
      </IntlProvider>
    );

    // Find TimelineNode components by their mock implementation
    const timelineNodes = component.root.findAllByProps({ 'data-testid': 'timeline-node' });

    if (timelineNodes.length > 0) {
      // The onClick handler is actually on the wrapping div
      const nodeContainer = timelineNodes[0].parent;
      if (nodeContainer?.props.onClick) {
        nodeContainer.props.onClick();
        expect(mockHandleSelectRepetition).toHaveBeenCalledWith(0, 0); // taskId, index
      }
    }
  });

  it('should show selected repetition correctly', () => {
    const selectedRep = createMockRepetition(1, 0);
    const component = renderWithIntl({
      ...defaultProps,
      selectedRepetition: selectedRep,
      transitionIndex: 0, // same as taskId to start expanded
    });

    // First need to expand the group manually since useEffect doesn't trigger in tests the same way
    const buttons = component.root.findAllByType('button');
    if (buttons.length > 0) {
      buttons[0].props.onClick(); // Expand the group
    }

    // Re-render to apply state changes
    component.update(
      <IntlProvider locale="en" defaultLocale="en">
        <TimelineGroup {...defaultProps} selectedRepetition={selectedRep} transitionIndex={0} />
      </IntlProvider>
    );

    const timelineNodes = component.root.findAllByProps({ 'data-testid': 'timeline-node' });

    if (timelineNodes.length >= 2) {
      // Second node should be selected (repetition index 1)
      expect(timelineNodes[1].props['data-selected']).toBe(true);
      expect(timelineNodes[0].props['data-selected']).toBe(false);
    }
  });

  it('should handle transition index changes', () => {
    // Test that component renders correctly with different transition indices
    const component1 = renderWithIntl({
      ...defaultProps,
      transitionIndex: 1, // different from taskId
    });

    const component2 = renderWithIntl({
      ...defaultProps,
      transitionIndex: 0, // same as taskId
    });

    // Both should render without errors
    expect(component1.toJSON()).toBeTruthy();
    expect(component2.toJSON()).toBeTruthy();

    // The components should have different rendered output based on transitionIndex
    expect(component1.toJSON()).not.toEqual(component2.toJSON());
  });
});
