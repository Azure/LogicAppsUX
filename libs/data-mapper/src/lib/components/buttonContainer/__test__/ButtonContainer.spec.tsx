import { ButtonContainer } from '../ButtonContainer';
import type { ButtonContainerButtonProps } from '../ButtonContainer';
import { AddRegular, AddFilled } from '@fluentui/react-icons';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('ButtonContainer', () => {
  const mockButtons: ButtonContainerButtonProps[] = [
    {
      regularIcon: AddRegular,
      filledIcon: AddFilled,
      tooltip: 'Add',
      onClick: vi.fn(),
    },
  ];

  it('renders without crashing', () => {
    const { container } = render(<ButtonContainer buttons={mockButtons} horizontal={true} xPos="0px" yPos="0px" />);
    expect(container).toBeDefined();
  });

  it('renders with anchorToBottom', () => {
    const { container } = render(<ButtonContainer buttons={mockButtons} horizontal={false} xPos="10px" yPos="20px" anchorToBottom />);
    expect(container).toBeDefined();
  });
});
