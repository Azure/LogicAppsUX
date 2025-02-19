import { useSelector } from 'react-redux';
import { FileDropdownTree } from '../../common/fileDropdownTree/FileDropdownTree';
import type { RootState } from '../../../core/state/Store';
import type { IFileSysTreeItem } from '@microsoft/logic-apps-shared';
import { DataMapperFileService } from '../../../core';
import { useIntl } from 'react-intl';

export type XsltFilePickerProps = {
  onFileSelect: (filePath: string) => void;
};

export const XsltFilePicker = (props: XsltFilePickerProps) => {
  const intl = useIntl();
  const customXsltPath = 'DataMapper/Extensions/InlineXslt';

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

  const updateInputFromFile = (item: IFileSysTreeItem) => {
    if (item.type === 'file') {
      props.onFileSelect(item.fullPath);
    }
  };

  const selectXsltMessage = `${relativePathMessage}${customXsltPath}`;

  return (
    <FileDropdownTree
      placeholder={selectXsltMessage}
      onReopen={onDropdownReopen}
      onItemSelect={updateInputFromFile}
      fileTree={xsltFileTree}
    />
  );
};
