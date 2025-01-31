import type { RootState } from '../../core/state/Store';
import { type SelectTabData, type SelectTabEvent, Tab, TabList } from '@fluentui/react-components';
import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import {
  collectErrorsForMapChecker,
  collectWarningsForMapChecker,
  convertMapIssuesToMessages,
  MapCheckerItemSeverity,
  type MapCheckerMessage,
} from '../../utils/MapChecker.Utils';
import { MapCheckerItem } from './MapCheckerItem';
import { Panel } from '../common/panel/Panel';
import { useStyles } from './styles';
import { PanelXButton } from '../common/panel/PanelXButton';
import { type MapCheckTabType, setSelectedMapCheckerTab, toggleMapChecker } from '../../core/state/PanelSlice';

export const MapCheckerPanel = () => {
  const intl = useIntl();
  const styles = useStyles();
  const dispatch = useDispatch();

  const isMapCheckerPanelOpen = useSelector((state: RootState) => state.panel.mapCheckerPanel.isOpen);
  const selectedTab = useSelector((state: RootState) => state.panel.mapCheckerPanel.selectedTab);
  const sourceSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.targetSchema);
  const targetSchemaDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.flattenedTargetSchema);
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);
  const storeErrors = useSelector((state: RootState) => state.errors.deserializationMessages);

  const onCloseClick = useCallback(() => {
    dispatch(toggleMapChecker());
  }, [dispatch]);

  const onTabSelect = useCallback(
    (_event: SelectTabEvent, data: SelectTabData) => {
      dispatch(setSelectedMapCheckerTab(data.value as MapCheckTabType));
    },
    [dispatch]
  );

  const stringResources = useMemo(
    () => ({
      MAP_ISSUES: intl.formatMessage({
        defaultMessage: 'Issues',
        id: 'iGxL1E',
        description: 'Issues ith the map',
      }),
      CLOSE_MAP_CHECKER: intl.formatMessage({
        defaultMessage: 'Close map checker',
        id: 'epi+zR',
        description: 'Describes X button to close the map checker panel',
      }),
      ERROR_TAB: intl.formatMessage({
        defaultMessage: 'Errors',
        id: 'c/2T3J',
        description: 'Error tab name',
      }),
      WARNING_TAB: intl.formatMessage({
        defaultMessage: 'Warnings',
        id: 'hqa/U1',
        description: 'Warning tab name',
      }),
      ZERO_ERRORS_MESSAGE: intl.formatMessage({
        defaultMessage: 'No errors found in your map.',
        id: 'BFBJi2',
        description: 'Message displayed when there are no errors',
      }),
      ZERO_WARNINGS_MESSAGE: intl.formatMessage({
        defaultMessage: 'No warnings found in your map.',
        id: 'gnYVoF',
        description: 'Message displayed when there are no warnings',
      }),
    }),
    [intl]
  );

  const mapMapCheckerContentToElements = (elements: MapCheckerMessage[], severity: MapCheckerItemSeverity) => {
    return elements
      .filter((item) => !!item.description?.message?.defaultMessage)
      .map((item, index) => {
        return (
          <MapCheckerItem
            key={index}
            title={item.title}
            description={item.description}
            severity={severity}
            reactFlowId={item.reactFlowId}
            data={item.data}
          />
        );
      });
  };

  const errorContent = useMemo(() => {
    if (sourceSchema && targetSchema) {
      const errors = collectErrorsForMapChecker(connectionDictionary, targetSchemaDictionary);
      const deserializationWarnings = convertMapIssuesToMessages(storeErrors);
      return errors.concat(deserializationWarnings);
    }

    return [];
  }, [connectionDictionary, sourceSchema, storeErrors, targetSchema, targetSchemaDictionary]);

  const errorItems = useMemo(() => {
    return mapMapCheckerContentToElements(errorContent, MapCheckerItemSeverity.Error);
  }, [errorContent]);

  const warningContent = useMemo(() => {
    if (sourceSchema && targetSchema) {
      const warnings = collectWarningsForMapChecker(connectionDictionary, targetSchemaDictionary);

      return warnings;
    }

    return [];
  }, [connectionDictionary, sourceSchema, targetSchema, targetSchemaDictionary]);

  const warningItems = useMemo(() => {
    return mapMapCheckerContentToElements(warningContent, MapCheckerItemSeverity.Warning);
  }, [warningContent]);

  return (
    <Panel
      id="map-checker"
      isOpen={isMapCheckerPanelOpen}
      title={{
        text: stringResources.MAP_ISSUES,
        rightAction: <PanelXButton onCloseClick={onCloseClick} ariaLabel={stringResources.CLOSE_MAP_CHECKER} />,
      }}
      body={
        <div>
          <TabList selectedValue={selectedTab} onTabSelect={onTabSelect}>
            <Tab value="error">{`${stringResources.ERROR_TAB} (${errorItems.length})`}</Tab>
            <Tab value="warning">{`${stringResources.WARNING_TAB} (${warningItems.length})`}</Tab>
          </TabList>
          {selectedTab === 'error' && (
            <div className={styles.tabContainer}>
              {errorItems.length === 0 ? <div className={styles.noDataMessage}>{stringResources.ZERO_ERRORS_MESSAGE}</div> : errorItems}
            </div>
          )}
          {selectedTab === 'warning' && (
            <div className={styles.tabContainer}>
              {warningItems.length === 0 ? (
                <div className={styles.noDataMessage}>{stringResources.ZERO_WARNINGS_MESSAGE}</div>
              ) : (
                warningItems
              )}
            </div>
          )}
        </div>
      }
      styles={{ root: styles.root, title: styles.title, body: styles.body }}
      position={'end'}
    />
  );
};
