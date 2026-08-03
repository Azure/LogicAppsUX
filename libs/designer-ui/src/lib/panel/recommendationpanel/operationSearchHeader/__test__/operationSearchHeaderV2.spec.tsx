/**
 * @vitest-environment jsdom
 */
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { OperationSearchHeaderV2 } from '../OperationSearchHeaderV2';

const renderHeader = (props: Partial<React.ComponentProps<typeof OperationSearchHeaderV2>> = {}) =>
  render(
    <IntlProvider locale="en">
      <OperationSearchHeaderV2 searchCallback={vi.fn()} isTriggerNode={false} {...props} />
    </IntlProvider>
  );

describe('OperationSearchHeaderV2', () => {
  afterEach(() => {
    cleanup();
  });

  it('uses the action placeholder by default', () => {
    renderHeader();

    expect(screen.getByPlaceholderText('Search for an action')).toBeDefined();
  });

  it('uses the trigger placeholder for a trigger node', () => {
    renderHeader({ isTriggerNode: true });

    expect(screen.getByPlaceholderText('Search for a trigger')).toBeDefined();
  });

  it('uses the connector placeholder when operations are hidden', () => {
    renderHeader({ hideOperations: true });

    expect(screen.getByPlaceholderText('Search for a connector')).toBeDefined();
  });

  it('prefers an explicit placeholder over every default', () => {
    renderHeader({ placeholder: 'Search for an MCP server', isTriggerNode: true, hideOperations: true });

    expect(screen.getByPlaceholderText('Search for an MCP server')).toBeDefined();
    expect(screen.queryByPlaceholderText('Search for a trigger')).toBeNull();
  });

  it('renders the current search term and reports changes', () => {
    const searchCallback = vi.fn();
    renderHeader({ searchTerm: 'github', searchCallback });

    const searchBox = screen.getByPlaceholderText('Search for an action') as HTMLInputElement;
    expect(searchBox.value).toBe('github');

    fireEvent.change(searchBox, { target: { value: 'slack' } });
    expect(searchCallback).toHaveBeenCalledWith('slack');
  });
});
