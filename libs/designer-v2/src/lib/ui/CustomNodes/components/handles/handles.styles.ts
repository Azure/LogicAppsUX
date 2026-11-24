import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { nodeMetrics } from '@microsoft/designer-ui-v2/metrics';
import type { CSSProperties } from 'react';

// Inline positioning wins XYFlow's side offsets when a real port is inside a shared dot.
export const containedHandleStyle: CSSProperties = {
  top: '50%',
  left: '50%',
  right: 'auto',
  bottom: 'auto',
  transform: 'translate(-50%, -50%)',
};

export const useHandleStyles = makeStyles({
  nodeHandle: {
    border: 'none',
  },

  top: {
    transform: 'translate(-50%, 0%)',
    top: '0px',
    width: '100%',
    height: '100%',
    borderRadius: '2px',
    background: 'transparent',
    boxSizing: 'border-box',
    zIndex: '2',
  },

  bottom: {
    visibility: 'hidden',
    transform: 'translate(-50%, 0%)',
  },

  left: {
    transform: 'translate(0%, -50%)',
    left: '0px',
    width: '100%',
    height: '100%',
    borderRadius: '2px',
    background: 'transparent',
    boxSizing: 'border-box',
    zIndex: '2',
  },

  right: {
    visibility: 'hidden',
    transform: 'translate(0%, -50%)',
  },

  edgeDrawStart: {
    visibility: 'visible',
    background: 'var(--colorEdge)',
    width: '10px',
    height: '10px',
    borderRadius: '32px',
    transform: 'translate(-50%, 50)',
    bottom: '0px',
    zIndex: '3',

    '&:active, &:hover': {
      background: 'var(--colorSelection)',
    },
  },

  edgeDrawStartHighlighted: {
    background: 'var(--colorSelection)',
  },

  sharedPort: {
    width: `${nodeMetrics.handle.size}px`,
    height: `${nodeMetrics.handle.size}px`,
    minWidth: 0,
    minHeight: 0,
    border: 'none',
    background: 'transparent',
    visibility: 'visible',
    zIndex: 3,
  },
  sharedSource: {
    bottom: `${nodeMetrics.handle.edgeOffset}px`,
    transform: 'translateX(-50%)',
  },
  sharedSourceHorizontal: {
    right: `${nodeMetrics.handle.edgeOffset}px`,
    transform: 'translateY(-50%)',
  },
  inputDot: {
    position: 'absolute',
    top: `${nodeMetrics.handle.edgeOffset}px`,
    left: '50%',
    transform: 'translateX(-50%)',
    pointerEvents: 'none',
  },
  inputDotHorizontal: {
    position: 'absolute',
    left: `${nodeMetrics.handle.edgeOffset}px`,
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  dot: { pointerEvents: 'none' },
  /**
   * The visible dot is pointer-transparent so React Flow owns the drag; its own `:hover` therefore never
   * fires. The port drives the dot's feedback instead: brand fill and a focus-style ring, with no size or
   * position change so connection geometry is unaffected. `.connectingfrom` keeps it lit during the drag.
   */
  sharedSourceInteractive: {
    cursor: 'crosshair',
    '&:hover > *, &:focus-visible > *, &.connectingfrom > *': {
      ...shorthands.borderColor(tokens.colorBrandStroke1),
      backgroundColor: tokens.colorBrandBackground,
      boxShadow: `0 0 0 3px ${tokens.colorBrandBackground2}`,
    },
    '@media (forced-colors: active)': {
      '&:hover > *, &:focus-visible > *, &.connectingfrom > *': {
        ...shorthands.borderColor('Highlight'),
        backgroundColor: 'Highlight',
        boxShadow: 'none',
      },
    },
  },
  /** Selected-node source port, matching legacy's selection tint without the hover ring. */
  sharedSourceHighlighted: {
    '& > *': { ...shorthands.borderColor(tokens.colorBrandStroke1) },
  },
  merge: {
    position: 'absolute',
    left: '50%',
    bottom: `${-nodeMetrics.mergePoint.size / 2}px`,
    transform: 'translateX(-50%)',
    zIndex: 3,
    '&[data-merge-add-source]': { pointerEvents: 'auto' },
  },
  mergeHorizontal: {
    left: 'auto',
    right: `${-nodeMetrics.mergePoint.size / 2}px`,
    bottom: '50%',
    transform: 'translateY(50%)',
  },
});
