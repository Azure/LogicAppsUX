import { commonCodeEditorProps } from '../testMapPanel/TestMapPanel';
import { Stack } from '@fluentui/react';
import { Button, makeStyles, shorthands, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { Code20Regular, Dismiss20Regular } from '@fluentui/react-icons';
import { EditorLanguage, MonacoEditor } from '@microsoft/logic-apps-shared';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export const minCodeViewWidth = 320;

const useStyles = makeStyles({
  containerStyle: {
    height: '100%',
    width: '100%',
    ...shorthands.overflow('hidden'),
    ...shorthands.padding('12px'),
    boxSizing: 'border-box',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  titleTextStyle: {
    ...typographyStyles.body1Strong,
  },
  editorStyle: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding('10px'),
  },
});

export interface CodeViewProps {
  dataMapDefinition: string;
  isCodeViewOpen: boolean;
  setIsCodeViewOpen: (isOpen: boolean) => void;
  canvasAreaHeight: number;
  centerViewWidth: number;
  contentWidth: number;
  setContentWidth: (newWidth: number) => void;
}

export const CodeView = ({
  dataMapDefinition,
  isCodeViewOpen,
  setIsCodeViewOpen,
  canvasAreaHeight,
  centerViewWidth,
  contentWidth,
  setContentWidth,
}: CodeViewProps) => {
  const intl = useIntl();
  const styles = useStyles();

  const [initialDragXPos, setInitialDragXPos] = useState<number | undefined>(undefined);
  const [initialDragWidth, setInitialDragWidth] = useState<number | undefined>(undefined);

  const onStartDrag = (e: React.DragEvent) => {
    setInitialDragXPos(e.clientX);
    setInitialDragWidth(contentWidth);

    // Show empty image in place of dragging ghost preview
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const onDrag = (e: React.DragEvent) => {
    // Have to check for clientY being 0 as it messes everything up when drag ends for some unknown reason
    if (!initialDragWidth || !initialDragXPos || e.clientX === 0) {
      return;
    }

    const deltaX = e.clientX - initialDragXPos; // Going up == negative

    // Clamp height percent between 0 and the centerViewWidth
    const newPaneContentHeight = Math.min(centerViewWidth, Math.max(0, initialDragWidth - deltaX));

    // Max width is half the canvas
    const halfWidth = 0.5 * centerViewWidth;
    if (newPaneContentHeight >= halfWidth) {
      setContentWidth(halfWidth);
      return;
    }

    if (newPaneContentHeight <= minCodeViewWidth) {
      setContentWidth(minCodeViewWidth);
      return;
    }

    setContentWidth(newPaneContentHeight);
  };

  const onDragEnd = () => {
    setInitialDragWidth(undefined);
    setInitialDragXPos(undefined);
  };

  const codeViewLoc = intl.formatMessage({
    defaultMessage: 'Code view',
    description: 'Code view title',
  });

  const closeCodeViewLoc = intl.formatMessage({
    defaultMessage: 'Close code view',
    description: 'Close code view button',
  });

  const noMapDefLoc = intl.formatMessage({
    defaultMessage: 'Unable to generate data map definition',
    description: `Message to display when the data map definition can't be generated`,
  });

  return (
    <Stack style={{ display: isCodeViewOpen ? 'flex' : 'none', width: contentWidth, minWidth: '25%' }} horizontal={true} verticalFill>
      <div
        style={{ width: '10px', cursor: isCodeViewOpen ? 'col-resize' : 'auto' }}
        onDragStart={onStartDrag}
        onDrag={onDrag}
        onDragEnd={onDragEnd}
        draggable={isCodeViewOpen ? 'true' : 'false'}
      />
      <div className={styles.containerStyle}>
        <Stack horizontal={false} verticalAlign="center" horizontalAlign="center">
          <Stack
            horizontal
            verticalAlign="center"
            style={{ width: '100%', justifyContent: 'space-between', marginBottom: '12px', marginTop: '4px' }}
          >
            <Stack horizontal verticalAlign="center">
              <Code20Regular />
              <Text className={styles.titleTextStyle} style={{ marginLeft: '8px' }}>
                {codeViewLoc}
              </Text>
            </Stack>

            <Button
              icon={<Dismiss20Regular />}
              appearance="subtle"
              onClick={() => setIsCodeViewOpen(false)}
              aria-label={closeCodeViewLoc}
            />
          </Stack>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: '1 1 auto' }}>
            <MonacoEditor
              language={EditorLanguage.yaml}
              value={dataMapDefinition === '' ? noMapDefLoc : dataMapDefinition}
              className={styles.editorStyle}
              {...commonCodeEditorProps}
              height={`${Math.max(200, canvasAreaHeight - 75)}px`}
              readOnly
            />
          </div>
        </Stack>
      </div>
    </Stack>
  );
};
