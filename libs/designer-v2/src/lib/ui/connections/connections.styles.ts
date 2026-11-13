import { makeStyles } from '@fluentui/react-components';
import { nodeMetrics } from '@microsoft/designer-ui-v2/metrics';
import type { CSSProperties } from 'react';

// Existing host terminal margin; the connector stops before the transparent add-circle button.
export const terminalConnectionLength = 8;

// All terminal hosts reserve the same output-side gap and canonical control hit target.
export const horizontalTerminalStyle: CSSProperties = {
  position: 'absolute',
  left: '100%',
  top: '50%',
  width: nodeMetrics.edgeControl.hitTargetSize,
  height: nodeMetrics.edgeControl.hitTargetSize,
  margin: 0,
  marginLeft: terminalConnectionLength,
  transform: 'translateY(-50%)',
};

export const useConnectionStyles = makeStyles({
  control: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${nodeMetrics.edgeControl.hitTargetSize}px`,
    height: `${nodeMetrics.edgeControl.hitTargetSize}px`,
    pointerEvents: 'auto',
    marginInline: 'auto',
  },
  controlRow: { display: 'flex', justifyContent: 'center', width: '100%' },
  terminalLine: {
    position: 'absolute',
    top: `${-terminalConnectionLength}px`,
    left: '50%',
    transform: 'translateX(-50%)',
    pointerEvents: 'none',
  },
  terminalLineHorizontal: {
    top: '50%',
    left: `${-terminalConnectionLength}px`,
    transform: 'translateY(-50%)',
  },
  hitPath: { fill: 'none', stroke: 'transparent', cursor: 'pointer' },
});
