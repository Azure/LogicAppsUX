import { WarningModalState, openDiscardWarningModal } from '../../core/state/ModalSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { Toolbar, ToolbarButton, ToolbarGroup, Switch, tokens } from '@fluentui/react-components';
import { ArrowUndo20Regular, Dismiss20Regular, Play20Regular, Save20Regular } from '@fluentui/react-icons';
import { useCallback, useContext, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { generateMapMetadata } from '../../mapHandling/MapMetadataSerializer';
import { DataMapperFileService, DataMapperWrappedContext, generateDataMapXslt } from '../../core';
import { saveDataMap, updateDataMapLML } from '../../core/state/DataMapSlice';
import { LogCategory, LogService } from '../../utils/Logging.Utils';
import { convertToMapDefinition } from '../../mapHandling/MapDefinitionSerializer';
import { toggleCodeView, toggleTestPanel } from '../../core/state/PanelSlice';
import { useStyles } from './styles';

export type EditorCommandBarProps = {};

export const EditorCommandBar = (_props: EditorCommandBarProps) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const isStateDirty = useSelector((state: RootState) => state.dataMap.present.isDirty);
  const undoStack = useSelector((state: RootState) => state.dataMap.past);
  const isCodeViewOpen = useSelector((state: RootState) => state.panel.codeViewPanel.isOpen);
  const { sourceSchema, targetSchema } = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);

  const currentConnections = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);
  const functions = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.functionNodes);
  const targetSchemaSortArray = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.targetSchemaOrdering);

  const isDiscardConfirmed = useSelector(
    (state: RootState) => state.modal.warningModalType === WarningModalState.DiscardWarning && state.modal.isOkClicked
  );

  const dataMapDefinition = useMemo<string>(() => {
    if (sourceSchema && targetSchema) {
      try {
        return convertToMapDefinition(currentConnections, sourceSchema, targetSchema, targetSchemaSortArray);
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
        return '';
      }
    }
    return '';
  }, [sourceSchema, targetSchema, currentConnections, targetSchemaSortArray]);

  const onTestClick = useCallback(() => {
    dispatch(toggleTestPanel());
  }, [dispatch]);

  const onCodeViewClick = useCallback(() => {
    dispatch(toggleCodeView());
  }, [dispatch]);

  const { canvasBounds } = useContext(DataMapperWrappedContext);

  const onSaveClick = useCallback(() => {
    if (!canvasBounds || !canvasBounds.width || !canvasBounds.height) {
      throw new Error('Canvas bounds are not defined, cannot save map metadata.');
    }

    const mapMetadata = JSON.stringify(
      generateMapMetadata(functions, currentConnections, {
        width: canvasBounds.width,
        height: canvasBounds.height,
      })
    );

    DataMapperFileService().saveMapDefinitionCall(dataMapDefinition, mapMetadata);

    dispatch(
      saveDataMap({
        sourceSchemaExtended: sourceSchema,
        targetSchemaExtended: targetSchema,
      })
    );

    generateDataMapXslt(dataMapDefinition)
      .then((xsltStr) => {
        DataMapperFileService().saveXsltCall(xsltStr);

        LogService.log(LogCategory.DataMapperDesigner, 'onGenerateClick', {
          message: 'Successfully generated xslt',
        });
      })
      .catch((error: Error) => {
        LogService.error(LogCategory.DataMapperDesigner, 'onGenerateClick', {
          message: error.message,
        });

        // show notification here
      });
  }, [currentConnections, functions, dataMapDefinition, sourceSchema, targetSchema, dispatch, canvasBounds]);

  const triggerDiscardWarningModal = useCallback(() => {
    dispatch(openDiscardWarningModal());
  }, [dispatch]);

  useEffect(() => {
    if (dataMapDefinition) {
      dispatch(updateDataMapLML(dataMapDefinition));
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
    }),
    [intl]
  );

  const toolbarStyles = useStyles();
  const bothSchemasDefined = useMemo(() => sourceSchema && targetSchema, [sourceSchema, targetSchema]);

  const disabledState = useMemo(
    () => ({
      save: !bothSchemasDefined || !isStateDirty,
      undo: undoStack.length === 0,
      discard: !isStateDirty,
      test: !bothSchemasDefined,
      codeView: !bothSchemasDefined,
    }),
    [bothSchemasDefined, isStateDirty, undoStack]
  );

  return (
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
          aria-label={Resources.UNDO}
          icon={<ArrowUndo20Regular color={disabledState.undo ? undefined : tokens.colorPaletteBlueBorderActive} />}
          disabled={disabledState.undo}
          onClick={() => {}}
        >
          {Resources.UNDO}
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
          onClick={onTestClick}
        >
          {Resources.RUN_TEST}
        </ToolbarButton>
      </ToolbarGroup>
      <ToolbarGroup>
        <Switch disabled={disabledState.codeView} label={Resources.VIEW_CODE} onChange={onCodeViewClick} checked={isCodeViewOpen} />
      </ToolbarGroup>
    </Toolbar>
  );
};
