import { IconButton, initializeIcons, Text } from '@fluentui/react';
import type { FunctionComponent } from 'react';
import { useIntl } from 'react-intl';

export interface DefaultPanelViewProps {
  onInputSchemaClick: () => void;
  onOutputSchemaClick: () => void;
}

initializeIcons();

export const DefaultPanelView: FunctionComponent<DefaultPanelViewProps> = ({ onInputSchemaClick, onOutputSchemaClick }) => {
  const intl = useIntl();

  const replaceMessage = intl.formatMessage({
    defaultMessage: 'Replace existing schema.',
    description: 'label to inform the ability to replace schemas',
  });

  return (
    <div>
      <Text className="inform-text">{replaceMessage}</Text>

      <div className="schema-selection-container">
        <div>
          <Text className="schema-label-text">Input Schema</Text>
          <p>selectedSchema</p>
        </div>
        <IconButton iconProps={{ iconName: 'Edit' }} title="pencil" ariaLabel="pencil" onClick={onInputSchemaClick} />
      </div>

      <div className="schema-selection-container">
        <div>
          <Text className="schema-label-text">Output Schema</Text>
          <p>selectedSchema</p>
        </div>
        <IconButton iconProps={{ iconName: 'Edit' }} title="pencil" ariaLabel="pencil" onClick={onOutputSchemaClick} />
      </div>
    </div>
  );
};
