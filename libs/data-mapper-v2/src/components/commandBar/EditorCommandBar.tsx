import { openDiscardWarningModal } from '../../core/state/ModalSlice';
import type { AppDispatch } from '../../core/state/Store';
import {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  Switch,
  tokens,
  useId,
  useToastController,
  Toast,
  ToastTitle,
  Toaster,
  ToastBody,
} from '@fluentui/react-components';
import { Dismiss20Regular, Play20Regular, Save20Regular } from '@fluentui/react-icons';
import { useCallback, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { generateMapMetadata } from '../../mapHandling/MapMetadataSerializer';
import { DataMapperFileService, generateDataMapXslt } from '../../core';
import { saveDataMap, updateDataMapLML } from '../../core/state/DataMapSlice';
import { LogCategory, LogService } from '../../utils/Logging.Utils';
import type { MetaMapDefinition } from '../../mapHandling/MapDefinitionSerializer';
import { convertToMapDefinition } from '../../mapHandling/MapDefinitionSerializer';
import { toggleCodeView, toggleTestPanel } from '../../core/state/PanelSlice';
import { useStyles } from './styles';
import useReduxStore from '../useReduxStore';

export type EditorCommandBarProps = {};

export const EditorCommandBar = (_props: EditorCommandBarProps) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const {
    isDirty,
    sourceInEditState,
    targetInEditState,
    past: undoStack,
    isCodeViewOpen,
    sourceSchema,
    targetSchema,
    xsltFilename,
    currentConnections,
    functionNodes: functions,
    targetSchemaSortArray,
    canvasRect,
    isDiscardConfirmed,
  } = useReduxStore();

  const toasterId = useId('toaster');
  const { dispatchToast } = useToastController(toasterId);

  const failedXsltMessage = intl.formatMessage({
    defaultMessage: 'Failed to generate XSLT.',
    id: 'e9bIKh',
    description: 'Message on failed generation',
  });

  const dataMapDefinition = useMemo<MetaMapDefinition>(() => {
    if (sourceSchema && targetSchema) {
      try {
        const result = convertToMapDefinition(currentConnections, sourceSchema, targetSchema, targetSchemaSortArray);
        return result;
      } catch (error) {
        let errorMessage = '';
        if (typeof error === 'string') {
          errorMessage = error;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        LogService.error(LogCategory.DataMapperDesigner, 'dataMapDefinition', {
          message: errorMessage,
        });
        return { isSuccess: false, errorNodes: [] };
      }
    }
    return { isSuccess: false, errorNodes: [] };
  }, [sourceSchema, targetSchema, currentConnections, targetSchemaSortArray]);

  const onTestClick = useCallback(() => {
    dispatch(toggleTestPanel());
  }, [dispatch]);

  const onCodeViewClick = useCallback(() => {
    dispatch(toggleCodeView());
  }, [dispatch]);

  const onSaveClick = useCallback(() => {
    if (!canvasRect || !canvasRect.width || !canvasRect.height) {
      throw new Error('Canvas bounds are not defined, cannot save map metadata.');
    }

    const mapMetadata = JSON.stringify(generateMapMetadata(functions, currentConnections, canvasRect));

    if (dataMapDefinition.isSuccess) {
      DataMapperFileService().saveMapDefinitionCall(dataMapDefinition.definition, mapMetadata);

      dispatch(
        saveDataMap({
          sourceSchemaExtended: sourceSchema,
          targetSchemaExtended: targetSchema,
        })
      );

      generateDataMapXslt(dataMapDefinition.definition)
        .then((xsltStr) => {
          DataMapperFileService().saveXsltCall(xsltStr);

          LogService.log(LogCategory.DataMapperDesigner, 'onGenerateClick', {
            message: 'Successfully generated xslt',
          });
        })
        .catch((error: Error) => {
          LogService.error(LogCategory.DataMapperDesigner, 'onGenerateClick', {
            message: JSON.stringify(error),
          });
          dispatchToast(
            <Toast>
              <ToastTitle>{failedXsltMessage}</ToastTitle>
              <ToastBody>{error.message} </ToastBody>
            </Toast>,
            { intent: 'error' }
          );
        });
    } else {
      dispatchToast(
        <Toast>
          <ToastTitle>{failedXsltMessage}</ToastTitle>
        </Toast>,
        { intent: 'error' }
      );
    }
  }, [
    currentConnections,
    functions,
    dataMapDefinition,
    sourceSchema,
    targetSchema,
    dispatch,
    canvasRect,
    failedXsltMessage,
    dispatchToast,
  ]);

  const triggerDiscardWarningModal = useCallback(() => {
    dispatch(openDiscardWarningModal());
  }, [dispatch]);

  useEffect(() => {
    if (dataMapDefinition && dataMapDefinition.isSuccess) {
      dispatch(updateDataMapLML(dataMapDefinition.definition));
    }
  }, [dispatch, dataMapDefinition]);
  // Tracks modal (confirmation) state
  useEffect(() => {
    if (isDiscardConfirmed) {
      console.log('Discard confirmed');
    }
  }, [dispatch, isDiscardConfirmed]);

  const Resources = useMemo(
    () => ({
      COMMAND_BAR_ARIA: intl.formatMessage({
        defaultMessage: 'Use left and right arrow keys to navigate between commands',
        id: 'rd6fai',
        description: 'Aria describing the way to control the keyboard navigation',
      }),
      SAVE: intl.formatMessage({
        defaultMessage: 'Save',
        id: 'Sh10cw',
        description: 'Button text for save the changes',
      }),
      UNDO: intl.formatMessage({
        defaultMessage: 'Undo',
        id: 'r43nMc',
        description: 'Button text for undo the last action',
      }),
      DISCARD: intl.formatMessage({
        defaultMessage: 'Discard',
        id: 'Q4TUFX',
        description: 'Button text for discard the unsaved changes',
      }),
      RUN_TEST: intl.formatMessage({
        defaultMessage: 'Test',
        id: 'iy8rNf',
        description: 'Button text for running test',
      }),
      VIEW_CODE: intl.formatMessage({
        defaultMessage: 'View Code',
        id: '/4vB3J',
        description: 'Button for View Code',
      }),
      DISABLED_TEST: intl.formatMessage({
        defaultMessage: 'Please save the map before testing',
        id: 'wTaSTp',
        description: 'Tooltip for disabled test button',
      }),
    }),
    [intl]
  );

  const toolbarStyles = useStyles();

  const disabledState = useMemo(
    () => ({
      save: !isDirty || sourceInEditState || targetInEditState,
      undo: undoStack.length === 0,
      discard: !isDirty,
      test: sourceInEditState || targetInEditState || !xsltFilename,
      codeView: sourceInEditState || targetInEditState,
    }),
    [isDirty, undoStack.length, sourceInEditState, targetInEditState, xsltFilename]
  );

  return (
    <>
      <Toolbar size="small" aria-label={Resources.COMMAND_BAR_ARIA} className={toolbarStyles.toolbar}>
        <ToolbarGroup className={toolbarStyles.toolbarGroup}>
          <ToolbarButton
            aria-label={Resources.SAVE}
            icon={<Save20Regular color={disabledState.save ? undefined : tokens.colorPaletteBlueBorderActive} />}
            disabled={disabledState.save}
            onClick={onSaveClick}
            className={toolbarStyles.button}
          >
            {Resources.SAVE}
          </ToolbarButton>
          <ToolbarButton
            aria-label={Resources.DISCARD}
            icon={<Dismiss20Regular color={disabledState.discard ? undefined : tokens.colorPaletteBlueBorderActive} />}
            disabled={disabledState.discard}
            onClick={triggerDiscardWarningModal}
          >
            {Resources.DISCARD}
          </ToolbarButton>
          <ToolbarButton
            aria-label={Resources.RUN_TEST}
            icon={<Play20Regular color={disabledState.test ? undefined : tokens.colorPaletteBlueBorderActive} />}
            disabled={disabledState.test}
            title={disabledState.test ? Resources.DISABLED_TEST : ''}
            onClick={onTestClick}
          >
            {Resources.RUN_TEST}
          </ToolbarButton>
        </ToolbarGroup>
        <ToolbarGroup>
          <Switch disabled={disabledState.codeView} label={Resources.VIEW_CODE} onChange={onCodeViewClick} checked={isCodeViewOpen} />
        </ToolbarGroup>
      </Toolbar>
      <Toaster timeout={10000} toasterId={toasterId} />
    </>
  );
};
