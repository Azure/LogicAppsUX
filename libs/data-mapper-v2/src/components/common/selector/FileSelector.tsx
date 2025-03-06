import { useStyles } from './styles';
import { StackShim } from '@fluentui/react-migration-v8-v9';
import { Button, Caption2, InfoLabel, Input, Radio, RadioGroup, Text, type RadioGroupOnChangeData } from '@fluentui/react-components';
import type { IFileSysTreeItem } from '@microsoft/logic-apps-shared';
import { FileDropdownTree } from '../fileDropdownTree/FileDropdownTree';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../core/state/Store';
import { DataMapperFileService } from '../../../core';

type U = {
  text: string;
};

export type FileSelectorOption = 'upload-new' | 'select-existing';

export type FileSelectorProps<T> = {
  selectedKey: FileSelectorOption;
  onOptionChange: (selection: FileSelectorOption) => void;
  options?: Record<string, T>;
  errorMessage?: string;
  upload: {
    onUploadClick: () => void;
    uploadButtonText: string;
    inputPlaceholder?: string;
    fileName?: string;
  };
  existing: {
    fileList?: IFileSysTreeItem[];
    onSelect: (item: IFileSysTreeItem) => void;
  };
  cancel?: {
    onCancel: () => void;
    cancelButtonText: string;
  };
};

const SchemaFileSelector = <T extends U>(props: FileSelectorProps<T>) => {
  const {
    selectedKey,
    options = {},
    onOptionChange,
    upload: { onUploadClick, uploadButtonText, inputPlaceholder, fileName },
    cancel,
    existing: { onSelect },
    errorMessage,
  } = props;
  const styles = useStyles();
  const intl = useIntl();

  const availableSchemaTree = useSelector((state: RootState) => state.schema.availableSchemas);

  const fileService = DataMapperFileService();

  const onDropdownReopen = () => {
    fileService.readCurrentSchemaOptions();
  };

  const addNewInfo = intl.formatMessage({
    defaultMessage: 'Copy schema and its imports from the file system to your Logic App.',
    id: '9d1093917f18',
    description: 'Add new option',
  });

  const selectSchema = intl.formatMessage({
    defaultMessage: 'Select schema',
    id: 'de985e17a232',
    description: 'Select schema',
  });

  return (
    <div className={styles.root}>
      <RadioGroup
        value={selectedKey}
        className={styles.choiceGroupRoot}
        required={true}
        onChange={(_e, option: RadioGroupOnChangeData) => onOptionChange(option.value as FileSelectorOption)}
      >
        {Object.keys(options).map((key) => {
          return (
            <Radio
              value={key}
              key={key}
              label={
                <div>
                  <Text>
                    {options[key].text}
                    {selectedKey === key && key === 'upload-new' ? <InfoLabel info={<div>{addNewInfo}</div>} /> : null}
                  </Text>
                  <br />
                  {selectedKey === key && key === 'upload-new' ? (
                    <div className={styles.uploadInputRoot}>
                      <StackShim horizontal>
                        <Input size="small" value={fileName} placeholder={inputPlaceholder} readOnly />
                        <Button size="small" shape="square" appearance="primary" onClick={() => onUploadClick()} style={{ marginLeft: 8 }}>
                          {uploadButtonText}
                        </Button>
                      </StackShim>
                    </div>
                  ) : null}
                  {selectedKey === key && key === 'select-existing' ? (
                    <FileDropdownTree
                      placeholder={selectSchema}
                      fileTree={availableSchemaTree}
                      onItemSelect={onSelect}
                      className={styles.selectorDropdownRoot}
                      onReopen={onDropdownReopen}
                    />
                  ) : null}
                </div>
              }
            />
          );
        })}
      </RadioGroup>
      <Caption2 className={styles.errorMessage}>{errorMessage}</Caption2>
      {cancel && (
        <div className={styles.cancelButton}>
          <Button size="small" shape="square" appearance="secondary" onClick={cancel.onCancel}>
            {cancel.cancelButtonText}
          </Button>
        </div>
      )}
    </div>
  );
};

export default SchemaFileSelector;
