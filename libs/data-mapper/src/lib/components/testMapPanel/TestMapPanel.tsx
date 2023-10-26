import type { TestMapResponse } from '../../core';
import { generateDataMapXslt, testDataMap } from '../../core/queries/datamap';
import type { RootState } from '../../core/state/Store';
import { SchemaFileFormat } from '../../models';
import { LogCategory, LogService } from '../../utils/Logging.Utils';
import { ChoiceGroup, DefaultButton, Panel, PanelType, Pivot, PivotItem, PrimaryButton, Stack, StackItem, Text } from '@fluentui/react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import type { MonacoProps } from '@microsoft/designer-ui';
import { EditorLanguage, MonacoEditor } from '@microsoft/designer-ui';
import { guid, isNullOrEmpty } from '@microsoft/utils-logic-apps';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

enum PanelPivotItems {
  Input = 'input',
  Output = 'output',
}

enum InputDataOptions {
  PasteSample = 'pasteSample',
}

export const commonCodeEditorProps: Partial<MonacoProps> = {
  lineNumbers: 'on',
  scrollbar: { horizontal: 'hidden', vertical: 'auto' },
  height: '650px',
  wordWrap: 'on',
  wrappingIndent: 'same',
};

const headerTextStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 600,
  fontSize: '16px',
};

const textStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  marginTop: '4px',
};

const useStyles = makeStyles({
  editorStyle: {
    marginTop: '12px',
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius('3px'),
    ...shorthands.padding('6px'),
  },
  pivotItem: {
    marginTop: '12px',
  },
});

export interface TestMapPanelProps {
  mapDefinition: string;
  isOpen: boolean;
  onClose: () => void;
}

