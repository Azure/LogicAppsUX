export interface FloatingPanelProps {
  xPos: string;
  yPos: string;
  width: string;
  height: string;
}

export const FloatingPanel: React.FC<FloatingPanelProps> = ({ xPos, yPos, height, width, children }) => {
  const innerStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 10,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.14), 0px 0px 2px rgba(0, 0, 0, 0.12)',
    borderRadius: '4px',
    padding: '12px',
    top: yPos,
    left: xPos,
    width,
    height,
  };

  return (
    // Placeholder div so that we can move the stack locally to the spot it's been inserted
    <div style={{ position: 'relative', width: 0, height: 0 }}>
      <div style={innerStyle}>{children}</div>
    </div>
  );
};
