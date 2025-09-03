import type { ComponentProps } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import renderer from 'react-test-renderer';
import { IntlProvider } from 'react-intl';
import TimelineButtons from '../TimelineButtons';

// Mock the styles
vi.mock('../monitoringTimeline.styles', () => ({
  useMonitoringTimelineStyles: () => ({
    flexCol: 'flex-col',
    navButton: 'nav-button',
  }),
}));

type TimelineButtonsProps = ComponentProps<typeof TimelineButtons>;

describe('TimelineButtons', () => {
  let defaultProps: TimelineButtonsProps;
  const mockHandleSelectRepetition = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps = {
      isExpanded: true,
      isFetchingRepetitions: false,
      transitionIndex: 1,
      noRepetitions: false,
      tasksNumber: 5,
      handleSelectRepetition: mockHandleSelectRepetition,
    };
  });

  const renderWithIntl = (props: TimelineButtonsProps) => {
    return renderer.create(
      <IntlProvider locale="en" defaultLocale="en">
        <TimelineButtons {...props} />
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

  it('should render with disabled previous button at first task', () => {
    const tree = renderWithIntl({
      ...defaultProps,
      transitionIndex: 0,
    }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with disabled next button at last task', () => {
    const tree = renderWithIntl({
      ...defaultProps,
      transitionIndex: 4, // last task (tasksNumber - 1)
    }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with disabled buttons when fetching repetitions', () => {
    const tree = renderWithIntl({
      ...defaultProps,
      isFetchingRepetitions: true,
    }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with disabled buttons when no repetitions', () => {
    const tree = renderWithIntl({
      ...defaultProps,
      noRepetitions: true,
    }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should call handleSelectRepetition with correct params when previous button clicked', () => {
    const component = renderWithIntl(defaultProps);

    // Simulate clicking the previous button
    const buttons = component.root.findAllByType('button');
    const previousButton = buttons[0]; // First button is previous

    previousButton.props.onClick({ preventDefault: () => {} });

    expect(mockHandleSelectRepetition).toHaveBeenCalledWith(0, 0); // transitionIndex - 1, 0
  });

  it('should call handleSelectRepetition with correct params when next button clicked', () => {
    const component = renderWithIntl(defaultProps);

    // Simulate clicking the next button
    const buttons = component.root.findAllByType('button');
    const nextButton = buttons[1]; // Second button is next

    nextButton.props.onClick({ preventDefault: () => {} });

    expect(mockHandleSelectRepetition).toHaveBeenCalledWith(2, 0); // transitionIndex + 1, 0
  });

  it('should not call handleSelectRepetition when buttons are disabled', () => {
    const component = renderWithIntl({
      ...defaultProps,
      isFetchingRepetitions: true,
    });

    const buttons = component.root.findAllByType('button');

    // When buttons are disabled, the onClick should not trigger the handler
    // The disabled state prevents the actual handler from being called
    expect(buttons[0].props.disabled).toBe(true);
    expect(buttons[1].props.disabled).toBe(true);
    expect(mockHandleSelectRepetition).not.toHaveBeenCalled();
  });
});
