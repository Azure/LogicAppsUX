import { WarningModalState, openDiscardWarningModal } from '../../core/state/ModalSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { Toolbar, ToolbarButton, ToolbarGroup } from '@fluentui/react-components';
import { ArrowUndo20Regular, Dismiss20Regular, Play20Regular, Save20Regular } from '@fluentui/react-icons';
import { useCallback, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { generateMapMetadata } from '../../mapHandling/MapMetadataSerializer';
import { DataMapperFileService } from '../../core';
import { saveDataMap, updateDataMapLML } from '../../core/state/DataMapSlice';
import { LogCategory, LogService } from '../../utils/Logging.Utils';
import { convertToMapDefinition } from '../../mapHandling/MapDefinitionSerializer';
import { toggleCodeView } from '../../core/state/PanelSlice';
import { useStyles } from './styles';

export interface EditorCommandBarProps {
  onUndoClick: () => void;
  onTestClick: () => void;
}

export const EditorCommandBar = (props: EditorCommandBarProps) => {
  const { onUndoClick, onTestClick } = props;
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const isStateDirty = useSelector((state: RootState) => state.dataMap.present.isDirty);
  const undoStack = useSelector((state: RootState) => state.dataMap.past);
  const sourceSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.targetSchema);
  const xsltFilename = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.xsltFilename);
  const currentConnections = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);
  const functions = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.functionNodes);
  const targetSchemaSortArray = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.targetSchemaOrdering);

  const isDiscardConfirmed = useSelector(
    (state: RootState) => state.modal.warningModalType === WarningModalState.DiscardWarning && state.modal.isOkClicked
  );

  const dataMapDefinition = useMemo<string>(() => {
    if (sourceSchema && targetSchema) {
      try {
        const newDataMapDefinition = convertToMapDefinition(currentConnections, sourceSchema, targetSchema, targetSchemaSortArray);

        // this can be added later
        // if (saveDraftStateCall) {
        //   saveDraftStateCall(newDataMapDefinition);
        // }

        dispatch(updateDataMapLML(newDataMapDefinition));

        return newDataMapDefinition;
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
  }, [sourceSchema, targetSchema, currentConnections, targetSchemaSortArray, dispatch]);

  const onSaveClick = useCallback(() => {
    //const errors = collectErrorsForMapChecker(currentConnections, flattenedTargetSchema);

    // save until we discuss error notifications
    // if (errors.length > 0) {
    //   dispatch(
    //     showNotification({
    //       type: NotificationTypes.MapHasErrorsAtSave,
    //       msgParam: errors.length,
    //       autoHideDurationMs: errorNotificationAutoHideDuration,
    //     })
    //   );
    // }

    const mapMetadata = JSON.stringify(generateMapMetadata(functions, currentConnections));

    DataMapperFileService().saveMapDefinitionCall(dataMapDefinition, mapMetadata);

    dispatch(
      saveDataMap({
        sourceSchemaExtended: sourceSchema,
        targetSchemaExtended: targetSchema,
      })
    );
  }, [currentConnections, functions, dataMapDefinition, sourceSchema, targetSchema, dispatch]);

  const triggerDiscardWarningModal = useCallback(() => {
    dispatch(openDiscardWarningModal());
  }, [dispatch]);

  // Tracks modal (confirmation) state
  useEffect(() => {
    if (isDiscardConfirmed) {
      console.log('Discard confirmed');
      //   dispatch(discardDataMap());
      //   dispatch(closeModal());
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
    }),
    [intl]
  );

  const toolbarStyles = useStyles();
  const bothSchemasDefined = sourceSchema && targetSchema;

  const toggleCodeViewClick = () => {
    dispatch(toggleCodeView());
  };

  return (
    <Toolbar size="small" aria-label={Resources.COMMAND_BAR_ARIA} className={toolbarStyles.toolbar}>
      <ToolbarGroup className={toolbarStyles.toolbarGroup}>
        <ToolbarButton
          aria-label={Resources.SAVE}
          icon={<Save20Regular />}
          disabled={!bothSchemasDefined || !isStateDirty}
          onClick={onSaveClick}
          className={toolbarStyles.button}
        >
          {Resources.SAVE}
        </ToolbarButton>
        <ToolbarButton aria-label={Resources.UNDO} icon={<ArrowUndo20Regular />} disabled={undoStack.length === 0} onClick={onUndoClick}>
          {Resources.UNDO}
        </ToolbarButton>
        <ToolbarButton
          aria-label={Resources.DISCARD}
          icon={<Dismiss20Regular />}
          disabled={!isStateDirty}
          onClick={triggerDiscardWarningModal}
        >
          {Resources.DISCARD}
        </ToolbarButton>
        <ToolbarButton aria-label={Resources.RUN_TEST} icon={<Play20Regular />} disabled={!xsltFilename} onClick={onTestClick}>
          {Resources.RUN_TEST}
        </ToolbarButton>
      </ToolbarGroup>
      <ToolbarGroup>
        <ToolbarButton onClick={toggleCodeViewClick}>Code View</ToolbarButton>
      </ToolbarGroup>
    </Toolbar>
  );
};
