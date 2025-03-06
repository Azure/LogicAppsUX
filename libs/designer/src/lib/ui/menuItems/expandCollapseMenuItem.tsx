import { MenuItem } from '@fluentui/react-components';
import {
  bundleIcon,
  AddSquareMultipleFilled,
  AddSquareMultipleRegular,
  SubtractSquareMultipleFilled,
  SubtractSquareMultipleRegular,
} from '@fluentui/react-icons';
import { removeIdTag } from '@microsoft/logic-apps-shared';
import { toggleCollapsedGraphId } from '../../core/state/workflow/workflowSlice';
import { useIsGraphCollapsed } from '../../core/state/workflow/workflowSelectors';
import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

const CollapseIcon = bundleIcon(SubtractSquareMultipleFilled, SubtractSquareMultipleRegular);
const ExpandIcon = bundleIcon(AddSquareMultipleFilled, AddSquareMultipleRegular);

export interface ExpandCollapseMenuItemProps {
  key: string;
  nodeId: string;
}

export const ExpandCollapseMenuItem = (props: ExpandCollapseMenuItemProps) => {
  const { key, nodeId } = props;

  const graphId = useMemo(() => removeIdTag(nodeId), [nodeId]);
  const expanded = !useIsGraphCollapsed(graphId);

  const intl = useIntl();
  const dispatch = useDispatch();

  const expandText = intl.formatMessage({
    defaultMessage: 'Expand nested',
    id: 'ms2526c37c8acc',
    description: 'Expand text',
  });

  const collapseText = intl.formatMessage({
    defaultMessage: 'Collapse nested',
    id: 'msa42efffa6edf',
    description: 'Collapse text',
  });

  const onClick = useCallback(() => {
    dispatch(toggleCollapsedGraphId({ id: nodeId, includeNested: true }));
  }, [dispatch, nodeId]);

  return (
    <MenuItem key={key} icon={expanded ? <CollapseIcon /> : <ExpandIcon />} onClick={onClick}>
      {expanded ? collapseText : expandText}
    </MenuItem>
  );
};
