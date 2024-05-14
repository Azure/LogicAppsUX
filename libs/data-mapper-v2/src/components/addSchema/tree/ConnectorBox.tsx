import { Stack } from '@fluentui/react';
import { Text, tokens } from '@fluentui/react-components';
import { AddCircle20Regular, CheckmarkCircle20Filled, Circle20Filled } from '@fluentui/react-icons';
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
    <Stack horizontal verticalAlign="center">
      {isLeftDirection ? (
        <>
          <Text>{text}</Text>
          <span style={{ display: 'flex', position: 'absolute', right: -9 }}>
            {isAdded ? (
              <CheckmarkCircle20Filled primaryFill={tokens.colorBrandForeground1} />
            ) : isHovered ? (
              <AddCircle20Regular primaryFill={tokens.colorNeutralForeground3} />
            ) : (
              <Circle20Filled className={styles.circleNonHoveredAndNonConnected} />
            )}
          </span>
        </>
      ) : (
        <>
          <span style={{ display: 'flex', position: 'absolute', left: -9 }}>
            {isAdded ? (
              <CheckmarkCircle20Filled primaryFill={tokens.colorBrandForeground1} />
            ) : isHovered ? (
              <AddCircle20Regular primaryFill={tokens.colorNeutralForeground3} />
            ) : (
              <Circle20Filled className={styles.circleNonHoveredAndNonConnected} />
            )}
          </span>
          <Text>{text}</Text>
        </>
      )}
    </Stack>
  );
};
