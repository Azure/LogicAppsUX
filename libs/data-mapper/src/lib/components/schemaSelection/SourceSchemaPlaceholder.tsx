import { selectSchemaCardHeight, selectSchemaCardWidth } from './SelectSchemaCard';
import { Stack } from '@fluentui/react';
import { Button, makeStyles, shorthands, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { useViewport } from 'reactflow';

const useStyles = makeStyles({
  placeholderContainer: {
    width: `${selectSchemaCardWidth}px`,
    height: `${selectSchemaCardHeight}px`,
    ...shorthands.border(tokens.strokeWidthThick, 'dashed', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  placeholderText: {
    ...typographyStyles.body1Strong,
    color: tokens.colorNeutralForeground2,
    maxWidth: '80%',
    textAlign: 'center',
  },
});

export interface SourceSchemaPlaceholderProps {
  onClickSelectElement: () => void;
}

export const SourceSchemaPlaceholder = ({ onClickSelectElement }: SourceSchemaPlaceholderProps) => {
  const intl = useIntl();
  const styles = useStyles();
  const reactFlowViewport = useViewport();

  const placeholderMsgLoc = intl.formatMessage({
    defaultMessage: 'Select source schema elements to build your map',
    id: 'rsdJcV',
    description: 'Main message displayed in the placeholder',
  });

  const selectElementLoc = intl.formatMessage({
    defaultMessage: 'Select element',
    id: '5hWg4V',
    description: 'Select element',
  });

  return (
    <Stack
      verticalAlign="space-evenly"
      horizontalAlign="center"
      className={styles.placeholderContainer}
      onClick={onClickSelectElement}
      style={{
        position: 'absolute',
        zIndex: 4,
        top: reactFlowViewport.y,
        left: reactFlowViewport.x,
        transform: `scale(${reactFlowViewport.zoom}) translate(0, +5%)`,
        transformOrigin: 'top left',
      }}
    >
      <Text className={styles.placeholderText}>{placeholderMsgLoc}</Text>

      <Button size="small">{selectElementLoc}</Button>
    </Stack>
  );
};
