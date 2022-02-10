import { DefaultButton } from '@fluentui/react';
import { equals } from '@microsoft-logic-apps/utils';
import { useIntl } from 'react-intl';
import { Value } from '../values';
import { BoundParameters } from './types';

export interface ValueListProps {
  labelledBy: string;
  noValuesText: string;
  showMore: boolean;
  values: BoundParameters;
  onMoreClick?(): void;
}

export const ValueList: React.FC<ValueListProps> = ({ labelledBy, noValuesText, showMore, values, onMoreClick }) => {
  const intl = useIntl();
  const Resources = {
    VALUES_PANEL_TOGGLE_LESS_TEXT: intl.formatMessage({
      defaultMessage: 'Show less',
      description: 'Toggle button text for hiding advanced parameters',
    }),
    VALUES_PANEL_TOGGLE_MORE_TEXT: intl.formatMessage({
      defaultMessage: 'Show more',
      description: 'Toggle button text for showing advanced parameters',
    }),
  };

  const keys = Object.keys(values);
  const basicKeys = keys.filter((key) => !equals(values[key].visibility, 'advanced'));
  const advancedKeys = keys.filter((key) => equals(values[key].visibility, 'advanced'));

  return (
    <div aria-labelledby={labelledBy} className="msla-trace-values">
      {keys.length === 0 ? <div className="msla-monitoring-parameters-empty">{noValuesText}</div> : null}
      {basicKeys.map((key) => (
        <Value {...values[key]} key={key} />
      ))}
      {advancedKeys.length > 0 ? (
        <>
          {showMore ? advancedKeys.map((key) => <Value {...values[key]} key={key} />) : null}
          <DefaultButton
            className="msla-button msla-input-parameters-show-more"
            checked={showMore}
            key="~toggle~"
            toggle
            text={showMore ? Resources.VALUES_PANEL_TOGGLE_LESS_TEXT : Resources.VALUES_PANEL_TOGGLE_MORE_TEXT}
            onClick={onMoreClick}
          />
        </>
      ) : null}
    </div>
  );
};
