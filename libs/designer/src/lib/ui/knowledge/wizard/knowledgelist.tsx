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
} from '@fluentui/react-components';
import {
  ArrowUpload24Regular,
  ChevronDownRegular,
  ChevronRightRegular,
  Delete24Regular,
  Document20Regular,
  Edit24Regular,
  Folder20Regular,
  MoreHorizontal20Regular,
} from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import { equals, type KnowledgeHubExtended as KnowledgeHub } from '@microsoft/logic-apps-shared';
import { useListStyles } from '../wizard/styles';
import { useQueryClient } from '@tanstack/react-query';
import { DeleteModal } from '../modals/delete';

const toolTableCellStyles = {
  border: 'none',
  paddingBottom: '8px',
};
const toolNameCellStyles = {
  paddingTop: '6px',
  alignItems: 'center',
};
const lastCellStyles = {
  width: '8%',
};

export interface KnowledgeHubItem {
  name: string;
  type: string;
  agent?: string;
  description: string;
  modifiedBy: string;
  modifiedDate: string;
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

  const INTL_TEXT = {
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
    lastModifiedLabel: intl.formatMessage({
      defaultMessage: 'Last modified by',
      id: '8mnvGL',
      description: 'Label for the last modified column',
    }),
    lastModifiedDateLabel: intl.formatMessage({
      defaultMessage: 'Last modified date',
      id: 'AIinB0',
      description: 'Label for the last modified date column',
    }),
    statusLabel: intl.formatMessage({
      defaultMessage: 'Upload status',
      id: 'xfUoo5',
      description: 'Label for the status column',
    }),
    renameLabel: intl.formatMessage({
      defaultMessage: 'Rename',
      id: '1Jch8f',
      description: 'Label for the rename action',
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
  };

  const [hubItems, setHubItems] = useState<Record<string, KnowledgeHubItem>>(createHubItems(hubs));

  useEffect(() => {
    if (hubs) {
      setHubItems(createHubItems(hubs));
    }
  }, [hubs]);

  const columns = [
    createTableColumn<KnowledgeHubItem>({
      columnId: 'name',
    }),
    createTableColumn<KnowledgeHubItem>({
      columnId: 'type',
    }),
    createTableColumn<KnowledgeHubItem>({
      columnId: 'agent',
    }),
    createTableColumn<KnowledgeHubItem>({
      columnId: 'description',
    }),
    createTableColumn<KnowledgeHubItem>({
      columnId: 'modifiedBy',
    }),
    createTableColumn<KnowledgeHubItem>({
      columnId: 'modifiedDate',
    }),
    createTableColumn<KnowledgeHubItem>({
      columnId: 'status',
    }),
    createTableColumn<KnowledgeHubItem>({
      columnId: 'actions',
    }),
  ];

  const items = useMemo(
    () =>
      Object.values(hubItems).reduce((acc: KnowledgeHubItem[], item: KnowledgeHubItem) => {
        acc.push(item);

        if (item.parentId === null && item.isExpanded) {
          const childItems = hubs.find((hub) => hub.name === item.name)?.artifacts ?? [];
          acc.push(
            ...childItems.map((child) => ({
              name: child.name,
              type: 'file',
              description: child.description,
              modifiedBy: '--', // Need to get this info from backend
              modifiedDate: '--', // Need to get this info from backend
              status: '--', // Need to determine how to get upload status
              parentId: item.name,
              isExpanded: false,
            }))
          );
        }

        return acc;
      }, []),
    [hubs, hubItems]
  );

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [artifactToDelete, setArtifactToDelete] = useState<KnowledgeHubItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const setSelectedArtifactItems = useCallback(
    (artifacts: string[]) => {
      setSelectedItems(artifacts);
      setSelectedArtifacts(
        artifacts.map((artifactName) => {
          const artifact = items.find((item) => equals(item.name, artifactName));
          return artifact!;
        })
      );
    },
    [items, setSelectedArtifacts]
  );

  const {
    getRows,
    selection: { toggleRow, isRowSelected },
  } = useTableFeatures({ columns, items }, [
    useTableSelection({
      selectionMode: 'multiselect',
      selectedItems: new Set(selectedItems),
      onSelectionChange: (_, data) => setSelectedArtifactItems(Array.from(data.selectedItems, String)),
    }),
  ]);

  const rows = getRows((row) => {
    const selected = isRowSelected(row.item.name);
    return {
      ...row,
      onClick: (e: React.MouseEvent) => toggleRow(e, row.item.name),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === ' ') {
          e.preventDefault();
          toggleRow(e, row.item.name);
        }
      },
      selected,
      appearance: selected ? ('brand' as const) : ('none' as const),
    };
  });

  const allRowsSelected = useMemo(() => {
    return !rows?.filter((row) => !row.selected)?.length;
  }, [rows]);

