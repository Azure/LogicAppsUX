import { Stack } from '@fluentui/react';
import { Button, makeStyles, shorthands, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { Dismiss20Regular } from '@fluentui/react-icons';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';

export const floatingPanelZIndex = 10;

const useStyles = makeStyles({
  title: {
    ...typographyStyles.body1Strong,
    color: tokens.colorNeutralForeground1,
  },
  subtitle: {
    ...typographyStyles.body1,
    color: tokens.colorNeutralForeground2,
    paddingLeft: '4px',
    maxWidth: '110px',
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
  height?: string;
  contentHeight?: string;
  panelOrdering?: number;
  isOpen: boolean;
  children?: React.ReactNode;
}

export const FloatingPanel = (props: FloatingPanelProps) => {
  const { title, subtitle, onClose, xPos, yPos, minHeight, height, contentHeight, width, panelOrdering, isOpen, children } = props;
  const styles = useStyles();
  const intl = useIntl();

  const xLabel = intl.formatMessage({
    defaultMessage: 'Close panel',
    id: '0SSwxD',
    description: 'Label on button that closes floating panel',
  });

  const innerStyle: React.CSSProperties = useMemo(
    () => ({
      display: isOpen ? undefined : 'none',
      position: 'absolute',
      zIndex: panelOrdering ? floatingPanelZIndex + panelOrdering : floatingPanelZIndex,
      boxShadow: tokens.shadow4,
      borderRadius: tokens.borderRadiusMedium,
      padding: '12px',
      top: yPos,
      left: xPos,
      width,
      minHeight,
      height,
      backgroundColor: tokens.colorNeutralBackground1,
    }),
    [xPos, yPos, width, minHeight, height, panelOrdering, isOpen]
  );

  return (
    <div style={innerStyle}>
      <Stack horizontal verticalAlign="center" style={{ paddingBottom: 10 }}>
        <Text className={styles.title}>{title}</Text>
        <Text className={styles.subtitle}>{subtitle}</Text>

        <Button appearance="subtle" icon={<Dismiss20Regular />} onClick={onClose} aria-label={xLabel} style={{ marginLeft: 'auto' }} />
      </Stack>

      <div style={{ maxHeight: contentHeight, overflowY: 'auto', position: 'relative' }}>{children}</div>
    </div>
  );
};
