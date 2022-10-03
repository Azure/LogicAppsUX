import { testDataMap } from '../../core/queries/datamap';
import { ChoiceGroup, DefaultButton, Panel, PanelType, Pivot, PivotItem, PrimaryButton } from '@fluentui/react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { EditorLanguage, MonacoEditor } from '@microsoft/designer-ui';
import React, { useState } from 'react';
import { useIntl } from 'react-intl';

const useStyles = makeStyles({
  editorStyle: {
    marginTop: '12px',
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius('3px'),
    ...shorthands.padding('10px'),
  },
});

const defaultStartingXmlInputValue = `<?xml version="1.0" encoding="utf-8"?>`;

export interface TestMapPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestMapPanel = (props: TestMapPanelProps) => {
  const { isOpen, onClose } = props;
  const intl = useIntl();
  const styles = useStyles();

  const [selectedInputOption, setSelectedInputOption] = useState<string | undefined>('pasteSample');
  const [testMapInput, setTestMapInput] = useState<string | undefined>(defaultStartingXmlInputValue);
  const [testMapResponse, _setTestMapResponse] = useState<any>({});

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

  const discardLoc = intl.formatMessage({
    defaultMessage: 'Discard',
    description: 'Discard',
  });

  const inputDataOptionsLabelLoc = intl.formatMessage({
    defaultMessage: 'Provide input data to test the map with',
    description: 'Label for input data option choice group',
  });

  const inputDataOptions = [{ key: 'pasteSample', text: pasteFromSampleLoc }];

  const testMap = async () => {
    if (!testMapInput) {
      return;
    }

    console.log(testMapInput);

    const testMapResponse = await testDataMap('CheckAvailability', testMapInput);

    console.log(testMapResponse);
  };

  const getFooterContent = () => {
    return (
      <div>
        <PrimaryButton onClick={testMap} style={{ marginRight: 8 }} disabled={!testMapInput}>
          {testLoc}
        </PrimaryButton>
        <DefaultButton onClick={onClose}>{discardLoc}</DefaultButton>
      </div>
    );
  };

  return (
    <Panel
      isOpen={isOpen}
      onDismiss={onClose}
      type={PanelType.medium}
      headerText={testMapLoc}
      closeButtonAriaLabel={closeLoc}
      onRenderFooterContent={getFooterContent}
      isFooterAtBottom={true}
      isLightDismiss
    >
      <Pivot style={{ marginTop: 16 }}>
        <PivotItem headerText={inputLoc} style={{ marginTop: 12 }}>
          <ChoiceGroup
            label={inputDataOptionsLabelLoc}
            selectedKey={selectedInputOption}
            options={inputDataOptions}
            onChange={(_, option) => setSelectedInputOption(option?.key)}
          />

          <MonacoEditor
            language={EditorLanguage.xml}
            value={testMapInput}
            onContentChanged={(e) => setTestMapInput(e.value)}
            lineNumbers="on"
            scrollbar={{ horizontal: 'hidden', vertical: 'auto' }}
            className={styles.editorStyle}
            height={`500px`}
            wordWrap="on"
          />
        </PivotItem>

        <PivotItem headerText={outputLoc} style={{ marginTop: 12 }}>
          <MonacoEditor
            language={EditorLanguage.xml}
            value={testMapResponse.value ?? ''}
            lineNumbers="on"
            scrollbar={{ horizontal: 'hidden', vertical: 'auto' }}
            className={styles.editorStyle}
            height={`500px`}
            wordWrap="on"
            readOnly
          />
        </PivotItem>
      </Pivot>
    </Panel>
  );
};
