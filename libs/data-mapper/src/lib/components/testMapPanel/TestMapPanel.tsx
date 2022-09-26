import { DefaultButton, Panel, PanelType, PrimaryButton } from '@fluentui/react';
import { Radio, RadioGroup, Tab, TabList, Textarea } from '@fluentui/react-components';
import React, { useState } from 'react';
import { useIntl } from 'react-intl';

enum SelectedTab {
  Input,
  Output,
}

enum InputDataOptions {
  PasteSample = 'pasteSample',
}

export interface TestMapPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestMapPanel = (props: TestMapPanelProps) => {
  const { isOpen, onClose } = props;
  const intl = useIntl();

  const [selectedTab, setSelectedTab] = useState(SelectedTab.Input);
  const [selectedInputOption, setSelectedInputOption] = useState(InputDataOptions.PasteSample);

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

  const pasteFromSample = intl.formatMessage({
    defaultMessage: 'Paste from sample',
    description: 'Paste from sample',
  });

  const discardLoc = intl.formatMessage({
    defaultMessage: 'Discard',
    description: 'Discard',
  });

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
    >
      <div>
        <TabList selectedValue={selectedTab} onTabSelect={(_e, data) => setSelectedTab(data.value as SelectedTab)}>
          <Tab value={SelectedTab.Input}>{inputLoc}</Tab>
          <Tab value={SelectedTab.Output}>{outputLoc}</Tab>
        </TabList>

        {selectedTab === SelectedTab.Input && (
          <div>
            <RadioGroup value={selectedInputOption} onChange={(_, data) => setSelectedInputOption(data.value as InputDataOptions)}>
              <Radio label={pasteFromSample} value={InputDataOptions.PasteSample} />
            </RadioGroup>

            <Textarea placeholder="Input helper text" />
          </div>
        )}

        {selectedTab === SelectedTab.Output && (
          <div>
            <Textarea placeholder="Output helper text" />
          </div>
        )}
      </div>
    </Panel>
  );
};
