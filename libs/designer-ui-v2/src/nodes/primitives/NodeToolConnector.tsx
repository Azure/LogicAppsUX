import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import { AddRegular } from '@fluentui/react-icons';
import { designerUiTokens } from '../../theme/tokens';
import { nodeMetrics } from '../metrics';
import { defaultNodeStrings } from '../strings';
import { NodeHandle } from './NodeHandle';
const m = nodeMetrics.toolConnector;
const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf: 'center' },
  rootHorizontal: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    flexShrink: 0,
    height: `${m.sideRowHeight}px`,
  },
  diamond: {
    boxSizing: 'border-box',
    width: `${m.diamond}px`,
    height: `${m.diamond}px`,
    marginTop: `${-m.diamond / 2}px`,
    marginBottom: `${m.gap}px`,
    transform: 'rotate(45deg)',
    borderRadius: tokens.borderRadiusSmall,
    // 2px stroke matches Otto's diamond connector geometry while keeping forced-colors Canvas/CanvasText contrast.
    ...shorthands.border(tokens.strokeWidthThick, 'solid', tokens.colorNeutralStroke1),
    backgroundColor: designerUiTokens.nodeToolConnectorFill,
    '@media (forced-colors: active)': { ...shorthands.borderColor('CanvasText'), backgroundColor: 'Canvas' },
  },
  diamondHorizontal: {
    marginTop: 0,
    marginBottom: 0,
    marginLeft: `${-m.diamond / 2}px`,
    marginRight: `${m.gap}px`,
  },
  label: {
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    color: tokens.colorNeutralForeground3,
    marginBottom: tokens.spacingVerticalS,
  },
  labelHorizontal: {
    marginBottom: 0,
    marginRight: tokens.spacingHorizontalS,
  },
  line: {
    width: tokens.strokeWidthThin,
    height: `${m.line}px`,
    backgroundColor: tokens.colorNeutralStroke1,
    '@media (forced-colors: active)': { backgroundColor: 'CanvasText' },
  },
  lineHorizontal: {
    width: `${m.line}px`,
    height: tokens.strokeWidthThin,
  },
  add: {
    position: 'relative',
    overflow: 'visible',
    boxSizing: 'border-box',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${m.add}px`,
    height: `${m.add}px`,
    padding: 0,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: designerUiTokens.nodeToolConnectorFill,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase300,
    cursor: 'pointer',
    transitionProperty: 'color, border-color',
    transitionDuration: tokens.durationFast,
    transitionTimingFunction: tokens.curveEasyEase,
    // Expand the interactive hit target from 20x20px to 40x40px without altering the visual circle.
    '::before': {
      content: '""',
      position: 'absolute',
      inset: `calc(-1 * ${tokens.spacingHorizontalS} - ${tokens.strokeWidthThick})`,
    },
    ':hover': { color: tokens.colorNeutralForeground1, ...shorthands.borderColor(tokens.colorNeutralStroke1Hover) },
    ':focus-visible': { outline: `${tokens.strokeWidthThick} solid ${tokens.colorStrokeFocus2}`, outlineOffset: tokens.strokeWidthThick },
    '@media (prefers-reduced-motion: reduce)': { transitionDuration: '0.01ms' },
    '&:is([data-reduce-motion="true"] *)': { transitionDuration: '0.01ms' },
    '@media (forced-colors: active)': { ...shorthands.borderColor('ButtonText'), color: 'ButtonText' },
  },
  attached: { marginBottom: `${-nodeMetrics.handle.size / 2}px`, position: 'relative', zIndex: 1 },
  attachedHorizontal: { marginBottom: 0, marginRight: `${-nodeMetrics.handle.size / 2}px` },
});
export interface NodeToolConnectorProps extends HTMLAttributes<HTMLDivElement> {
  hasTools?: boolean;
  onAddTool?: (anchor?: HTMLElement | null) => void;
  label?: string;
  addToolLabel?: string;
  orientation?: 'vertical' | 'horizontal';
}
export const NodeToolConnector = forwardRef<HTMLDivElement, NodeToolConnectorProps>(function NodeToolConnector(
  {
    hasTools = false,
    onAddTool,
    label = defaultNodeStrings.agent.tools,
    addToolLabel = defaultNodeStrings.agent.addTool,
    orientation = 'vertical',
    className,
    ...rest
  },
  ref
) {
  const styles = useStyles();
  const horizontal = orientation === 'horizontal';
  return (
    <div
      {...rest}
      ref={ref}
      className={mergeClasses(styles.root, horizontal && styles.rootHorizontal, className)}
      data-testid="node-tool-connector"
      data-orientation={orientation}
    >
      <span className={mergeClasses(styles.diamond, horizontal && styles.diamondHorizontal)} aria-hidden="true" />
      <span className={mergeClasses(styles.label, horizontal && styles.labelHorizontal)}>{label}</span>
      <span className={mergeClasses(styles.line, horizontal && styles.lineHorizontal)} aria-hidden="true" />
      {hasTools || !onAddTool ? (
        <NodeHandle className={hasTools ? mergeClasses(styles.attached, horizontal && styles.attachedHorizontal) : undefined} />
      ) : (
        <button
          type="button"
          className={mergeClasses('nodrag', styles.add)}
          aria-label={addToolLabel}
          onClick={(event) => {
            event.stopPropagation();
            onAddTool(event.currentTarget);
          }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <AddRegular aria-hidden="true" />
        </button>
      )}
    </div>
  );
});
