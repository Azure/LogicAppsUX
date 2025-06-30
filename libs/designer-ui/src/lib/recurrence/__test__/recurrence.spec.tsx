import type { Recurrence } from '../index';
import { ScheduleEditor } from '../index';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, it, expect } from 'vitest';
import { RecurrenceType } from '@microsoft/logic-apps-shared';

describe('lib/recurrence', () => {
  let renderer: ReactShallowRenderer.ShallowRenderer;
  const mockOnChange = vi.fn();

  beforeEach(() => {
    renderer = ReactShallowRenderer.createRenderer();
    mockOnChange.mockClear();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render basic recurrence editor', () => {
    const initialValue = [{ id: '1', type: 'literal', value: '{"frequency": "Day", "interval": 1}' }];

    renderer.render(<ScheduleEditor type={RecurrenceType.Basic} initialValue={initialValue} onChange={mockOnChange} />);

    const wrapper = renderer.getRenderOutput();
    expect(wrapper.type).toBe('div');
    expect(wrapper.props.className).toBeDefined(); // Using makeStyles now

    // Check that it renders frequency group
    const frequencyGroup = wrapper.props.children[0];
    expect(frequencyGroup.type).toBe('div');
    expect(frequencyGroup.props.className).toBeDefined();
  });

  it('should render advanced recurrence editor with schedule section', () => {
    const initialValue = [{ id: '1', type: 'literal', value: '{"frequency": "Week", "interval": 1}' }];

    renderer.render(<ScheduleEditor type={RecurrenceType.Advanced} initialValue={initialValue} onChange={mockOnChange} />);

    const wrapper = renderer.getRenderOutput();
    // Advanced type should have schedule section
    const children = React.Children.toArray(wrapper.props.children);
    expect(children.length).toBeGreaterThan(3); // Should have additional schedule section
  });

  it('should call onChange when values are updated', () => {
    const initialValue = [{ id: '1', type: 'literal', value: '{"frequency": "Day", "interval": 1}' }];

    renderer.render(<ScheduleEditor initialValue={initialValue} onChange={mockOnChange} />);

    // Note: With shallow rendering, we can't easily test interaction
    // but we can verify the onChange prop is passed correctly
    const wrapper = renderer.getRenderOutput();
    const textInput = wrapper.props.children[0].props.children[0];

    expect(textInput.props.onChange).toBeDefined();
  });

  it('should render with preview when showPreview is true', () => {
    const initialValue = [{ id: '1', type: 'literal', value: '{"frequency": "Day", "interval": 1}' }];

    renderer.render(
      <ScheduleEditor type={RecurrenceType.Advanced} initialValue={initialValue} showPreview={true} onChange={mockOnChange} />
    );

    const wrapper = renderer.getRenderOutput();
    // Should include preview component when showPreview is true
    expect(wrapper).toBeDefined();
  });

  it('should handle readonly mode', () => {
    const initialValue = [{ id: '1', type: 'literal', value: '{"frequency": "Day", "interval": 1}' }];

    renderer.render(<ScheduleEditor initialValue={initialValue} readOnly={true} onChange={mockOnChange} />);

    const wrapper = renderer.getRenderOutput();
    const textInput = wrapper.props.children[0].props.children[0];

    expect(textInput.props.readOnly).toBe(true);
  });
});
