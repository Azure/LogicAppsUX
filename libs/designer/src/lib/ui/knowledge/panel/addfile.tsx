import type { TemplatePanelFooterProps, TemplatesSectionItem } from '@microsoft/designer-ui';
import { FileDropZone, TemplatesPanelFooter, TemplatesSection } from '@microsoft/designer-ui';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/knowledge/store';
import { closePanel, KnowledgePanelView } from '../../../core/state/knowledge/panelSlice';
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  Text,
  Option,
  Field,
  Combobox,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  Input,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  tokens,
} from '@fluentui/react-components';
import { useAddFilePanelStyles, usePanelStyles } from './styles';
import { useIntl } from 'react-intl';
import { bundleIcon, Delete20Regular, Dismiss24Filled, Dismiss24Regular, DocumentText20Regular, AddRegular } from '@fluentui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAllKnowledgeHubs } from '../../../core/knowledge/utils/queries';
import { validateArtifactNameAvailability } from '../../../core/knowledge/utils/helper';
import { CreateGroup } from '../modals/creategroup';
import { LoggerService, LogEntryLevel, type UploadFile, equals, type UploadFileHandler } from '@microsoft/logic-apps-shared';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);
const UploadSizeLimit = 16 * 1024 * 1024; // 16MB
export const AddFilePanel = ({
  resourceId,
  mountNode,
  selectedHub,
  onUploadArtifact,
}: { resourceId: string; mountNode: HTMLDivElement | null; selectedHub?: string; onUploadArtifact: UploadFileHandler }) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const styles = { ...usePanelStyles(), ...useAddFilePanelStyles() };

  const { isOpen, currentPanelView } = useSelector((state: RootState) => state.knowledgeHubPanel);
  const { data: hubs, isLoading, refetch } = useAllKnowledgeHubs(resourceId);

  const INTL_TEXT = {
    title: intl.formatMessage({
      id: 'SUo94t',
      defaultMessage: 'Add files',
      description: 'Title for add files panel',
    }),
    groupSectionTitle: intl.formatMessage({
      id: 'YNy+xR',
      defaultMessage: 'Group',
      description: 'Section title for group details in add files panel',
    }),
    groupSectionDescription: intl.formatMessage({
      id: 'H0G+5i',
      defaultMessage: 'Create a group or select an existing one to manage your knowledge base files.',
      description: 'Section description for group details in add files panel',
    }),
    learnMore: intl.formatMessage({
      id: 'R7UxBX',
      defaultMessage: 'Learn more',
      description: 'Link text for learning more about knowledge base group',
    }),
    nameLabel: intl.formatMessage({
      id: '2Do8Lp',
      defaultMessage: 'Name',
      description: 'Label for the group name input field in add files panel',
    }),
    namePlaceholder: intl.formatMessage({
      id: 'ASLx7+',
      defaultMessage: 'Choose or create a new group',
      description: 'Placeholder for the group name field in add files panel',
    }),
    loading: intl.formatMessage({
      id: 'h0ATm8',
      defaultMessage: 'Loading groups...',
      description: 'Placeholder text while loading groups in add files panel',
    }),
    createGroupLabel: intl.formatMessage({
      id: 'ddpKN/',
      defaultMessage: 'Create a new group',
      description: 'Label for the create new group option in add files panel',
    }),
    groupDescriptionLabel: intl.formatMessage({
      id: 'J+HlnI',
      defaultMessage: 'Description',
      description: 'Label for the group description input field in add files panel',
    }),
    addFilesSectionDescription: intl.formatMessage({
      id: 'ifDZq4',
      defaultMessage: `Files are added to the specified group. Each file can't exceed 16 MB. Total upload can't exceed 100 MB.`,
      description: 'Section description for file details in add files panel',
    }),
    largeFileError: intl.formatMessage({
      id: 'zuszqq',
      defaultMessage: 'File size must be less than 16 MB.',
      description: 'Error message when uploaded file exceeds size limit in add files panel',
    }),
    addButton: intl.formatMessage({
      id: '9EmZWH',
      defaultMessage: 'Add',
      description: 'Button text for adding files to knowledge base in add files panel',
    }),
    addingButton: intl.formatMessage({
      id: 'Lzm9eC',
      defaultMessage: 'Adding...',
      description: 'Button text for adding files to knowledge base in add files panel when upload is in progress',
    }),
    cancelButton: intl.formatMessage({
      id: 'K4G+Zo',
      defaultMessage: 'Cancel',
      description: 'Button text for canceling adding files to knowledge base in add files panel',
    }),
    closeAriaLabel: intl.formatMessage({
      id: 'kdCuJZ',
      defaultMessage: 'Close panel',
      description: 'Aria label for close button',
    }),
    parameterEmptyErrorMessage: intl.formatMessage({
      id: 'nX3iRl',
      defaultMessage: 'User input must not be empty.',
      description: 'Error message for parameter is empty',
    }),
    errorTitle: intl.formatMessage({
      id: 'K550WF',
      defaultMessage: 'File upload failed',
      description: 'Title for error message when file upload fails in add files panel',
    }),
  };

  const options = useMemo(
    () =>
      hubs?.map((hub) => ({
        id: hub.name,
        name: hub.name,
        displayName: hub.name,
      })),
    [hubs]
  );

  const createNewKey = 'CREATE_NEW';
  const [groupName, setGroupName] = useState<string>(selectedHub ?? '');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string | undefined>(undefined);
  const [groupDescription, setGroupDescription] = useState<string>('');
  const [existingArtifactNames, setExistingArtifactNames] = useState<string[]>([]);

  useEffect(() => {
    if (hubs && groupName) {
      setGroupDescription(hubs.find((hub) => equals(hub.name, groupName))?.description ?? '');
      setExistingArtifactNames(hubs.find((hub) => equals(hub.name, groupName))?.artifacts.map((artifact) => artifact.name) ?? []);
    }
  }, [hubs, groupName]);

  const handleCreateGroup = useCallback(
    async (groupName: string, groupDescription: string) => {
      setGroupName(groupName);
      setGroupDescription(groupDescription);
      setSearchTerm(undefined);
      setShowCreateModal(false);
      await refetch();
    },
    [refetch]
  );
  const groupSectionItems = useMemo(() => {
    return [
      {
        label: INTL_TEXT.nameLabel,
        value: groupName,
        type: 'custom',
        required: true,
        onRenderItem: () => (
          <Field required={true}>
            <div>
              <Combobox
                style={{ width: '100%' }}
                disabled={isLoading}
                value={searchTerm !== undefined ? searchTerm : groupName}
                selectedOptions={groupName ? [groupName] : []}
                placeholder={isLoading ? INTL_TEXT.loading : INTL_TEXT.namePlaceholder}
                onOptionSelect={(_, data) => {
                  if (data.optionValue && data.optionValue === createNewKey) {
                    setShowCreateModal(true);
                  } else if (data.optionValue) {
                    setGroupName(data.optionValue);
                  }
                  setSearchTerm(undefined);
                }}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                }}
              >
                {isLoading
                  ? null
                  : (options ?? []).map((option) => (
                      <Option key={option.id} value={option.id}>
                        {option.displayName}
                      </Option>
                    ))}
                <Option id={createNewKey} value={createNewKey} text={INTL_TEXT.createGroupLabel}>
                  <AddRegular />
                  {INTL_TEXT.createGroupLabel}
                </Option>
              </Combobox>
            </div>
          </Field>
        ),
      },
      {
        label: INTL_TEXT.groupDescriptionLabel,
        value: groupDescription,
        type: 'textarea',
        disabled: true,
      },
    ] as TemplatesSectionItem[];
  }, [
    INTL_TEXT.createGroupLabel,
    INTL_TEXT.groupDescriptionLabel,
    INTL_TEXT.loading,
    INTL_TEXT.nameLabel,
    INTL_TEXT.namePlaceholder,
    groupDescription,
    groupName,
    isLoading,
    options,
    searchTerm,
  ]);

  const [selectedFiles, setSelectedFiles] = useState<UploadFile[]>([]);
  const sizeTooLargeError = useMemo(
    () => (selectedFiles.some((x) => x.file.size > UploadSizeLimit) ? INTL_TEXT.largeFileError : undefined),
    [INTL_TEXT.largeFileError, selectedFiles]
  );
  const addSectionItems = useMemo(() => {
    return [
      {
        value: groupName,
        type: 'custom',
        required: true,
        onRenderItem: () => (
          <FileDropZone
            accept={'.pdf, .doc, .docx, .ppt, .pptx, .xls, .xlsx, .txt, .md, .html'}
            disabled={selectedFiles.length > 0}
            isMultiUpload={false}
            onAdd={(file) => setSelectedFiles((prev) => [...prev, file])}
          />
        ),
        errorMessage: sizeTooLargeError,
      },
    ] as TemplatesSectionItem[];
  }, [groupName, selectedFiles.length, sizeTooLargeError]);

  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [fileDescriptions, setFileDescriptions] = useState<Record<string, string>>({});
  const hasNonEmptyFileNames = useMemo(
    () =>
      selectedFiles.length > 0 &&
      selectedFiles.every((file) => {
        const name = fileNames[file.uuid];
        return name !== undefined && name.trim() !== '';
      }),
    [fileNames, selectedFiles]
  );

  const handleDeleteFile = useCallback(
    (file: UploadFile) => {
      setSelectedFiles((prev) => prev.filter((f) => f.uuid !== file.uuid));
      const newFileNames = { ...fileNames };
      delete newFileNames[file.uuid.toString()];
      setFileNames(newFileNames);

      const newFileDescriptions = { ...fileDescriptions };
      delete newFileDescriptions[file.uuid.toString()];
      setFileDescriptions(newFileDescriptions);
    },
    [fileDescriptions, fileNames]
  );

  const handleUpdateFile = useCallback((file: UploadFile, { name, description }: { name?: string; description?: string }) => {
    if (name !== undefined) {
      setFileNames((prev) => ({
        ...prev,
        [file.uuid]: name,
      }));
    }

    if (description !== undefined) {
      setFileDescriptions((prev) => ({
        ...prev,
        [file.uuid]: description,
      }));
    }
  }, []);

  const fileSectionItems = useMemo(() => {
    return [
      {
        value: '',
        type: 'custom',
        required: true,
        onRenderItem: () => (
          <FileList files={selectedFiles} onDelete={handleDeleteFile} onUpdate={handleUpdateFile} existingNames={existingArtifactNames} />
        ),
      },
    ] as TemplatesSectionItem[];
  }, [existingArtifactNames, handleDeleteFile, handleUpdateFile, selectedFiles]);

  const handleCancel = useCallback(() => {
    dispatch(closePanel());
  }, [dispatch]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | undefined>(undefined);

  const handleAdd = useCallback(async () => {
    setUploadError(undefined);

    try {
      await onUploadArtifact(
        resourceId,
        groupName,
        { file: selectedFiles[0], name: fileNames[selectedFiles[0].uuid], description: fileDescriptions[selectedFiles[0].uuid] },
        setIsUploading
      );
      // For now we will just close the panel after upload. We can add a success message and keep the panel open in future if needed.
      dispatch(closePanel());
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'KnowledgeHub.uploadFileToKnowledgeHub',
        error,
        message: `Error occurred during file upload to the knowledge hub: ${resourceId}`,
      });

      setUploadError(
        intl.formatMessage(
          {
            id: '+nKZHB',
            defaultMessage: `Can't upload file. Please try again. Error: {errorMessage}`,
            description: 'Error message when file upload fails in add files panel',
          },
          { errorMessage }
        )
      );
      setIsUploading(false);
    }
  }, [dispatch, fileDescriptions, fileNames, groupName, intl, onUploadArtifact, resourceId, selectedFiles]);

  const handleClose = useCallback(() => {
    handleCancel();
  }, [handleCancel]);

  const footerContent: TemplatePanelFooterProps = useMemo(() => {
    return {
      buttonContents: [
        {
          type: 'action',
          text: isUploading ? INTL_TEXT.addingButton : INTL_TEXT.addButton,
          appearance: 'primary',
          disabled: !groupName || selectedFiles.length === 0 || sizeTooLargeError !== undefined || isUploading || !hasNonEmptyFileNames,
          onClick: handleAdd,
        },
        {
          type: 'action',
          text: INTL_TEXT.cancelButton,
          onClick: handleCancel,
        },
      ],
    };
  }, [
    INTL_TEXT.addButton,
    INTL_TEXT.addingButton,
    INTL_TEXT.cancelButton,
    groupName,
    handleAdd,
    handleCancel,
    hasNonEmptyFileNames,
    isUploading,
    selectedFiles.length,
    sizeTooLargeError,
  ]);

  return (
    <>
      {showCreateModal && <CreateGroup resourceId={resourceId} onDismiss={() => setShowCreateModal(false)} onCreate={handleCreateGroup} />}
      <Drawer
        className={styles.drawer}
        open={isOpen && currentPanelView === KnowledgePanelView.AddFiles}
        onOpenChange={(_, { open }) => !open && handleClose()}
        position="end"
        size="large"
        mountNode={{ element: mountNode }}
      >
        <DrawerHeader className={styles.header}>
          <div className={styles.headerContent}>
            <Text size={600} weight="semibold" style={{ flex: 1 }}>
              {INTL_TEXT.title}
            </Text>
            <Button appearance="subtle" icon={<CloseIcon />} onClick={handleClose}>
              {INTL_TEXT.closeAriaLabel}
            </Button>
          </div>
        </DrawerHeader>
        <DrawerBody className={styles.body}>
          {uploadError ? (
            <div>
              <MessageBar intent="error">
                <MessageBarBody>
                  <MessageBarTitle>{INTL_TEXT.errorTitle}</MessageBarTitle>
                  {uploadError}
                </MessageBarBody>
              </MessageBar>
            </div>
          ) : null}

          <TemplatesSection
            title={INTL_TEXT.groupSectionTitle}
            titleHtmlFor={'groupNameSectionLabel'}
            description={INTL_TEXT.groupSectionDescription}
            descriptionLink={{ text: INTL_TEXT.learnMore, href: 'https://www.microsoft.com' }}
            items={groupSectionItems}
            cssOverrides={{ sectionItem: styles.sectionItem }}
          />
          <TemplatesSection
            title={INTL_TEXT.title}
            titleHtmlFor={'addFilesSectionLabel'}
            description={INTL_TEXT.addFilesSectionDescription}
            descriptionLink={{ text: INTL_TEXT.learnMore, href: 'https://www.microsoft.com' }}
            items={addSectionItems}
          />
          <TemplatesSection
            title={intl.formatMessage(
              {
                id: 'g7puft',
                defaultMessage: 'Files ({count})',
                description: 'Section title for files list in add files panel',
              },
              { count: selectedFiles.length }
            )}
            titleHtmlFor={'filesSectionLabel'}
            items={fileSectionItems}
          />
        </DrawerBody>
        <DrawerFooter className={styles.footer}>
          <TemplatesPanelFooter {...footerContent} />
        </DrawerFooter>
      </Drawer>
    </>
  );
};

const FileList = ({
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
                  value={fileNames[item.uuid.toString()]?.name}
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
