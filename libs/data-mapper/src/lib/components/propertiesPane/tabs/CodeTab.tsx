import { targetPrefix } from '../../../constants/ReactFlowConstants';
import type { RootState } from '../../../core/state/Store';
import { convertToMapDefinition } from '../../../mapDefinitions';
import type { FunctionData } from '../../../models';
import type { ConnectionDictionary } from '../../../models/Connection';
import { collectFunctionValue } from '../../../utils/DataMap.Utils';
import { isFunctionData } from '../../../utils/Function.Utils';
import { addSourceReactFlowPrefix } from '../../../utils/ReactFlow.Util';
import { commonCodeEditorProps } from '../../testMapPanel/TestMapPanel';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { MonacoEditor } from '@microsoft/designer-ui';
import { EditorLanguage, type SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

const useStyles = makeStyles({
  editorStyles: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding('5px'),
  },
});

interface CodeTabProps {
  currentNode: SchemaNodeExtended | FunctionData;
  contentHeight: number;
}

// For Source/Target/Function nodes
export const CodeTab = ({ currentNode, contentHeight }: CodeTabProps) => {
  const styles = useStyles();

  const sourceSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.targetSchema);
  const targetSchemaSortArray = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.targetSchemaOrdering);
  const sourceSchemaDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.flattenedSourceSchema);
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);
  // RF key of currently selected item PropPane is open for (needed for function node keys)
  const selectedItemKey = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.selectedItemKey);

  const mapDefChunk = useMemo<string>(() => {
    if (isFunctionData(currentNode)) {
      if (!selectedItemKey) {
        return '';
      }

      const fnNodeConnection = connectionDictionary[selectedItemKey];

      if (!fnNodeConnection) {
        return `${currentNode.functionName}()`;
      }
      return collectFunctionValue(currentNode, fnNodeConnection, connectionDictionary, false);
    }
    const srcSchemaNode = sourceSchemaDictionary[addSourceReactFlowPrefix(currentNode.key)];

    // If source schema node, just return its path/key
    if (srcSchemaNode) {
      return srcSchemaNode.key;
    }
    // Get target schema node's map definition chunk
    const reducedConnectionDictionary: ConnectionDictionary = {
      ...connectionDictionary,
    };
    Object.keys(reducedConnectionDictionary).forEach((conKey) => {
      if (conKey.includes(targetPrefix) && !conKey.includes(currentNode.key)) {
        delete reducedConnectionDictionary[conKey];
      }
    });

    return convertToMapDefinition(reducedConnectionDictionary, sourceSchema, targetSchema, targetSchemaSortArray, false);
  }, [currentNode, selectedItemKey, connectionDictionary, sourceSchemaDictionary, sourceSchema, targetSchema, targetSchemaSortArray]);

  return (
    <MonacoEditor
      language={EditorLanguage.yaml}
      value={mapDefChunk}
      className={styles.editorStyles}
      {...commonCodeEditorProps}
      height={`${contentHeight - 50}px`}
      readOnly
    />
  );
};
