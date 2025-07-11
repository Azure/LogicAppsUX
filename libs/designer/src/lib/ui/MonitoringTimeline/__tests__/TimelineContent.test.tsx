import type { ComponentProps } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import renderer from 'react-test-renderer';
import { IntlProvider } from 'react-intl';
import TimelineContent from '../TimelineContent';
import type { TimelineRepetitionWithActions } from '../helpers';

// Mock the styles
vi.mock('../monitoringTimeline.styles', () => ({
  useMonitoringTimelineStyles: () => ({
    loadingContainer: 'loading-container',
    timelineMainContent: 'timeline-main-content',
    timelineNodeContainer: 'timeline-node-container',
    errorCaretContainer: 'error-caret-container',
    errorCaret: 'error-caret',
  }),
}));

// Mock useId to return consistent IDs for snapshots
vi.mock('react', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    useId: () => 'test-id',
  };
});

// Mock TimelineGroup component
vi.mock('../TimelineGroup', () => ({
  default: ({ taskId, repetitions }: { taskId: number; repetitions: TimelineRepetitionWithActions[] }) => (
    <div data-testid={`timeline-group-${taskId}`}>
      {repetitions.map((rep) => (
        <div key={rep.repetitionIndex} data-testid={`repetition-${rep.repetitionIndex}`}>
          Repetition {rep.repetitionIndex}
        </div>
      ))}
    </div>
  ),
}));

type TimelineContentProps = ComponentProps<typeof TimelineContent>;

describe('TimelineContent', () => {
  let defaultProps: TimelineContentProps;
  const mockHandleSelectRepetition = vi.fn();

  const createMockRepetition = (repetitionIndex: number, taskId: number, status = 'succeeded'): TimelineRepetitionWithActions => ({
    actionIds: ['action1'],
    repetitionIndex,
    data: {
      id: `rep-${repetitionIndex}`,
      name: `repetition-${repetitionIndex}`,
      properties: {
        actions: {
          action1: {
            status,
          },
        },
        canResubmit: false,
        correlation: '',
        startTime: '2024-01-01T00:00:00Z',
        status,
        a2ametadata: {
          taskId,
        },
      },
      type: 'repetition',
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();

    const mockRepetitions = new Map<number, TimelineRepetitionWithActions[]>();
    mockRepetitions.set(0, [createMockRepetition(0, 0), createMockRepetition(1, 0)]);
    mockRepetitions.set(1, [createMockRepetition(2, 1, 'failed')]);

    defaultProps = {
      isExpanded: true,
      isFetchingRepetitions: false,
      noRepetitions: false,
      transitionIndex: 0,
      repetitions: mockRepetitions,
      tasksNumber: 2,
      selectedRepetition: createMockRepetition(0, 0),
      handleSelectRepetition: mockHandleSelectRepetition,
    };
  });

  const renderWithIntl = (props: TimelineContentProps) => {
    return renderer.create(
      <IntlProvider locale="en" defaultLocale="en">
        <TimelineContent {...props} />
      </IntlProvider>
    );
  };

  it('should render with default props', () => {
    const tree = renderWithIntl(defaultProps).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render collapsed (not expanded)', () => {
    const tree = renderWithIntl({
      ...defaultProps,
      isExpanded: false,
    }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render loading state', () => {
    const tree = renderWithIntl({
      ...defaultProps,
      isFetchingRepetitions: true,
    }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render loading state when collapsed', () => {
    const tree = renderWithIntl({
      ...defaultProps,
      isExpanded: false,
      isFetchingRepetitions: true,
    }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render no repetitions state', () => {
    const tree = renderWithIntl({
      ...defaultProps,
      noRepetitions: true,
      repetitions: new Map(),
    }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render no repetitions state when collapsed', () => {
    const tree = renderWithIntl({
      ...defaultProps,
      isExpanded: false,
      noRepetitions: true,
      repetitions: new Map(),
    }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with empty repetitions map', () => {
    const tree = renderWithIntl({
      ...defaultProps,
      repetitions: new Map(),
    }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with multiple task groups', () => {
    const mockRepetitions = new Map<number, TimelineRepetitionWithActions[]>();
    mockRepetitions.set(0, [createMockRepetition(0, 0), createMockRepetition(1, 0)]);
    mockRepetitions.set(1, [createMockRepetition(2, 1)]);
    mockRepetitions.set(2, [createMockRepetition(3, 2, 'failed')]);

    const tree = renderWithIntl({
      ...defaultProps,
      repetitions: mockRepetitions,
      tasksNumber: 3,
    }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render slider with correct values when expanded', () => {
    const component = renderWithIntl(defaultProps);
    const sliders = component.root.findAllByType('input');

    expect(sliders).toHaveLength(1);
    const slider = sliders[0];
    expect(slider.props.value).toBe(0); // transitionIndex
    expect(slider.props.min).toBe(0);
    expect(slider.props.max).toBe(1); // tasksNumber - 1
  });

  it('should call handleSelectRepetition when slider changes', () => {
    const component = renderWithIntl(defaultProps);
    const sliders = component.root.findAllByType('input');
    const slider = sliders[0];

    // Simulate slider change with proper event structure
    const mockEvent = { target: { value: '1' } };
    const mockData = { value: 1 };
    slider.props.onChange(mockEvent, mockData);

    expect(mockHandleSelectRepetition).toHaveBeenCalledWith(1, 0);
  });

  it('should render error carets for failed repetitions', () => {
    const mockRepetitions = new Map<number, TimelineRepetitionWithActions[]>();
    mockRepetitions.set(0, [createMockRepetition(0, 0, 'failed')]);
    mockRepetitions.set(1, [createMockRepetition(1, 1, 'succeeded')]);

    const tree = renderWithIntl({
      ...defaultProps,
      repetitions: mockRepetitions,
    }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should not render slider and error carets when collapsed', () => {
    const component = renderWithIntl({
      ...defaultProps,
      isExpanded: false,
    });

    expect(() => component.root.findByType('input')).toThrow();
  });
});
