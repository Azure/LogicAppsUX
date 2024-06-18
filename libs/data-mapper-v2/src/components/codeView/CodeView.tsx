import { Stack } from '@fluentui/react';
import { Button, Text } from '@fluentui/react-components';
import { Code20Regular, Dismiss20Regular } from '@fluentui/react-icons';
import type { MonacoProps } from '@microsoft/designer-ui';
import { MonacoEditor } from '@microsoft/designer-ui';
import { EditorLanguage } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import type { RootState } from '../../core/state/Store';
import { useStyles } from './styles';

export const minCodeViewWidth = 320;

export const commonCodeEditorProps: Partial<MonacoProps> = {
  lineNumbers: 'on',
  scrollbar: { horizontal: 'hidden', vertical: 'auto' },
  height: '650px',
  wordWrap: 'on',
  wrappingIndent: 'same',
};

export const CodeView = () => {
  const intl = useIntl();
  const styles = useStyles();

  const dataMapDefinition = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapLML);
  const isCodeViewOpen = useSelector((state: RootState) => state.panel.isCodeViewOpen);

  const onStartDrag = (e: React.DragEvent) => {
    // Show empty image in place of dragging ghost preview
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const codeViewLoc = intl.formatMessage({
    defaultMessage: 'Code view',
    id: 'M0xrm+',
    description: 'Code view title',
  });

  const closeCodeViewLoc = intl.formatMessage({
    defaultMessage: 'Close code view',
    id: '3sJlV+',
    description: 'Close code view button',
  });

  const noMapDefLoc = intl.formatMessage({
    defaultMessage: 'Unable to generate data map definition',
    id: 'sv+IcU',
    description: `Message to display when the data map definition can't be generated`,
  });

  return (
    <Stack
      style={{
        display: isCodeViewOpen ? 'flex' : 'none',
        width: minCodeViewWidth,
        minWidth: '25%',
      }}
      horizontal={true}
      verticalFill
    >
      <div
        style={{
          width: '10px',
          cursor: isCodeViewOpen ? 'col-resize' : 'auto',
        }}
        onDragStart={onStartDrag}
        draggable={isCodeViewOpen ? 'true' : 'false'}
      />
      <div className={styles.containerStyle}>
        <Stack horizontal={false} verticalAlign="center" horizontalAlign="center">
          <Stack
            horizontal
            verticalAlign="center"
            style={{
              width: '100%',
              justifyContent: 'space-between',
              marginBottom: '12px',
              marginTop: '4px',
            }}
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
              //onClick={() => setIsCodeViewOpen(false)}
              aria-label={closeCodeViewLoc}
            />
          </Stack>

          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              flex: '1 1 auto',
            }}
          >
            <MonacoEditor
              language={EditorLanguage.yaml}
              value={dataMapDefinition === '' ? noMapDefLoc : dataMapDefinition}
              className={styles.editorStyle}
              {...commonCodeEditorProps}
              readOnly
            />
          </div>
        </Stack>
      </div>
    </Stack>
  );
};
