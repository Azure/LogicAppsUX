import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useStyles } from './styles';
import FileSelector, { type FileSelectorOption } from '../common/selector/FileSelector';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../core/state/Store';
import type { FileWithVsCodePath } from '../../models/Schema';
import { toggleShowSelection, setTestFile } from '../../core/state/PanelSlice';
import { equals, type ITreeFile, SchemaType, type IFileSysTreeItem } from '@microsoft/logic-apps-shared';

type TestPanelBodyProps = {};

export const TestPanelBody = (_props: TestPanelBodyProps) => {
  const intl = useIntl();
  const styles = useStyles();
  const dispatch = useDispatch<AppDispatch>();
  const [fileSelectorOption, setFileSelectorOption] = useState<FileSelectorOption>('select-existing');
  const showSelection = useSelector((state: RootState) => state.panel.testPanel.showSelection);
  const selectedFile = useSelector((state: RootState) => state.panel.testPanel.selectedFile);

  const stringResources = useMemo(
    () => ({
      TEST_MAP: intl.formatMessage({
        defaultMessage: 'Test map',
        id: 'GFnJQe',
        description: 'Code view title',
      }),
      CLOSE_TEST_MAP: intl.formatMessage({
        defaultMessage: 'Close test map',
        id: '6oOQnD',
        description: 'Close code view button',
      }),
      BROWSE: intl.formatMessage({
        defaultMessage: 'Browse',
        id: 'syiNc+',
        description: 'Browse for file',
      }),
      BROWSE_MESSAGE: intl.formatMessage({
        defaultMessage: 'Select a file to upload',
        id: '2CXCOt',
        description: 'Placeholder for input to load a schema file',
      }),
      ADD_NEW: intl.formatMessage({
        defaultMessage: 'Upload sample data',
        id: 'lQnUbu',
        description: 'Upload sample data option',
      }),
      SELECT_EXISTING: intl.formatMessage({
        defaultMessage: 'Select from existing sample data',
        id: 'bXTpVp',
        description: 'Select existing option',
      }),
    }),
    [intl]
  );

  const onSelectExistingFile = useCallback(
    (item: IFileSysTreeItem) => {
      dispatch(toggleShowSelection());
      dispatch(
        setTestFile({
          name: item.name ?? '',
          path: equals(item.type, 'file') ? (item as ITreeFile).fullPath ?? '' : '',
          type: SchemaType.Source,
        })
      );
    },
    [dispatch]
  );

  const onOpenClose = useCallback(() => {}, []);

  const onUpload = useCallback(
    (files?: FileList) => {
      if (!files) {
        console.error('Files array is empty');
        return;
      }

      const schemaFile = files[0] as FileWithVsCodePath;
      if (!schemaFile.path) {
        console.log('Path property is missing from file (should only occur in browser/standalone)');
      } else if (schemaFile) {
        dispatch(
          setTestFile({
            name: schemaFile.name,
            path: schemaFile.path,
            type: SchemaType.Source,
          })
        );
        dispatch(toggleShowSelection());
      } else {
        console.error('Missing test file');
      }
    },
    [dispatch]
  );

  return (
    <div className={styles.bodyWrapper}>
      {showSelection ? (
        <FileSelector
          selectedKey={fileSelectorOption}
          options={{
            'upload-new': { text: stringResources.ADD_NEW },
            'select-existing': { text: stringResources.SELECT_EXISTING },
          }}
          onOptionChange={setFileSelectorOption}
          upload={{
            uploadButtonText: stringResources.BROWSE,
            inputPlaceholder: stringResources.BROWSE_MESSAGE,
            acceptedExtensions: '.xsd, .json',
            fileName: selectedFile?.name,
            onUpload: onUpload,
          }}
          existing={{
            fileList: [],
            onSelect: onSelectExistingFile,
            onOpenClose: onOpenClose,
          }}
        />
      ) : null}
    </div>
  );
};
