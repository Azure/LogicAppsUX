import { openUpdateSourceSchemaPanelView, openUpdateTargetSchemaPanelView } from '../../core/state/PanelSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { SchemaType } from '../../models';
import { IconButton, Text } from '@fluentui/react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export const DefaultConfigView = () => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();

  const sourceSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.targetSchema);

  const replaceMsgLoc = intl.formatMessage({
    defaultMessage: 'Add or replace your schemas.',
    description: 'Label to inform the ability to replace schemas',
  });

  const sourceSchemaLabel = intl.formatMessage({
    defaultMessage: 'Source schema',
    description: 'Label to inform the below schema name is for source schema',
  });

  const targetSchemaLabel = intl.formatMessage({
    defaultMessage: 'Target schema',
    description: 'Label to inform the below schema name is for target schema',
  });

  const noSchemaAddedLoc = intl.formatMessage({
    defaultMessage: 'No schema is added',
    description: 'Placeholder when no schema has been added',
  });

  const pencilIconLoc = intl.formatMessage({
    defaultMessage: 'Pencil icon',
    description: 'Pencil icon aria label',
  });

  const onEditSchemaClick = (schemaType: SchemaType) => {
    if (schemaType === SchemaType.Source) {
      dispatch(openUpdateSourceSchemaPanelView());
    } else {
      dispatch(openUpdateTargetSchemaPanelView());
    }
  };

  return (
    <div>
      <p className="inform-text">{replaceMsgLoc}</p>

      <div className="schema-selection-container">
        <div>
          <Text className="schema-label-text">{sourceSchemaLabel}</Text>
          <p>{sourceSchema?.name ?? noSchemaAddedLoc}</p>
        </div>
        <IconButton
          iconProps={{ iconName: 'Edit' }}
          title={pencilIconLoc}
          ariaLabel={pencilIconLoc}
          onClick={() => onEditSchemaClick(SchemaType.Source)}
        />
      </div>

      <div className="schema-selection-container">
        <div>
          <Text className="schema-label-text">{targetSchemaLabel}</Text>
          <p>{targetSchema?.name ?? noSchemaAddedLoc}</p>
        </div>
        <IconButton
          iconProps={{ iconName: 'Edit' }}
          title={pencilIconLoc}
          ariaLabel={pencilIconLoc}
          onClick={() => onEditSchemaClick(SchemaType.Target)}
        />
      </div>
    </div>
  );
};
