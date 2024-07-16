import { SchemaTree } from '../schema/tree/SchemaTree';
import { useStyles } from './styles';
import { SchemaType } from '@microsoft/logic-apps-shared';
import { useSelector } from 'react-redux';
import type { RootState } from '../../core/state/Store';

interface SchemaViewProps {
  schemaType: SchemaType | undefined;
}

export const SchemaItemView = (props: SchemaViewProps) => {
  const styles = useStyles();

  const schema = useSelector((state: RootState) => {
    if (props.schemaType === SchemaType.Source) {
      return state.dataMap.present.curDataMapOperation.sourceSchema;
    }
    if (props.schemaType === SchemaType.Target) {
      return state.dataMap.present.curDataMapOperation.targetSchema;
    }
    return undefined;
  });
  return <div className={styles.treeWrapper}>{schema !== undefined && <SchemaTree schemaType={props.schemaType} schema={schema} />}</div>;
};
