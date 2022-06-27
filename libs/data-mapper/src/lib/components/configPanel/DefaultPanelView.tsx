import { initializeIcons } from '@fluentui/react';
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
      <p>{replaceMessage}</p>

      <div>
        <div>
          <p>Input Schema</p>
          <p>selectedSchema</p>
        </div>
        <div onClick={onInputSchemaClick}>Pencil icon placeholder</div>
      </div>

      <div>
        <div>
          <p>Output Schema</p>
          <p>selectedSchema</p>
        </div>
        <div onClick={onOutputSchemaClick}>Pencil icon placeholder</div>
      </div>
    </div>
  );
};
