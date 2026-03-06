import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/knowledge/store';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { setLayerHostSelector } from '@fluentui/react';
import { useIntl } from 'react-intl';
import type { KnowledgeHub } from '@microsoft/logic-apps-shared';
import { getStandardLogicAppId } from '../../../core/configuretemplate/utils/helper';
import { KnowledgePanelView, openPanelView } from '../../../core/state/knowledge/panelSlice';
import {
  Spinner,
  Text,
  Button,
  Image,
  Menu,
  MenuTrigger,
  MenuButton,
  MenuItem,
  MenuPopover,
  MenuList,
  Divider,
} from '@fluentui/react-components';
import { useWizardStyles } from './styles';
import { useAllKnowledgeHubs, useConnection } from '../../../core/knowledge/utils/queries';
import { KnowledgeHubPanel } from '../panel/panelroot';
import { DescriptionWithLink } from '../../configuretemplate/common';
import AddFiles_Light from '../../../common/images/knowledge/addfiles_light.svg';
import AddFiles_Dark from '../../../common/images/knowledge/addfiles_dark.svg';
import EmptySetup_Light from '../../../common/images/knowledge/emptysetup_light.svg';
import EmptySetup_Dark from '../../../common/images/knowledge/emptysetup_dark.svg';
import {
  AddRegular,
  ArrowClockwiseRegular,
  DeleteRegular,
  DocumentRegular,
  FolderRegular,
  LinkMultipleRegular,
} from '@fluentui/react-icons';
import { CreateGroup } from '../modals/creategroup';

export const KnowledgeHubWizard = () => {
  useEffect(() => setLayerHostSelector('#msla-layer-host'), []);
  const styles = useWizardStyles();
  const dispatch = useDispatch<AppDispatch>();
  const { subscriptionId, resourceGroup, logicAppName } = useSelector((state: RootState) => ({
    subscriptionId: state.resource.subscriptionId,
    resourceGroup: state.resource.resourceGroup,
    logicAppName: state.resource.logicAppName,
  }));
  const logicAppId = useMemo(
    () => getStandardLogicAppId(subscriptionId, resourceGroup, logicAppName ?? ''),
    [subscriptionId, resourceGroup, logicAppName]
  );
  const intl = useIntl();
  const INTL_TEXT = {
    description: intl.formatMessage({
      defaultMessage:
        'Add knowledge sources to build a knowledge base that the agent uses to generate accurate, context-aware responses and insights.',
      id: 'DIH5g2',
      description: 'Description displayed above the knowledge hubs list',
    }),
    learnMore: intl.formatMessage({
      defaultMessage: 'Learn more about knowledge sources',
      id: 'P2FkOv',
      description: 'Link text for learning more about knowledge bases',
    }),
    newButton: intl.formatMessage({
      defaultMessage: 'New',
      id: 'DgXA3v',
      description: 'Button text for creating new knowledge hub',
    }),
    addFilesItem: intl.formatMessage({
      defaultMessage: 'Add files',
      id: 'FBabb+',
      description: 'Menu item for adding files to knowledge hub',
    }),
    addGroupItem: intl.formatMessage({
      defaultMessage: 'Create new group',
      id: '0TLYdu',
      description: 'Menu item for adding group of files to knowledge hub',
    }),
    refreshButton: intl.formatMessage({
      defaultMessage: 'Refresh',
      id: 'YMwLWl',
      description: 'Button text for refreshing the knowledge hubs list',
    }),
    connectionButton: intl.formatMessage({
      defaultMessage: 'Connection',
      id: 'q80Qpn',
      description: 'Button text for knowledge hub connection settings',
    }),
    deleteButton: intl.formatMessage({
      defaultMessage: 'Delete',
      id: 'LWm9b4',
      description: 'Button text for deleting a knowledge hub',
    }),
  };

  const { data: allHubs, isLoading, refetch } = useAllKnowledgeHubs(logicAppId);
  const { data: connection, isLoading: isConnectionLoading } = useConnection();

  const [hubs, setHubs] = useState<KnowledgeHub[] | undefined>(undefined);
  const [showAddGroup, setShowAddGroup] = useState(false);

  useEffect(() => {
    if (allHubs && !isLoading) {
      setHubs(allHubs);
    }
  }, [allHubs, isLoading]);

  const handleDelete = useCallback(() => {
    // Implement delete functionality here
  }, []);

  const handleAddFiles = useCallback(() => {
    // Implement add files functionality here
  }, []);

  const handleAddGroup = useCallback(() => {
    setShowAddGroup(true);
  }, []);
  const handleCloseAddGroup = useCallback(() => {
    setShowAddGroup(false);
  }, []);

  const handleRefreshHubs = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleConnectionClick = useCallback(() => {
    dispatch(openPanelView({ panelView: connection ? KnowledgePanelView.EditConnection : KnowledgePanelView.CreateConnection }));
  }, [dispatch, connection]);

  if (hubs === undefined || isLoading || isConnectionLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="huge" />
        <Text weight="medium" size={500} className={styles.loadingText}>
          {intl.formatMessage({
            defaultMessage: 'Loading...',
            id: 'w/tTbg',
            description: 'Text displayed while loading knowledge hubs',
          })}
        </Text>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <KnowledgeHubPanel resourceId={logicAppId} />
      <DescriptionWithLink text={INTL_TEXT.description} linkText={INTL_TEXT.learnMore} linkUrl="" />
      <div style={{ display: 'flex', gap: '2px', marginBottom: '16px' }}>
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <MenuButton icon={<AddRegular />} appearance="subtle">
              {INTL_TEXT.newButton}
            </MenuButton>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem icon={<DocumentRegular />} onClick={handleAddFiles} disabled={!connection}>
                {INTL_TEXT.addFilesItem}
              </MenuItem>
              <MenuItem icon={<FolderRegular />} onClick={handleAddGroup} disabled={!connection}>
                {INTL_TEXT.addGroupItem}
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
        <Button appearance="subtle" icon={<ArrowClockwiseRegular />} onClick={handleRefreshHubs}>
          {INTL_TEXT.refreshButton}
        </Button>
        <Divider vertical={true} style={{ maxWidth: '2px' }} />
        <Button appearance="subtle" icon={<LinkMultipleRegular />} onClick={handleConnectionClick} disabled={!connection}>
          {INTL_TEXT.connectionButton}
        </Button>
        <Button appearance="subtle" icon={<DeleteRegular />} onClick={handleDelete} disabled={!connection}>
          {INTL_TEXT.deleteButton}
        </Button>
      </div>
      {hubs.length === 0 ? connection ? <EmptyKnowledgeBaseView /> : <NoConnectionsView /> : <div>{'Open the list view here'}</div>}
      {showAddGroup ? <CreateGroup resourceId={logicAppId} onDismiss={handleCloseAddGroup} /> : null}
      <div
        id={'msla-layer-host'}
        style={{
          position: 'absolute',
          inset: '0px',
          visibility: 'hidden',
        }}
      />
    </div>
  );
};

