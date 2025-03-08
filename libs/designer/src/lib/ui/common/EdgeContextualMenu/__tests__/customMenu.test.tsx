import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomMenu, type CustomMenuProps } from '../customMenu';

vi.mock('@fluentui/react-components', () => ({
  Menu: ({ children, ...props }) => <div {...props}>{children}</div>,
  MenuPopover: ({ children, ...props }) => <div {...props}>{children}</div>,
  MenuTrigger: ({ children, ...props }) => <div {...props}>{children}</div>,
  MenuItem: ({ children, ...props }) => <div {...props}>{children}</div>,
  MenuList: ({ children, ...props }) => <div {...props}>{children}</div>,
}));

const mockItem = {
  text: 'Main Item',
  icon: 'icon-main',
  subMenuItems: [
    { text: 'Sub Item 1', icon: 'icon-sub1', onClick: vi.fn() },
    { text: 'Sub Item 2', icon: 'icon-sub2', onClick: vi.fn() },
  ],
};

const renderCustomMenu = (props: CustomMenuProps) => {
  return render(<CustomMenu {...props} />);
};

describe('CustomMenu', () => {
  it('should render main menu item', () => {
    renderCustomMenu({ item: mockItem });

    expect(screen.getByText('Main Item')).toBeDefined();
  });

  it('should toggle submenu on main menu item click', () => {
    renderCustomMenu({ item: mockItem });

    const mainMenuItem = screen.getByText('Main Item');
    fireEvent.click(mainMenuItem);

    // Check if submenu items are rendered
    expect(screen.getByText('Sub Item 1')).toBeDefined();
    expect(screen.getByText('Sub Item 2')).toBeDefined();
  });

  it('should call onClick of submenu item when clicked', () => {
    renderCustomMenu({ item: mockItem });

    const mainMenuItem = screen.getByText('Main Item');
    fireEvent.click(mainMenuItem);

    const subMenuItem1 = screen.getByText('Sub Item 1');
    fireEvent.click(subMenuItem1);

    expect(mockItem.subMenuItems[0].onClick).toHaveBeenCalled();
  });
});
