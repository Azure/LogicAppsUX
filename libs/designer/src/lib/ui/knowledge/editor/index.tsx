import {
  ArtifactCreationStatus,
  WorkflowService,
  type IEditorProps,
  type KnowledgeHubExtended,
  type UploadFile,
} from '@microsoft/logic-apps-shared';
import { useKnowledgeStyles } from './styles';
import { Button, Dropdown, Input, Option, Text, Field, Label, Link, Badge } from '@fluentui/react-components';
import type { DropdownProps } from '@fluentui/react-components';
import {
  Add20Regular,
  ChevronRight16Regular,
  ChevronDown16Regular,
  ArrowSyncCircle16Regular,
  CheckmarkCircle16Regular,
  SubtractCircle16Regular,
} from '@fluentui/react-icons';
import { useState, useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useAllKnowledgeHubs, useConnection } from '../../../core/knowledge/utils/queries';
import { createLiteralValueSegment, NavigateIcon } from '@microsoft/designer-ui';
import { AddFilesModal } from './files';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../core/store';
import { openKnowledgeConnectionModal } from '../../../core/state/modal/modalSlice';
import { isLiteralValueSegment } from '../../../core/utils/parameters/segment';

interface KnowledgeHubEditorOptions {
  logicAppId: string;
}

export const KnowledgeHubEditor = ({ editorOptions, onValueChange, value }: IEditorProps) => {
  const styles = useKnowledgeStyles();
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const { logicAppId } = editorOptions as KnowledgeHubEditorOptions;
  const hubName = useMemo(() => (value.length === 1 && isLiteralValueSegment(value[0]) ? value[0].value : undefined), [value]);
  const { data: connection, isLoading: isConnectionLoading } = useConnection();
  const { data: hubs, isLoading, refetch } = useAllKnowledgeHubs(logicAppId);

  const [isFileUploadModalOpen, setIsFileUploadModalOpen] = useState(false);

  const INTL_TEXT = useMemo(
    () => ({
      title: intl.formatMessage({
        defaultMessage: 'Knowledge base',
        id: '8/Vjz3',
        description: 'Title for knowledge hub editor',
      }),
      description: intl.formatMessage({
        defaultMessage: 'Create a connection and add knowledge hub sources your agent will use to generate responses.',
        id: 'uMVVuc',
        description: 'Description for knowledge hub editor',
      }),
      connectionSectionLabel: intl.formatMessage({
        defaultMessage: 'Connection',
        id: 'Ij0UEU',
        description: 'Label for connection section',
      }),
      createConnectionButtonText: intl.formatMessage({
        defaultMessage: 'Create',
        id: 'IxkaoV',
        description: 'Text for create connection button',
      }),
      sourcesSectionLabel: intl.formatMessage({
        defaultMessage: 'Sources',
        id: 'w63mKE',
        description: 'Label for sources section',
      }),
      selectKnowledgeHubPlaceholder: intl.formatMessage({
        defaultMessage: 'Select a knowledge hub',
        id: '5Vbd0e',
        description: 'Placeholder text for knowledge hub dropdown',
      }),
      uploadFilesButtonText: intl.formatMessage({
        defaultMessage: 'Upload',
        id: 'HMSDoJ',
        description: 'Text for upload files button',
      }),
      connectionModalTitle: intl.formatMessage({
        defaultMessage: 'Create Connection',
        id: 'so2OVS',
        description: 'Title for create connection modal',
      }),
      uploadModalTitle: intl.formatMessage({
        defaultMessage: 'Upload Files',
        id: '874l4V',
        description: 'Title for upload files modal',
      }),
      learnMore: intl.formatMessage({
        defaultMessage: 'Learn more',
        id: '1ZDLZA',
        description: 'Text for learn more link',
      }),
      emptyArtifacts: intl.formatMessage({
        defaultMessage: `Can't find knowledge base artifacts. Create a knowledge base and upload files to get started.`,
        id: 'kIxrfq',
        description: 'Text to indicate that there are no artifacts in the knowledge hub',
      }),
      noConnectionMessage: intl.formatMessage({
        defaultMessage: 'Create a connection to add knowledge hubs.',
        id: 'wwXFYB',
        description: 'Text to indicate that there is no connection',
      }),
    }),
    [intl]
  );

  const handleOpenConnectionModal = useCallback(() => {
    dispatch(openKnowledgeConnectionModal());
  }, [dispatch]);

  const handleOpenFileUploadModal = useCallback(() => {
    setIsFileUploadModalOpen(true);
  }, []);

  const handleCloseFileUploadModal = useCallback(() => {
    setIsFileUploadModalOpen(false);
  }, []);

  const handleUploadArtifact = useCallback(
    async (
      resourceId: string,
      hubName: string,
      content: { file: UploadFile; name: string; description?: string },
      setIsLoading: (isLoading: boolean) => void
    ) => {
      if (WorkflowService().uploadFileArtifact) {
        await WorkflowService().uploadFileArtifact?.(resourceId, hubName, content, setIsLoading);
        await refetch();
      } else {
        console.warn('uploadFileArtifact method is not implemented in WorkflowService');
      }
    },
    [refetch]
  );

  const [selectedHub, setSelectedHub] = useState<string>(hubName ?? '');
  const handleHubSelect = useCallback<NonNullable<DropdownProps['onOptionSelect']>>(
    (_event, data) => {
      if (data.optionValue) {
        const hubName = data.optionValue;
        setSelectedHub(hubName ?? '');
        onValueChange?.({ value: [createLiteralValueSegment(hubName ?? '')] });
      }
    },
    [onValueChange]
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text size={200} weight="semibold">
          {INTL_TEXT.title}
        </Text>
        <div>
          <Text size={200}>{INTL_TEXT.description}</Text>
          <Link href="https://go.microsoft.com/fwlink/?linkid=2361415" target="_blank" rel="noopener noreferrer" className={styles.link}>
            {INTL_TEXT.learnMore}
            <NavigateIcon style={{ position: 'relative', top: '2px', left: '2px' }} />
          </Link>
        </div>
      </div>
      {/* Connection Section */}
      <Field className={styles.sectionContent}>
        <Label size="small" htmlFor="connection-input">
          {INTL_TEXT.connectionSectionLabel}
        </Label>
        {connection ? (
          <Input id="connection-input" value={connection?.name ?? ''} disabled={true} aria-label={INTL_TEXT.connectionSectionLabel} />
        ) : (
          <Button className={styles.createButton} icon={<Add20Regular style={{ width: '18px' }} />} onClick={handleOpenConnectionModal}>
            {INTL_TEXT.createConnectionButtonText}
          </Button>
        )}
      </Field>

      {/* Sources Section */}
      <div className={styles.sourcesRow}>
        <Field className={styles.sectionContent}>
          <Label size="small" htmlFor="knowledge-hub-dropdown">
            {INTL_TEXT.sourcesSectionLabel}
          </Label>
          <Dropdown
            id="knowledge-hub-dropdown"
            placeholder={!isConnectionLoading && !connection ? INTL_TEXT.noConnectionMessage : INTL_TEXT.selectKnowledgeHubPlaceholder}
            value={selectedHub ?? ''}
            selectedOptions={selectedHub ? [selectedHub] : []}
            onOptionSelect={handleHubSelect}
            aria-label={INTL_TEXT.sourcesSectionLabel}
            style={{ flexGrow: 1 }}
            disabled={isLoading || !connection}
          >
            {hubs?.length === 0 ? (
              <Option value="" text={INTL_TEXT.emptyArtifacts} disabled={true}>
                {INTL_TEXT.emptyArtifacts}
              </Option>
            ) : (
              hubs?.map((hub) => (
                <Option key={hub.id} value={hub.name} text={hub.name}>
                  <HubOption hub={hub} />
                </Option>
              ))
            )}
          </Dropdown>
        </Field>
        <Button
          className={styles.uploadButton}
          icon={<Add20Regular />}
          onClick={handleOpenFileUploadModal}
          aria-label={INTL_TEXT.uploadFilesButtonText}
          disabled={isLoading || !connection}
        >
          {INTL_TEXT.uploadFilesButtonText}
        </Button>
      </div>

      {isFileUploadModalOpen && (
        <AddFilesModal
          resourceId={logicAppId}
          selectedHub={hubName}
          onUploadArtifact={handleUploadArtifact}
          onDismiss={handleCloseFileUploadModal}
        />
      )}
    </div>
  );
};