const NoConnectionsView = () => {
  const styles = useWizardStyles();
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const INTL_TEXT = {
    title: intl.formatMessage({
      defaultMessage: 'Ground responses and insights with knowledge',
      id: '76TGL0',
      description: 'Title displayed when there are no connections and hubs in the logic apps.',
    }),
    description: intl.formatMessage({
      defaultMessage: 'Set up your knowledge base and add sources that the agent will reference for accuracy.',
      id: 'L2xC0I',
      description: 'Description displayed when there are no connections and hubs in the logic apps.',
    }),
    buttonText: intl.formatMessage({
      defaultMessage: 'Set up',
      id: 'XZ5kRn',
      description: 'Button text for setting up',
    }),
  };

  const isDarkMode = useSelector((state: RootState) => state.options.isDarkMode);
  const handleSetup = useCallback(() => dispatch(openPanelView({ panelView: KnowledgePanelView.CreateConnection })), [dispatch]);
  return (
    <div className={styles.emptyViewContainer}>
      <div className={styles.emptyViewContent}>
        <Image src={isDarkMode ? EmptySetup_Dark : EmptySetup_Light} className={styles.icon} />
        <Text weight="semibold" size={500} className={styles.emptyViewTitle}>
          {INTL_TEXT.title}
        </Text>
        <DescriptionWithLink text={INTL_TEXT.description} />
      </div>
      <div className={styles.emptyViewButtons}>
        <Button appearance="primary" icon={<AddRegular />} onClick={handleSetup}>
          {INTL_TEXT.buttonText}
        </Button>
      </div>
    </div>
  );
};

const EmptyKnowledgeBaseView = () => {
  const styles = useWizardStyles();
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const INTL_TEXT = {
    title: intl.formatMessage({
      defaultMessage: 'Add file sources to your Knowledge base',
      id: 'AhAJr6',
      description: 'Title displayed when there are no hubs in the logic apps.',
    }),
    description: intl.formatMessage({
      defaultMessage: 'Add sources that the agent will reference for accuracy.',
      id: 'ZTC15w',
      description: 'Description displayed when there are no hubs in the logic apps.',
    }),
    buttonText: intl.formatMessage({
      defaultMessage: 'Add files',
      id: 'k/8PVE',
      description: 'Button text for adding files',
    }),
  };

  const isDarkMode = useSelector((state: RootState) => state.options.isDarkMode);
  const handleSetup = useCallback(() => dispatch(openPanelView({ panelView: KnowledgePanelView.AddFiles })), [dispatch]);
  return (
    <div className={styles.emptyViewContainer}>
      <div className={styles.emptyViewContent}>
        <Image src={isDarkMode ? AddFiles_Dark : AddFiles_Light} className={styles.icon} />
        <Text weight="semibold" size={500} className={styles.emptyViewTitle}>
          {INTL_TEXT.title}
        </Text>
        <DescriptionWithLink text={INTL_TEXT.description} />
      </div>
      <div className={styles.emptyViewButtons}>
        <Button appearance="primary" icon={<AddRegular />} onClick={handleSetup}>
          {INTL_TEXT.buttonText}
        </Button>
      </div>
    </div>
  );
};
