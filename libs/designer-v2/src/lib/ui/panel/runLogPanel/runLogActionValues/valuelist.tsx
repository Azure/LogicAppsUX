import { Value } from '@microsoft/designer-ui';
import type { BoundParameters } from '@microsoft/logic-apps-shared';
import { equals } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import { MessageBar, MessageBarBody, MessageBarTitle, Text, ToggleButton } from '@fluentui/react-components';
import { useRunLogActionValuesStyles } from './runLogActionValues.styles';

export interface ValueListProps {
  error?: any;
  showMore: boolean;
  values: BoundParameters;
  onMoreClick?(): void;
}

export const ValueList: React.FC<ValueListProps> = ({ error, showMore, values, onMoreClick }) => {
  const intl = useIntl();
  const styles = useRunLogActionValuesStyles();

  const resources = {
    noValuesText: intl.formatMessage({
      defaultMessage: 'No values',
      id: 'ODitNS',
      description: 'Text shown when there are no values to display',
    }),
    toggleLessText: intl.formatMessage({
      defaultMessage: 'Show less',
      id: 'V0ZbQO',
      description: 'Toggle button text for hiding advanced parameters',
    }),
    toggleMoreText: intl.formatMessage({
      defaultMessage: 'Show more',
      id: '7yEdSt',
      description: 'Toggle button text for showing advanced parameters',
    }),
    errorTitle: intl.formatMessage({
      defaultMessage: 'Error loading values',
      id: 'JOrhoq',
      description: 'Title for error message bar when there is an error loading values',
    }),
  };

  const keys = Object.keys(values);
  const basicKeys = keys.filter((key) => !equals(values[key].visibility, 'advanced'));
  const advancedKeys = keys.filter((key) => equals(values[key].visibility, 'advanced'));

  return (
    <div className={styles.valueList}>
      {error ? (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>{resources.errorTitle}</MessageBarTitle>
            {JSON.stringify(error)}
          </MessageBarBody>
        </MessageBar>
      ) : null}
      {!error && keys.length === 0 ? <Text>{resources.noValuesText}</Text> : null}
      {basicKeys.map((key) => (
        <Value {...values[key]} key={key} />
      ))}
      {advancedKeys.length > 0 ? (
        <>
          {showMore ? advancedKeys.map((key) => <Value {...values[key]} key={key} />) : null}
          <ToggleButton checked={showMore} onClick={onMoreClick}>
            {showMore ? resources.toggleLessText : resources.toggleMoreText}
          </ToggleButton>
        </>
      ) : null}
    </div>
  );
};
