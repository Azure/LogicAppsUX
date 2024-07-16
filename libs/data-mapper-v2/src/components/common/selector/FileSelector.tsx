import { useCallback, useRef } from 'react';
import { useStyles } from './styles';
import { ChoiceGroup } from '@fluentui/react';
import { StackShim } from '@fluentui/react-migration-v8-v9';
import { Button, Input } from '@fluentui/react-components';
import type { IFileSysTreeItem } from '@microsoft/logic-apps-shared';
import { DropdownTree } from '../DropdownTree';

type U = {
  text: string;
};

export type FileSelectorOption = 'upload-new' | 'select-existing';

export type FileSelectorProps<T> = {
  selectedKey: FileSelectorOption;
  onOptionChange: (selection: FileSelectorOption) => void;
  options?: Record<string, T>;
  upload: {
    onUpload: (files?: FileList) => void;
    uploadButtonText: string;
    acceptedExtensions?: string;
    inputPlaceholder?: string;
    fileName?: string;
  };
  existing: {
    fileList?: IFileSysTreeItem[];
    onSelect: (item: IFileSysTreeItem) => void;
    onOpenClose: () => void;
  };
};

const FileSelector = <T extends U>(props: FileSelectorProps<T>) => {
  const {
    selectedKey,
    options = {},
    onOptionChange,
    upload: { onUpload, acceptedExtensions, uploadButtonText, inputPlaceholder, fileName },
    existing: { fileList = [], onSelect, onOpenClose },
  } = props;
  const uploadFileRef = useRef<HTMLInputElement>(null);
  const styles = useStyles();

  const onInput = useCallback(
    (event: React.FormEvent<HTMLInputElement>) => {
      onUpload(event.currentTarget.files ?? undefined);
    },
    [onUpload]
  );

  return (
    <div className={styles.root}>
      <ChoiceGroup
        className={styles.choiceGroupRoot}
        selectedKey={selectedKey}
        options={Object.keys(options).map((key) => ({
          key,
          text: options[key].text,
          data: options[key],
          className: styles.choiceGroupOptionRoot,
        }))}
        onChange={(_e, option) => onOptionChange(option?.key as FileSelectorOption)}
        required={true}
      />
      {selectedKey === 'upload-new' ? (
        <div className={styles.uploadInputRoot}>
          <input type="file" ref={uploadFileRef} onInput={onInput} accept={acceptedExtensions} hidden />
          <StackShim horizontal>
            <Input size="small" value={fileName} placeholder={inputPlaceholder} readOnly />
            <Button
              size="small"
              shape="square"
              appearance="primary"
              onClick={() => uploadFileRef.current?.click()}
              style={{ marginLeft: 8 }}
            >
              {uploadButtonText}
            </Button>
          </StackShim>
        </div>
      ) : null}
      {selectedKey === 'select-existing' ? (
        <DropdownTree items={fileList} onItemSelect={onSelect} onDropdownOpenClose={onOpenClose} className={styles.selectorDropdownRoot} />
      ) : null}
    </div>
  );
};

export default FileSelector;
