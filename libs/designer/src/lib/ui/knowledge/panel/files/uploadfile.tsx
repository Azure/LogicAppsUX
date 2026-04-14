import type { TemplatesSectionItem } from '@microsoft/designer-ui';
import { FileDropZone, TemplatesSection } from '@microsoft/designer-ui';
import { Option, Field, Combobox } from '@fluentui/react-components';
import { useAddFilePanelStyles, usePanelStyles } from '../styles';
import { useIntl } from 'react-intl';
import { AddRegular } from '@fluentui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAllKnowledgeHubs } from '../../../../core/knowledge/utils/queries';
import { type UploadFile, equals } from '@microsoft/logic-apps-shared';
import { FileList } from './filelist';
import { CreateGroup } from '../../modals/creategroup';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../../core/state/knowledge/store';
import { setNotification } from '../../../../core/state/knowledge/optionsSlice';

const UploadSizeLimit = 16 * 1024 * 1024; // 16MB
interface FileUploadProps {
  resourceId: string;
  selectedHub?: string;
  setDetails: (details: {
    groupName?: string;
    selectedFiles?: UploadFile[];
    fileNames?: Record<string, string>;
    fileDescriptions?: Record<string, string>;
  }) => void;
}

export const FileUpload = ({ resourceId, selectedHub, setDetails }: FileUploadProps) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const styles = { ...usePanelStyles(), ...useAddFilePanelStyles() };

  const { data: hubs, isLoading, refetch } = useAllKnowledgeHubs(resourceId);

  const INTL_TEXT = useMemo(
    () => ({
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
    }),
    [intl]
  );

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
      const selectedHubData = hubs.find((hub) => equals(hub.name, groupName));
      setGroupDescription(selectedHubData?.description ?? '');
      setExistingArtifactNames(selectedHubData?.artifacts?.map((artifact) => artifact.name) ?? []);
    }
  }, [hubs, groupName]);

  const handleCreateGroup = useCallback(
    async (name: string, description: string) => {
      setGroupName(name);
      setDetails({ groupName: name });
      setGroupDescription(description);
      setSearchTerm(undefined);
      setShowCreateModal(false);

      dispatch(
        setNotification({
          title: intl.formatMessage({
            id: '/RFd5i',
            defaultMessage: 'Successfully created the group.',
            description: 'Title for the toaster after creating a group in add files panel',
          }),
          content: intl.formatMessage(
            {
              id: 's2f0XK',
              defaultMessage: 'Group {name} has been created and selected.',
              description: 'Content for the toaster after creating a group in add files panel',
            },
            { name }
          ),
        })
      );

      await refetch();
    },
    [dispatch, intl, refetch, setDetails]
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
                    setDetails({ groupName: data.optionValue });
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
    setDetails,
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
            onAdd={(file) => {
              const newSelectedFiles = [...selectedFiles, file];
              setSelectedFiles(newSelectedFiles);
              setDetails({ selectedFiles: newSelectedFiles });
            }}
          />
        ),
        errorMessage: sizeTooLargeError,
      },
    ] as TemplatesSectionItem[];
  }, [groupName, selectedFiles, setDetails, sizeTooLargeError]);

  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [fileDescriptions, setFileDescriptions] = useState<Record<string, string>>({});

  const handleDeleteFile = useCallback(
    (file: UploadFile) => {
      const newSelectedFiles = selectedFiles.filter((f) => f.uuid !== file.uuid);
      const newFileNames = { ...fileNames };
      delete newFileNames[file.uuid.toString()];
      const newFileDescriptions = { ...fileDescriptions };
      delete newFileDescriptions[file.uuid.toString()];

      setFileNames(newFileNames);
      setFileDescriptions(newFileDescriptions);
      setSelectedFiles(newSelectedFiles);

      setDetails({ selectedFiles: newSelectedFiles, fileNames: newFileNames, fileDescriptions: newFileDescriptions });
    },
    [fileDescriptions, fileNames, selectedFiles, setDetails]
  );

  const handleUpdateFile = useCallback(
    (file: UploadFile, { name, description }: { name?: string; description?: string }) => {
      if (name !== undefined) {
        setFileNames((prev) => ({
          ...prev,
          [file.uuid]: name,
        }));
        setDetails({ fileNames: { ...fileNames, [file.uuid]: name } });
      }

      if (description !== undefined) {
        setFileDescriptions((prev) => ({
          ...prev,
          [file.uuid]: description,
        }));
        setDetails({ fileDescriptions: { ...fileDescriptions, [file.uuid]: description } });
      }
    },
    [fileDescriptions, fileNames, setDetails]
  );

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
  return (
    <>
      {showCreateModal && <CreateGroup resourceId={resourceId} onDismiss={() => setShowCreateModal(false)} onCreate={handleCreateGroup} />}
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
    </>
  );
};
