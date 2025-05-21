/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 */

import { ArrowMaximizeVerticalRegular, ArrowMinimizeVerticalRegular } from '@fluentui/react-icons';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';

import { ControlButton } from '@xyflow/react';
import { useLayout } from '../../../core/graphlayout';
// import { useDesignerNodesExpanded } from '../../../core/state/designerView/designerViewSelectors';
// import { toggleExpand } from '../../../core/state/designerView/designerViewSlice';
import { setCollapsedGraphIds } from '../../../core/state/workflow/workflowSlice';
// import { useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { useIsEverythingExpanded } from '../../../core/state/workflow/workflowSelectors';

export const expandCollapseControlId = 'control-expand-collapse-button';

const CollapseExpandControl = () => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const designerNodesExpanded = useIsEverythingExpanded();
  const [nodes] = useLayout();

  const controlLabel = designerNodesExpanded
    ? intl.formatMessage({
        id: 'dCFP4g',
        description: 'Collapse all',
        defaultMessage: 'Collapse all',
      })
    : intl.formatMessage({
        id: 'PV/SAA',
        description: 'Expand all',
        defaultMessage: 'Expand all',
      });

  const expandCollapseToggleClick = () => {
    LoggerService().log({
      area: 'CustomControls:expandCollapseToggleClick',
      level: LogEntryLevel.Verbose,
      message: 'Expand all/Collapse all button clicked.',
      args: [String(designerNodesExpanded)],
    });
    if (designerNodesExpanded && nodes) {
      dispatch(setCollapsedGraphIds(nodes.map((node) => node.id)));
    } else {
      dispatch(setCollapsedGraphIds([]));
    }
  };

  return (
    <ControlButton id={expandCollapseControlId} aria-label={controlLabel} title={controlLabel} onClick={expandCollapseToggleClick}>
      {designerNodesExpanded ? <ArrowMinimizeVerticalRegular /> : <ArrowMaximizeVerticalRegular />}
    </ControlButton>
  );
};

export default CollapseExpandControl;
