import type { RootState } from '../../../core/state/Store';
import type { Connection } from '../../../models/Connection';
import { isSchemaNodeExtended } from '../../../utils';
import { isCustomValue } from '../../../utils/Connection.Utils';
import { functionDropDownItemText } from '../../../utils/Function.Utils';
import { iconForNormalizedDataType } from '../../../utils/Icon.Utils';
import { addTargetReactFlowPrefix } from '../../../utils/ReactFlow.Util';
import { InputDropdown } from '../../inputTypes/InputDropdown';
import { Stack } from '@fluentui/react';
import { Label, makeStyles, Text, tokens, typographyStyles } from '@fluentui/react-components';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

const gridColumnSpan1 = '1 / span 1';
const gridColumnSpan2 = '2 / span 2';

const useStyles = makeStyles({
  nodeInfoGridContainer: {
    display: 'grid',
    width: '100%',
    rowGap: '16px',
    columnGap: '20px',
    alignItems: 'start',
    justifyContent: 'start',
  },
  bodyText: {
    ...typographyStyles.body1,
    color: tokens.colorNeutralForeground1,
  },
});

interface SchemaNodePropertiesTabProps {
  currentNode: SchemaNodeExtended;
}

export const SchemaNodePropertiesTab = ({ currentNode }: SchemaNodePropertiesTabProps): JSX.Element => {
  const intl = useIntl();
  const styles = useStyles();

  const targetSchemaDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.flattenedTargetSchema);
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);

  const nameLoc = intl.formatMessage({
    defaultMessage: 'Name',
    id: 'RFjYpH',
    description: 'Name of current node',
  });

  const fullPathLoc = intl.formatMessage({
    defaultMessage: 'Full path',
    id: 'wPlTDB',
    description: 'Full path of current node',
  });

  const dataTypeLoc = intl.formatMessage({
    defaultMessage: 'Data type',
    id: '6xRvni',
    description: 'The data type of the current node.',
  });

  const inputLoc = intl.formatMessage({
    defaultMessage: 'Input',
    id: 'P6I90y',
    description: 'Input',
  });

  const isTargetSchemaNode = useMemo(
    () => !!targetSchemaDictionary[addTargetReactFlowPrefix(currentNode.key)],
    [currentNode, targetSchemaDictionary]
  );

  const DataTypeIcon = iconForNormalizedDataType(currentNode.type, 16, false, currentNode.nodeProperties);

  const connection = connectionDictionary[addTargetReactFlowPrefix(currentNode.key)];

  const getInputName = (connection: Connection | undefined) => {
    if (connection?.inputs && connection.inputs[0].length === 1) {
      const input = connection.inputs[0][0];
      return input === undefined
        ? undefined
        : isCustomValue(input)
        ? input
        : isSchemaNodeExtended(input.node)
        ? input.node.name
        : functionDropDownItemText(input.reactFlowKey, input.node, connectionDictionary);
    }

    return undefined;
  };

  const getInputValue = (connection: Connection | undefined) => {
    if (connection?.inputs && connection.inputs[0].length === 1) {
      const input = connection.inputs[0][0];
      return input === undefined ? undefined : isCustomValue(input) ? input : input.reactFlowKey;
    }

    return undefined;
  };

  return (
    <div>
      <div className={styles.nodeInfoGridContainer}>
        <Label style={{ gridColumn: gridColumnSpan1 }}>{nameLoc}</Label>
        <Text className={styles.bodyText} style={{ gridColumn: gridColumnSpan2 }}>
          {currentNode?.name}
        </Text>

        <Label style={{ gridColumn: gridColumnSpan1 }}>{fullPathLoc}</Label>
        <Text className={styles.bodyText} style={{ gridColumn: gridColumnSpan2 }}>
          {currentNode?.key}
        </Text>

        <Label style={{ gridColumn: gridColumnSpan1 }}>{dataTypeLoc}</Label>
        <Stack horizontal verticalAlign="center" style={{ gridColumn: gridColumnSpan2 }}>
          <DataTypeIcon style={{ marginRight: '5px', color: tokens.colorNeutralForeground1 }} />
          <Text className={styles.bodyText}>{currentNode?.type}</Text>
        </Stack>

        {isTargetSchemaNode && (
          <>
            <Label id="label-for-target-node-input-dropdown" htmlFor="dropdown" style={{ gridColumn: gridColumnSpan1 }}>
              {inputLoc}
            </Label>
            <InputDropdown
              id="target-node-input-dropdown"
              labelId="label-for-target-node-input-dropdown"
              currentNode={currentNode}
              inputName={getInputName(connection)}
              inputValue={getInputValue(connection)}
              inputIndex={0}
            />
          </>
        )}
      </div>
    </div>
  );
};
