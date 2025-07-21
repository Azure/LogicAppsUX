import { useOperationVisuals } from '../../../core/state/operation/operationSelector';
import { changePanelNode } from '../../../core/state/panel/panelSlice';
import { useNodeDisplayName, useNodeIds } from '../../../core/state/workflow/workflowSelectors';
import { collapseGraphsToShowNode, setFocusNode } from '../../../core/state/workflow/workflowSlice';
import type { InputOnChangeData, SearchBoxChangeEvent } from '@fluentui/react-components';
import { Button, SearchBox } from '@fluentui/react-components';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import { OperationSearchCard, XLargeText } from '@microsoft/designer-ui';
import { labelCase } from '@microsoft/logic-apps-shared';
import Fuse from 'fuse.js';
import { useMemo, useState, useRef, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { createTabster, getModalizer, setTabsterAttribute } from 'tabster';
import { useDispatch } from 'react-redux';
import { useNodeSearchPanelStyles } from './nodeSearchPanelStyles';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

const fuseOptions: Fuse.IFuseOptions<{ id: string; text: string }> = {
  includeScore: true,
  minMatchCharLength: 2,
  includeMatches: true,
  ignoreLocation: true,
  threshold: 0.4,
  keys: ['text'],
};

const NodeSearchCard = ({ node }: { node: string }) => {
  const dispatch = useDispatch();
  const displayName = useNodeDisplayName(node);
  const { brandColor, iconUri } = useOperationVisuals(node);
  return (
    <div style={{ paddingBottom: 10 }}>
      <OperationSearchCard
        operationActionData={{ id: node, title: displayName, isTrigger: false, brandColor, iconUri }}
        showImage={true}
        onClick={(_: string) => {
          dispatch(collapseGraphsToShowNode(node));
          dispatch(changePanelNode(node));
          // Delay focus to allow graph expansion to complete.
          // 100ms provides enough time for React Flow to re-render expanded nodes
          // and calculate positions without feeling sluggish to users.
          // This ensures CanvasFinder has accurate node positions for panning.
          setTimeout(() => {
            dispatch(setFocusNode(node));
          }, 100);
        }}
      />
    </div>
  );
};

export type NodeSearchPanelProps = {
  focusReturnElementId: string | undefined;
} & CommonPanelProps;

export const NodeSearchPanel = (props: NodeSearchPanelProps) => {
  const allNodeNames = useNodeIds();
  const styles = useNodeSearchPanelStyles();
  const [searchTerm, setSearchTerm] = useState<string | null>(null);
  const intl = useIntl();
  const panelRef = useRef<HTMLDivElement>(null);

  // Get or create tabster instance and modalizer for focus trapping
  const tabsterCoreRef = useRef(createTabster(window));
  const modalizer = getModalizer(tabsterCoreRef.current);

  // Set up modalizer when component mounts
  useEffect(() => {
    if (panelRef.current && modalizer) {
      const element = panelRef.current;

      // Set the modalizer attribute on the element
      setTabsterAttribute(element, {
        modalizer: {
          id: 'node-search-panel',
          isTrapped: true,
        },
      });

      // Activate the modalizer
      modalizer.activate(element);

      return () => {
        // Deactivate modalizer when component unmounts
        modalizer.activate(undefined);

        // Clear the tabster attribute
        setTabsterAttribute(element, {});
      };
    }

    // Return undefined when no cleanup is needed
    return undefined;
  }, [modalizer]);

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

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Handle Escape key to close panel
    if (event.key === 'Escape') {
      event.preventDefault();
      props.toggleCollapse();

      // Restore focus to the original element if specified
      if (props.focusReturnElementId) {
        const originalElement = document.getElementById(props.focusReturnElementId);
        originalElement?.focus();
      }
    }
  };

  return (
    <div ref={panelRef} role="dialog" aria-label={goToOperationHeader} onKeyDown={handleKeyDown}>
      <div className="msla-app-action-header">
        <XLargeText text={goToOperationHeader} />
        <Button aria-label={closeButtonAriaLabel} appearance="subtle" onClick={props.toggleCollapse} icon={<CloseIcon />} />
      </div>
      <SearchBox
        className={styles.searchBox}
        placeholder={searchOperation}
        autoFocus={true}
        onChange={(_event: SearchBoxChangeEvent, data: InputOnChangeData) => setSearchTerm(data.value ?? null)}
      />
      <div aria-label="List of operation results">
        {searchNodeNames.map((node) => (
          <NodeSearchCard key={node} node={node} />
        ))}
      </div>
    </div>
  );
};
