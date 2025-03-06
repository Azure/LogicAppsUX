import { WarningModalState, openDiscardWarningModal } from '../../core/state/ModalSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { Toolbar, ToolbarButton, ToolbarGroup, Switch, tokens, useId, Toaster } from '@fluentui/react-components';
import { Dismiss20Regular, PlayRegular, Save20Regular, TextGrammarErrorRegular } from '@fluentui/react-icons';
import { useCallback, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { generateMapMetadata } from '../../mapHandling/MapMetadataSerializer';
import { DataMapperFileService, generateDataMapXslt } from '../../core';
import { saveDataMap, updateDataMapLML } from '../../core/state/DataMapSlice';
import { LogCategory } from '../../utils/Logging.Utils';
import type { MetaMapDefinition } from '../../mapHandling/MapDefinitionSerializer';
import { convertToMapDefinition } from '../../mapHandling/MapDefinitionSerializer';
import { toggleCodeView, toggleMapChecker, toggleTestPanel } from '../../core/state/PanelSlice';
import { useStyles } from './styles';
import { emptyCanvasRect, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';

export type EditorCommandBarProps = {};

export const EditorCommandBar = (_props: EditorCommandBarProps) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const { isDirty, sourceInEditState, targetInEditState, isTestDisabledForOS } = useSelector((state: RootState) => state.dataMap.present);
  const undoStack = useSelector((state: RootState) => state.dataMap.past);
  const isCodeViewOpen = useSelector((state: RootState) => state.panel.codeViewPanel.isOpen);
  const { sourceSchema, targetSchema } = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);

  const xsltFilename = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.xsltFilename);

  const toasterId = useId('toaster');

  const currentConnections = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);
  const functions = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.functionNodes);
  const targetSchemaSortArray = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.targetSchemaOrdering);
  const canvasRect = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation.loadedMapMetadata?.canvasRect ?? emptyCanvasRect
  );

  const failedXsltMessage = intl.formatMessage({
    defaultMessage: 'Failed to generate XSLT.',
    id: '7bd6c82a17a7',
    description: 'Message on failed generation',
  });

  const isDiscardConfirmed = useSelector(
    (state: RootState) => state.modal.warningModalType === WarningModalState.DiscardWarning && state.modal.isOkClicked
  );

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
        LoggerService().log({
          level: LogEntryLevel.Error,
          area: `${LogCategory.DataMapperDesigner}/dataMapDefinition`,
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

  const onMapCheckerClick = useCallback(() => {
    dispatch(toggleMapChecker());
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
          LoggerService().log({
            level: LogEntryLevel.Verbose,
            area: `${LogCategory.DataMapperDesigner}/onGenerateClick`,
            message: 'Successfully generated xslt',
          });
        })
        .catch((error: Error) => {
          LoggerService().log({
            level: LogEntryLevel.Error,
            area: `${LogCategory.DataMapperDesigner}/onGenerateClick`,
            message: JSON.stringify(error),
          });
          DataMapperFileService().sendNotification(failedXsltMessage, error.message, LogEntryLevel.Error);
        });
    } else {
      DataMapperFileService().sendNotification(failedXsltMessage, '', LogEntryLevel.Error);
    }
  }, [currentConnections, functions, dataMapDefinition, sourceSchema, targetSchema, dispatch, canvasRect, failedXsltMessage]);

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
        id: 'adde9f6a2d3d',
        description: 'Aria describing the way to control the keyboard navigation',
      }),
      SAVE: intl.formatMessage({
        defaultMessage: 'Save',
        id: '4a1d747303a5',
        description: 'Button text for save the changes',
      }),
      UNDO: intl.formatMessage({
        defaultMessage: 'Undo',
        id: 'af8de731c765',
        description: 'Button text for undo the last action',
      }),
      DISCARD: intl.formatMessage({
        defaultMessage: 'Discard',
        id: '4384d415751c',
        description: 'Button text for discard the unsaved changes',
      }),
      OPEN_TEST_PANEL: intl.formatMessage({
        defaultMessage: 'Open test panel',
        id: 'c6106f5e3820',
        description: 'Button text for opening test panel',
      }),
      VIEW_CODE: intl.formatMessage({
        defaultMessage: 'View code',
        id: '572b128f72f8',
        description: 'Button for View Code',
      }),
      VIEW_MAP_CHECKER: intl.formatMessage({
        defaultMessage: 'View issues',
        id: '01ef13f78a26',
        description: 'Button to see issues',
      }),
      DISABLED_TEST: intl.formatMessage({
        defaultMessage: 'Please save the map before testing',
        id: 'c136924e9b40',
        description: 'Tooltip for disabled test button',
      }),
      DISABLED_TEST_FOR_OS: intl.formatMessage({
        defaultMessage: 'Test is not supported for your current operating system',
        id: 'db208325d736',
        description: 'Tooltip for disabled test button for the os',
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
      test: sourceInEditState || targetInEditState || !xsltFilename || isTestDisabledForOS,
      codeView: sourceInEditState || targetInEditState,
      mapChecker: sourceInEditState || targetInEditState,
    }),
    [isDirty, undoStack.length, sourceInEditState, targetInEditState, xsltFilename, isTestDisabledForOS]
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
            aria-label={Resources.OPEN_TEST_PANEL}
            icon={<PlayRegular color={disabledState.test ? undefined : tokens.colorPaletteBlueBorderActive} />}
            disabled={disabledState.test}
            title={disabledState.test ? (isTestDisabledForOS ? Resources.DISABLED_TEST_FOR_OS : Resources.DISABLED_TEST) : ''}
            onClick={onTestClick}
          >
            {Resources.OPEN_TEST_PANEL}
          </ToolbarButton>
        </ToolbarGroup>
        <ToolbarGroup className={toolbarStyles.toolbarGroup}>
          <ToolbarButton
            disabled={disabledState.mapChecker}
            icon={<TextGrammarErrorRegular color={disabledState.mapChecker ? undefined : tokens.colorPaletteBlueBorderActive} />}
            onClick={onMapCheckerClick}
          >
            {Resources.VIEW_MAP_CHECKER}
          </ToolbarButton>
          <Switch disabled={disabledState.codeView} label={Resources.VIEW_CODE} onChange={onCodeViewClick} checked={isCodeViewOpen} />
        </ToolbarGroup>
      </Toolbar>
      <Toaster timeout={10000} toasterId={toasterId} />
    </>
  );
};
