import type { RootState } from '../../core/state/Store';
import { IconButton, Text } from '@fluentui/react';
import type { FunctionComponent } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

export interface DefaultPanelViewProps {
  onInputSchemaClick: () => void;
  onOutputSchemaClick: () => void;
}

export const DefaultPanelView: FunctionComponent<DefaultPanelViewProps> = ({ onInputSchemaClick, onOutputSchemaClick }) => {
  const inputSchema = useSelector((state: RootState) => state.schema?.inputSchema);
  const outputSchema = useSelector((state: RootState) => state.schema?.outputSchema);
  const intl = useIntl();

  const replaceMessage = intl.formatMessage({
    defaultMessage: 'Replace existing schema.',
    description: 'label to inform the ability to replace schemas',
  });
  const inputSchemaLabel = intl.formatMessage({
    defaultMessage: 'Input Schema',
    description: 'label to inform the below schema name is for input schema',
  });
  const outputSchemaLabel = intl.formatMessage({
    defaultMessage: 'Output Schema',
    description: 'label to inform the below schema name is for output schema',
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
          <Text className="schema-label-text">{inputSchemaLabel}</Text>
          <p>{inputSchema?.name}</p>
        </div>
        <IconButton iconProps={{ iconName: 'Edit' }} title={pencilAriaLabel} ariaLabel={pencilAriaLabel} onClick={onInputSchemaClick} />
      </div>

      <div className="schema-selection-container">
        <div>
          <Text className="schema-label-text">{outputSchemaLabel}</Text>
          <p>{outputSchema?.name}</p>
        </div>
        <IconButton iconProps={{ iconName: 'Edit' }} title={pencilAriaLabel} ariaLabel={pencilAriaLabel} onClick={onOutputSchemaClick} />
      </div>
    </div>
  );
};
