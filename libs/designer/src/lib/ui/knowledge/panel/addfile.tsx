import type { TemplatePanelFooterProps, TemplatesSectionItem } from '@microsoft/designer-ui';
import { TemplatesPanelFooter, TemplatesSection } from '@microsoft/designer-ui';
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
} from '@fluentui/react-components';
import { usePanelStyles } from './styles';
import { useIntl } from 'react-intl';
import { bundleIcon, Delete24Regular, Dismiss24Filled, Dismiss24Regular, DocumentText20Regular, AddRegular } from '@fluentui/react-icons';
import { useCallback, useMemo, useState } from 'react';
import { useAllKnowledgeHubs } from '../../../core/knowledge/utils/queries';
import { uploadFileToKnowledgeHub } from '../../../core/knowledge/utils/helper';
import { CreateGroup } from '../modals/creategroup';
import { LoggerService, LogEntryLevel, type RenderFileUploadProps, type UploadFile } from '@microsoft/logic-apps-shared';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);
const UploadSizeLimit = 16 * 1024 * 1024; // 16MB
export const AddFilePanel = ({
  resourceId,
  mountNode,
  renderFileUpload,
}: { resourceId: string; mountNode: HTMLDivElement | null; renderFileUpload: (props: RenderFileUploadProps) => JSX.Element }) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const styles = usePanelStyles();

  const { isOpen, currentPanelView } = useSelector((state: RootState) => state.knowledgeHubPanel);
  const { data: hubs, isLoading } = useAllKnowledgeHubs(resourceId);

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
    addFilesSectionDescription: intl.formatMessage({
      id: '2tsZvo',
      defaultMessage: 'Files will be added to the group name above. Each file can be up to 16MB, with a maximum or 100MB per upload.',
      description: 'Section description for file details in add files panel',
    }),
    largeFileError: intl.formatMessage({
      id: 't0GT/E',
      defaultMessage: 'File must be less than 16MB.',
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
  const [groupName, setGroupName] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const groupSectionItems = useMemo(() => {
    return [
      {
        value: groupName,
        type: 'custom',
        required: true,
        onRenderItem: () => (
          <Field required={true}>
            <div>
              <Combobox
                disabled={isLoading}
                value={searchTerm}
                selectedOptions={groupName ? [groupName] : []}
                placeholder={isLoading ? INTL_TEXT.loading : INTL_TEXT.namePlaceholder}
                onOptionSelect={(_, data) => {
                  if (data.optionValue && data.optionValue === createNewKey) {
                    setShowCreateModal(true);
                  } else if (data.optionValue) {
                    setGroupName(data.optionValue);
                    setSearchTerm(data.optionValue);
                  }
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
    ] as TemplatesSectionItem[];
  }, [INTL_TEXT.createGroupLabel, INTL_TEXT.loading, INTL_TEXT.namePlaceholder, groupName, isLoading, options, searchTerm]);

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
        onRenderItem: () =>
          renderFileUpload({
            accept: '.pdf,.docx,.xlsx',
            disabled: selectedFiles.length > 0,
            isMultiUpload: false,
            onAdd: (file) => setSelectedFiles((prev) => [...prev, file]),
            onRemove: (file) => setSelectedFiles((prev) => prev.filter((f) => f.uuid !== file.uuid)),
          }),
        errorMessage: sizeTooLargeError,
      },
    ] as TemplatesSectionItem[];
  }, [groupName, renderFileUpload, selectedFiles.length, sizeTooLargeError]);

  const [fileDescriptions, setFileDescriptions] = useState<Record<string, string>>({});
  const handleDeleteFile = useCallback((file: UploadFile) => {
    setSelectedFiles((prev) => prev.filter((f) => f.uuid !== file.uuid));
  }, []);

  const handleUpdateFile = useCallback((file: UploadFile, properties: { description?: string }) => {
    setFileDescriptions((prev) => ({
      ...prev,
      [file.uuid]: properties.description ?? '',
    }));
  }, []);

  const fileSectionItems = useMemo(() => {
    return [
      {
        value: '',
        type: 'custom',
        required: true,
        onRenderItem: () => <FileList files={selectedFiles} onDelete={handleDeleteFile} onUpdate={handleUpdateFile} />,
      },
    ] as TemplatesSectionItem[];
  }, [handleDeleteFile, handleUpdateFile, selectedFiles]);

  const handleCancel = useCallback(() => {
    dispatch(closePanel());
  }, [dispatch]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | undefined>(undefined);

  const handleAdd = useCallback(async () => {
    setIsUploading(true);
    setUploadError(undefined);

    try {
      await uploadFileToKnowledgeHub(resourceId, groupName, {
        file: selectedFiles[0],
        description: fileDescriptions[selectedFiles[0].uuid],
      });
      // For now we will just close the panel after upload. We can add a success message and keep the panel open in future if needed.
      dispatch(closePanel());
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'KnowledgeHub.uploadFileToKnowledgeHub',
        error,
        message: `Error while uploading file to knowledge hub for the app: ${resourceId}`,
      });

      setUploadError(
        intl.formatMessage(
          {
            id: 'mlqmGy',
            defaultMessage: 'File upload failed. Please try again. Error: {errorMessage}',
            description: 'Error message when file upload fails in add files panel',
          },
          { errorMessage }
        )
      );
    } finally {
      setIsUploading(false);
    }
  }, [dispatch, fileDescriptions, groupName, intl, resourceId, selectedFiles]);

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
          disabled: !groupName || selectedFiles.length === 0 || sizeTooLargeError !== undefined || isUploading,
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
    isUploading,
    selectedFiles.length,
    sizeTooLargeError,
  ]);

  return (
    <>
      {showCreateModal && (
        <CreateGroup
          resourceId={resourceId}
          onDismiss={() => setShowCreateModal(false)}
          onCreate={(name) => {
            setGroupName(name);
            setSearchTerm(name);
          }}
        />
      )}
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
        <DrawerBody className={styles.body} style={{ overflow: 'auto', maxHeight: 'calc(100vh - 130px)', minHeight: '80vh' }}>
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
}: {
  files: UploadFile[];
  onDelete: (file: UploadFile) => void;
  onUpdate: (file: UploadFile, properties: { description?: string }) => void;
}) => {
  const intl = useIntl();
  const INTL_TEXT = {
    tableAriaLabel: intl.formatMessage({
      id: 'ZmBMSx',
      defaultMessage: 'File to be added to knowledge hub',
      description: 'Aria label for file list table in add files panel',
    }),
    fileNameLabel: intl.formatMessage({
      id: 'Dm/N8T',
      defaultMessage: 'File Name',
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
    descriptionLabel: intl.formatMessage({
      id: 'wb/39q',
      defaultMessage: 'Description',
      description: 'Label for file description column in file list',
    }),
    descriptionPlaceholder: intl.formatMessage({
      id: 'rZdUTh',
      defaultMessage: 'Optional description for the file',
      description: 'Placeholder for file description input in file list',
    }),
    deleteButtonAriaLabel: intl.formatMessage({
      id: 'eyy6Yf',
      defaultMessage: 'Delete file',
      description: 'Aria label for delete file button in file list',
    }),
  };

  const columns = [
    { columnKey: 'name', label: INTL_TEXT.fileNameLabel },
    { columnKey: 'type', label: INTL_TEXT.fileTypeLabel },
    { columnKey: 'size', label: INTL_TEXT.fileSizeLabel },
    { columnKey: 'description', label: INTL_TEXT.descriptionLabel },
    { columnKey: 'actions', label: '' }, // Empty label for actions column
  ];

  return (
    <Table size="small" aria-label={INTL_TEXT.tableAriaLabel}>
      <TableHeader>
        <TableRow>
          {columns.map((column, i) => (
            <TableHeaderCell key={column.columnKey} style={i === columns.length - 1 ? { width: '5%' } : {}}>
              <Text weight="semibold">{column.label}</Text>
            </TableHeaderCell>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.map((item) => (
          <TableRow key={item.uuid}>
            <TableCell>
              <DocumentText20Regular />
              <Text size={300} title={item.file.name}>
                {item.file.name}
              </Text>
            </TableCell>
            <TableCell>
              <Text size={300}>{item.file.type?.toUpperCase()}</Text>
            </TableCell>
            <TableCell>
              <Text size={300}>{getFileSizeInKB(item.file)} KB</Text>
            </TableCell>
            <TableCell style={{ alignContent: 'center' }}>
              <Input placeholder={INTL_TEXT.descriptionPlaceholder} onChange={(e) => onUpdate(item, { description: e.target.value })} />
            </TableCell>
            <TableCell>
              <Button
                appearance="subtle"
                size="small"
                icon={<Delete24Regular />}
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
