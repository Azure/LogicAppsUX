import { Stack } from '@fluentui/react';
import { Text, tokens } from '@fluentui/react-components';
import { AddCircle16Regular, CheckmarkCircle16Filled, Circle16Filled } from '@fluentui/react-icons';
import { useStyles } from './styles';

export type ConnectorBoxProps = {
  isLeftDirection: boolean;
  text: string;
  id: string;
  isHovered: boolean;
  isAdded: boolean;
  addConnection: (start: string, end: string) => void;
};

export const ConnectorBox = (props: ConnectorBoxProps) => {
  const { text, isAdded, isHovered, isLeftDirection } = props;
  const styles = useStyles();

  return (
    <Stack horizontal verticalAlign="center" style={{ width: '100%' }}>
      {isLeftDirection ? (
        <span>
          <Text>{text}</Text>
          <span style={{ display: 'flex', position: 'absolute', right: -9 }}>
            {isAdded ? (
              <CheckmarkCircle16Filled primaryFill={tokens.colorBrandForeground1} />
            ) : isHovered ? (
              <AddCircle16Regular primaryFill={tokens.colorNeutralForeground3} />
            ) : (
              <Circle16Filled className={styles.circleNonHoveredAndNonConnected} filled={true} />
            )}
          </span>
        </span>
      ) : (
        <span>
          <span style={{ display: 'flex', position: 'absolute', left: -9 }}>
            {isAdded ? (
              <CheckmarkCircle16Filled primaryFill={tokens.colorBrandForeground1} />
            ) : isHovered ? (
              <AddCircle16Regular primaryFill={tokens.colorNeutralForeground3} />
            ) : (
              <Circle16Filled className={styles.circleNonHoveredAndNonConnected} filled={true} />
            )}
          </span>
          <Text>{text}</Text>
        </span>
      )}
    </Stack>
  );
};