  const toggleAllRows = useCallback(() => {
    setSelectedArtifactItems(allRowsSelected ? [] : items.map((item) => item.name));
  }, [setSelectedArtifactItems, items, allRowsSelected]);

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
    setHubItems((prev) => ({
      ...prev,
      [item.name]: {
        ...prev[item.name],
        isExpanded: !prev[item.name].isExpanded,
      },
    }));
  }, []);

  const handleContextMenuClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
  }, []);

  const handleRename = useCallback(
    (item: KnowledgeHubItem, event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      // For now just log the action, need to implement rename logic
      // Implement rename logic here, possibly opening a dialog to enter new name
      console.log('Rename item', item, selectedItems);
    },
    [selectedItems]
  );

  const handleDelete = useCallback(async (item: KnowledgeHubItem, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    setArtifactToDelete(item);
    setShowDeleteModal(true);
  }, []);
  const handleCloseDeleteModal = useCallback(() => setShowDeleteModal(false), []);
  const handleOnDeleteComplete = useCallback(() => {
    const itemDeleted = artifactToDelete;
    setShowDeleteModal(false);

    if (!itemDeleted) {
      return;
    }

    if (selectedItems.includes(itemDeleted.name)) {
      setSelectedArtifactItems(selectedItems.filter((name) => name !== itemDeleted.name));
    }
    setArtifactToDelete(null);
    queryClient.setQueryData(['knowledgehubs', resourceId], (oldData: KnowledgeHub[] | undefined) => {
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
  }, [artifactToDelete, queryClient, resourceId, selectedItems, setSelectedArtifactItems]);

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
        <TableCell style={toolNameCellStyles}>
          <div className={styles.nameCell}>
            {isHubGroup ? (
              <Button
                appearance="subtle"
                icon={item.isExpanded ? <ChevronDownRegular /> : <ChevronRightRegular />}
                onClick={(event) => handleExpandCollapse(item, event)}
              />
            ) : null}
            <div className={mergeClasses(styles.nameText, className)}>
              {isHubGroup ? <Folder20Regular /> : <Document20Regular />}
              <Text size={300} title={item.name}>
                {item.name}
              </Text>
            </div>
          </div>
        </TableCell>
      );
    },
    [handleExpandCollapse, styles.artifactNameCell, styles.nameCell, styles.nameText]
  );

  const renderTextCell = useCallback(
    (text: string) => (
      <TableCell style={toolNameCellStyles}>
        <Text size={300} title={text}>
          {text}
        </Text>
      </TableCell>
    ),
    []
  );

  if (!items.length) {
    return null;
  }

  return (
    <div>
      <Table className={styles.tableStyle} aria-label={INTL_TEXT.tableAriaLabel} size="small">
        <TableHeader>
          <TableRow style={toolTableCellStyles}>
            <TableSelectionCell
              checked={allRowsSelected}
              checkboxIndicator={{ 'aria-label': INTL_TEXT.selectAll }}
              onClick={toggleAllRows}
              onKeyDown={toggleAllKeydown}
            />
            <TableHeaderCell style={toolTableCellStyles}>{INTL_TEXT.nameLabel}</TableHeaderCell>
            <TableHeaderCell style={toolTableCellStyles}>{INTL_TEXT.typeLabel}</TableHeaderCell>
            <TableHeaderCell style={toolTableCellStyles}>{INTL_TEXT.agentLabel}</TableHeaderCell>
            <TableHeaderCell style={toolTableCellStyles}>{INTL_TEXT.descriptionLabel}</TableHeaderCell>
            <TableHeaderCell style={toolTableCellStyles}>{INTL_TEXT.lastModifiedLabel}</TableHeaderCell>
            <TableHeaderCell style={toolTableCellStyles}>{INTL_TEXT.lastModifiedDateLabel}</TableHeaderCell>
            <TableHeaderCell style={toolTableCellStyles}>{INTL_TEXT.statusLabel}</TableHeaderCell>
            <TableHeaderCell style={lastCellStyles}>{/* Actions column, no header */}</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody style={toolTableCellStyles}>
          {rows.map(({ item, selected, onClick, onKeyDown, appearance }) => (
            <TableRow
              key={item.name}
              style={toolTableCellStyles}
              onClick={onClick}
              onKeyDown={onKeyDown}
              appearance={appearance}
              aria-selected={selected}
            >
              <TableSelectionCell checked={selected} checkboxIndicator={{ 'aria-label': INTL_TEXT.selectRow }} />
              {renderNameCell(item)}
              {renderTextCell(item.type)}
              {renderTextCell(item.agent ?? '')}
              {renderTextCell(item.description)}
              {renderTextCell(item.modifiedBy)}
              {renderTextCell(item.modifiedDate)}
              {renderTextCell(item.status)}
              <TableCell className={styles.iconsCell} style={toolTableCellStyles}>
                <Menu>
                  <MenuTrigger disableButtonEnhancement>
                    <Button appearance="subtle" icon={<MoreHorizontal20Regular />} onClick={handleContextMenuClick} />
                  </MenuTrigger>
                  <MenuPopover>
                    <MenuList>
                      <MenuItem icon={<Edit24Regular />} onClick={(event) => handleRename(item, event)}>
                        {INTL_TEXT.renameLabel}
                      </MenuItem>
                      {item.parentId === null ? (
                        <MenuItem icon={<ArrowUpload24Regular />} onClick={(event) => handleUploadArtifacts(item, event)}>
                          {INTL_TEXT.uploadLabel}
                        </MenuItem>
                      ) : null}
                      <Divider />
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

const createHubItems = (hubs: KnowledgeHub[]): Record<string, KnowledgeHubItem> =>
  hubs.reduce(
    (result: Record<string, KnowledgeHubItem>, hub: KnowledgeHub) => {
      result[hub.name] = {
        name: hub.name,
        type: 'folder',
        agent: '--', // Need to determine how to get agent info
        description: hub.description,
        modifiedBy: '--', // Need to get this info from backend
        modifiedDate: '--', // Need to get this info from backend
        status: '--', // Need to determine how to get upload status
        parentId: null,
        isExpanded: false,
      };
      return result;
    },
    {} as Record<string, KnowledgeHubItem>
  );
