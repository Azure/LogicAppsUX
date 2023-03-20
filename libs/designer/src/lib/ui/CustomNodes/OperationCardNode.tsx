/* eslint-disable @typescript-eslint/no-empty-function */
import { getMonitoringError } from '../../common/utilities/error';
import type { AppDispatch } from '../../core';
import { deleteOperation } from '../../core/actions/bjsworkflow/delete';
import { moveOperation } from '../../core/actions/bjsworkflow/move';
import { useMonitoringView, useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useParameterValidationErrors } from '../../core/state/operation/operationSelector';
import { useIsNodeSelected } from '../../core/state/panel/panelSelectors';
import { changePanelNode, showDefaultTabs } from '../../core/state/panel/panelSlice';
import {
  useBrandColor,
  useIconUri,
  useIsConnectionRequired,
  useNodeConnectionName,
  useOperationInfo,
  useOperationQuery,
} from '../../core/state/selectors/actionMetadataSelector';
import { useSettingValidationErrors } from '../../core/state/setting/settingSelector';
import { useStaticResultSchema } from '../../core/state/staticresultschema/staitcresultsSelector';
import { useIsLeafNode, useNodeDescription, useNodeDisplayName, useNodeMetadata } from '../../core/state/workflow/workflowSelectors';
import { DropZone } from '../connections/dropzone';
import { MessageBarType } from '@fluentui/react';
import type { MenuItemOption } from '@microsoft/designer-ui';
import { Card, MenuItemType, DeleteNodeModal } from '@microsoft/designer-ui';
import { WORKFLOW_NODE_TYPES } from '@microsoft/utils-logic-apps';
import { memo, useCallback, useMemo, useState } from 'react';
import { useDrag } from 'react-dnd';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';

