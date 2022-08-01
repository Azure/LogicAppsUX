import { tokens } from '@fluentui/react-components';

const FLOATING_PANEL_Z = 10;

export interface FloatingPanelProps {
  xPos: string;
  yPos: string;
  width: string;
  minHeight: string;
  maxHeight?: string;
  panelOrdering?: number;
}

export const FloatingPanel: React.FC<FloatingPanelProps> = ({ xPos, yPos, minHeight, maxHeight, width, panelOrdering, children }) => {
  const innerStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: panelOrdering ? FLOATING_PANEL_Z + panelOrdering : FLOATING_PANEL_Z,
    boxShadow: tokens.shadow4,
    borderRadius: tokens.borderRadiusMedium,
    padding: '12px',
    top: yPos,
    left: xPos,
    width,
    minHeight,
    maxHeight,
    backgroundColor: tokens.colorNeutralBackground1,
    overflowY: 'auto',
  };

  return (
    // Placeholder div so that we can move the stack locally to the spot it's been inserted
    <div style={{ position: 'relative', width: 0, height: 0 }}>
      <div style={innerStyle}>{children}</div>
    </div>
  );
};
