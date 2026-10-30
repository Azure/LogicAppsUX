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
  diamond: {
    boxSizing: 'border-box',
    width: `${m.diamond}px`,
    height: `${m.diamond}px`,
    marginTop: `${-m.diamond / 2}px`,
    marginBottom: `${m.gap}px`,
    transform: 'rotate(45deg)',
    borderRadius: tokens.borderRadiusSmall,
    border: `${nodeMetrics.handle.stroke}px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: designerUiTokens.nodeHandleBackground,
    '@media (forced-colors: active)': { ...shorthands.borderColor('CanvasText') },
  },
  label: {
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    color: tokens.colorNeutralForeground3,
    marginBottom: tokens.spacingVerticalS,
  },
  line: {
    width: tokens.strokeWidthThin,
    height: `${m.line}px`,
    backgroundColor: tokens.colorNeutralStroke1,
    '@media (forced-colors: active)': { backgroundColor: 'CanvasText' },
  },
  add: {
    boxSizing: 'border-box',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${m.add}px`,
    height: `${m.add}px`,
    padding: 0,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: designerUiTokens.nodeHandleBackground,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase300,
    cursor: 'pointer',
    transitionProperty: 'color, border-color',
    transitionDuration: tokens.durationFast,
    transitionTimingFunction: tokens.curveEasyEase,
    ':hover': { color: tokens.colorNeutralForeground1, ...shorthands.borderColor(tokens.colorNeutralStroke1Hover) },
    ':focus-visible': { outline: `${tokens.strokeWidthThick} solid ${tokens.colorStrokeFocus2}`, outlineOffset: tokens.strokeWidthThick },
    '@media (prefers-reduced-motion: reduce)': { transitionDuration: '0.01ms' },
    '&:is([data-reduce-motion="true"] *)': { transitionDuration: '0.01ms' },
    '@media (forced-colors: active)': { ...shorthands.borderColor('ButtonText'), color: 'ButtonText' },
  },
  attached: { marginBottom: `${-nodeMetrics.handle.size / 2}px`, position: 'relative', zIndex: 1 },
});
export interface NodeToolConnectorProps extends HTMLAttributes<HTMLDivElement> {
  hasTools?: boolean;
  onAddTool?: () => void;
  label?: string;
  addToolLabel?: string;
}
export const NodeToolConnector = forwardRef<HTMLDivElement, NodeToolConnectorProps>(function NodeToolConnector(
  { hasTools, onAddTool, label = defaultNodeStrings.agent.tools, addToolLabel = defaultNodeStrings.agent.addTool, className, ...rest },
  ref
) {
  const styles = useStyles();
  return (
    <div {...rest} ref={ref} className={mergeClasses(styles.root, className)} data-testid="node-tool-connector">
      <span className={styles.diamond} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
      <span className={styles.line} aria-hidden="true" />
      {hasTools || !onAddTool ? (
        <NodeHandle className={hasTools ? styles.attached : undefined} />
      ) : (
        <button
          type="button"
          className={mergeClasses('nodrag', styles.add)}
          aria-label={addToolLabel}
          onClick={(event) => {
            event.stopPropagation();
            onAddTool();
          }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <AddRegular aria-hidden="true" />
        </button>
      )}
    </div>
  );
});