const DefaultNode = ({ targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const readOnly = useReadOnly();
  const isMonitoringView = useMonitoringView();
  const intl = useIntl();

  const dispatch = useDispatch<AppDispatch>();

  const metadata = useNodeMetadata(id);
  const operationInfo = useOperationInfo(id);
  const isTrigger = useMemo(() => metadata?.graphId === 'root' && metadata?.isRoot, [metadata]);

  const { status: statusRun, duration: durationRun, error: errorRun, code: codeRun } = metadata?.runData ?? {};

  const [{ isDragging }, drag, dragPreview] = useDrag(
    () => ({
      type: 'BOX',
      end: (item, monitor) => {
        const dropResult = monitor.getDropResult<{
          graphId: string;
          parentId: string;
          childId: string;
        }>();
        if (item && dropResult) {
          dispatch(
            moveOperation({
              nodeId: id,
              oldGraphId: metadata?.graphId ?? 'root',
              newGraphId: dropResult.graphId,
              relationshipIds: dropResult,
            })
          );
        }
      },
      item: {
        id: id,
      },
      canDrag: !readOnly && !isTrigger,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [readOnly, metadata]
  );

  const selected = useIsNodeSelected(id);
  const nodeComment = useNodeDescription(id);
  const connectionResult = useNodeConnectionName(id);
  const isConnectionRequired = useIsConnectionRequired(operationInfo);
  const hasSchema = useStaticResultSchema(operationInfo.connectorId, operationInfo.operationId);
  const isLeaf = useIsLeafNode(id);

  const showLeafComponents = useMemo(() => !readOnly && isLeaf, [readOnly, isLeaf]);

  const nodeClick = useCallback(() => {
    dispatch(changePanelNode(id));
    dispatch(showDefaultTabs({ isMonitoringView, hasSchema: !!hasSchema }));
  }, [dispatch, hasSchema, id, isMonitoringView]);

  const brandColor = useBrandColor(id);
  const iconUri = useIconUri(id);

  const comment = useMemo(
    () =>
      nodeComment
        ? {
            brandColor,
            comment: nodeComment,
            isDismissed: false,
            isEditing: false,
          }
        : undefined,
    [brandColor, nodeComment]
  );

  const label = useNodeDisplayName(id);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const handleDeleteClick = () => setShowDeleteModal(true);
  const handleDelete = () => dispatch(deleteOperation({ nodeId: id, isTrigger: !!isTrigger }));

  const getDeleteMenuItem = () => {
    const deleteDescription = intl.formatMessage({
      defaultMessage: 'Delete',
      description: 'Delete text',
    });

    const disableTriggerDeleteText = intl.formatMessage({
      defaultMessage: 'Triggers cannot be deleted.',
      description: 'Text to explain that triggers cannot be deleted',
    });

    return {
      key: deleteDescription,
      disabled: readOnly,
      disabledReason: disableTriggerDeleteText,
      iconName: 'Delete',
      title: deleteDescription,
      type: MenuItemType.Advanced,
      onClick: handleDeleteClick,
    };
  };

  const contextMenuOptions: MenuItemOption[] = [getDeleteMenuItem()]; // danielle look here

  const opQuery = useOperationQuery(id);

  const isLoading = useMemo(() => opQuery.isLoading || connectionResult.isLoading, [opQuery.isLoading, connectionResult.isLoading]);

  const opManifestErrorText = intl.formatMessage({
    defaultMessage: 'Error fetching manifest',
    description: 'Error message when manifest fails to load',
  });

  const settingValidationErrors = useSettingValidationErrors(id);
  const settingValidationErrorText = intl.formatMessage({
    defaultMessage: 'Invalid settings',
    description: 'Text to explain that there are invalid settings for this node',
  });

  const parameterValidationErrors = useParameterValidationErrors(id);
  const parameterValidationErrorText = intl.formatMessage({
    defaultMessage: 'Invalid parameters',
    description: 'Text to explain that there are invalid parameters for this node',
  });

  const { errorMessage, errorLevel } = useMemo(() => {
    if (opQuery?.isError) return { errorMessage: opManifestErrorText, errorLevel: MessageBarType.error };
    if (settingValidationErrors?.length > 0) return { errorMessage: settingValidationErrorText, errorLevel: MessageBarType.severeWarning };
    if (parameterValidationErrors?.length > 0)
      return { errorMessage: parameterValidationErrorText, errorLevel: MessageBarType.severeWarning };

    if (isMonitoringView) {
      return getMonitoringError(errorRun, statusRun, codeRun);
    }
    return { errorMessage: undefined, errorLevel: undefined };
  }, [
    opQuery?.isError,
    opManifestErrorText,
    settingValidationErrors?.length,
    settingValidationErrorText,
    parameterValidationErrors?.length,
    parameterValidationErrorText,
    isMonitoringView,
    errorRun,
    statusRun,
    codeRun,
  ]);

  return (
    <>
      <div className="nopan">
        <Handle className="node-handle top" type="target" position={targetPosition} isConnectable={false} />
        <Card
          title={label}
          icon={iconUri}
          draggable={!readOnly && !isTrigger}
          brandColor={brandColor}
          id={id}
          connectionRequired={isConnectionRequired}
          connectionDisplayName={connectionResult.isLoading ? '...' : connectionResult.result}
          commentBox={comment}
          drag={drag}
          dragPreview={dragPreview}
          errorMessage={errorMessage}
          errorLevel={errorLevel}
          isDragging={isDragging}
          isLoading={isLoading}
          isMonitoringView={isMonitoringView}
          runData={{ status: statusRun, duration: durationRun }}
          readOnly={readOnly}
          onClick={nodeClick}
          selected={selected}
          contextMenuOptions={contextMenuOptions}
        />
        <Handle className="node-handle bottom" type="source" position={sourcePosition} isConnectable={false} />
      </div>
      {showLeafComponents ? (
        <div className={'edge-drop-zone-container'}>
          <DropZone graphId={metadata?.graphId ?? ''} parentId={id} />
        </div>
      ) : null}
      <DeleteNodeModal
        nodeId={id}
        nodeType={WORKFLOW_NODE_TYPES.OPERATION_NODE}
        isOpen={showDeleteModal}
        onDismiss={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />
    </>
  );
};

DefaultNode.displayName = 'DefaultNode';

export default memo(DefaultNode);
