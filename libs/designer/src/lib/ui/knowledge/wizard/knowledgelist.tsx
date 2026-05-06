import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Text,
  TableCell,
  TableRow,
  Table,
  TableHeader,
  TableHeaderCell,
  Button,
  TableBody,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuItem,
  MenuList,
  Divider,
  mergeClasses,
  useTableFeatures,
  useTableSelection,
  createTableColumn,
  TableSelectionCell,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowSyncCircle20Regular,
  ArrowUpload24Regular,
  CheckmarkCircle20Regular,
  ChevronDownRegular,
  ChevronRightRegular,
  Delete24Regular,
  DocumentText20Regular,
  FolderOpen20Regular,
  MoreHorizontal20Regular,
  SubtractCircle20Regular,
} from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import { ArtifactCreationStatus, equals, getPropertyValue, type KnowledgeHubExtended as KnowledgeHub } from '@microsoft/logic-apps-shared';
import { useListStyles } from '../wizard/styles';
import { useQueryClient } from '@tanstack/react-query';
import { DeleteModal } from '../modals/delete';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../core/state/knowledge/store';
import type { ServerNotificationData } from '../../mcp/servers/servers';
import { setNotification } from '../../../core/state/knowledge/optionsSlice';

export interface KnowledgeHubItem {
  id: string;
  name: string;
  type: string;
  description: string;
  createdDate: string;
  status: string;
  parentId: string | null;
  isExpanded: boolean;
}

