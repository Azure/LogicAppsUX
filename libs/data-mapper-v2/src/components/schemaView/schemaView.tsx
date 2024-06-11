import { SearchBox } from '@fluentui/react-search';
import { SchemaTree } from '../addSchema/tree/SchemaTree';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useStyles } from './styles';
import { SchemaType } from '@microsoft/logic-apps-shared';
import { useSelector } from 'react-redux';
import type { RootState } from '../../core/state/Store';

interface SchemaViewProps {
  schemaType: SchemaType | undefined;
}

export const SchemaItemView = (props: SchemaViewProps) => {
  const intl = useIntl();
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

  const stringResources = useMemo(
    () => ({
      SEARCH_PROPERTIES: intl.formatMessage({
        defaultMessage: 'Search properties',
        id: 'BnkCwH',
        description: 'Seach source or target properties',
      }),
    }),
    [intl]
  );
  return (
    <div className={styles.treeWrapper}>
      <SearchBox placeholder={stringResources.SEARCH_PROPERTIES} className={styles.searchBox} />
      {schema === undefined ? <div>Schema not found</div> : <SchemaTree schemaType={props.schemaType} schema={schema} />}
    </div>
  );
};
