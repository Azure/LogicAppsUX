import { type TemplatePanelFooterProps, TemplatesPanelFooter } from '@microsoft/designer-ui';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../../core/state/mcp/store';
import { closePanel } from '../../../../core/state/mcp/panel/mcpPanelSlice';
import { Button, DrawerBody, DrawerFooter, DrawerHeader, Text } from '@fluentui/react-components';
import { useMcpPanelStyles } from '../styles';
import { useIntl } from 'react-intl';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import { useCallback, useMemo, useState } from 'react';
import { EditOperation } from '../../operations/EditOperation';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export const EditOperationPanelInner = () => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const styles = useMcpPanelStyles();
  const [isDirty, setIsDirty] = useState(false);

  const INTL_TEXT = {
    title: intl.formatMessage({
      id: 'unVPy/',
      defaultMessage: 'Edit Operations',
      description: 'Title for edit operations panel',
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

  const updateOperationData = useCallback(
    (_operationData: any) => {
      setIsDirty(true);
      //TODO: update operation data logic
    },
    [setIsDirty]
  );

  const footerContent: TemplatePanelFooterProps = useMemo(() => {
    return {
      buttonContents: [
        {
          type: 'action',
          text: intl.formatMessage({
            defaultMessage: 'Save',
            id: 'pWivUj',
            description: 'Button text for saving changes for operation in the edit operation panel',
          }),
          appearance: 'primary',
          onClick: () => {
            //TODO: Implement save logic
            dispatch(closePanel());
          },
          disabled: !isDirty,
        },
        {
          type: 'action',
          text: intl.formatMessage({
            defaultMessage: 'Cancel',
            id: '75zXUl',
            description: 'Button text for closing the panel',
          }),
          onClick: () => {
            handleDismiss();
          },
        },
      ],
    };
  }, [dispatch, intl, isDirty, handleDismiss]);

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
      <DrawerBody>
        <EditOperation updateOperationData={updateOperationData} />
      </DrawerBody>
      <DrawerFooter className={styles.footer}>
        <TemplatesPanelFooter {...footerContent} />
      </DrawerFooter>
    </div>
  );
};
