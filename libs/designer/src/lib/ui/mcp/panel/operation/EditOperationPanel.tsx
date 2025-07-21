import type { TemplatePanelFooterProps } from '@microsoft/designer-ui';
import { TemplatesPanelFooter } from '@microsoft/designer-ui';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../core/state/mcp/store';
import { closePanel, McpPanelView } from '../../../../core/state/mcp/panel/mcpPanelSlice';
import { Button, Drawer, DrawerBody, DrawerFooter, DrawerHeader, Text } from '@fluentui/react-components';
import { useMcpPanelStyles } from '../styles';
import { useIntl } from 'react-intl';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EditOperation } from '../../parameters/EditOperation';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { useEditSnapshot } from '../../../../core/mcp/utils/hooks';
import { updateOperationDescription } from '../../../../core/state/operation/operationMetadataSlice';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export const EditOperationPanel = () => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const styles = useMcpPanelStyles();

  const { selectedOperationId, operationMetadata, isOpen, panelMode } = useSelector((state: RootState) => ({
    selectedOperationId: state.connector.selectedOperationId,
    operationMetadata: state.operation.operationMetadata,
    isOpen: state.mcpPanel?.isOpen ?? false,
    panelMode: state.mcpPanel?.currentPanelView ?? null,
  }));

  const selectedOperationSummary = useMemo(() => {
    return operationMetadata[selectedOperationId ?? '']?.summary ?? selectedOperationId;
  }, [selectedOperationId, operationMetadata]);

  const selectedOperationDescription = useMemo(() => {
    return operationMetadata[selectedOperationId ?? '']?.description ?? '';
  }, [selectedOperationId, operationMetadata]);

  const { restoreSnapshot, clearSnapshot } = useEditSnapshot(selectedOperationId ?? '');
  const [localDescription, setLocalDescription] = useState<string>('');
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const INTL_TEXT = {
    closeAriaLabel: intl.formatMessage({
      id: 'kdCuJZ',
      defaultMessage: 'Close panel',
      description: 'Aria label for close button',
    }),
  };

  const handleDescriptionInputChange = useCallback((description: string) => {
    setLocalDescription(description);
    setIsDirty(true);
  }, []);

  const onParameterUpdate = useCallback(() => {
    setIsDirty(true);
  }, []);

  const handleCancel = useCallback(() => {
    restoreSnapshot();
    clearSnapshot();
    dispatch(closePanel());
  }, [restoreSnapshot, clearSnapshot, dispatch]);

  const handleSave = useCallback(() => {
    if (!selectedOperationId) {
      LoggerService().log({
        level: LogEntryLevel.Error,
        message: 'Cannot save: missing operation data',
        area: 'MCP.EditOperation',
      });
      return;
    }

    const originalDescription = selectedOperationDescription;

    if (localDescription !== originalDescription) {
      dispatch(
        updateOperationDescription({
          id: selectedOperationId,
          description: localDescription,
        })
      );
    }

    clearSnapshot();
    dispatch(closePanel());
  }, [selectedOperationId, clearSnapshot, dispatch, selectedOperationDescription, localDescription]);

  const handleClose = useCallback(() => {
    handleCancel();
  }, [handleCancel]);

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

  useEffect(() => {
    if (selectedOperationDescription) {
      setLocalDescription(selectedOperationDescription);
    } else {
      setLocalDescription('');
    }
  }, [selectedOperationDescription]);

  return (
    <Drawer
      className={styles.drawer}
      open={isOpen && panelMode === McpPanelView.EditOperation}
      onOpenChange={(_, { open }) => !open && handleClose()}
      position="end"
      size="large"
    >
      <DrawerHeader className={styles.header}>
        <div className={styles.headerContent}>
          <Text size={600} weight="semibold" style={{ flex: 1 }}>
            {intl.formatMessage(
              {
                id: '8+TVCG',
                defaultMessage: 'Edit: {selectedOperationSummary}',
                description: 'Title for edit operation panel',
              },
              { selectedOperationSummary }
            )}
          </Text>
          <Button appearance="subtle" icon={<CloseIcon />} onClick={handleClose} aria-label={INTL_TEXT.closeAriaLabel} />
        </div>
      </DrawerHeader>
      <DrawerBody className={styles.body} style={{ overflow: 'auto', maxHeight: 'calc(100vh - 130px)', minHeight: '80vh' }}>
        <EditOperation
          localDescription={localDescription}
          handleDescriptionInputChange={handleDescriptionInputChange}
          onParameterUpdate={onParameterUpdate}
        />
      </DrawerBody>
      <DrawerFooter className={styles.footer}>
        <TemplatesPanelFooter {...footerContent} />
      </DrawerFooter>
    </Drawer>
  );
};
