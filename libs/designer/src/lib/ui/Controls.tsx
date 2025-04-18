import { openPanel } from '../core';
import { useShowMinimap } from '../core/state/designerView/designerViewSelectors';
import { toggleMinimap } from '../core/state/designerView/designerViewSlice';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { ControlButton, Controls, useReactFlow } from '@xyflow/react';
import CollapseExpandControl from './common/controls/collapseExpandControl';
import { AddRegular, MapFilled, MapRegular, SearchRegular, SubtractRegular, ZoomFitRegular } from '@fluentui/react-icons';

export const searchControlId = 'control-search-button';
export const minimapControlId = 'control-minimap-button';
export const zoomFitControlId = 'control-zoom-fit-button';
export const zoomInControlId = 'control-zoom-in-button';
export const zoomOutControlId = 'control-zoom-out-button';

const CustomControls = () => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const showMinimap = useShowMinimap();
  const searchId = 'control-search-button';

  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const minimapToggleClick = () => {
    LoggerService().log({
      area: 'CustomControls:onToggleMiniMapClick',
      level: LogEntryLevel.Verbose,
      message: 'Minimap toggled.',
    });
    dispatch(toggleMinimap());
  };

  const searchToggleClick = () => {
    LoggerService().log({
      area: 'CustomControls:searchToggleClick',
      level: LogEntryLevel.Verbose,
      message: 'Node search opened.',
    });
    dispatch(openPanel({ panelMode: 'NodeSearch', focusReturnElementId: searchId }));
  };

  const minimapAria = intl.formatMessage({
    defaultMessage: 'Toggle minimap',
    id: 'yOyeBT',
    description: 'Turn the minimap on or off',
  });

  const searchAria = intl.formatMessage({
    defaultMessage: 'Search workflow actions',
    id: 'yqF/Ew',
    description: 'Aria label for a button that opens a search panel to search the actions in the users workflow',
  });

  const zoomFitAria = intl.formatMessage({
    defaultMessage: 'Zoom view to fit',
    id: 'nAEN7n',
    description: 'Aria label for a button that fits the workflow to the window',
  });
  const zoomInAria = intl.formatMessage({
    defaultMessage: 'Zoom in',
    id: 'LeR+TX',
    description: 'Aria label for a button that zooms in on the workflow',
  });
  const zoomOutAria = intl.formatMessage({
    defaultMessage: 'Zoom out',
    id: 'JyYLq1',
    description: 'Aria label for a button that zooms out on the workflow',
  });

  const zoomFitClick = () => {
    LoggerService().log({
      area: 'CustomControls:onFitWindowClick',
      level: LogEntryLevel.Verbose,
      message: 'Canvas control clicked.',
    });
    fitView();
  };

  const zoomInClick = () => {
    LoggerService().log({
      area: 'CustomControls:onZoomInClick',
      level: LogEntryLevel.Verbose,
      message: 'Canvas control clicked.',
    });
    zoomIn();
  };

  const zoomOutClick = () => {
    LoggerService().log({
      area: 'CustomControls:onZoomOutClick',
      level: LogEntryLevel.Verbose,
      message: 'Canvas control clicked.',
    });
    zoomOut();
  };

  return (
    <Controls showFitView={false} showInteractive={false} showZoom={false}>
      <CollapseExpandControl />
      <ControlButton id={zoomInControlId} aria-label={zoomInAria} title={zoomInAria} onClick={zoomInClick}>
        <AddRegular />
      </ControlButton>
      <ControlButton id={zoomOutControlId} aria-label={zoomOutAria} title={zoomOutAria} onClick={zoomOutClick}>
        <SubtractRegular />
      </ControlButton>
      <ControlButton id={zoomFitControlId} aria-label={zoomFitAria} title={zoomFitAria} onClick={zoomFitClick}>
        <ZoomFitRegular />
      </ControlButton>
      <ControlButton id={searchId} aria-label={searchAria} title={searchAria} onClick={searchToggleClick}>
        <SearchRegular />
      </ControlButton>
      <ControlButton aria-label={minimapAria} title={minimapAria} onClick={minimapToggleClick}>
        {showMinimap ? <MapFilled /> : <MapRegular />}
      </ControlButton>
    </Controls>
  );
};

export default CustomControls;
