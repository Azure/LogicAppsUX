import type { RootState } from '../../core/state/Store';
import { IconButton, Text } from '@fluentui/react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

export interface DefaultPanelViewProps {
  onSourceSchemaClick: () => void;
  onTargetSchemaClick: () => void;
}

export const DefaultPanelView = ({ onSourceSchemaClick, onTargetSchemaClick }: DefaultPanelViewProps) => {
  const sourceSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.targetSchema);
  const intl = useIntl();

  const replaceMessage = intl.formatMessage({
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

  const pencilAriaLabel = intl.formatMessage({
    defaultMessage: 'Pencil icon',
    description: 'Icon to click to edit the schema selection, pressing will lead to a selection panel page',
  });

  return (
    <div>
      <p className="inform-text">{replaceMessage}</p>

      <div className="schema-selection-container">
        <div>
          <Text className="schema-label-text">{sourceSchemaLabel}</Text>
          <p>{sourceSchema?.name ?? noSchemaAddedLoc}</p>
        </div>
        <IconButton iconProps={{ iconName: 'Edit' }} title={pencilAriaLabel} ariaLabel={pencilAriaLabel} onClick={onSourceSchemaClick} />
      </div>

      <div className="schema-selection-container">
        <div>
          <Text className="schema-label-text">{targetSchemaLabel}</Text>
          <p>{targetSchema?.name ?? noSchemaAddedLoc}</p>
        </div>
        <IconButton iconProps={{ iconName: 'Edit' }} title={pencilAriaLabel} ariaLabel={pencilAriaLabel} onClick={onTargetSchemaClick} />
      </div>
    </div>
  );
};
