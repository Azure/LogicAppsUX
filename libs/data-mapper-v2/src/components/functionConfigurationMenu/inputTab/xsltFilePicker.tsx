import { useSelector } from 'react-redux';
import { FileDropdownTree } from '../../common/fileDropdownTree/FileDropdownTree';
import type { RootState } from '../../../core/state/Store';
import type { IFileSysTreeItem } from '@microsoft/logic-apps-shared';
import { DataMapperFileService } from '../../../core';
import { useIntl } from 'react-intl';
import { useStyles } from './styles';

export type XsltFilePickerProps = {
  onFileSelect: (filePath: string) => void;
  selectedFileName?: string;
};

export const XsltFilePicker = (props: XsltFilePickerProps) => {
  const intl = useIntl();
  const customXsltPath = 'DataMapper/Extensions/InlineXslt';

  const style = useStyles();

  const xsltFileTree = useSelector((state: RootState) => state.function.customXsltFilePaths);

  const fileService = DataMapperFileService();

  const onDropdownReopen = () => {
    fileService.readCurrentCustomXsltPathOptions();
  };

  const relativePathMessage = intl.formatMessage({
    defaultMessage: 'Select function from ',
    id: '+KXX+O',
    description: 'Path to the function to select',
  });

  const selectFileMessage = intl.formatMessage({
    defaultMessage: 'Select file',
    id: 'vAtGzU',
    description: 'Path to the file to select',
  });

  const updateInputFromFile = (item: IFileSysTreeItem) => {
    if (item.type === 'file') {
      props.onFileSelect(`"${item.fullPath}"`);
    }
  };

  const selectXsltMessage = `${relativePathMessage}${customXsltPath}`;

  return (
    <>
      <div className={style.descriptionText}>{selectXsltMessage}</div>
      <FileDropdownTree
        existingSelectedFile={props.selectedFileName}
        className={style.xsltStyles}
        placeholder={selectFileMessage}
        onReopen={onDropdownReopen}
        onItemSelect={updateInputFromFile}
        fileTree={xsltFileTree}
      />
    </>
  );
};
