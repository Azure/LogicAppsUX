import type { TemplatePanelFooterProps } from '@microsoft/designer-ui';
import { TemplatesPanelFooter } from '@microsoft/designer-ui';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../core/state/mcp/store';
import { closePanel } from '../../../../core/state/mcp/panel/mcpPanelSlice';
import { Button, DrawerBody, DrawerFooter, DrawerHeader, Text } from '@fluentui/react-components';
import { useMcpPanelStyles } from '../styles';
import { useIntl } from 'react-intl';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import { useCallback, useMemo } from 'react';
import { EditOperation } from '../../parameters/EditOperation';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { useEditSnapshot } from '../../../../core/mcp/utils/hooks';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export const EditOperationPanelInner = () => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const styles = useMcpPanelStyles();

  const { selectedOperationId } = useSelector((state: RootState) => ({
    selectedOperationId: state.connector.selectedOperationId,
  }));

  const { restoreSnapshot, clearSnapshot } = useEditSnapshot(selectedOperationId ?? '');

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
  };

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

    clearSnapshot();
    dispatch(closePanel());
  }, [selectedOperationId, clearSnapshot, dispatch]);

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
  }, [intl, handleSave, handleCancel]);

  return (
    <div>
      <DrawerHeader className={styles.header}>
        <div className={styles.headerContent}>
          <Text size={600} weight="semibold" style={{ flex: 1 }}>
            {INTL_TEXT.title}
          </Text>
          <Button appearance="subtle" icon={<CloseIcon />} onClick={handleClose} aria-label={INTL_TEXT.closeAriaLabel} />
        </div>
      </DrawerHeader>
      <DrawerBody className={styles.body} style={{ overflow: 'auto', maxHeight: 'calc(100vh - 170px)', minHeight: '80vh' }}>
        <EditOperation />
      </DrawerBody>
      <DrawerFooter className={styles.footer}>
        <TemplatesPanelFooter {...footerContent} />
      </DrawerFooter>
    </div>
  );
};
