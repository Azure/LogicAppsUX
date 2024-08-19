import { useCallback, useMemo } from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverSurface,
  type OpenPopoverEvents,
  type OnOpenChangeData,
  MenuList,
  MenuItem,
  tokens,
} from '@fluentui/react-components';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { addLoopToConnection, deleteEdge, updateEdgePopOverId } from '../../core/state/DataMapSlice';
import type { Bounds } from '../../core';
import { useStyles } from './styles';
import { ArrowRepeatAllRegular, DeleteRegular, ArrowRepeatAllOffRegular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import { SchemaNodeProperty } from '@microsoft/logic-apps-shared';

type EdgePopOverProps = Bounds & {};

const EdgePopOver = (props: EdgePopOverProps) => {
  const { edgePopOverIds: edgePopOverId } = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);
  if (edgePopOverId === undefined) {
    return;
  }
  return <EdgePopOverInner {...props} />;
};

const EdgePopOverInner = (props: EdgePopOverProps) => {
  const { x, y, height, width } = props;
  const { edgePopOverIds: edgePopOverId } = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);
  const dispatch = useDispatch<AppDispatch>();
  const styles = useStyles();
  const intl = useIntl();
  const edgeSource = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections[edgePopOverId?.source || '']
  );
  const edge = edgeSource?.outputs.find((output) => output.reactFlowKey === edgePopOverId?.target);
  const schemaSource = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation.flattenedSourceSchema[edgePopOverId?.source || '']
  );

  const stringResources = useMemo(
    () => ({
      DELETE: intl.formatMessage({
        defaultMessage: 'Delete mapping',
        id: '0uuxAX',
        description: 'Delete mapping',
      }),
      ADD_LOOP: intl.formatMessage({
        defaultMessage: 'Add loop',
        id: 'vNqq43',
        description: 'Add loop for the connection',
      }),
      REMOVE_LOOP: intl.formatMessage({
        defaultMessage: 'Remove loop',
        id: 'IBFBR2',
        description: 'Remove loop for the connection',
      }),
    }),
    [intl]
  );

  const closePopup = useCallback(() => {
    dispatch(updateEdgePopOverId(undefined));
  }, [dispatch]);

  const onOpenChange = useCallback(
    (e: OpenPopoverEvents, data: OnOpenChangeData) => {
      if (!data.open) {
        closePopup();
      }
    },
    [closePopup]
  );

  const onDelete = useCallback(() => {
    closePopup();
    if (edgePopOverId) {
      dispatch(deleteEdge(edgePopOverId.id));
    }
  }, [dispatch, closePopup, edgePopOverId]);

  const onAddLoop = useCallback(() => {
    closePopup();
    if (edgePopOverId) {
      dispatch(addLoopToConnection(edgePopOverId));
    }
  }, [dispatch, edgePopOverId, closePopup]);

  if (!edgePopOverId || x === undefined || y === undefined || height === undefined || width === undefined) {
    return null;
  }

  const isLoopRemovingAllowed = typeof edge !== 'string' && edge?.isRepeating;
  const isLoopAddingAllowed = schemaSource && schemaSource.nodeProperties.includes(SchemaNodeProperty.Repeating) && !isLoopRemovingAllowed;

  return (
    <Popover
      key={`popover__${edgePopOverId}`}
      open={true}
      onOpenChange={onOpenChange}
      openOnContext={true}
      trapFocus={true}
      withArrow={true}
      size={'small'}
    >
      <PopoverTrigger>
        <div
          className={styles.contextMenu}
          style={{
            top: y,
            left: x,
          }}
        />
      </PopoverTrigger>
      <PopoverSurface as={'div'}>
        <MenuList>
          {isLoopRemovingAllowed ? (
            <MenuItem icon={<ArrowRepeatAllOffRegular color={tokens.colorPaletteBlueBorderActive} />}>
              {stringResources.REMOVE_LOOP}
            </MenuItem>
          ) : isLoopAddingAllowed ? (
            <MenuItem onClick={onAddLoop} icon={<ArrowRepeatAllRegular color={tokens.colorPaletteBlueBorderActive} />}>
              {stringResources.ADD_LOOP}
            </MenuItem>
          ) : null}
          <MenuItem onClick={onDelete} icon={<DeleteRegular color={tokens.colorPaletteBlueBorderActive} />}>
            {stringResources.DELETE}
          </MenuItem>
        </MenuList>
      </PopoverSurface>
    </Popover>
  );
};

export default EdgePopOver;
