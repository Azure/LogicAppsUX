import { Children, forwardRef, isValidElement, useId } from 'react';
import type { HTMLAttributes, MouseEvent } from 'react';
import { Button, makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import { AddRegular, ChevronDownRegular, ChevronUpRegular } from '@fluentui/react-icons';
import { designerUiTokens } from '../../theme/tokens';
import { nodeMetrics } from '../metrics';
import type { AgentToolsStrings } from '../strings';
import { defaultNodeStrings } from '../strings';

const panelSurface = {
  boxSizing: 'border-box',
  ...shorthands.border(tokens.strokeWidthThin, 'solid', tokens.colorNeutralStroke3),
  borderRadius: tokens.borderRadius2XLarge,
  '@media (forced-colors: active)': { ...shorthands.borderColor('CanvasText') },
} as const;

const useStyles = makeStyles({
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    width: `${nodeMetrics.cards.agent.width}px`,
    padding: tokens.spacingHorizontalL,
    color: tokens.colorNeutralForeground1,
    ...panelSurface,
  },
  opaqueSurface: {
    backgroundColor: designerUiTokens.nodeAgentSurface,
  },
  transparentSurface: {
    backgroundColor: 'transparent',
    ...shorthands.borderColor('transparent'),
    '@media (forced-colors: active)': { ...shorthands.borderColor('transparent') },
  },
  decoration: {
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    ...panelSurface,
  },
  header: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalSNudge, height: `${nodeMetrics.toolsHeader}px` },
  headerButton: { width: `${nodeMetrics.toolsHeader}px`, height: `${nodeMetrics.toolsHeader}px`, minWidth: 0, padding: 0 },
  heading: {
    flexGrow: 1,
    margin: 0,
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightBase300,
  },
  list: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, margin: 0, padding: 0, listStyleType: 'none' },
  addRow: { display: 'flex', justifyContent: 'center' },
  add: { minWidth: 0 },
});

export type AgentToolsSurface = 'opaque' | 'transparent';

export interface AgentToolsDecorationProps extends HTMLAttributes<HTMLElement> {}

export const AgentToolsDecoration = forwardRef<HTMLElement, AgentToolsDecorationProps>(function AgentToolsDecoration(
  { className, ...rest },
  ref
) {
  const styles = useStyles();
  return <section {...rest} ref={ref} className={mergeClasses(styles.decoration, styles.opaqueSurface, className)} />;
});

export interface AgentToolsPanelProps extends HTMLAttributes<HTMLElement> {
  expanded?: boolean;
  onToggleExpanded?: () => void;
  onAddTool?: () => void;
  surface?: AgentToolsSurface;
  strings?: AgentToolsStrings;
}
export const AgentToolsPanel = forwardRef<HTMLElement, AgentToolsPanelProps>(function AgentToolsPanel(
  { children, expanded = true, onToggleExpanded, onAddTool, surface = 'opaque', strings = defaultNodeStrings.tools, className, ...rest },
  ref
) {
  const styles = useStyles();
  const headingId = useId();
  const listId = useId();
  const items = Children.toArray(children);
  const stop = (event: MouseEvent) => event.stopPropagation();
  const add = (event: MouseEvent) => {
    event.stopPropagation();
    onAddTool?.();
  };
  const toggle = (event: MouseEvent) => {
    event.stopPropagation();
    onToggleExpanded?.();
  };
  return (
    <section
      {...rest}
      ref={ref}
      className={mergeClasses(styles.panel, surface === 'opaque' ? styles.opaqueSurface : styles.transparentSurface, className)}
      aria-labelledby={headingId}
      data-testid="agent-tools-panel"
    >
      <div className={styles.header}>
        <h3 id={headingId} className={styles.heading}>
          {strings.heading(items.length)}
        </h3>
        {onAddTool ? (
          <Button
            shape="circular"
            appearance="subtle"
            size="small"
            className={mergeClasses('nodrag', styles.headerButton)}
            icon={<AddRegular />}
            aria-label={strings.addTools}
            onClick={add}
            onMouseDown={stop}
          />
        ) : null}
        {onToggleExpanded ? (
          <Button
            shape="circular"
            appearance="subtle"
            size="small"
            className={mergeClasses('nodrag', styles.headerButton)}
            icon={expanded ? <ChevronUpRegular /> : <ChevronDownRegular />}
            aria-label={expanded ? strings.collapseTools : strings.expandTools}
            aria-expanded={expanded}
            aria-controls={expanded ? listId : undefined}
            onClick={toggle}
            onMouseDown={stop}
          />
        ) : null}
      </div>
      {expanded ? (
        <>
          <ul id={listId} className={styles.list}>
            {items.map((child, index) => (
              <li key={isValidElement(child) ? (child.key ?? index) : index}>{child}</li>
            ))}
          </ul>
          {onAddTool ? (
            <div className={styles.addRow}>
              <Button
                shape="circular"
                className={mergeClasses('nodrag', styles.add)}
                icon={<AddRegular />}
                onClick={add}
                onMouseDown={stop}
              >
                {strings.add}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
});
