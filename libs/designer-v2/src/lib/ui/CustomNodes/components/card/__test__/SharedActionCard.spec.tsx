import { createRef } from 'react';
import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionCardProps } from '../actionCard';
import { SharedActionCard } from '../SharedActionCard';
import { OperationNodeCard } from '../OperationNodeCard';
import { getOperationNodeSubtitle, mapSharedRunStatus } from '../nodeUiStrings';
import { useCardStyles } from '../card.styles';
import * as Intl from 'react-intl';
import { getNodeGlyph } from '@microsoft/designer-ui-v2';
import { getOperationNodeGlyph, getOperationNodeVisualKind } from '../operationNodeGlyphs';

const option = vi.hoisted(() => ({ enabled: false }));
vi.mock('../../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useSharedNodeUi: () => option.enabled,
}));

const props: ActionCardProps = {
  id: 'action',
  title: 'Send request',
  connectorName: 'HTTP',
  icon: 'icon.svg',
  nodeIndex: 2,
  drag: vi.fn(),
  dragPreview: vi.fn(),
};

beforeEach(() => {
  option.enabled = false;
  vi.clearAllMocks();
});

describe('shared host action adapter', () => {
  it('normalizes raw identity without copying shared visual pairs or using the display name', () => {
    expect(getOperationNodeVisualKind('CoMpOsE')).toBe('compose');
    expect(getOperationNodeGlyph('CoMpOsE')).toMatchObject({
      icon: { type: getNodeGlyph('compose').regular },
      selectedIcon: { type: getNodeGlyph('compose').filled },
    });
    expect(getOperationNodeVisualKind('XmlValidation')).toBeNull();
    expect(getOperationNodeGlyph('XmlValidation')).toBeNull();
    expect(getOperationNodeVisualKind('ApiConnection')).toBeUndefined();
    expect(getOperationNodeGlyph('ApiConnection')).toBeUndefined();
    const { container, rerender } = render(<SharedActionCard {...props} operationType="Compose" />);
    const originalId = screen.getByRole('button').id;
    rerender(<SharedActionCard {...props} operationType="Compose" title="HTTP renamed by user" isSelected />);
    expect(screen.getByRole('button')).toHaveAttribute('id', originalId);
    expect(container.querySelector('[data-icon-name="BracesFilled"]')).toBeInTheDocument();
    expect(container.querySelector('[data-icon-name="GlobeFilled"]')).toBeNull();
  });

  it('uses the real trigger identity with the same host interaction contract', () => {
    const ref = createRef<HTMLDivElement>();
    render(<SharedActionCard {...props} isTrigger operationType="Request" ref={ref} isSelected />);
    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('data-node-card', 'trigger');
    expect(card.querySelector('[data-category="trigger"]')).toBeInTheDocument();
    expect(screen.getByText('Trigger · Request')).toBeInTheDocument();
    expect(card).toHaveAttribute('tabindex', '2');
    expect(ref.current).toBe(card);
    expect(props.drag).toHaveBeenCalledWith(card);
    expect(props.dragPreview).toHaveBeenCalledWith(card);
    expect(card.querySelector('[data-handle]')).toBeNull();
  });

  it('passes real metadata into rich hover without duplicating the ordinary card category', async () => {
    render(<SharedActionCard {...props} operationType="Compose" description="Creates one output from the provided input." />);
    fireEvent.mouseEnter(screen.getByRole('button').parentElement!);
    expect(await screen.findByText('Creates one output from the provided input.')).toBeInTheDocument();
    expect(screen.getByText('Action · Compose')).toBeInTheDocument();
    expect(screen.queryByText('Action · Built-in · Compose')).toBeNull();
    expect(screen.getByText('Configured')).toBeInTheDocument();
  });

  it.each([
    ['selected', { isSelected: true }],
    ['dragging', { isDragging: true }],
    ['monitoring', { isMonitoringView: true }],
  ])('suppresses rich hover while %s', async (_state, flags) => {
    render(<SharedActionCard {...props} {...flags} operationType="Compose" description="Suppressed info" />);
    fireEvent.mouseEnter(screen.getByRole('button').parentElement!);
    await new Promise((resolve) => setTimeout(resolve, 420));
    expect(screen.queryByText('Suppressed info')).toBeNull();
  });

  it('uses the canonical Compose Regular/Filled glyph pair rather than its legacy manifest image', () => {
    const { container, rerender } = render(<SharedActionCard {...props} operationType="Compose" />);
    expect(container.querySelector('[data-icon-name="BracesRegular"]')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('Built-in · Compose')).toBeInTheDocument();
    rerender(<SharedActionCard {...props} operationType="Compose" isSelected />);
    expect(container.querySelector('[data-icon-name="BracesFilled"]')).toBeInTheDocument();
    expect(container.querySelector('[data-icon-name="BracesRegular"]')).toBeNull();
  });

  it('retains the branded connector image and Azure subtitle across selection', () => {
    const { container, rerender } = render(
      <SharedActionCard {...props} operationType="ApiConnection" connectorName="Office 365 Outlook" />
    );
    const image = container.querySelector('img');
    expect(image).toHaveAttribute('src', 'icon.svg');
    expect(screen.getByText('Azure · Office 365 Outlook')).toBeInTheDocument();
    rerender(<SharedActionCard {...props} operationType="ApiConnection" connectorName="Office 365 Outlook" isSelected />);
    expect(container.querySelector('img')).toBe(image);
  });

  it('localizes category and type while preserving intentionally empty connector display names', () => {
    const intl = Intl.createIntl({
      locale: 'fr',
      defaultLocale: 'fr',
      messages: { '+DmIHG': 'Intégré', YbWOeB: 'Composer' },
    });
    vi.spyOn(Intl, 'useIntl').mockReturnValue(intl);
    const { rerender } = render(<SharedActionCard {...props} operationType="Compose" />);
    expect(screen.getByText('Intégré · Composer')).toBeInTheDocument();
    rerender(<SharedActionCard {...props} operationType="ApiConnection" connectorName="" />);
    expect(screen.queryByText(/Azure ·/)).toBeNull();
    expect(screen.queryByText('ApiConnection')).toBeNull();
  });

  it('does not replace empty translations or repeat a category already used as the display name', () => {
    const intl = Intl.createIntl({
      locale: 'fr',
      fallbackOnEmptyString: false,
      messages: { '+DmIHG': 'Intégré', YbWOeB: '', uVsa1i: 'Azure' },
    });
    expect(getOperationNodeSubtitle(intl, 'Compose', undefined, undefined, false, false)).toBe('Intégré');
    expect(getOperationNodeSubtitle(intl, 'ApiConnection', undefined, 'Azure', false, false)).toBe('Azure');
    expect(getOperationNodeSubtitle(intl, 'ApiConnection', undefined, '', false, false)).toBe('Azure');
  });

  it('does not equate missing icon or settled empty metadata with loading', () => {
    const { rerender } = render(<SharedActionCard {...props} icon={undefined} operationType="Compose" />);
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy');
    rerender(<SharedActionCard {...props} icon={undefined} operationType="Compose" metadataUnavailable />);
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByAltText('Errors')).toBeInTheDocument();
    rerender(<SharedActionCard {...props} icon={undefined} errorMessages={['Error fetching manifest']} />);
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByAltText('Errors')).toBeInTheDocument();
  });

  it.each([
    ['Request', 'Globe'],
    ['Http', 'Globe'],
    ['HttpWithSwagger', 'Globe'],
    ['HttpWebhook', 'Globe'],
    ['Response', 'ArrowReply'],
    ['Recurrence', 'Clock'],
    ['Wait', 'Timer'],
    ['Delay', 'Timer'],
    ['DelayUntil', 'Timer'],
    ['Compose', 'Braces'],
    ['ParseJson', 'DocumentData'],
    ['InitializeVariable', 'BracesVariable'],
    ['SetVariable', 'BracesVariable'],
    ['IncrementVariable', 'BracesVariable'],
    ['DecrementVariable', 'BracesVariable'],
    ['AppendToArrayVariable', 'BracesVariable'],
    ['AppendToStringVariable', 'BracesVariable'],
    ['Table', 'Table'],
    ['Select', 'Table'],
    ['Query', 'Filter'],
    ['Join', 'Merge'],
    ['CurrentTime', 'CalendarClock'],
    ['AddToTime', 'CalendarClock'],
    ['SubtractFromTime', 'CalendarClock'],
    ['GetFutureTime', 'CalendarClock'],
    ['GetPastTime', 'CalendarClock'],
    ['ConvertTimeZone', 'CalendarClock'],
    ['JavaScriptCode', 'Code'],
    ['InlineJavaScript', 'Code'],
    ['ExecutePythonCode', 'Code'],
    ['InlinePython', 'Code'],
    ['Terminate', 'Prohibited'],
    ['Workflow', 'Flow'],
  ])('retains the canonical %s glyph pair %s', (operationType, glyph) => {
    const { container, rerender } = render(<SharedActionCard {...props} operationType={operationType} />);
    expect(container.querySelector(`[data-icon-name="${glyph}Regular"]`)).toBeInTheDocument();
    rerender(<SharedActionCard {...props} operationType={operationType} isSelected />);
    expect(container.querySelector(`[data-icon-name="${glyph}Filled"]`)).toBeInTheDocument();
  });

  it('uses the canonical default for unmapped built-ins and failed connector images without a false spinner', () => {
    const { container, rerender } = render(<SharedActionCard {...props} operationType="XmlValidation" />);
    expect(container.querySelector('[data-icon-name="FlashRegular"]')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
    rerender(<SharedActionCard {...props} operationType="ApiConnection" />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[data-icon-name="FlashRegular"]')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).toBeNull();
    rerender(<SharedActionCard {...props} operationType="ApiConnection" icon="new-logo.svg" />);
    expect(container.querySelector('img')).toHaveAttribute('src', 'new-logo.svg');
  });

  it('keeps known built-in identity while metadata fetches and removes loading when it settles', () => {
    const { container, rerender } = render(<SharedActionCard {...props} operationType="Compose" isLoading />);
    expect(container.querySelector('[data-icon-name="BracesRegular"]')).toBeInTheDocument();
    expect(screen.getByText('Built-in · Compose')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    rerender(<SharedActionCard {...props} operationType="Compose" isLoading={false} />);
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy');
  });

  it('uses the canonical connector loading treatment only while its metadata is unresolved', () => {
    const { rerender } = render(<SharedActionCard {...props} icon={undefined} operationType="ApiConnection" isLoading />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    rerender(<SharedActionCard {...props} operationType="ApiConnection" connectorName="Office 365 Outlook" isLoading={false} />);
    expect(screen.queryByText('Loading...')).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByText('Azure · Office 365 Outlook')).toBeInTheDocument();
  });

  it('uses the legacy renderer by default and switches to actual shared presentation only when enabled', () => {
    const { container, rerender } = render(<OperationNodeCard {...props} />);
    expect(container.querySelector('[data-node-card="action"]')).toBeNull();
    option.enabled = true;
    rerender(<OperationNodeCard {...props} />);
    expect(screen.getByRole('button')).toHaveAttribute('data-node-card', 'action');
    expect(screen.getByRole('button')).toHaveAccessibleName('Send request operation, HTTP connector');
    option.enabled = false;
    rerender(<OperationNodeCard {...props} />);
    expect(container.querySelector('[data-node-card="action"]')).toBeNull();
  });

  it('keeps the accepted renderer while the live flag waits for matching geometry', () => {
    option.enabled = true;
    const { container, rerender } = render(<OperationNodeCard {...props} sharedPresentation={false} />);
    expect(container.querySelector('[data-node-card]')).toBeNull();
    option.enabled = false;
    rerender(<OperationNodeCard {...props} sharedPresentation />);
    expect(screen.getByRole('button')).toHaveAttribute('data-node-card', 'action');
  });

  it.each(['action', 'subWorkflow', 'mcp'] as const)(
    'uses the canonical compact %s tool row without losing host interactions',
    (toolKind) => {
      const onClick = vi.fn();
      const { container, rerender } = render(<SharedActionCard {...props} toolKind={toolKind} onClick={onClick} />);
      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('data-node-card', 'tool');
      expect(card).toHaveAttribute('data-tool-kind', toolKind);
      expect(card).toHaveAttribute('id', 'msla-node-action');
      expect(card).toHaveAttribute('tabindex', '2');
      expect(card).toHaveAccessibleName(`${toolKind === 'mcp' ? 'MCP tool' : 'Tool'}: Send request`);
      expect(card).toHaveAttribute('aria-pressed', 'false');
      expect(getComputedStyle(card.firstElementChild!).minHeight).toBe('56px');
      fireEvent.click(card);
      expect(onClick).toHaveBeenCalledOnce();
      if (toolKind === 'mcp') {
        expect(container.querySelector('img')).toBeNull();
        expect(container.querySelector('[data-icon-name="PlugConnectedRegular"]')).toBeInTheDocument();
        expect(screen.getByText('Type · MCP')).toBeInTheDocument();
        rerender(<SharedActionCard {...props} toolKind={toolKind} isSelected isLoading />);
        expect(container.querySelector('[data-icon-name="PlugConnectedRegular"]')).toBeInTheDocument();
        expect(container.querySelector('img')).toBeNull();
      } else if (toolKind === 'subWorkflow') {
        expect(screen.getByText('Sub-workflow')).toBeInTheDocument();
      }
    }
  );

  it('announces tool selection without changing the action name or inventing a not-invoked monitoring state', () => {
    const { rerender } = render(<SharedActionCard {...props} toolKind="action" />);
    const card = screen.getByRole('button', { name: 'Tool: Send request', pressed: false });
    rerender(<SharedActionCard {...props} toolKind="action" isSelected active={false} />);
    expect(card).toHaveAccessibleName('Tool: Send request');
    expect(card).toHaveAttribute('aria-pressed', 'true');
    rerender(<SharedActionCard {...props} isSelected />);
    expect(screen.getByRole('button')).toHaveAccessibleName('Send request operation, HTTP connector');
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-pressed');
  });

  it('localizes the canonical tool accessible name through host messages', () => {
    const intl = Intl.createIntl({
      locale: 'fr',
      defaultLocale: 'fr',
      messages: { '0Rn3S4': 'Outil MCP : {title}', '0IYCac': 'Outil : {title}' },
    });
    vi.spyOn(Intl, 'useIntl').mockReturnValue(intl);
    const { rerender } = render(<SharedActionCard {...props} toolKind="mcp" />);
    expect(screen.getByRole('button', { name: 'Outil MCP : Send request', pressed: false })).toBeInTheDocument();
    rerender(<SharedActionCard {...props} toolKind="subWorkflow" isSelected />);
    expect(screen.getByRole('button', { name: 'Outil : Send request', pressed: true })).toBeInTheDocument();
  });

  it('composes DnD, preview, external and forwarded refs on the focusable card, including detach', () => {
    const rootRef = createRef<HTMLDivElement>();
    const forwarded = createRef<HTMLDivElement>();
    const { unmount } = render(<SharedActionCard {...props} ref={forwarded} rootRef={rootRef} />);
    const card = screen.getByRole('button');
    expect(forwarded.current).toBe(card);
    expect(rootRef.current).toBe(card);
    expect(props.drag).toHaveBeenCalledWith(card);
    expect(props.dragPreview).toHaveBeenCalledWith(card);
    unmount();
    expect(forwarded.current).toBeNull();
    expect(rootRef.current).toBeNull();
    expect(props.drag).toHaveBeenLastCalledWith(null);
    expect(props.dragPreview).toHaveBeenLastCalledWith(null);
  });

  it('focuses without native scrolling only on a false-to-true focus request', () => {
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    const { rerender } = render(<SharedActionCard {...props} setFocus />);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    const count = focus.mock.calls.length;
    rerender(<SharedActionCard {...props} setFocus title="Renamed" />);
    expect(focus).toHaveBeenCalledTimes(count);
    rerender(<SharedActionCard {...props} setFocus={false} />);
    rerender(<SharedActionCard {...props} setFocus />);
    expect(focus).toHaveBeenCalledTimes(count + 1);
  });

  it('preserves indexed tab order, selection/pin/Copilot and loading/secure/comment/static-result states', () => {
    render(
      <SharedActionCard
        {...props}
        isSelected
        isPinned
        copilotModified
        isLoading
        isLoadingDynamicData
        staticResultsEnabled
        isSecureInputsOutputs
        comment="A comment"
      />
    );
    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('tabindex', '2');
    expect(card).toHaveAttribute('data-selected', 'true');
    expect(card).toHaveAttribute('data-pinned', 'true');
    expect(card).toHaveAttribute('data-copilot-modified', 'true');
    expect(screen.getByTestId('card-indicator-static-results')).toBeInTheDocument();
    expect(screen.getByTestId('card-indicator-comment')).toBeInTheDocument();
    expect(screen.getByTestId('card-indicator-secure-inputs-outputs')).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar', { name: 'Loading operation' })).toHaveLength(2);
    expect(screen.getAllByRole('progressbar', { hidden: true })).toHaveLength(2);
    expect(card.querySelector('[data-handle]')).toBeNull();
  });

  it('exposes primary operation loading to assistive technology without dynamic-data loading', () => {
    render(<SharedActionCard {...props} isLoading isLoadingDynamicData={false} />);
    expect(screen.getByRole('progressbar', { name: 'Loading operation' })).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('localizes primary loading through the extracted host message and clears busy state when complete', () => {
    const intl = Intl.createIntl({
      locale: 'fr',
      defaultLocale: 'fr',
      messages: { CFLJFK: 'Chargement de l’opération' },
    });
    vi.spyOn(Intl, 'useIntl').mockReturnValue(intl);
    const { rerender } = render(<SharedActionCard {...props} isLoading />);
    expect(screen.getByRole('progressbar', { name: 'Chargement de l’opération' })).toBeInTheDocument();
    rerender(<SharedActionCard {...props} isLoading={false} />);
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy');
  });

  it('retains the existing host Copilot gradient treatment and its reduced-motion fallback', () => {
    const { result } = renderHook(useCardStyles);
    const { rerender } = render(<SharedActionCard {...props} copilotModified />);
    const card = screen.getByRole('button');
    const treatment = result.current.copilotModified.split(' ').filter((name) => name.startsWith('f'));
    expect(treatment.length).toBeGreaterThan(0);
    expect(card).toHaveClass(...treatment);
    const css = Array.from(document.styleSheets)
      .flatMap((sheet) => Array.from(sheet.cssRules))
      .map((rule) => rule.cssText)
      .join('\n');
    expect(css).toContain('linear-gradient(90deg');
    expect(css).toMatch(/animation-duration:\s*1.5s/);
    expect(css).toMatch(/@media \(prefers-reduced-motion\)[\s\S]*animation-name:\s*none/);
    rerender(<SharedActionCard {...props} copilotModified={false} />);
    expect(card).not.toHaveClass(treatment[0]);
  });

  it('preserves canvas propagation, primary, context, delete and copy keyboard behavior', () => {
    const onClick = vi.fn();
    const onDeleteClick = vi.fn();
    const onCopyClick = vi.fn();
    const onContextMenu = vi.fn();
    const parent = vi.fn();
    render(
      <div onClick={parent}>
        <SharedActionCard
          {...props}
          onClick={onClick}
          onDeleteClick={onDeleteClick}
          onCopyClick={onCopyClick}
          onContextMenu={onContextMenu}
        />
      </div>
    );
    const card = screen.getByRole('button');
    fireEvent.click(card);
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });
    fireEvent.keyDown(card, { key: 'Delete' });
    fireEvent.keyDown(card, { key: 'c', ctrlKey: true });
    fireEvent.contextMenu(card);
    expect(onClick).toHaveBeenCalledTimes(3);
    expect(onDeleteClick).toHaveBeenCalledOnce();
    expect(onCopyClick).toHaveBeenCalledOnce();
    expect(onContextMenu).toHaveBeenCalledOnce();
    expect(parent).not.toHaveBeenCalled();
  });

  it('preserves all error messages and gives monitoring status priority without duplicate presentation', () => {
    const { rerender } = render(<SharedActionCard {...props} errorMessages={['Error one', 'Error two']} />);
    expect(screen.getByLabelText('Errors: 2')).toBeInTheDocument();
    rerender(
      <SharedActionCard
        {...props}
        errorMessages={['Error one']}
        runData={{ status: 'Succeeded', duration: '1s' } as ActionCardProps['runData']}
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent('Succeeded 1s');
    expect(screen.queryByAltText('Errors')).toBeNull();
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it.each(['Waiting', 'Resuming', 'Custom runtime state'])('does not lose monitoring label %s', (status) => {
    render(<SharedActionCard {...props} runData={{ status } as ActionCardProps['runData']} active={false} />);
    expect(screen.getByRole('status')).toHaveTextContent(status);
  });

  it.each([
    ['TimedOut', 'failed'],
    ['Aborted', 'cancelled'],
    ['SucceededWithWarning', 'warning'],
    ['Skipped', 'skipped'],
    ['Error', 'error'],
    [undefined, undefined],
  ])('maps service status %s to presentation %s in the host', (status, expected) => {
    expect(mapSharedRunStatus(status)).toBe(expected);
  });
});
