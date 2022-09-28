import { ChoiceGroup, DefaultButton, Panel, PanelType, Pivot, PivotItem, PrimaryButton, TextField } from '@fluentui/react';
import React, { useState } from 'react';
import { useIntl } from 'react-intl';

export interface TestMapPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestMapPanel = (props: TestMapPanelProps) => {
  const { isOpen, onClose } = props;
  const intl = useIntl();

  const [selectedInputOption, setSelectedInputOption] = useState<string | undefined>('pasteSample');

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

  const testMap = () => {
    // TODO: Call testMap API once we get it
  };

  const getFooterContent = () => {
    return (
      <div>
        <PrimaryButton onClick={testMap} style={{ marginRight: 8 }}>
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

          <TextField
            multiline
            resizable={false}
            placeholder="Input helper text"
            style={{ height: 500 }}
            styles={{ root: { marginTop: 12 } }}
          />
        </PivotItem>

        <PivotItem headerText={outputLoc} style={{ marginTop: 12 }}>
          <TextField
            multiline
            resizable={false}
            placeholder="Output helper text"
            style={{ height: 500 }}
            styles={{ root: { marginTop: 12 } }}
          />
        </PivotItem>
      </Pivot>
    </Panel>
  );
};
