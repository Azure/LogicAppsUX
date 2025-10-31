import { useNodeIds } from '../../../core/state/workflow/workflowSelectors';
import type { InputOnChangeData, SearchBoxChangeEvent } from '@fluentui/react-components';
import { Text, DialogBody, DialogContent, DialogSurface, DialogTitle, SearchBox } from '@fluentui/react-components';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import { labelCase } from '@microsoft/logic-apps-shared';
import Fuse from 'fuse.js';
import { useMemo, useState, useRef, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { createTabster, getModalizer, setTabsterAttribute } from 'tabster';
import { useNodeSearchPanelStyles } from './nodeSearchPanelStyles';
import { NodeSearchCard } from './nodeSearchCard';

const fuseOptions: Fuse.IFuseOptions<{ id: string; text: string }> = {
  includeScore: true,
  minMatchCharLength: 2,
  includeMatches: true,
  ignoreLocation: true,
  threshold: 0.4,
  keys: ['text'],
};

export type NodeSearchDialogProps = {
  focusReturnElementId: string | undefined;
} & CommonPanelProps;

export const NodeSearchDialog = (props: NodeSearchDialogProps) => {
  const allNodeNames = useNodeIds();
  const styles = useNodeSearchPanelStyles();
  const [searchTerm, setSearchTerm] = useState<string | null>(null);
  const intl = useIntl();
  const panelRef = useRef<HTMLDivElement>(null);

  // Get or create tabster instance and modalizer for focus trapping
  const tabsterInstance = useMemo(() => createTabster(window), []);
  const tabsterCoreRef = useRef(tabsterInstance);
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
    return;
  }, [modalizer]);

  const fuseObject = useMemo(() => {
    return new Fuse(
      allNodeNames.map((name) => ({
        id: name,
        text: labelCase(name),
      })),
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
    description: 'Header for a search dialog that searches for and allows direct navigation to a specific node',
    defaultMessage: 'Go to operation',
    id: 'a4pbE7',
  });

  const searchOperation = intl.formatMessage({
    defaultMessage: 'Search for operation',
    id: 'i0XjL5',
    description: 'Placeholder for search box that searches operations',
  });

  const noOperationsText = intl.formatMessage({
    defaultMessage: 'No operations found',
    id: 'Qi6Ayq',
    description: 'Text displayed when no operations match the search term',
  });

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Handle Escape key to close dialog
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

  const searchNodes = searchNodeNames.map((node) => <NodeSearchCard key={node} node={node} />);

  return (
    <DialogSurface ref={panelRef} aria-label={goToOperationHeader} onKeyDown={handleKeyDown}>
      <DialogBody>
        <DialogTitle>
          <SearchBox
            size="large"
            className={styles.searchBox}
            placeholder={searchOperation}
            autoFocus={true}
            onChange={(_event: SearchBoxChangeEvent, data: InputOnChangeData) => setSearchTerm(data.value ?? null)}
          />
        </DialogTitle>
        <DialogContent style={{ height: '30vh' }}>
          <div role="list" aria-label="List of operation results" className={styles.nodeSearchResults}>
            {searchNodes.length > 0 ? searchNodes : <Text style={{ margin: '8px auto' }}>{noOperationsText}</Text>}
          </div>
        </DialogContent>
      </DialogBody>
    </DialogSurface>
  );
};
