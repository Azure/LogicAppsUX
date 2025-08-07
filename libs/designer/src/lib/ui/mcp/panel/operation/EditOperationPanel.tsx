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
import { equals, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { useEditSnapshot } from '../../../../core/mcp/utils/hooks';
import { updateOperationDescription } from '../../../../core/state/operation/operationMetadataSlice';
import { useFunctionalState } from '@react-hookz/web';
import { getGroupIdFromParameterId, parameterHasValue } from '../../../../core/utils/parameters/helper';
import { isDependentStaticParameter } from '../../../../core/mcp/utils/helper';
import { useOperationDynamicInputsError } from '../../../../core/state/operation/operationSelector';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export const EditOperationPanel = () => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const styles = useMcpPanelStyles();

  const { selectedOperationId, operationMetadata, isOpen, panelMode, inputParameters, dependencies } = useSelector((state: RootState) => ({
    selectedOperationId: state.mcpSelection.selectedOperationId,
    operationMetadata: state.operations.operationMetadata,
    isOpen: state.mcpPanel?.isOpen ?? false,
    panelMode: state.mcpPanel?.currentPanelView ?? null,
    inputParameters: state.operations.inputParameters,
    dependencies: state.operations.dependencies,
  }));
  const nodeInputs = useMemo(
    () => (selectedOperationId ? inputParameters[selectedOperationId] : null),
    [selectedOperationId, inputParameters]
  );
  const inputDependencies = useMemo(
    () => (selectedOperationId ? (dependencies[selectedOperationId].inputs ?? {}) : {}),
    [selectedOperationId, dependencies]
  );

  const selectedOperationSummary = useMemo(() => {
    return operationMetadata[selectedOperationId ?? '']?.summary ?? selectedOperationId;
  }, [selectedOperationId, operationMetadata]);

  const selectedOperationDescription = useMemo(() => {
    return operationMetadata[selectedOperationId ?? '']?.description ?? '';
  }, [selectedOperationId, operationMetadata]);

  const dynamicInputsError = useOperationDynamicInputsError(selectedOperationId);

  const { restoreSnapshot, clearSnapshot } = useEditSnapshot(selectedOperationId ?? '');
  const [description, setDescription] = useState<string>('');
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [getUserInputParamIds, setUserInputParamIds] = useFunctionalState<Record<string, boolean>>(() =>
    Object.fromEntries(
      Object.values(nodeInputs?.parameterGroups ?? {})
        .flatMap((group) => group.parameters)
        .map((param) => [param.id, isDependentStaticParameter(param, inputDependencies) || parameterHasValue(param)])
    )
  );
  const [getParameterErrors, setParameterErrors] = useFunctionalState<Record<string, string | undefined>>({});

  const INTL_TEXT = {
    closeAriaLabel: intl.formatMessage({
      id: 'kdCuJZ',
      defaultMessage: 'Close panel',
      description: 'Aria label for close button',
    }),
    parameterEmptyErrorMessage: intl.formatMessage({
      id: 'nX3iRl',
      defaultMessage: 'User input must not be empty.',
      description: 'Error message for parameter is empty',
    }),
  };

  const haveUserModeInputsEmptyValues = useCallback(() => {
    if (!selectedOperationId || !nodeInputs?.parameterGroups) {
      return;
    }

    let hasEmptyUserInputValue = false;
    for (const parameterId of Object.keys(getUserInputParamIds())) {
      const parameterGroupId = getGroupIdFromParameterId(nodeInputs, parameterId);

      if (!parameterGroupId) {
        return;
      }

      const thisParameterHasEmptyUserInput =
        getUserInputParamIds()[parameterId] &&
        !!nodeInputs?.parameterGroups?.[parameterGroupId]?.parameters?.find((parameter) => {
          return equals(parameter?.id, parameterId) && !parameterHasValue(parameter);
        });

      if (thisParameterHasEmptyUserInput) {
        setParameterErrors((parameterErrors) => ({
          ...parameterErrors,
          [parameterId]: INTL_TEXT.parameterEmptyErrorMessage,
        }));
      }

      hasEmptyUserInputValue = hasEmptyUserInputValue || thisParameterHasEmptyUserInput;
    }
    return hasEmptyUserInputValue;
  }, [getUserInputParamIds, nodeInputs, selectedOperationId, setParameterErrors, INTL_TEXT.parameterEmptyErrorMessage]);

  const handleDescriptionInputChange = useCallback((description: string) => {
    setDescription(description);
    setIsDirty(true);
  }, []);

  const onParameterVisibilityUpdate = useCallback(() => {
    setIsDirty(true);
  }, []);

  const handleCancel = useCallback(() => {
    restoreSnapshot();
    clearSnapshot();
    dispatch(closePanel());
  }, [restoreSnapshot, clearSnapshot, dispatch]);

  const handleSave = useCallback(() => {
    if (!selectedOperationId) {
      return;
    }

    // If some user input values are empty, do not proceed to save
    if (haveUserModeInputsEmptyValues()) {
      return;
    }

    const originalDescription = selectedOperationDescription;
    const hasDescriptionChanged = originalDescription !== description;

    if (hasDescriptionChanged) {
      dispatch(
        updateOperationDescription({
          id: selectedOperationId,
          description: description,
        })
      );
    }

    LoggerService().log({
      level: LogEntryLevel.Trace,
      area: 'MCP.EditOperationPanel',
      message: 'Edit operation details',
      args: [`operationId:${selectedOperationId}`],
    });

    clearSnapshot();
    dispatch(closePanel());
  }, [selectedOperationId, clearSnapshot, dispatch, selectedOperationDescription, description, haveUserModeInputsEmptyValues]);

  const handleClose = useCallback(() => {
    handleCancel();
  }, [handleCancel]);

  const footerContent: TemplatePanelFooterProps = useMemo(() => {
    return {
      buttonContents: [
        {
          type: 'action',
          text: intl.formatMessage({
            defaultMessage: 'Save changes',
            id: 'XtVXqm',
            description: 'Button text for saving operation changes',
          }),
          appearance: 'primary',
          onClick: handleSave,
          disabled: !!dynamicInputsError || !isDirty,
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
  }, [intl, handleSave, dynamicInputsError, isDirty, handleCancel]);

  useEffect(() => {
    if (selectedOperationDescription) {
      setDescription(selectedOperationDescription);
    } else {
      setDescription('');
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
          <Button appearance="subtle" icon={<CloseIcon />} onClick={handleClose}>
            {INTL_TEXT.closeAriaLabel}
          </Button>
        </div>
      </DrawerHeader>
      <DrawerBody className={styles.body} style={{ overflow: 'auto', maxHeight: 'calc(100vh - 130px)', minHeight: '80vh' }}>
        <EditOperation
          description={description}
          handleDescriptionInputChange={handleDescriptionInputChange}
          onParameterVisibilityUpdate={onParameterVisibilityUpdate}
          userInputParamIds={getUserInputParamIds()}
          setUserInputParamIds={setUserInputParamIds}
          parameterErrors={getParameterErrors()}
          setParameterErrors={setParameterErrors}
        />
      </DrawerBody>
      <DrawerFooter className={styles.footer}>
        <TemplatesPanelFooter {...footerContent} />
      </DrawerFooter>
    </Drawer>
  );
};
