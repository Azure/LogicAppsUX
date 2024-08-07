import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { DropZone } from '../dropzone';
import { InitUiInteractionsService, IntlProvider, type TopLevelDropdownMenuItem } from '@microsoft/logic-apps-shared';
import { renderWithRedux } from '../../../__test__/redux-test-helper';
import { QueryClientProvider } from '@tanstack/react-query';
import { getReactQueryClient } from '../../../core';

const queryClient = getReactQueryClient();
const intlOnError = vi.fn();
vi.mock('@fluentui/react-components', async (importOriginal) => {
  const original: { key: [object] } = await importOriginal();
  return {
    ...original,
    Popover: ({ children, ...props }) => <div {...props}>{children}</div>,
    PopoverTrigger: ({ children, ...props }) => <div {...props}>{children}</div>,
    PopoverSurface: ({ children, ...props }) => <div {...props}>{children}</div>,
    MenuItem: ({ children, ...props }) => <div {...props}>{children}</div>,
    MenuList: ({ children, ...props }) => <div {...props}>{children}</div>,
    MenuDivider: ({ children, ...props }) => <div {...props}>{children}</div>,
    Tooltip: ({ children, ...props }) => <div {...props}>{children}</div>,
  };
});

vi.mock('@microsoft/designer-ui', async (importOriginal) => {
  const original: { key: [object] } = await importOriginal();
  return {
    ...original,
    ActionButtonV2: ({ children, ...props }) => <div className={'action-button'}>{'action button'}</div>,
    PanelLocation: ({ children, ...props }) => <div {...props}>{children}</div>,
  };
});

vi.mock('../customMenu', () => ({
  CustomMenu: ({ children, ...props }) => <div className={'custom-menu'}>{'custom menu'}</div>,
}));

vi.spyOn(React, 'useCallback').mockImplementation(vi.fn());
vi.mock('@xyflow/react', async () => {
  const original = await vi.importActual('@xyflow/react');
  return {
    ...original,
    useOnViewportChange: vi.fn(),
  };
});

vi.mock('react-redux', async () => {
  const original = await vi.importActual('react-redux');
  return {
    ...original,
    useDispatch: vi.fn(),
  };
});

vi.mock('react-dnd', async () => {
  const actual = await vi.importActual('react-dnd');
  return {
    ...actual,
    useDrop: vi.fn(() => [
      { isOver: false, canDrop: true },
      (node) => {
        if (node) {
          node.current = node; // Mock setting the current property
        }
      },
    ]),
  };
});

vi.mock('react-intl', async () => {
  const actualIntl = await vi.importActual('react-intl');
  return {
    ...actualIntl,
    useIntl: () => ({
      formatMessage: vi.fn(() => 'tooltip'),
    }),
  };
});

vi.mock('react-hotkeys-hook', async () => {
  const actualHotkeysHook = await vi.importActual('react-hotkeys-hook');
  return {
    ...actualHotkeysHook,
    useHotkeys: vi.fn(() => [{ current: null }, vi.fn()]),
  };
});

describe('DropZone component handling of empty or undefined menu items', () => {
  it('renders correctly when getAddButtonMenuItems returns undefined', async () => {
    const uiInteractionsService = { getAddButtonMenuItems: vi.fn() };
    InitUiInteractionsService(uiInteractionsService);
    uiInteractionsService.getAddButtonMenuItems.mockReturnValue(undefined);
    const renderer = renderWithRedux(
      <QueryClientProvider client={queryClient}>
        <IntlProvider locale={''} defaultLocale={''} onError={intlOnError}>
          <DropZone graphId="root" parentId="parent" />
        </IntlProvider>
      </QueryClientProvider>
    );
    const container = renderer.root;
    expect(container.findByProps({ className: 'action-button' }).children).toEqual(['action button']);
    expect(container.findAllByProps({ className: 'custom-menu' })).toEqual([]);
  });

  it('renders correctly when getAddButtonMenuItems returns an empty array', async () => {
    const uiInteractionsService = { getAddButtonMenuItems: vi.fn() };
    InitUiInteractionsService(uiInteractionsService);
    uiInteractionsService.getAddButtonMenuItems.mockReturnValue([]);

    const renderer = renderWithRedux(
      <QueryClientProvider client={queryClient}>
        <IntlProvider locale={''} defaultLocale={''} onError={intlOnError}>
          <DropZone graphId="root" parentId="parent" />
        </IntlProvider>
      </QueryClientProvider>
    );
    const container = renderer.root;
    expect(container.findByProps({ className: 'action-button' }).children).toEqual(['action button']);
    expect(container.findAllByProps({ className: 'custom-menu' })).toEqual([]);
  });

  it('renders correctly when getAddButtonMenuItems returns array with items', async () => {
    const uiInteractionsService = { getAddButtonMenuItems: vi.fn() };
    InitUiInteractionsService(uiInteractionsService);
    const mockItem: TopLevelDropdownMenuItem = {
      text: 'mockItem',
      onClick: () => {},
    };
    uiInteractionsService.getAddButtonMenuItems.mockReturnValue([mockItem]);

    const renderer = renderWithRedux(
      <QueryClientProvider client={queryClient}>
        <IntlProvider locale={''} defaultLocale={''} onError={intlOnError}>
          <DropZone graphId="root" parentId="parent" />
        </IntlProvider>
      </QueryClientProvider>
    );
    const container = renderer.root;
    expect(container.findByProps({ className: 'action-button' }).children).toEqual(['action button']);
    expect(container.findByProps({ className: 'custom-menu' }).children).toEqual(['custom menu']);
  });
});
