import { type TemplatePanelFooterProps, TemplatesPanelFooter } from '@microsoft/designer-ui';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../../core/state/mcp/store';
import { closePanel } from '../../../../core/state/mcp/panel/mcpPanelSlice';
import { Button, DrawerBody, DrawerFooter, DrawerHeader, Text } from '@fluentui/react-components';
import { useMcpPanelStyles } from '../styles';
import { useIntl } from 'react-intl';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import { useCallback, useMemo, useState } from 'react';
import { EditOperation } from '../../parameters/EditOperation';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export const EditOperationPanelInner = () => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const styles = useMcpPanelStyles();
  const [isDirty, setIsDirty] = useState(false);

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

  const handleDismiss = useCallback(() => {
    dispatch(closePanel());
  }, [dispatch]);

  const handleValueChange = useCallback(() => {
    console.log('Value changed');
    setIsDirty(true);
  }, []);

  const handleCancel = useCallback(() => {
    if (isDirty) {
      const shouldDiscard = window.confirm('You have unsaved changes. Are you sure you want to discard them?');
      if (!shouldDiscard) {
        return;
      }
    }
    setIsDirty(false);
    handleDismiss();
  }, [isDirty, handleDismiss]);

  const handleSave = useCallback(() => {
    console.log('Saving operation data...');
  }, []);

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
          <Button appearance="subtle" icon={<CloseIcon />} onClick={handleDismiss} aria-label={INTL_TEXT.closeAriaLabel} />
        </div>
      </DrawerHeader>
      <DrawerBody
        className={styles.body}
        style={{ overflow: 'auto', maxHeight: /*calculated based on height of header/footer */ 'calc(100vh - 140px)' }}
      >
        <EditOperation onValueChange={handleValueChange} isDirty={isDirty} />
      </DrawerBody>
      <DrawerFooter className={styles.footer}>
        <TemplatesPanelFooter {...footerContent} />
      </DrawerFooter>
    </div>
  );
};
