import { ChoiceGroup, ComboBox, DefaultButton, initializeIcons, Panel, PrimaryButton, TextField } from '@fluentui/react';
import type { IChoiceGroupOption } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import { useCallback, useState } from 'react';
import type { FunctionComponent } from 'react';

export interface AddSchemaModelProps {
  schemaType: SchemaTypes;
  onSchemaChange: (schemaFileName: string) => void;
  schemaFilesList: string[];
}

export enum SchemaTypes {
  INPUT = 'input',
  OUTPUT = 'output',
}

// Initialize icons in case this example uses them
initializeIcons();

export const AddSchemaPanelButton: FunctionComponent<AddSchemaModelProps> = ({ schemaType, onSchemaChange, schemaFilesList }) => {
  const options: IChoiceGroupOption[] = [
    { key: 'upload-new', text: 'Upload new' },
    { key: 'select-from', text: 'Select from existing' },
  ];

  const [selectedKey, setSelectedKey] = useState<string>('select-from');

  const onChange = useCallback((_: unknown, option?: IChoiceGroupOption): void => {
    if (option) setSelectedKey(option.key);
  }, []);

  const dataMapDropdownOptions = schemaFilesList.map((fileName) => ({ key: fileName, text: fileName, secondaryText: 'secondary' }));

  const buttonStyles = { root: { marginRight: 8 } };

  const [isPanelOpen, { setTrue: showPanel, setFalse: hidePanel }] = useBoolean(false);

  const onRenderFooterContent = useCallback(
    () => (
      <div>
        <PrimaryButton onClick={hidePanel} styles={buttonStyles}>
          Add
        </PrimaryButton>
        <DefaultButton onClick={hidePanel}>Cancel</DefaultButton>
      </div>
    ),
    [hidePanel]
  );

  const onRenderOption = (item: any): any => {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: '237px',
        }}
      >
        <div>{item.text}</div>
        <div style={{ color: '#424242' }}>SECOND</div>
      </div>
    );
  };

  return (
    <div>
      <DefaultButton text={`${schemaType} schema`} onClick={showPanel} />
      <Panel
        isOpen={isPanelOpen}
        onDismiss={hidePanel}
        headerText={`Add ${schemaType} schema`}
        closeButtonAriaLabel="Close"
        onRenderFooterContent={onRenderFooterContent}
        isFooterAtBottom={true}
      >
        <p>{`Upload or select an ${schemaType} schema to be used for your map.`}</p>
        <ChoiceGroup selectedKey={selectedKey} options={options} onChange={onChange} required={true} />
        {selectedKey === 'upload-new' && (
          <div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
              }}
            >
              <TextField placeholder="Select an schema to upload" />
              <PrimaryButton text="browse" />
            </div>
            <TextField label="Schema name" />
          </div>
        )}
        {selectedKey === 'select-from' && (
          <ComboBox
            placeholder="select input"
            styles={{
              root: {
                // marginTop: '16px',
                width: '267px',
                minWidth: '267px',
                height: '32px',
              },
              input: {
                height: '32px',
              },

              optionsContainerWrapper: {
                width: '267px',
              },
            }}
            allowFreeform
            onChange={(_, e) => onSchemaChange(e?.text ?? '')}
            onRenderOption={onRenderOption}
            options={dataMapDropdownOptions}
          />
        )}
      </Panel>
    </div>
  );
};
