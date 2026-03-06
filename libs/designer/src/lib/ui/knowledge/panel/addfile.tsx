import type { TemplatePanelFooterProps, TemplatesSectionItem } from '@microsoft/designer-ui';
import { TemplatesPanelFooter, TemplatesSection } from '@microsoft/designer-ui';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/knowledge/store';
import { closePanel, KnowledgePanelView } from '../../../core/state/knowledge/panelSlice';
import { Button, Drawer, DrawerBody, DrawerFooter, DrawerHeader, Text, Option, Field, Combobox } from '@fluentui/react-components';
import { usePanelStyles } from './styles';
import { useIntl } from 'react-intl';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular, AddRegular } from '@fluentui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { setLayerHostSelector } from '@fluentui/react';
import { useAllKnowledgeHubs } from '../../../core/knowledge/utils/queries';
import { CreateGroup } from '../modals/creategroup';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export const AddFilePanel = ({ resourceId }: { resourceId: string }) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const styles = usePanelStyles();

  const { isOpen, currentPanelView } = useSelector((state: RootState) => state.knowledgeHubPanel);
  const isAddFilesPanel = currentPanelView === KnowledgePanelView.AddFiles;

  // Set layer host for Fluent UI v8 components (dropdowns, callouts) inside the drawer
  useEffect(() => {
    if (isOpen && isAddFilesPanel) {
      setLayerHostSelector('#msla-layer-host-add-files');
    }
  }, [isOpen, isAddFilesPanel]);

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
    addButton: intl.formatMessage({
      id: '9EmZWH',
      defaultMessage: 'Add',
      description: 'Button text for adding files to knowledge base in add files panel',
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

  const addSectionItems = useMemo(() => {
    return [
      {
        value: groupName,
        type: 'custom',
        required: true,
        onRenderItem: () => <Button icon={<AddRegular />} title={'Browse for files'} />,
      },
    ] as TemplatesSectionItem[];
  }, [groupName]);

  const handleCancel = useCallback(() => {
    dispatch(closePanel());
  }, [dispatch]);

  const handleAdd = useCallback(() => {
    // Placeholder for add files functionality, currently just closes the panel
    dispatch(closePanel());
  }, [dispatch]);

  const handleClose = useCallback(() => {
    handleCancel();
  }, [handleCancel]);

  const footerContent: TemplatePanelFooterProps = useMemo(() => {
    return {
      buttonContents: [
        {
          type: 'action',
          text: INTL_TEXT.addButton,
          appearance: 'primary',
          onClick: handleAdd,
        },
        {
          type: 'action',
          text: INTL_TEXT.cancelButton,
          onClick: handleCancel,
        },
      ],
    };
  }, [INTL_TEXT.addButton, INTL_TEXT.cancelButton, handleAdd, handleCancel]);

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
        </DrawerBody>
        <DrawerFooter className={styles.footer}>
          <TemplatesPanelFooter {...footerContent} />
        </DrawerFooter>
        <div
          id="msla-layer-host-add-files"
          style={{
            position: 'absolute',
            inset: '0px',
            visibility: 'hidden',
            pointerEvents: 'none',
          }}
        />
      </Drawer>
    </>
  );
};