const HubOption = ({ hub }: { hub: KnowledgeHubExtended }) => {
  const styles = useKnowledgeStyles();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExpandClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <div className={styles.optionRoot}>
      <div className={styles.optionContainer}>
        <Button
          onClick={handleExpandClick}
          appearance="subtle"
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          size="small"
          icon={isExpanded ? <ChevronDown16Regular /> : <ChevronRight16Regular />}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          aria-expanded={isExpanded}
        />
        <Text>{hub.name}</Text>
      </div>
      {isExpanded && (
        <div className={styles.artifactsList}>
          {(hub.artifacts ?? []).map((artifact) => (
            <div key={artifact.id} className={styles.artifactItem}>
              <Text className={styles.artifactName}>{artifact.name}</Text>
              <BadgeArtifact status={artifact.uploadStatus} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const BadgeArtifact = ({ status }: { status: ArtifactCreationStatus }) => {
  let icon: React.ReactNode | null = null;
  let text: string;
  let color: 'brand' | 'danger' | 'success';
  const styles = useKnowledgeStyles();
  const style: React.CSSProperties = { width: '20%' };

  const intl = useIntl();
  const INTL_TEXT = useMemo(
    () => ({
      inProgressStatus: intl.formatMessage({
        defaultMessage: 'In progress',
        id: 'gyfZhJ',
        description: 'Text to indicate that the artifact upload is in progress',
      }),
      completedStatus: intl.formatMessage({
        defaultMessage: 'Complete',
        id: '9euy52',
        description: 'Text to indicate that the artifact upload is completed',
      }),
      failedStatus: intl.formatMessage({
        defaultMessage: 'Error',
        id: 'fs92Nu',
        description: 'Text to indicate that the artifact upload has failed',
      }),
    }),
    [intl]
  );

  switch (status) {
    case ArtifactCreationStatus.InProgress: {
      icon = <ArrowSyncCircle16Regular />;
      text = INTL_TEXT.inProgressStatus;
      color = 'brand';
      break;
    }
    case ArtifactCreationStatus.Completed: {
      icon = <CheckmarkCircle16Regular />;
      text = INTL_TEXT.completedStatus;
      color = 'success';
      break;
    }
    case ArtifactCreationStatus.Failed: {
      icon = <SubtractCircle16Regular />;
      text = INTL_TEXT.failedStatus;
      color = 'danger';
      style.width = '14%';
      break;
    }
    default: {
      text = status;
      color = 'brand';
    }
  }

  return (
    <Badge style={style} className={styles.statusBadge} size="small" appearance="outline" color={color} icon={icon}>
      {text}
    </Badge>
  );
};
