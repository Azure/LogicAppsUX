import {
  Button,
  Text,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  Input,
  tokens,
} from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { Delete20Regular, DocumentText20Regular } from '@fluentui/react-icons';
import { useCallback, useState } from 'react';
import { validateArtifactNameAvailability } from '../../../../core/knowledge/utils/helper';
import type { UploadFile } from '@microsoft/logic-apps-shared';
import { useAddFilePanelStyles } from '../styles';

export const FileList = ({
  files,
  onDelete,
  onUpdate,
  existingNames,
}: {
  files: UploadFile[];
  onDelete: (file: UploadFile) => void;
  onUpdate: (file: UploadFile, properties: { name?: string; description?: string }) => void;
  existingNames: string[];
}) => {
  const intl = useIntl();
  const INTL_TEXT = {
    tableAriaLabel: intl.formatMessage({
      id: 'jS5fEs',
      defaultMessage: 'File to add to the knowledge hub',
      description: 'Aria label for file list table in add files panel',
    }),
    fileNameLabel: intl.formatMessage({
      id: 'HtP0n9',
      defaultMessage: 'File',
      description: 'Label for file name column in file list',
    }),
    fileTypeLabel: intl.formatMessage({
      id: 'vrvlzv',
      defaultMessage: 'Type',
      description: 'Label for file type column in file list',
    }),
    fileSizeLabel: intl.formatMessage({
      id: 'gTZBAj',
      defaultMessage: 'Size',
      description: 'Label for file size column in file list',
    }),
    nameLabel: intl.formatMessage({
      id: 'L8q0Xw',
      defaultMessage: 'Name',
      description: 'Label for the artifact name input field in add files panel',
    }),
    namePlaceholder: intl.formatMessage({
      id: 'kqqMwh',
      defaultMessage: 'Artifact name',
      description: 'Placeholder for the artifact name field in add files panel',
    }),
    descriptionLabel: intl.formatMessage({
      id: 'wb/39q',
      defaultMessage: 'Description',
      description: 'Label for file description column in file list',
    }),
    descriptionPlaceholder: intl.formatMessage({
      id: '2t7Wx0',
      defaultMessage: 'Optional file description',
      description: 'Placeholder for file description input in file list',
    }),
    deleteButtonAriaLabel: intl.formatMessage({
      id: 'eyy6Yf',
      defaultMessage: 'Delete file',
      description: 'Aria label for delete file button in file list',
    }),
  };

  const styles = useAddFilePanelStyles();

  const columns = [
    { columnKey: 'fileName', label: INTL_TEXT.fileNameLabel },
    { columnKey: 'size', label: INTL_TEXT.fileSizeLabel },
    { columnKey: 'name', label: INTL_TEXT.nameLabel },
    { columnKey: 'description', label: INTL_TEXT.descriptionLabel },
    { columnKey: 'actions', label: '' }, // Empty label for actions column
  ];

  const renderHeaderCell = useCallback(
    (column: { columnKey: string; label: string }, style?: React.CSSProperties) => (
      <TableHeaderCell key={column.columnKey} style={style}>
        <Text weight="semibold">{column.label}</Text>
      </TableHeaderCell>
    ),
    []
  );

  const [fileNames, setFileNames] = useState<Record<string, { name: string; error: string | undefined }>>({});
  const handleNameChange = useCallback(
    (file: UploadFile, name: string) => {
      const errorMessage = validateArtifactNameAvailability(name, [
        ...existingNames,
        ...Object.keys(fileNames)
          .filter((key) => key !== file.uuid.toString())
          .map((key) => fileNames[key].name),
      ]);
      setFileNames((prevFileNames) => ({ ...prevFileNames, [file.uuid.toString()]: { name, error: errorMessage } }));

      if (!errorMessage) {
        onUpdate(file, { name });
      }
    },
    [existingNames, fileNames, onUpdate]
  );

  return (
    <Table size="small" aria-label={INTL_TEXT.tableAriaLabel}>
      <TableHeader>
        <TableRow>
          {renderHeaderCell(columns[0], { width: '15%' })}
          {renderHeaderCell(columns[1], { width: '10%' })}
          {renderHeaderCell(columns[2], { width: '25%' })}
          {renderHeaderCell(columns[3], { width: '40%' })}
          {renderHeaderCell(columns[4], { width: '5%' })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.map((item) => (
          <TableRow key={item.uuid}>
            <TableCell style={{ maxWidth: 0 }}>
              <div className={styles.fileNameCell}>
                <DocumentText20Regular style={{ flexShrink: 0 }} />
                <Text size={300} title={item.file.name} className={styles.fileNameText}>
                  {item.file.name}
                </Text>
              </div>
            </TableCell>
            <TableCell>
              <Text size={300}>{getFileSizeInKB(item.file)} KB</Text>
            </TableCell>
            <TableCell className={styles.inputCell}>
              <div className={fileNames[item.uuid.toString()]?.error ? styles.errorInput : undefined}>
                <Input
                  className={styles.inputText}
                  value={fileNames[item.uuid.toString()]?.name ?? ''}
                  placeholder={INTL_TEXT.namePlaceholder}
                  onChange={(e) => handleNameChange(item, e.target.value)}
                />
                {fileNames[item.uuid.toString()]?.error && (
                  <Text size={200} style={{ color: tokens.colorStatusDangerForeground3 }}>
                    {fileNames[item.uuid.toString()]?.error}
                  </Text>
                )}
              </div>
            </TableCell>
            <TableCell className={styles.inputCell}>
              <Input
                className={styles.inputText}
                placeholder={INTL_TEXT.descriptionPlaceholder}
                onChange={(e) => onUpdate(item, { description: e.target.value })}
              />
            </TableCell>
            <TableCell>
              <Button
                className={styles.actionButton}
                appearance="subtle"
                size="small"
                icon={<Delete20Regular />}
                onClick={() => onDelete(item)}
                aria-label={INTL_TEXT.deleteButtonAriaLabel}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const getFileSizeInKB = (file: File) => {
  return Math.round(file.size / 1024);
};
