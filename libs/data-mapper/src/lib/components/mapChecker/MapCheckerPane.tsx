import { targetPrefix } from '../../constants/ReactFlowConstants';
import { setCurrentTargetSchemaNode, setSelectedItem } from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import type { SchemaNodeDictionary } from '../../models';
import type { ConnectionDictionary } from '../../models/Connection';
import { iconForMapCheckerSeverity } from '../../utils/Icon.Utils';
import {
  collectErrorsForMapChecker,
  collectInfoForMapChecker,
  collectOtherForMapChecker,
  collectWarningsForMapChecker,
} from '../../utils/MapChecker.Utils';
import type { MapCheckerEntry } from './MapCheckerItem';
import { MapCheckerItem, MapCheckerItemSeverity } from './MapCheckerItem';
import { Stack } from '@fluentui/react';
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Button,
  makeStyles,
  shorthands,
  Text,
  tokens,
  typographyStyles,
} from '@fluentui/react-components';
import { Dismiss20Regular } from '@fluentui/react-icons';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export const schemaRootKey = 'schemaRoot';

const useStyles = makeStyles({
  containerStyle: {
    height: '100%',
    ...shorthands.overflow('hidden'),
    minWidth: '320px',
    width: '25%',
    ...shorthands.padding('12px'),
    boxSizing: 'border-box',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    flexDirection: 'column',
  },
  titleTextStyle: {
    ...typographyStyles.body1Strong,
  },
  editorStyle: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding('10px'),
  },
});

export interface TargetSchemaPaneProps {
  isMapCheckerOpen: boolean;
  closeMapChecker: () => void;
}

export const MapCheckerPane = ({ isMapCheckerOpen, closeMapChecker }: TargetSchemaPaneProps) => {
  const intl = useIntl();
  const styles = useStyles();
  const dispatch = useDispatch<AppDispatch>();

  const sourceSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.targetSchema);
  const targetSchemaDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedTargetSchema);
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);

  const mapCheckerLoc = intl.formatMessage({
    defaultMessage: 'Map checker',
    description: 'Map checker title',
  });

  const closeMapCheckerLoc = intl.formatMessage({
    defaultMessage: 'Close the map checker',
    description: 'Map checker close button',
  });

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

  const onMapCheckerItemClick = (reactFlowId: string, _connections: ConnectionDictionary, targetSchemaDictionary: SchemaNodeDictionary) => {
    if (reactFlowId.startsWith(targetPrefix)) {
      const currentNode = targetSchemaDictionary[reactFlowId];
      // This is a leaf node, use the parent
      if (currentNode.children.length === 0 && currentNode.parentKey) {
        dispatch(setCurrentTargetSchemaNode(targetSchemaDictionary[`${targetPrefix}${currentNode.parentKey}`]));
      } else {
        dispatch(setCurrentTargetSchemaNode(currentNode));
      }
    }

    dispatch(setSelectedItem(reactFlowId));

    // TODO Indeterminate when the same function goes to multiple targets
    /* TODO Function and Source schema errors
    const connection = connections[reactFlowId];
    if (connection) {
      const connectionNode = connection.self.node;
      if (isSchemaNodeExtended(connectionNode)) {

      }
    }*/
  };

  const mapErrorContentToElements = (elements: MapCheckerEntry[], severity: MapCheckerItemSeverity) => {
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

  const warningContent = useMemo(() => {
    if (sourceSchema && targetSchema) {
      return collectWarningsForMapChecker(connectionDictionary, targetSchemaDictionary);
    }

    return [];
    //Intentional, only want to update when we update connections
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionDictionary]);

  const infoContent = useMemo(() => {
    if (sourceSchema && targetSchema) {
      return collectInfoForMapChecker(connectionDictionary, targetSchemaDictionary);
    }

    return [];
    //Intentional, only want to update when we update connections
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionDictionary]);

  const otherContent = useMemo(() => {
    if (sourceSchema && targetSchema) {
      return collectOtherForMapChecker(connectionDictionary, targetSchemaDictionary);
    }

    return [];
    //Intentional, only want to update when we update connections
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionDictionary]);

  const errorItems = mapErrorContentToElements(errorContent, MapCheckerItemSeverity.Error);
  const warningItems = mapErrorContentToElements(warningContent, MapCheckerItemSeverity.Warning);
  const infoItems = mapErrorContentToElements(infoContent, MapCheckerItemSeverity.Info);
  const otherItems = mapErrorContentToElements(otherContent, MapCheckerItemSeverity.Unknown);
  const totalItems = errorItems.length + warningItems.length + infoItems.length + otherItems.length;

  return (
    <div className={styles.containerStyle} style={{ display: isMapCheckerOpen ? 'flex' : 'none', width: '40px' }}>
      <Stack horizontal verticalAlign="center" style={{ justifyContent: 'space-between', marginBottom: '12px', marginTop: '4px' }}>
        <Stack horizontal verticalAlign="center">
          <Text className={styles.titleTextStyle} style={{ marginLeft: '8px' }}>
            {mapCheckerLoc}
          </Text>
        </Stack>
        <Button icon={<Dismiss20Regular />} appearance="subtle" onClick={closeMapChecker} aria-label={closeMapCheckerLoc} />
      </Stack>
      <div style={{ overflowY: 'scroll', flex: '1 1 1px' }}>
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
          <Text>Map is in perfect condition</Text>
        )}
      </div>
    </div>
  );
};
