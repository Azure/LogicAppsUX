import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { IntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PanelContent, type PanelContentProps } from '../panelcontent';
import type { PanelTab } from '../panelUtil';

const tabsFor = (nodeId: string): PanelTab[] => [
  { id: 'PARAMETERS', title: 'Parameters', visible: true, order: 0, content: <div>{nodeId} parameters</div> },
  { id: 'SETTINGS', title: 'Settings', visible: true, order: 1, content: <div>{nodeId} settings</div> },
  { id: 'ABOUT', title: 'About', visible: true, order: 2, content: <div>{nodeId} about</div> },
];

const wrapper = ({ children }: { children: ReactNode }) => <IntlProvider locale="en">{children}</IntlProvider>;

const StatefulPreview = ({ serializedContent }: { serializedContent: string }) => {
  const [editCount, setEditCount] = useState(0);
  return (
    <>
      <input aria-label="Draft JSON" defaultValue={serializedContent} onChange={() => setEditCount((count) => count + 1)} />
      <p>Edits: {editCount}</p>
    </>
  );
};

describe('PanelContent tab preference', () => {
  let props: PanelContentProps;
  let restoreLayout: () => void;

  beforeEach(() => {
    // The DOM emulator has no layout; keep the real Fluent tabs out of the overflow menu.
    const width = function (this: HTMLElement) {
      return this.getAttribute('role') === 'tablist' ? 800 : 80;
    };
    const clientWidth = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(width);
    const offsetWidth = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(width);
    const bounds = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return new DOMRect(0, 0, width.call(this), 32);
    });
    restoreLayout = () => {
      clientWidth.mockRestore();
      offsetWidth.mockRestore();
      bounds.mockRestore();
    };
    props = { nodeId: 'First', tabs: tabsFor('First'), selectedTab: 'SETTINGS', selectTab: vi.fn(), trackEvent: vi.fn() };
  });

  afterEach(() => {
    cleanup();
    restoreLayout();
  });

  it('retains a valid preferred tab while rerendering content for another node', () => {
    const { rerender } = render(<PanelContent {...props} />, { wrapper });
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('First settings')).toBeVisible();

    rerender(<PanelContent {...props} nodeId="Second" tabs={tabsFor('Second')} />);
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Second settings')).toBeVisible();
    expect(screen.queryByText('First settings')).not.toBeInTheDocument();
    expect(props.selectTab).not.toHaveBeenCalled();
  });

  it('falls back without replacing the preference, then restores it on a compatible node', () => {
    const { rerender } = render(<PanelContent {...props} />, { wrapper });
    const limitedTabs = tabsFor('Limited').filter(({ id }) => id !== 'SETTINGS');
    rerender(<PanelContent {...props} nodeId="Limited" tabs={limitedTabs} />);
    expect(screen.queryByRole('tab', { name: 'Settings' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Parameters' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Limited parameters')).toBeVisible();
    expect(props.selectTab).not.toHaveBeenCalled();

    rerender(<PanelContent {...props} nodeId="Compatible" tabs={tabsFor('Compatible')} />);
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Compatible settings')).toBeVisible();
    expect(screen.queryByText('Limited parameters')).not.toBeInTheDocument();
    expect(props.selectTab).not.toHaveBeenCalled();
  });

  it('uses the first available tab rather than a hard-coded Parameters fallback', () => {
    const { rerender } = render(<PanelContent {...props} />, { wrapper });
    rerender(<PanelContent {...props} nodeId="AboutOnly" tabs={tabsFor('AboutOnly').filter(({ id }) => id === 'ABOUT')} />);
    expect(screen.getByRole('region', { name: 'About' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByText('AboutOnly about')).toBeVisible();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(props.selectTab).not.toHaveBeenCalled();
  });

  it('uses the first available tab when no preference was selected', () => {
    render(<PanelContent {...props} selectedTab={undefined} />, { wrapper });
    expect(screen.getByRole('tab', { name: 'Parameters' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('First parameters')).toBeVisible();
    expect(props.selectTab).not.toHaveBeenCalled();
  });

  it('handles an empty available-tab list and restores the preference when tabs return', () => {
    const { rerender, container } = render(<PanelContent {...props} />, { wrapper });
    rerender(<PanelContent {...props} nodeId="Empty" tabs={[]} />);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(container.querySelector('.msla-panel-content-container')).toBeEmptyDOMElement();
    expect(screen.queryByText('First settings')).not.toBeInTheDocument();
    expect(props.selectTab).not.toHaveBeenCalled();

    rerender(<PanelContent {...props} nodeId="Restored" tabs={tabsFor('Restored')} />);
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Restored settings')).toBeVisible();
    expect(props.selectTab).not.toHaveBeenCalled();
  });

  it('preserves the single-subgraph content exception even when its tab is not visible', () => {
    const singleTab = { ...tabsFor('SwitchCase')[0], visible: false };
    render(<PanelContent {...props} nodeId="SwitchCase" tabs={[singleTab]} />, { wrapper });
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getByText('SwitchCase parameters')).toBeVisible();
    expect(props.selectTab).not.toHaveBeenCalled();
  });

  it('only changes the preference through an explicit tab selection', () => {
    const { rerender } = render(<PanelContent {...props} />, { wrapper });
    fireEvent.click(screen.getByRole('tab', { name: 'About' }));
    expect(props.selectTab).toHaveBeenCalledExactlyOnceWith('ABOUT');
    rerender(<PanelContent {...props} selectedTab="ABOUT" />);
    expect(screen.getByRole('tab', { name: 'About' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('First about')).toBeVisible();
    expect(props.selectTab).toHaveBeenCalledOnce();
  });

  it.each([
    { name: 'same-node rerender preserves the draft and local state', nextNodeId: 'NodeA', preservesDraft: true },
    { name: 'different-node rerender discards the draft and local state', nextNodeId: 'NodeB', preservesDraft: false },
  ])('$name even when serialized content and selected tab are identical', ({ nextNodeId, preservesDraft }) => {
    const serializedContent = '{"type":"Compose","inputs":"original"}';
    const unsavedContent = '{"type":"Compose","inputs":"unsaved node A edit"}';
    const previewTabs = (): PanelTab[] => [
      ...tabsFor('Identical'),
      {
        id: 'CODE_VIEW',
        title: 'Code preview',
        visible: true,
        order: 3,
        content: <StatefulPreview serializedContent={serializedContent} />,
      },
    ];
    const { rerender } = render(<PanelContent {...props} nodeId="NodeA" tabs={previewTabs()} selectedTab="CODE_VIEW" />, { wrapper });
    const tabStrip = screen.getByRole('tablist');
    const originalInput = screen.getByRole('textbox', { name: 'Draft JSON' });
    fireEvent.change(originalInput, { target: { value: unsavedContent } });
    expect(originalInput).toHaveValue(unsavedContent);
    expect(screen.getByText('Edits: 1')).toBeVisible();

    rerender(<PanelContent {...props} nodeId={nextNodeId} tabs={previewTabs()} selectedTab="CODE_VIEW" />);
    const currentInput = screen.getByRole('textbox', { name: 'Draft JSON' });
    expect(currentInput === originalInput).toBe(preservesDraft);
    expect(currentInput).toHaveValue(preservesDraft ? unsavedContent : serializedContent);
    expect(screen.getByText(`Edits: ${preservesDraft ? 1 : 0}`)).toBeVisible();
    expect(screen.getByRole('tablist')).toBe(tabStrip);
    expect(screen.getByRole('tab', { name: 'Code preview' })).toHaveAttribute('aria-selected', 'true');
    expect(props.selectTab).not.toHaveBeenCalled();

    if (!preservesDraft) {
      expect(originalInput).not.toBeInTheDocument();
      rerender(<PanelContent {...props} nodeId="NodeA" tabs={previewTabs()} selectedTab="CODE_VIEW" />);
      expect(screen.getByRole('textbox', { name: 'Draft JSON' })).toHaveValue(serializedContent);
      expect(screen.getByText('Edits: 0')).toBeVisible();
    }
  });
});
