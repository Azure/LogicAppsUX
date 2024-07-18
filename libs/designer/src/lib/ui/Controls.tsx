import { openPanel } from '../core';
import { useShowMinimap } from '../core/state/designerView/designerViewSelectors';
import { toggleMinimap } from '../core/state/designerView/designerViewSlice';
import { Icon, useTheme } from '@fluentui/react';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { ControlButton, Controls } from '@xyflow/react';

const CustomControls = () => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const showMinimap = useShowMinimap();
  const { isInverted } = useTheme();
  const searchId = 'control-search-button';

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
    defaultMessage: 'Toggle Minimap',
    id: '4j2MEv',
    description: 'Turn the minimap on or off',
  });

  const searchAria = intl.formatMessage({
    defaultMessage: 'Search Workflow Actions',
    id: 'TNH/nK',
    description: 'Aria label for a button that opens a search panel to search the actions in the users workflow',
  });

  const iconStyles = { root: { color: showMinimap ? '#1F85FF' : isInverted ? '#FFFFFF' : '#000000' } };

  return (
    <Controls
      onFitView={() => {
        LoggerService().log({
          area: 'CustomControls:onFitWindowClick',
          level: LogEntryLevel.Verbose,
          message: 'Canvas control clicked.',
        });
      }}
      onZoomIn={() => {
        LoggerService().log({
          area: 'CustomControls:onZoomInClick',
          level: LogEntryLevel.Verbose,
          message: 'Canvas control clicked.',
        });
      }}
      onZoomOut={() => {
        LoggerService().log({
          area: 'CustomControls:onZoomOutClick',
          level: LogEntryLevel.Verbose,
          message: 'Canvas control clicked.',
        });
      }}
      showInteractive={false}
    >
      <ControlButton id={searchId} aria-label={searchAria} title={searchAria} onClick={searchToggleClick}>
        <Icon iconName={'Search'} />
      </ControlButton>
      <ControlButton aria-label={minimapAria} title={minimapAria} onClick={minimapToggleClick}>
        <Icon iconName={'Nav2DMapView'} styles={iconStyles} />
      </ControlButton>
    </Controls>
  );
};

export default CustomControls;
