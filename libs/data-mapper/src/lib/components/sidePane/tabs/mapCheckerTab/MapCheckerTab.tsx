import { targetPrefix } from '../../../../constants/ReactFlowConstants';
import { setCurrentTargetSchemaNode, setSelectedItem } from '../../../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../../../core/state/Store';
import type { SchemaNodeDictionary, SchemaNodeExtended } from '../../../../models';
import type { ConnectionDictionary } from '../../../../models/Connection';
import { getConnectedTargetSchemaNodes } from '../../../../utils/Connection.Utils';
import { iconForMapCheckerSeverity } from '../../../../utils/Icon.Utils';
import {
  collectErrorsForMapChecker,
  collectInfoForMapChecker,
  collectOtherForMapChecker,
  collectWarningsForMapChecker,
} from '../../../../utils/MapChecker.Utils';
import type { MapCheckerEntry } from './MapCheckerItem';
import { MapCheckerItem, MapCheckerItemSeverity } from './MapCheckerItem';
import { Stack } from '@fluentui/react';
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, Text, tokens } from '@fluentui/react-components';
import { CheckmarkCircle20Filled } from '@fluentui/react-icons';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export const MapCheckerTab = () => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const sourceSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.targetSchema);
  const targetSchemaDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.flattenedTargetSchema);
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);

  const errorTitleLoc = intl.formatMessage({
    defaultMessage: 'Errors',
    description: 'Error section title',
  });

  const warningTitleLoc = intl.formatMessage({
    defaultMessage: 'Warnings',
    description: 'Warnings section title',
  });

  const infoTitleLoc = intl.formatMessage({
    defaultMessage: 'Info',
    description: 'Info section title',
  });

  const otherTitleLoc = intl.formatMessage({
    defaultMessage: 'Other',
    description: 'Other section title',
  });

  const noItemsLoc = intl.formatMessage({
    defaultMessage: 'Your map is in perfect condition',
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
      if (destinationTargetNode.children.length === 0 && destinationTargetNode.parentKey) {
        dispatch(setCurrentTargetSchemaNode(targetSchemaDictionary[`${targetPrefix}${destinationTargetNode.parentKey}`]));
      } else {
        dispatch(setCurrentTargetSchemaNode(destinationTargetNode));
      }
    }

    dispatch(setSelectedItem(reactFlowId));
  };

  const mapMapCheckerContentToElements = (elements: MapCheckerEntry[], severity: MapCheckerItemSeverity) => {
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
      return collectErrorsForMapChecker(connectionDictionary, targetSchemaDictionary);
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
      return collectWarningsForMapChecker(connectionDictionary, targetSchemaDictionary);
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

  return (
    <div style={{ overflowY: 'scroll', width: '100%', flex: '1 1 1px' }}>
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
};
