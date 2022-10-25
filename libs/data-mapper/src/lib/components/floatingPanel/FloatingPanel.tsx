import { Stack } from '@fluentui/react';
import { Button, makeStyles, shorthands, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { Dismiss20Regular } from '@fluentui/react-icons';
import { useMemo } from 'react';

const FLOATING_PANEL_Z = 10;

const useStyles = makeStyles({
  title: {
    ...typographyStyles.body1Strong,
    color: tokens.colorNeutralForeground1,
  },
  subtitle: {
    ...typographyStyles.body1,
    color: tokens.colorNeutralForeground2,
    paddingLeft: '4px',
    maxWidth: '115px',
    ...shorthands.overflow('hidden'),
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
});

export interface FloatingPanelProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  xPos: string;
  yPos: string;
  width: string;
  minHeight: string;
  maxHeight?: string;
  panelOrdering?: number;
  children?: React.ReactNode;
}

export const FloatingPanel = (props: FloatingPanelProps) => {
  const { title, subtitle, onClose, xPos, yPos, minHeight, maxHeight, width, panelOrdering, children } = props;
  const styles = useStyles();

  const innerStyle: React.CSSProperties = useMemo(
    () => ({
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
    }),
    [xPos, yPos, width, minHeight, maxHeight, panelOrdering]
  );

  return (
    <div style={innerStyle}>
      <Stack horizontal verticalAlign="center" style={{ paddingBottom: 10 }}>
        <Text className={styles.title}>{title}</Text>
        <Text className={styles.subtitle}>{subtitle}</Text>

        <Button appearance="subtle" icon={<Dismiss20Regular />} onClick={onClose} style={{ marginLeft: 'auto' }} />
      </Stack>

      {children}
    </div>
  );
};
