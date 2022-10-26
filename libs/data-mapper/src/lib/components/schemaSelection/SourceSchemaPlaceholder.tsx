import { Stack } from "@fluentui/react";
import { Button, makeStyles, shorthands, Text, tokens, typographyStyles } from "@fluentui/react-components";
import { useIntl } from "react-intl";
import { selectSchemaCardHeight, selectSchemaCardWidth } from "./SelectSchemaCard";

// TODO: Project this onto the canvas, with its xPos being the same as the source schema nodes

const useStyles = makeStyles({
    placeholderContainer: {
        width: `${selectSchemaCardWidth}px`,
        height: `${selectSchemaCardHeight}px`,
        ...shorthands.border(tokens.strokeWidthThick, 'dashed', tokens.colorNeutralStroke1),
        ...shorthands.borderRadius(tokens.borderRadiusMedium),
    },
    placeholderText: {
        ...typographyStyles.body1Strong,
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
  
    const placeholderMsgLoc = intl.formatMessage({
        defaultMessage: 'Select source schema elements to build your map',
        description: 'Main message displayed in the placeholder',
    });

    const selectElementLoc = intl.formatMessage({
        defaultMessage: 'Select element',
        description: 'Select element',
    });
  
    return (
      <Stack
        verticalAlign="space-evenly"
        horizontalAlign="center"
        className={styles.placeholderContainer}
        onClick={onClickSelectElement}
        style={{ position: 'absolute', zIndex: 5 }}
      >
        <Text className={styles.placeholderText}>{placeholderMsgLoc}</Text>

        <Button size='small'>{selectElementLoc}</Button>
      </Stack>
    );
};
  