export const TestMapPanel = ({ mapDefinition, isOpen, onClose }: TestMapPanelProps) => {
  const intl = useIntl();
  const styles = useStyles();

  const currentTheme = useSelector((state: RootState) => state.app.theme);
  const xsltFilename = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.xsltFilename);
  const fileXslt = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.xsltContent);
  const sourceSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.targetSchema);

  const [selectedInputOption, setSelectedInputOption] = useState<InputDataOptions>(InputDataOptions.PasteSample);
  const [selectedPivotItem, setSelectedPivotItem] = useState<PanelPivotItems>(PanelPivotItems.Input);
  const [testMapInput, setTestMapInput] = useState<string>('');
  const [testMapResponse, setTestMapResponse] = useState<TestMapResponse | undefined>(undefined);
  const [currentXslt, setCurrentXslt] = useState<string>(fileXslt);

  //#region Loc
  const testMapLoc = intl.formatMessage({
    defaultMessage: 'Test map',
    description: 'Test map panel header',
  });

  const testLoc = intl.formatMessage({
    defaultMessage: 'Test',
    description: 'Test',
  });

  const closeLoc = intl.formatMessage({
    defaultMessage: 'Close',
    description: 'Close',
  });

  const inputLoc = intl.formatMessage({
    defaultMessage: 'Input',
    description: 'Input',
  });

  const outputLoc = intl.formatMessage({
    defaultMessage: 'Output',
    description: 'Output',
  });

  const pasteFromSampleLoc = intl.formatMessage({
    defaultMessage: 'Paste from sample',
    description: 'Paste from sample',
  });

  const inputDataOptionsLabelLoc = intl.formatMessage({
    defaultMessage: 'Provide input data to test the map with',
    description: 'Label for input data option choice group',
  });

  const statusCodeLoc = intl.formatMessage({
    defaultMessage: 'Status code',
    description: 'Response status code for test map API',
  });

  const responseBodyLoc = intl.formatMessage({
    defaultMessage: 'Response body',
    description: 'Response body for test map API',
  });

  const noXsltLoc = intl.formatMessage({
    defaultMessage: 'Generate XSLT first before attempting to test mappings.',
    description: 'Message on missing XSLT and attempting to test maps',
  });

  const mismatchedXsltLoc = intl.formatMessage({
    defaultMessage: 'The generated XSLT does not match the current mapping.',
    description: 'Message on mismatched XSLT and attempting to test maps',
  });
  //#endregion

  const inputDataOptions = useMemo(() => [{ key: 'pasteSample', text: pasteFromSampleLoc }], [pasteFromSampleLoc]);

  useEffect(() => {
    const generateXsltAsync = async () => {
      let generatedXslt = '';
      if (isOpen && !isNullOrEmpty(mapDefinition)) {
        try {
          generatedXslt = await generateDataMapXslt(mapDefinition);
        } catch (error) {
          console.log(error);
        }
      }

      setCurrentXslt(generatedXslt);
    };

    generateXsltAsync();
  }, [isOpen, mapDefinition]);

  const isMismatchedXslt = currentXslt && fileXslt !== currentXslt;

  const testMap = useCallback(async () => {
    if (!testMapInput) {
      return;
    }

    if (!xsltFilename) {
      LogService.error(LogCategory.TestMapPanel, 'testDataMap', {
        message: 'Missing XSLT filename',
      });

      return;
    }

    if (isMismatchedXslt) {
      LogService.error(LogCategory.TestMapPanel, 'testDataMap', {
        message: 'Mismatched XSLT content',
      });
    }

    setSelectedPivotItem(PanelPivotItems.Output);

    const testMapAttempt = guid();
    LogService.log(LogCategory.TestMapPanel, 'testDataMap', {
      message: 'Attempting test map',
      data: {
        testMapAttempt,
        roughTestMapInputSize: testMapInput.length,
      },
    });

    testDataMap(xsltFilename, testMapInput)
      .then((response) => {
        setTestMapResponse(response);

        LogService.log(LogCategory.TestMapPanel, 'testDataMap', {
          message: 'Successfully tested data map',
          data: {
            testMapAttempt,
            statusCode: response.statusCode,
            statusText: response.statusText,
          },
        });
      })
      .catch((error: Error) => {
        LogService.error(LogCategory.TestMapPanel, 'testDataMap', {
          message: error.message,
          data: {
            testMapAttempt,
          },
        });

        setTestMapResponse(undefined);
      });
  }, [isMismatchedXslt, testMapInput, xsltFilename]);

  const getFooterContent = useCallback(() => {
    return (
      <Stack horizontal={false} tokens={{ childrenGap: '8px' }}>
        <StackItem>
          {!fileXslt ? (
            <Text variant={'mediumPlus'} style={{ color: '#d13438' /*tokens.colorPaletteRedBackground3*/ }}>
              {noXsltLoc}
            </Text>
          ) : isMismatchedXslt ? (
            <Text variant={'mediumPlus'} style={{ color: '#e4cc00' /*tokens.colorPaletteYellowForeground1*/ }}>
              {mismatchedXsltLoc}
            </Text>
          ) : (
            <Text variant={'mediumPlus'}>{/*Space holding*/}</Text>
          )}
        </StackItem>
        <StackItem>
          <PrimaryButton onClick={testMap} style={{ marginRight: 8 }} disabled={!testMapInput || !fileXslt}>
            {testLoc}
          </PrimaryButton>
          <DefaultButton onClick={onClose}>{closeLoc}</DefaultButton>
        </StackItem>
      </Stack>
    );
  }, [fileXslt, testMapInput, isMismatchedXslt, closeLoc, mismatchedXsltLoc, noXsltLoc, onClose, testLoc, testMap]);

  return (
    <Panel
      isOpen={isOpen}
      onDismiss={onClose}
      type={PanelType.medium}
      headerText={testMapLoc}
      closeButtonAriaLabel={closeLoc}
      onRenderFooterContent={getFooterContent}
      isFooterAtBottom={true}
      overlayProps={{ isDarkThemed: currentTheme === 'dark' }}
      isLightDismiss
      layerProps={{ eventBubblingEnabled: true }}
    >
      <Pivot
        selectedKey={selectedPivotItem}
        onLinkClick={(item, _event) => setSelectedPivotItem((item?.props.itemKey as PanelPivotItems) ?? PanelPivotItems.Input)}
        style={{ marginTop: 16 }}
      >
        <PivotItem headerText={inputLoc} itemKey={PanelPivotItems.Input} className={styles.pivotItem}>
          <ChoiceGroup
            label={inputDataOptionsLabelLoc}
            selectedKey={selectedInputOption}
            options={inputDataOptions}
            onChange={(_, option) => setSelectedInputOption(option?.key as InputDataOptions)}
          />

          <MonacoEditor
            language={sourceSchema?.type === SchemaFileFormat.JSON ? EditorLanguage.json : EditorLanguage.xml}
            value={testMapInput}
            onContentChanged={(e) => setTestMapInput(e.value ?? '')}
            className={styles.editorStyle}
            contextMenu={true}
            {...commonCodeEditorProps}
          />
        </PivotItem>

        <PivotItem headerText={outputLoc} itemKey={PanelPivotItems.Output} className={styles.pivotItem}>
          <Text style={headerTextStyle}>{statusCodeLoc}</Text>
          <Text style={textStyle}>{testMapResponse && `${testMapResponse.statusCode} - ${testMapResponse.statusText}`}</Text>

          <Text style={{ ...headerTextStyle, marginTop: 20 }}>{responseBodyLoc}</Text>
          <MonacoEditor
            language={targetSchema?.type === SchemaFileFormat.JSON ? EditorLanguage.json : EditorLanguage.xml}
            value={testMapResponse?.outputInstance?.$content ?? ''}
            className={styles.editorStyle}
            {...commonCodeEditorProps}
            readOnly
          />
        </PivotItem>
      </Pivot>
    </Panel>
  );
};
