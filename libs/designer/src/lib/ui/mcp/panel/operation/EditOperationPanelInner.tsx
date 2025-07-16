import { type TemplatePanelFooterProps, TemplatesPanelFooter } from '@microsoft/designer-ui';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../core/state/mcp/store';
import { closePanel } from '../../../../core/state/mcp/panel/mcpPanelSlice';
import { updateParameterConditionalVisibility } from '../../../../core/state/operation/operationMetadataSlice';
import { Button, DrawerBody, DrawerFooter, DrawerHeader, Text } from '@fluentui/react-components';
import { useMcpPanelStyles } from '../styles';
import { useIntl } from 'react-intl';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import { useCallback, useMemo, useState, useRef } from 'react';
import { EditOperation } from '../../parameters/EditOperation';
import type { EditOperationRef } from '../../parameters/EditOperation'; // Import the ref type
import { LayerHost } from '@fluentui/react';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export const EditOperationPanelInner = () => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const styles = useMcpPanelStyles();
  const [isDirty, setIsDirty] = useState(false);

  // Create ref for EditOperation component
  const editOperationRef = useRef<EditOperationRef>(null);

  // 2. Bump the key every time the drawer is closed
  const handleDismiss = useCallback(() => {
    dispatch(closePanel());
  }, [dispatch]);

  const { selectedOperationId, inputParameters } = useSelector((state: RootState) => ({
    selectedOperationId: state.connector.selectedOperationId,
    inputParameters: state.operation.inputParameters,
  }));

  const parameters = selectedOperationId ? inputParameters[selectedOperationId] : null;

  const INTL_TEXT = {
    title: intl.formatMessage({
      id: 'KDsdC6',
      defaultMessage: 'Edit Operation',
      description: 'Title for edit operation panel',
    }),
    closeAriaLabel: intl.formatMessage({
      id: 'kdCuJZ',
      defaultMessage: 'Close panel',
      description: 'Aria label for close button',
    }),
    unsavedChangesMessage: intl.formatMessage({
      id: '2uxQXJ',
      defaultMessage: 'You have unsaved changes. Are you sure you want to discard them?',
      description: 'Confirmation message for discarding unsaved changes',
    }),
  };

  const handleValueChange = useCallback((change: { value: any[]; viewModel?: any }) => {
    console.log('Value changed', change);
    setIsDirty(true);
  }, []);

  const resetToOriginalState = useCallback(() => {
    // Use the ref to reset the EditOperation component's local state
    editOperationRef.current?.resetLocalChanges();
    setIsDirty(false);
  }, []);

  const handleCancel = useCallback(() => {
    if (isDirty) {
      const shouldDiscard = window.confirm(INTL_TEXT.unsavedChangesMessage);
      if (!shouldDiscard) {
        return;
      }
    }

    resetToOriginalState();
    handleDismiss();
  }, [isDirty, INTL_TEXT.unsavedChangesMessage, resetToOriginalState, handleDismiss]);

  const handleDismissWithReset = useCallback(() => {
    // Always reset state when dismissing via X button
    resetToOriginalState();
    handleDismiss();
  }, [resetToOriginalState, handleDismiss]);

  const handleSave = useCallback(() => {
    if (!selectedOperationId || !parameters?.parameterGroups) {
      console.error('Cannot save: missing operation data');
      return;
    }

    console.log('Saving operation data...');

    // Get the latest conditional visibility changes from the EditOperation component
    const latestConditionalVisibilityChanges = editOperationRef.current?.getConditionalVisibilityChanges() || {};
    console.log('Latest conditional visibility changes:', latestConditionalVisibilityChanges);

    // Apply conditional visibility changes to Redux
    Object.entries(latestConditionalVisibilityChanges).forEach(([parameterId, isVisible]) => {
      // Find the parameter's group
      let parameterGroupId: string | undefined;

      Object.entries(parameters.parameterGroups).forEach(([groupId, group]) => {
        const param = group.parameters.find((p) => p.id === parameterId);
        if (param) {
          parameterGroupId = groupId;
        }
      });

      if (parameterGroupId) {
        dispatch(
          updateParameterConditionalVisibility({
            nodeId: selectedOperationId,
            groupId: parameterGroupId,
            parameterId,
            value: isVisible,
          })
        );
      }
    });

    // TODO: Save other parameter changes here

    setIsDirty(false);
    handleDismiss();
  }, [selectedOperationId, parameters, dispatch, handleDismiss]);

  const footerContent: TemplatePanelFooterProps = useMemo(() => {
    return {
      buttonContents: [
        {
          type: 'action',
          text: intl.formatMessage({
            defaultMessage: 'Save Changes',
            id: 'AkWRBl',
            description: 'Button text for saving operation changes',
          }),
          appearance: 'primary',
          onClick: handleSave,
          disabled: !isDirty,
        },
        {
          type: 'action',
          text: intl.formatMessage({
            defaultMessage: 'Cancel',
            id: '6u9d0D',
            description: 'Button text for canceling changes',
          }),
          onClick: handleCancel,
        },
      ],
    };
  }, [intl, isDirty, handleSave, handleCancel]);

  return (
    <div>
      <DrawerHeader className={styles.header}>
        <div className={styles.headerContent}>
          <Text size={600} weight="semibold" style={{ flex: 1 }}>
            {INTL_TEXT.title}
          </Text>
          <Button appearance="subtle" icon={<CloseIcon />} onClick={handleDismissWithReset} aria-label={INTL_TEXT.closeAriaLabel} />
        </div>
      </DrawerHeader>
      <LayerHost id="dropdown-layer-host" style={{ position: 'relative', zIndex: 1000 }}>
        <DrawerBody className={styles.body} style={{ overflow: 'auto', maxHeight: 'calc(100vh - 170px)', minHeight: '80vh' }}>
          <EditOperation ref={editOperationRef} onValueChange={handleValueChange} isDirty={isDirty} />
        </DrawerBody>
      </LayerHost>
      <DrawerFooter className={styles.footer}>
        <TemplatesPanelFooter {...footerContent} />
      </DrawerFooter>
    </div>
  );
};
