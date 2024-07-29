import { useHostOptions } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { useOperationVisuals } from '../../../core/state/operation/operationSelector';
import { clearPanel } from '../../../core/state/panel/panelSlice';
import { useNodeDisplayName, useNodeIds } from '../../../core/state/workflow/workflowSelectors';
import { setFocusNode } from '../../../core/state/workflow/workflowSlice';
import { SearchBox, FocusTrapZone } from '@fluentui/react';
import { Button } from '@fluentui/react-components';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import { OperationSearchCard, XLargeText } from '@microsoft/designer-ui';
import { labelCase } from '@microsoft/logic-apps-shared';
import Fuse from 'fuse.js';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

const fuseOptions: Fuse.IFuseOptions<{ id: string; text: string }> = {
  includeScore: true,
  minMatchCharLength: 2,
  includeMatches: true,
  ignoreLocation: true,
  threshold: 0.4,
  keys: ['text'],
};

const NodeSearchCard = ({ node, displayRuntimeInfo }: { node: string; displayRuntimeInfo: boolean }) => {
  const dispatch = useDispatch();
  const displayName = useNodeDisplayName(node);
  const { brandColor, iconUri } = useOperationVisuals(node);
  return (
    <div style={{ paddingBottom: 10 }}>
      <OperationSearchCard
        operationActionData={{ id: node, title: displayName, isTrigger: false, brandColor, iconUri }}
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
  focusReturnElementId: string | undefined;
} & CommonPanelProps;

export const NodeSearchPanel = (props: NodeSearchPanelProps) => {
  const { displayRuntimeInfo } = useHostOptions();
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
    if (!searchTerm) {
      return allNodeNames;
    }
    return fuseObject.search(searchTerm).map((result) => result.item.id);
  }, [allNodeNames, fuseObject, searchTerm]);

  const goToOperationHeader = intl.formatMessage({
    description: 'Header for a search panel that searches for and allows direct navigation to a specific node',
    defaultMessage: 'Go to operation',
    id: 'Fx/6sv',
  });
  const searchOperation = intl.formatMessage({
    defaultMessage: 'Search for operation',
    id: 'i0XjL5',
    description: 'Placeholder for search box that searches operations',
  });

  const closeButtonAriaLabel = intl.formatMessage({
    defaultMessage: 'Close panel',
    id: 'sfTqHY',
    description: 'Aria label for the close button in the node search panel',
  });

  const originalFocusElement = props.focusReturnElementId ? document.getElementById(props.focusReturnElementId) : undefined;

  return (
    <FocusTrapZone elementToFocusOnDismiss={originalFocusElement ? originalFocusElement : undefined}>
      <div className="msla-app-action-header">
        <XLargeText text={goToOperationHeader} />
        <Button aria-label={closeButtonAriaLabel} appearance="subtle" onClick={props.toggleCollapse} icon={<CloseIcon />} />
      </div>
      <div style={{ padding: 20 }}>
        <SearchBox placeholder={searchOperation} autoFocus={true} onChange={(e, newValue) => setSearchTerm(newValue ?? null)} />
      </div>
      <div aria-description={'List of operation results'}>
        {searchNodeNames.map((node) => (
          <NodeSearchCard key={node} node={node} displayRuntimeInfo={displayRuntimeInfo} />
        ))}
      </div>
    </FocusTrapZone>
  );
};
