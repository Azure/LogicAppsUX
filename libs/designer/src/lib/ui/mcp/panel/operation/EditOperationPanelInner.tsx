import type { ChangeState, ParameterInfo, TemplatePanelFooterProps } from '@microsoft/designer-ui';
import { TemplatesPanelFooter } from '@microsoft/designer-ui';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../core/state/mcp/store';
import { closePanel } from '../../../../core/state/mcp/panel/mcpPanelSlice';
import type { UpdateParametersPayload } from '../../../../core/state/operation/operationMetadataSlice';
import {
  updateNodeParameters,
  updateOperationDescription,
  updateParameterConditionalVisibility,
} from '../../../../core/state/operation/operationMetadataSlice';
import { Button, DrawerBody, DrawerFooter, DrawerHeader, Text } from '@fluentui/react-components';
import { useMcpPanelStyles } from '../styles';
import { useIntl } from 'react-intl';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import { useCallback, useMemo, useState, useRef } from 'react';
import { EditOperation } from '../../parameters/EditOperation';
import type { EditOperationRef } from '../../parameters/EditOperation';
import { isNullOrUndefined, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export const EditOperationPanelInner = () => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const styles = useMcpPanelStyles();
  const [isDirty, setIsDirty] = useState(false);

  const editOperationRef = useRef<EditOperationRef>(null);

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

  const handleValueChange = useCallback((_change: ChangeState) => {
    setIsDirty(true);
  }, []);

  const resetToOriginalState = useCallback(() => {
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
    resetToOriginalState();
    handleDismiss();
  }, [resetToOriginalState, handleDismiss]);

  const handleSave = useCallback(() => {
    if (!selectedOperationId || !parameters?.parameterGroups) {
      LoggerService().log({
        level: LogEntryLevel.Error,
        message: 'Cannot save: missing operation data',
        area: 'MCP_EditOperation',
      });
      return;
    }

    // Get all changes from the EditOperation component
    const latestConditionalVisibilityChanges = editOperationRef.current?.getConditionalVisibilityChanges() || {};
    const parameterValueChanges = editOperationRef.current?.getParameterValueChanges() || {};
    const descriptionChange = editOperationRef.current?.getDescriptionChange();

    Object.entries(latestConditionalVisibilityChanges).forEach(([parameterId, isVisible]) => {
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

    const parametersToUpdate: UpdateParametersPayload['parameters'] = Object.entries(parameterValueChanges)
      .map(([parameterId, properties]) => {
        let parameterGroupId: string | undefined;

        Object.entries(parameters.parameterGroups).forEach(([groupId, group]) => {
          const param = group.parameters.find((p) => p.id === parameterId);
          if (param) {
            parameterGroupId = groupId;
          }
        });

        if (!parameterGroupId) {
          LoggerService().log({
            level: LogEntryLevel.Warning,
            message: `Parameter ${parameterId} not found in any group`,
            area: 'MCP_EditOperation',
          });
          return null;
        }

        return {
          groupId: parameterGroupId,
          parameterId,
          propertiesToUpdate: properties as Partial<ParameterInfo>,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (parametersToUpdate.length > 0) {
      const updatePayload: UpdateParametersPayload = {
        nodeId: selectedOperationId,
        parameters: parametersToUpdate,
        isUserAction: true,
      };

      dispatch(updateNodeParameters(updatePayload));
    }

    if (!isNullOrUndefined(descriptionChange)) {
      dispatch(
        updateOperationDescription({
          id: selectedOperationId,
          description: descriptionChange,
        })
      );
    }

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
      <DrawerBody className={styles.body} style={{ overflow: 'auto', maxHeight: 'calc(100vh - 170px)', minHeight: '80vh' }}>
        <EditOperation ref={editOperationRef} onValueChange={handleValueChange} isDirty={isDirty} />
      </DrawerBody>
      <DrawerFooter className={styles.footer}>
        <TemplatesPanelFooter {...footerContent} />
      </DrawerFooter>
    </div>
  );
};
