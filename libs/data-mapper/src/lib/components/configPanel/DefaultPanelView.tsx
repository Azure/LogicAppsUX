import type { RootState } from '../../core/state/Store';
import { IconButton, Text } from '@fluentui/react';
import type { FunctionComponent } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

export interface DefaultPanelViewProps {
  onSourceSchemaClick: () => void;
  onTargetSchemaClick: () => void;
}

export const DefaultPanelView: FunctionComponent<DefaultPanelViewProps> = ({ onSourceSchemaClick, onTargetSchemaClick }) => {
  const sourceSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.targetSchema);
  const intl = useIntl();

  const replaceMessage = intl.formatMessage({
    defaultMessage: 'Replace existing schema',
    description: 'label to inform the ability to replace schemas',
  });
  const sourceSchemaLabel = intl.formatMessage({
    defaultMessage: 'Source Schema',
    description: 'label to inform the below schema name is for source schema',
  });
  const targetSchemaLabel = intl.formatMessage({
    defaultMessage: 'Target Schema',
    description: 'label to inform the below schema name is for target schema',
  });
  const pencilAriaLabel = intl.formatMessage({
    defaultMessage: 'pencil icon',
    description: 'icon to click to edit the schema selection, pressing will lead to a selection panel page',
  });

  return (
    <div>
      <p className="inform-text">{replaceMessage}</p>

      <div className="schema-selection-container">
        <div>
          <Text className="schema-label-text">{sourceSchemaLabel}</Text>
          <p>{sourceSchema?.name}</p>
        </div>
        <IconButton iconProps={{ iconName: 'Edit' }} title={pencilAriaLabel} ariaLabel={pencilAriaLabel} onClick={onSourceSchemaClick} />
      </div>

      <div className="schema-selection-container">
        <div>
          <Text className="schema-label-text">{targetSchemaLabel}</Text>
          <p>{targetSchema?.name}</p>
        </div>
        <IconButton iconProps={{ iconName: 'Edit' }} title={pencilAriaLabel} ariaLabel={pencilAriaLabel} onClick={onTargetSchemaClick} />
      </div>
    </div>
  );
};
