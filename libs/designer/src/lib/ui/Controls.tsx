import { openPanel } from '../core';
import { useShowMinimap } from '../core/state/designerView/designerViewSelectors';
import { toggleMinimap } from '../core/state/designerView/designerViewSlice';
import { Icon, useTheme } from '@fluentui/react';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { ControlButton, Controls } from '@xyflow/react';
import { toSvg } from 'html-to-image';
const downloadImage = (dataUrl: string) => {
  const a = document.createElement('a');

  a.setAttribute('download', 'workflow.svg');
  a.setAttribute('href', dataUrl);
  a.click();
};

// const imageWidth = 1024;
// const imageHeight = 768;

const DownloadButton = () => {
  // const { getNodes } = useReactFlow();
  const intl = useIntl();

  const downloadImageAria = intl.formatMessage({
    defaultMessage: 'Download svg image of the workflow',
    id: 'SHDMrx',
    description: 'Aria label for a button that downloads an svg formatted image of the users workflow',
  });

  const onClick = () => {
    // we calculate a transform for the nodes so that all nodes are visible
    // we then overwrite the transform of the `.react-flow__viewport` element
    // with the style option of the html-to-image library
    // const nodesBounds = getNodesBounds(getNodes());
    // const viewport = getViewportForBounds(nodesBounds, imageWidth*3, imageHeight*3, 0.1, 8, 0);

    const sel = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (sel) {
      toSvg(sel, {
        // style: {
        //   transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        // },
      }).then((dataUrl: string) => downloadImage(dataUrl));
    }
  };

  const downloadImageId = 'control-download-image-button';

  return (
    <ControlButton id={downloadImageId} aria-label={downloadImageAria} title={downloadImageAria} onClick={onClick}>
      <Icon iconName={'Download'} />
    </ControlButton>
  );
};

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
    defaultMessage: 'Toggle minimap',
    id: 'yOyeBT',
    description: 'Turn the minimap on or off',
  });

  const searchAria = intl.formatMessage({
    defaultMessage: 'Search workflow actions',
    id: 'yqF/Ew',
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
      <DownloadButton />
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
