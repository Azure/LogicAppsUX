import { ButtonPivot } from '../ButtonPivot';
import type { ButtonPivotButtonProps } from '../ButtonPivot';
import { AddRegular, AddFilled } from '@fluentui/react-icons';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('ButtonPivot', () => {
  const mockButtons: ButtonPivotButtonProps[] = [
    {
      regularIcon: AddRegular,
      filledIcon: AddFilled,
      tooltip: 'Add',
      value: 'add',
    },
  ];

  it('renders without crashing', () => {
    const { container } = render(<ButtonPivot buttons={mockButtons} horizontal={true} xPos="0px" yPos="0px" selectedValue="add" />);
    expect(container).toBeDefined();
  });

  it('renders with onTabSelect handler', () => {
    const onTabSelect = vi.fn();
    const { container } = render(
      <ButtonPivot buttons={mockButtons} horizontal={false} xPos="10px" yPos="20px" selectedValue="add" onTabSelect={onTabSelect} />
    );
    expect(container).toBeDefined();
  });
});
