import { makeStyles } from '@fluentui/react-components';
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
  inputDot: {
    position: 'absolute',
    top: `${nodeMetrics.handle.edgeOffset}px`,
    left: '50%',
    transform: 'translateX(-50%)',
    pointerEvents: 'none',
  },
  dot: { pointerEvents: 'none' },
  merge: {
    position: 'absolute',
    left: '50%',
    bottom: `${-nodeMetrics.mergePoint.size / 2}px`,
    transform: 'translateX(-50%)',
    zIndex: 3,
  },
});
