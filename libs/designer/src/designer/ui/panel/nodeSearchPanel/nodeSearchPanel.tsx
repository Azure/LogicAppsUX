import { clearPanel } from '../../../core/state/panel/panelSlice';
import { useBrandColor, useIconUri } from '../../../core/state/selectors/actionMetadataSelector';
import { useNodeDisplayName, useNodeIds } from '../../../core/state/workflow/workflowSelectors';
import { setFocusNode } from '../../../core/state/workflow/workflowSlice';
import { IconButton, SearchBox, Text, FocusTrapZone } from '@fluentui/react';
import type { CommonPanelProps } from '@microsoft/logic-apps-designer';
import { OperationSearchCard } from '@microsoft/logic-apps-designer';
import { labelCase } from '@microsoft/logic-apps-designer';
import Fuse from 'fuse.js';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

const fuseOptions: Fuse.IFuseOptions<{ id: string; text: string }> = {
  includeScore: true,
  minMatchCharLength: 2,
  includeMatches: true,
  threshold: 0.4,
  keys: ['text'],
};

const NodeSearchCard = ({ node, displayRuntimeInfo }: { node: string; displayRuntimeInfo: boolean }) => {
  const brandColor = useBrandColor(node);
  const icon = useIconUri(node);
  const dispatch = useDispatch();
  const displayName = useNodeDisplayName(node);
  return (
    <div style={{ paddingBottom: 10 }}>
      <OperationSearchCard
        operationActionData={{ id: node, title: displayName, isTrigger: false, brandColor, iconUri: icon }}
        showImage={true}
        onClick={(_: string) => {
          dispatch(setFocusNode(node));
          dispatch(clearPanel());
        }}
        displayRuntimeInfo={displayRuntimeInfo}
      />
    </div>
  );
};

export type NodeSearchPanelProps = {
  displayRuntimeInfo: boolean;
} & CommonPanelProps;

export const NodeSearchPanel = (props: NodeSearchPanelProps) => {
  const { displayRuntimeInfo } = props;
  const allNodeNames = useNodeIds();
  const [searchTerm, setSearchTerm] = useState<string | null>(null);
  const intl = useIntl();
  const fuseObject = useMemo(() => {
    return new Fuse(
      allNodeNames.map((name) => ({ text: labelCase(name), id: name })),
      fuseOptions
    );
  }, [allNodeNames]);
  const searchNodeNames = useMemo(() => {
    if (!searchTerm) return allNodeNames;
    return fuseObject.search(searchTerm).map((result) => result.item.id);
  }, [allNodeNames, fuseObject, searchTerm]);

  const goToOperationHeader = intl.formatMessage({
    description: 'Header for a search panel that searches for and allows direct navigation to a specific node',
    defaultMessage: 'Go To Operation',
  });
  const searchOperation = intl.formatMessage({
    defaultMessage: 'Search for operation',
    description: 'Placeholder for search box that searches operations',
  });

  return (
    <FocusTrapZone>
      <div className="msla-app-action-header">
        <Text variant="xLarge">{goToOperationHeader}</Text>
        <IconButton onClick={props.toggleCollapse} iconProps={{ iconName: 'Cancel' }} />
      </div>
      <div style={{ padding: 20 }}>
        <SearchBox placeholder={searchOperation} autoFocus={true} onChange={(e, newValue) => setSearchTerm(newValue ?? null)} />
      </div>
      {searchNodeNames.map((node) => (
        <NodeSearchCard key={node} node={node} displayRuntimeInfo={displayRuntimeInfo} />
      ))}
    </FocusTrapZone>
  );
};
