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
import { deleteEdge, updateEdgePopOverId } from '../../core/state/DataMapSlice';
import type { Bounds } from '../../core';
import { useStyles } from './styles';
import { ArrowRepeatAllRegular, DeleteRegular, ArrowRepeatAllOffRegular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import { useLooping } from '../../core/state/selectors/selectors';

type EdgePopOverProps = Bounds & {};

const EdgePopOver = (props: EdgePopOverProps) => {
  const { x, y, height, width } = props;
  const { edgePopOverId } = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);
  const dispatch = useDispatch<AppDispatch>();
  const styles = useStyles();
  const intl = useIntl();
  const loopingScenario = useLooping(edgePopOverId);
  const showLoop = false; // Temporary as we are hiding loop option

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
    dispatch(updateEdgePopOverId());
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
      dispatch(deleteEdge(edgePopOverId));
    }
  }, [dispatch, closePopup, edgePopOverId]);

  if (!edgePopOverId || x === undefined || y === undefined || height === undefined || width === undefined) {
    return null;
  }

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
          {loopingScenario.loopPresent && showLoop ? (
            <MenuItem icon={<ArrowRepeatAllOffRegular color={tokens.colorPaletteBlueBorderActive} />}>
              {stringResources.REMOVE_LOOP}
            </MenuItem>
          ) : loopingScenario.isLoopable && showLoop ? (
            <MenuItem icon={<ArrowRepeatAllRegular color={tokens.colorPaletteBlueBorderActive} />}>{stringResources.ADD_LOOP}</MenuItem>
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