export const KnowledgeList = ({
  hubs,
  resourceId,
  setSelectedArtifacts,
  onUploadArtifacts,
}: {
  hubs: KnowledgeHub[];
  resourceId: string;
  setSelectedArtifacts: (artifacts: KnowledgeHubItem[]) => void;
  onUploadArtifacts: (hub: KnowledgeHub) => void;
}) => {
  const intl = useIntl();
  const styles = useListStyles();
  const queryClient = useQueryClient();
  const dispatch = useDispatch<AppDispatch>();

  const INTL_TEXT = useMemo(
    () => ({
      tableAriaLabel: intl.formatMessage({
        defaultMessage: 'List of knowledge hubs',
        id: 'JLWOQY',
        description: 'The aria label for the knowledge hubs table',
      }),
      nameLabel: intl.formatMessage({
        defaultMessage: 'Name',
        id: '5m1Ozg',
        description: 'The label for the name column',
      }),
      typeLabel: intl.formatMessage({
        defaultMessage: 'Type',
        id: 'XXOaU8',
        description: 'The label for the type column',
      }),
      agentLabel: intl.formatMessage({
        defaultMessage: 'Agent',
        id: 'IOAsSh',
        description: 'Label for the agent column',
      }),
      descriptionLabel: intl.formatMessage({
        defaultMessage: 'Description',
        id: 'Uf1R8k',
        description: 'Label for the description column',
      }),
      createdDateLabel: intl.formatMessage({
        defaultMessage: 'Created',
        id: 'Lsac0i',
        description: 'Label for the created date column',
      }),
      statusLabel: intl.formatMessage({
        defaultMessage: 'Upload status',
        id: 'xfUoo5',
        description: 'Label for the status column',
      }),
      uploadLabel: intl.formatMessage({
        defaultMessage: 'Upload artifacts',
        id: 'mfpHrs',
        description: 'Label for the upload artifacts action',
      }),
      deleteLabel: intl.formatMessage({
        defaultMessage: 'Delete',
        id: '8M2YfK',
        description: 'Label for the delete action',
      }),
      selectAll: intl.formatMessage({
        defaultMessage: 'Select all',
        id: '5GHXCP',
        description: 'Label for select all checkbox',
      }),
      selectRow: intl.formatMessage({
        defaultMessage: 'Select row',
        id: '/BY2cI',
        description: 'Label for select row checkbox',
      }),
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
      collapseHub: intl.formatMessage({
        defaultMessage: 'Collapse hub',
        id: 'UXbZTn',
        description: 'Aria label for collapse hub button',
      }),
      expandHub: intl.formatMessage({
        defaultMessage: 'Expand hub',
        id: 'hfz4Il',
        description: 'Aria label for expand hub button',
      }),
    }),
    [intl]
  );

  const [allItems, setAllItems] = useState<Record<string, KnowledgeHubItem>>(createAllItems(hubs, /* existingItems: */ {}));

  useEffect(() => {
    if (hubs) {
      setAllItems((prev) => createAllItems(hubs, prev));
    }
  }, [hubs]);

  const columns = useMemo(
    () => [
      createTableColumn<KnowledgeHubItem>({
        columnId: 'name',
      }),
      createTableColumn<KnowledgeHubItem>({
        columnId: 'type',
      }),
      createTableColumn<KnowledgeHubItem>({
        columnId: 'description',
      }),
      createTableColumn<KnowledgeHubItem>({
        columnId: 'createdDate',
      }),
      createTableColumn<KnowledgeHubItem>({
        columnId: 'status',
      }),
      createTableColumn<KnowledgeHubItem>({
        columnId: 'actions',
      }),
    ],
    []
  );

  // Getting the viewable items based on the expanded/collapsed state of the hubs
  const items = useMemo(
    () =>
      Object.values(allItems).reduce((acc: KnowledgeHubItem[], item: KnowledgeHubItem) => {
        if (item.parentId === null) {
          acc.push(item);
        }

        if (item.parentId === null && item.isExpanded) {
          const childItems = (hubs.find((hub) => hub.name === item.name)?.artifacts ?? []).map(
            (artifact) => `${item.name.toLowerCase()}-${artifact.name.toLowerCase()}`
          );
          acc.push(...childItems.map((child) => allItems[child]));
        }

        return acc;
      }, []),
    [hubs, allItems]
  );

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [artifactToDelete, setArtifactToDelete] = useState<KnowledgeHubItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const setSelectedArtifactItems = useCallback(
    (artifacts: string[]) => {
      setSelectedItems(artifacts);
      setSelectedArtifacts(artifacts.map((artifactName) => getPropertyValue(allItems, artifactName)));
    },
    [allItems, setSelectedArtifacts]
  );

  const { getRows } = useTableFeatures({ columns, items }, [useTableSelection({ selectionMode: 'multiselect' })]);

  const isRowSelected = useCallback((id: string) => !!selectedItems.find((item) => equals(item, id)), [selectedItems]);
  const allRowsSelected = useMemo(() => items.every((item) => isRowSelected(item.id)), [items, isRowSelected]);
  const someRowsSelected = useMemo(() => items.some((item) => isRowSelected(item.id)), [items, isRowSelected]);

  const toggleRowItem = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent, item: KnowledgeHubItem) => {
      const selected = isRowSelected(item.id);
      const isHubGroup = item.parentId === null;
      const artifactsInHub = isHubGroup ? getArtifactItemsInHub(item, allItems) : [];
      const artifactsToToggleState: string[] = [];

      if (isHubGroup) {
        if (selected) {
          // If the hub group is already selected, unselect the hub group and all its artifacts
          for (const artifact of artifactsInHub) {
            if (isRowSelected(artifact.id)) {
              artifactsToToggleState.push(artifact.id);
            }
          }
        } else {
          // If the hub group is not selected, select the hub group and all its artifacts
          for (const artifact of artifactsInHub) {
            if (!isRowSelected(artifact.id)) {
              artifactsToToggleState.push(artifact.id);
            }
          }
        }
      } else {
        const hubItem = getPropertyValue(allItems, item.parentId as string);
        if (hubItem) {
          const artifactsInSameHub = getArtifactItemsInHub(hubItem, allItems);
          const selectedArtifactsInSameHub = artifactsInSameHub.filter((artifact) => isRowSelected(artifact.id)).length;

          if (!selected && selectedArtifactsInSameHub === artifactsInSameHub.length - 1 && !isRowSelected(hubItem.id)) {
            // If the artifact is not selected and it's the last unselected artifact in the hub, select the hub group
            artifactsToToggleState.push(hubItem.id);
          } else if (selected && selectedArtifactsInSameHub === artifactsInSameHub.length && isRowSelected(hubItem.id)) {
            // If the artifact is selected and it's the only selected artifact in the hub, unselect the hub group
            artifactsToToggleState.push(hubItem.id);
          }
        }
      }

      artifactsToToggleState.push(item.id);

      let finalSelectedItems: string[] = selectedItems.slice();
      for (const id of artifactsToToggleState) {
        if (selectedItems.includes(id)) {
          finalSelectedItems = finalSelectedItems.filter((i) => !equals(i, id));
        } else {
          finalSelectedItems.push(id);
        }
      }

      setSelectedArtifactItems(finalSelectedItems);
    },
    [allItems, isRowSelected, selectedItems, setSelectedArtifactItems]
  );
  const rows = getRows((row) => {
    const selected = isRowSelected(row.item.id);
    return {
      ...row,
      onClick: (e: React.MouseEvent) => toggleRowItem(e, row.item),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === ' ') {
          e.preventDefault();
          toggleRowItem(e, row.item);
        }
      },
      selected,
      appearance: selected ? ('brand' as const) : ('none' as const),
    };
  });

  const toggleAllRows = useCallback(() => {
    setSelectedArtifactItems(allRowsSelected ? [] : Object.values(allItems).map((item) => item.id));
  }, [setSelectedArtifactItems, allItems, allRowsSelected]);

  const toggleAllKeydown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === ' ') {
        toggleAllRows();
        e.preventDefault();
      }
    },
    [toggleAllRows]
  );

  const handleExpandCollapse = useCallback((item: KnowledgeHubItem, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    setAllItems((prev) => ({
      ...prev,
      [item.id]: {
        ...prev[item.id],
        isExpanded: !prev[item.id].isExpanded,
      },
    }));
  }, []);

  const handleContextMenuClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
  }, []);

  const handleDelete = useCallback(async (item: KnowledgeHubItem, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    setArtifactToDelete(item);
    setShowDeleteModal(true);
  }, []);
  const handleCloseDeleteModal = useCallback(() => setShowDeleteModal(false), []);
  const handleOnDeleteComplete = useCallback(
    (data: ServerNotificationData) => {
      const itemDeleted = artifactToDelete;
      setShowDeleteModal(false);

      if (!itemDeleted) {
        return;
      }

      dispatch(setNotification(data));

      if (selectedItems.includes(itemDeleted.id)) {
        setSelectedArtifactItems(selectedItems.filter((id) => !equals(id, itemDeleted.id)));
      }
      setArtifactToDelete(null);
      queryClient.setQueryData(['knowledgehubs', resourceId.toLowerCase()], (oldData: KnowledgeHub[] | undefined) => {
        if (oldData) {
          if (itemDeleted.parentId === null) {
            // Hub group deleted, remove the whole hub
            return oldData.filter((hub) => !equals(hub.name, itemDeleted.name));
          }
          // Artifact deleted, remove the artifact from the hub
          return oldData.map((hub) => {
            if (equals(hub.name, itemDeleted.parentId)) {
              return {
                ...hub,
                artifacts: hub.artifacts.filter((artifact) => !equals(artifact.name, itemDeleted.name)),
              };
            }
            return hub;
          });
        }

        return oldData;
      });
    },
    [artifactToDelete, dispatch, queryClient, resourceId, selectedItems, setSelectedArtifactItems]
  );

  const handleUploadArtifacts = useCallback(
    (item: KnowledgeHubItem, event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      onUploadArtifacts(hubs.find((hub) => hub.name === item.name)!);
    },
    [hubs, onUploadArtifacts]
  );

  const renderNameCell = useCallback(
    (item: KnowledgeHubItem) => {
      const isHubGroup = item.parentId === null;
      const className = isHubGroup ? undefined : styles.artifactNameCell;

      return (
        <TableCell className={styles.rowCell}>
          <div className={styles.nameCell}>
            {isHubGroup ? (
              <Button
                appearance="subtle"
                icon={item.isExpanded ? <ChevronDownRegular /> : <ChevronRightRegular />}
                onClick={(event) => handleExpandCollapse(item, event)}
                aria-label={item.isExpanded ? INTL_TEXT.collapseHub : INTL_TEXT.expandHub}
                aria-expanded={item.isExpanded}
              />
            ) : null}
            <div className={mergeClasses(styles.nameText, className)}>
              {isHubGroup ? (
                <FolderOpen20Regular className={styles.nameIcon} style={{ color: tokens.colorStatusWarningForegroundInverted }} />
              ) : (
                <DocumentText20Regular className={styles.nameIcon} />
              )}
              <Text size={300} title={item.name} className={styles.nameLabel}>
                {item.name}
              </Text>
            </div>
          </div>
        </TableCell>
      );
    },
    [
      INTL_TEXT.collapseHub,
      INTL_TEXT.expandHub,
      handleExpandCollapse,
      styles.artifactNameCell,
      styles.nameCell,
      styles.nameIcon,
      styles.nameLabel,
      styles.nameText,
      styles.rowCell,
    ]
  );

  const renderTextCell = useCallback(
    (text: string) => (
      <TableCell className={styles.rowCell}>
        <Text size={300} title={text}>
          {text}
        </Text>
      </TableCell>
    ),
    [styles.rowCell]
  );

  const renderStatusCell = useCallback(
    (status: ArtifactCreationStatus) => {
      let icon: React.ReactNode | null = null;
      let text: string;

      switch (status) {
        case ArtifactCreationStatus.InProgress: {
          icon = <ArrowSyncCircle20Regular style={{ color: tokens.colorCompoundBrandBackground }} />;
          text = INTL_TEXT.inProgressStatus;
          break;
        }
        case ArtifactCreationStatus.Completed: {
          icon = <CheckmarkCircle20Regular style={{ color: tokens.colorPaletteLightGreenForeground3 }} />;
          text = INTL_TEXT.completedStatus;
          break;
        }
        case ArtifactCreationStatus.Failed: {
          icon = <SubtractCircle20Regular style={{ color: tokens.colorStatusDangerForeground1 }} />;
          text = INTL_TEXT.failedStatus;
          break;
        }
        default:
          text = status;
      }

      return (
        <TableCell className={styles.rowCell}>
          <div className={styles.statusCell}>
            {icon}
            <Text size={300} title={text}>
              {text}
            </Text>
          </div>
        </TableCell>
      );
    },
    [INTL_TEXT.completedStatus, INTL_TEXT.failedStatus, INTL_TEXT.inProgressStatus, styles.rowCell, styles.statusCell]
  );

  const getSelectionStateForItem = useCallback(
    (item: KnowledgeHubItem, selected: boolean): boolean | 'mixed' => {
      if (item.parentId === null) {
        if (selected) {
          return true;
        }

        // Hub group
        const artifactsInHub = getArtifactItemsInHub(item, allItems) ?? [];
        const selectedArtifactsInHub = artifactsInHub.filter((artifact) => isRowSelected(artifact.id)).length;

        if (selectedArtifactsInHub === 0) {
          return selected;
        }

        if (selectedArtifactsInHub === artifactsInHub.length) {
          return true;
        }

        return 'mixed';
      }

      // Artifact
      const hubItem = getPropertyValue(allItems, item.parentId);
      return hubItem && isRowSelected(hubItem.id) ? true : selected;
    },
    [allItems, isRowSelected]
  );

  useEffect(() => {
    // Check if any item has been deleted to update the selected list
    if (allItems && selectedItems) {
      const deletedItems = selectedItems.filter((id) => !getPropertyValue(allItems, id));
      if (deletedItems.length) {
        const newSelectedItems = selectedItems.filter((id) => !deletedItems.includes(id));
        setSelectedArtifactItems(newSelectedItems);
      }
    }
  }, [allItems, selectedItems, setSelectedArtifactItems]);

  if (!items.length) {
    return null;
  }

  return (
    <div>
      <Table className={styles.tableStyle} aria-label={INTL_TEXT.tableAriaLabel} size="small">
        <TableHeader>
          <TableRow className={styles.tableCell}>
            <TableSelectionCell
              checked={allRowsSelected ? true : someRowsSelected ? 'mixed' : false}
              checkboxIndicator={{ 'aria-label': INTL_TEXT.selectAll }}
              onClick={toggleAllRows}
              onKeyDown={toggleAllKeydown}
            />
            <TableHeaderCell className={styles.tableCell} style={{ width: '20%' }}>
              {INTL_TEXT.nameLabel}
            </TableHeaderCell>
            <TableHeaderCell className={styles.tableCell} style={{ width: '10%' }}>
              {INTL_TEXT.typeLabel}
            </TableHeaderCell>
            <TableHeaderCell className={styles.tableCell} style={{ width: '30%' }}>
              {INTL_TEXT.descriptionLabel}
            </TableHeaderCell>
            <TableHeaderCell className={styles.tableCell}>{INTL_TEXT.createdDateLabel}</TableHeaderCell>
            <TableHeaderCell className={styles.tableCell}>{INTL_TEXT.statusLabel}</TableHeaderCell>
            <TableHeaderCell className={styles.tableCell}>{/* Actions column, no header */}</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody className={styles.tableCell}>
          {rows.map(({ item, selected, onClick, onKeyDown, appearance }) => (
            <TableRow
              key={item.id}
              className={styles.tableCell}
              onClick={onClick}
              onKeyDown={onKeyDown}
              appearance={appearance}
              aria-selected={selected}
            >
              <TableSelectionCell
                checked={getSelectionStateForItem(item, selected)}
                checkboxIndicator={{ 'aria-label': INTL_TEXT.selectRow }}
              />
              {renderNameCell(item)}
              {renderTextCell(item.type)}
              {renderTextCell(item.description)}
              {renderTextCell(item.createdDate)}
              {renderStatusCell(item.status)}
              <TableCell className={styles.iconsCell}>
                <Menu>
                  <MenuTrigger disableButtonEnhancement>
                    <Button appearance="subtle" icon={<MoreHorizontal20Regular />} onClick={handleContextMenuClick} />
                  </MenuTrigger>
                  <MenuPopover>
                    <MenuList>
                      {item.parentId === null ? (
                        <>
                          <MenuItem icon={<ArrowUpload24Regular />} onClick={(event) => handleUploadArtifacts(item, event)}>
                            {INTL_TEXT.uploadLabel}
                          </MenuItem>
                          <Divider />
                        </>
                      ) : null}
                      <MenuItem icon={<Delete24Regular />} onClick={(event) => handleDelete(item, event)}>
                        {INTL_TEXT.deleteLabel}
                      </MenuItem>
                    </MenuList>
                  </MenuPopover>
                </Menu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {showDeleteModal && artifactToDelete ? (
        <DeleteModal
          selectedArtifacts={[artifactToDelete]}
          resourceId={resourceId}
          onDelete={handleOnDeleteComplete}
          onDismiss={handleCloseDeleteModal}
        />
      ) : null}
    </div>
  );
};

const createAllItems = (hubs: KnowledgeHub[], existingItems: Record<string, KnowledgeHubItem>): Record<string, KnowledgeHubItem> =>
  hubs.reduce(
    (result: Record<string, KnowledgeHubItem>, hub: KnowledgeHub) => {
      const id = hub.name.toLowerCase();
      result[id] = {
        id,
        name: hub.name,
        type: 'folder',
        description: hub.description,
        createdDate: hub.createdAt ? new Date(hub.createdAt).toLocaleString() : '--',
        status: '--', // Need to determine how to get upload status
        parentId: null,
        isExpanded: existingItems[id]?.isExpanded ?? false, // Preserve the expanded state if the item already exists
      };
      // biome-ignore lint/performance/noAccumulatingSpread: <explanation>
      return { ...result, ...createArtifactItems(hub, existingItems) };
    },
    {} as Record<string, KnowledgeHubItem>
  );

const createArtifactItems = (hub: KnowledgeHub, existingItems: Record<string, KnowledgeHubItem>): Record<string, KnowledgeHubItem> =>
  hub.artifacts.reduce(
    (result: Record<string, KnowledgeHubItem>, artifact) => {
      const id = `${hub.name.toLowerCase()}-${artifact.name.toLowerCase()}`;
      result[id] = {
        id,
        name: artifact.name,
        type: 'file',
        description: artifact.description,
        createdDate: artifact.createdAt ? new Date(artifact.createdAt).toLocaleString() : '--',
        status: artifact.uploadStatus, // Need to determine how to get upload status
        parentId: hub.name,
        isExpanded: existingItems[id]?.isExpanded ?? false, // Preserve the expanded state if the item already exists
      };
      return result;
    },
    {} as Record<string, KnowledgeHubItem>
  );

const getArtifactItemsInHub = (hub: KnowledgeHubItem, allItems: Record<string, KnowledgeHubItem>): KnowledgeHubItem[] =>
  Object.values(allItems ?? []).filter((item) => equals(item.parentId, hub.name)) ?? [];
