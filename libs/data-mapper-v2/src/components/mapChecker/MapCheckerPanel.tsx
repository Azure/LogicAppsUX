import { targetPrefix } from '../../constants/ReactFlowConstants';
import type { RootState } from '../../core/state/Store';
import { Stack } from '@fluentui/react';
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, Text, tokens } from '@fluentui/react-components';
import { CheckmarkCircle20Filled } from '@fluentui/react-icons';
import type { SchemaNodeDictionary, SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { getConnectedTargetSchemaNodes } from '../../utils/Connection.Utils';
import type { ConnectionDictionary } from '../../models/Connection';
import {
  collectErrorsForMapChecker,
  collectInfoForMapChecker,
  collectOtherForMapChecker,
  collectWarningsForMapChecker,
  convertMapIssuesToMessages,
  MapCheckerItemSeverity,
  type MapCheckerMessage,
} from '../../utils/MapChecker.Utils';
import { iconForMapCheckerSeverity } from '../../utils/Icon.Utils';
import { MapCheckerItem } from './MapCheckerItem';
import { Panel } from '../common/panel/Panel';
import { useStyles } from './styles';

export const MapCheckerPanel = () => {
  const intl = useIntl();
  const styles = useStyles();
  const isMapCheckerPanelOpen = useSelector((state: RootState) => state.panel.mapCheckerPanel.isOpen);

  const sourceSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.targetSchema);
  const targetSchemaDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.flattenedTargetSchema);
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);
  const storeErrors = useSelector((state: RootState) => state.errors.deserializationMessages);

  const stringResources = useMemo(
    () => ({
      MAP_ISSUES: intl.formatMessage({
        defaultMessage: 'Map Issues',
        id: 'rwrlsB',
        description: 'problems with the map',
      }),
    }),
    [intl]
  );

  const errorTitleLoc = intl.formatMessage({
    defaultMessage: 'Errors',
    id: '4BH9uU',
    description: 'Error section title',
  });

  const warningTitleLoc = intl.formatMessage({
    defaultMessage: 'Warnings',
    id: 'dwrqEc',
    description: 'Warnings section title',
  });

  const infoTitleLoc = intl.formatMessage({
    defaultMessage: 'Info',
    id: 'bXFGpe',
    description: 'Info section title',
  });

  const otherTitleLoc = intl.formatMessage({
    defaultMessage: 'Other',
    id: 'jHKc3w',
    description: 'Other section title',
  });

  const noItemsLoc = intl.formatMessage({
    defaultMessage: 'Your map is in perfect condition',
    id: 'YlesUQ',
    description: 'Message displayed when map checker has no errors or warnings',
  });

  const onMapCheckerItemClick = (reactFlowId: string, connections: ConnectionDictionary, targetSchemaDictionary: SchemaNodeDictionary) => {
    let destinationTargetNode: SchemaNodeExtended | undefined = undefined;
    if (reactFlowId.startsWith(targetPrefix)) {
      destinationTargetNode = targetSchemaDictionary[reactFlowId];
    } else {
      const targetNodes = getConnectedTargetSchemaNodes([connections[reactFlowId]], connections);
      if (targetNodes.length > 0) {
        // We could have a input end up at more than one target, so just pick the first to navigate to
        destinationTargetNode = targetNodes[0];
      }
    }

    if (destinationTargetNode) {
      // This is a leaf node, use the parent
      //   if (destinationTargetNode.children.length === 0 && destinationTargetNode.parentKey) {
      //     dispatch(setCurrentTargetSchemaNode(targetSchemaDictionary[`${targetPrefix}${destinationTargetNode.parentKey}`]));
      //   } else {
      //     dispatch(setCurrentTargetSchemaNode(destinationTargetNode));
      //   }
    }

    //dispatch(setSelectedItem(reactFlowId));
  };

  const mapMapCheckerContentToElements = (elements: MapCheckerMessage[], severity: MapCheckerItemSeverity) => {
    return elements.map((item, index) => {
      return (
        <MapCheckerItem
          key={index}
          title={item.title}
          description={item.description}
          severity={severity}
          reactFlowId={item.reactFlowId}
          onClick={() => {
            onMapCheckerItemClick(item.reactFlowId, connectionDictionary, targetSchemaDictionary);
          }}
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
    //Intentional, only want to update when we update connections
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionDictionary]);

  const errorItems = useMemo(() => {
    return mapMapCheckerContentToElements(errorContent, MapCheckerItemSeverity.Error);
    //Intentional, only want to update when we update the content array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorContent]);

  const warningContent = useMemo(() => {
    if (sourceSchema && targetSchema) {
      const warnings = collectWarningsForMapChecker(connectionDictionary, targetSchemaDictionary);

      return warnings;
    }

    return [];
    //Intentional, only want to update when we update connections
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionDictionary]);

  const warningItems = useMemo(() => {
    return mapMapCheckerContentToElements(warningContent, MapCheckerItemSeverity.Warning);
    //Intentional, only want to update when we update the content array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorContent]);

  const infoContent = useMemo(() => {
    if (sourceSchema && targetSchema) {
      return collectInfoForMapChecker(connectionDictionary, targetSchemaDictionary);
    }

    return [];
    //Intentional, only want to update when we update connections
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionDictionary]);

  const infoItems = useMemo(() => {
    return mapMapCheckerContentToElements(infoContent, MapCheckerItemSeverity.Info);
    //Intentional, only want to update when we update the content array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorContent]);

  const otherContent = useMemo(() => {
    if (sourceSchema && targetSchema) {
      return collectOtherForMapChecker(connectionDictionary, targetSchemaDictionary);
    }

    return [];
    //Intentional, only want to update when we update connections
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionDictionary]);

  const otherItems = useMemo(() => {
    return mapMapCheckerContentToElements(otherContent, MapCheckerItemSeverity.Unknown);
    //Intentional, only want to update when we update the content array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorContent]);

  const totalItems = errorItems.length + warningItems.length + infoItems.length + otherItems.length;

  const panelBody = (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 auto',
      }}
    >
      {totalItems > 0 ? (
        <Accordion multiple collapsible defaultOpenItems={[MapCheckerItemSeverity.Error, MapCheckerItemSeverity.Warning]}>
          {errorItems.length > 0 && (
            <AccordionItem value={MapCheckerItemSeverity.Error}>
              <AccordionHeader icon={iconForMapCheckerSeverity(MapCheckerItemSeverity.Error)} size="large">
                {errorTitleLoc}
              </AccordionHeader>
              <AccordionPanel>{errorItems}</AccordionPanel>
            </AccordionItem>
          )}
          {warningItems.length > 0 && (
            <AccordionItem value={MapCheckerItemSeverity.Warning}>
              <AccordionHeader icon={iconForMapCheckerSeverity(MapCheckerItemSeverity.Warning)} size="large">
                {warningTitleLoc}
              </AccordionHeader>
              <AccordionPanel>{warningItems}</AccordionPanel>
            </AccordionItem>
          )}
          {infoItems.length > 0 && (
            <AccordionItem value={MapCheckerItemSeverity.Info}>
              <AccordionHeader icon={iconForMapCheckerSeverity(MapCheckerItemSeverity.Info)} size="large">
                {infoTitleLoc}
              </AccordionHeader>
              <AccordionPanel>{infoItems}</AccordionPanel>
            </AccordionItem>
          )}
          {otherItems.length > 0 && (
            <AccordionItem value={MapCheckerItemSeverity.Unknown}>
              <AccordionHeader icon={iconForMapCheckerSeverity(MapCheckerItemSeverity.Unknown)} size="large">
                {otherTitleLoc}
              </AccordionHeader>
              <AccordionPanel>{otherItems}</AccordionPanel>
            </AccordionItem>
          )}
        </Accordion>
      ) : (
        <Stack horizontal>
          <CheckmarkCircle20Filled height={20} width={20} primaryFill={tokens.colorPaletteGreenBackground3} />
          <Text>{noItemsLoc}</Text>
        </Stack>
      )}
    </div>
  );

  return (
    <Panel
      id="map-checker"
      isOpen={isMapCheckerPanelOpen}
      title={{
        text: stringResources.MAP_ISSUES,
        size: 500,
      }}
      body={panelBody}
      styles={{ root: styles.root }}
      position={'end'}
    />
  );
};
