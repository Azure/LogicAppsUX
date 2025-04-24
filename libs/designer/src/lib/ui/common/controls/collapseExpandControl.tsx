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
import { useState } from 'react';
import { useIsEverythingExpanded } from '../../../core/state/workflow/workflowSelectors';
import { TeachingPopup, UIConstants } from '@microsoft/designer-ui';

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

  const [shouldDisplayPopup, setShouldDisplayPopup] = useState(
    localStorage.getItem(UIConstants.TEACHING_POPOVER_ID.expandCollapseButton) !== 'true'
  );
  const handlePopupDismiss = () => {
    localStorage.setItem(UIConstants.TEACHING_POPOVER_ID.expandCollapseButton, 'true');
    setShouldDisplayPopup(false);
  };

  const targetElement = document.getElementById(expandCollapseControlId);
  const popoverTitle = intl.formatMessage({
    id: 'aikD4q',
    description: 'Title for teaching popover that will be shown to showcase the new feature.',
    defaultMessage: 'Expand or collapse all actions',
  });
  const popoverMessage = intl.formatMessage({
    id: 'pL1lzf',
    description: 'Text message for the teaching popover that will be shown to showcase the new feature.',
    defaultMessage: 'You can now expand or collapse all action groups with one single click.',
  });

  return (
    <>
      <ControlButton id={expandCollapseControlId} aria-label={controlLabel} title={controlLabel} onClick={expandCollapseToggleClick}>
        {designerNodesExpanded ? <ArrowMinimizeVerticalRegular /> : <ArrowMaximizeVerticalRegular />}
      </ControlButton>
      {shouldDisplayPopup ? (
        <TeachingPopup
          targetElement={targetElement}
          title={popoverTitle}
          message={popoverMessage}
          handlePopupPrimaryOnClick={handlePopupDismiss}
          withArrow={true}
        />
      ) : null}
    </>
  );
};

export default CollapseExpandControl;
