import { makeStyles } from '@fluentui/react-components';
import { nodeMetrics } from '@microsoft/designer-ui-v2/metrics';

// Existing host terminal margin; the connector stops before the transparent add-circle button.
export const terminalConnectionLength = 8;

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
  hitPath: { fill: 'none', stroke: 'transparent', cursor: 'pointer' },
});
