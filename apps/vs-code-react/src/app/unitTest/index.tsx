import type { RootState } from '../../state/store';
import './unitTest.less';
import { Text, Button } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

export const UnitTestResults: React.FC = () => {
  const unitTestState = useSelector((state: RootState) => state.unitTest);

  const { unitTestName, unitTestDescription } = unitTestState;

  console.log(unitTestName, unitTestDescription);

  const intl = useIntl();

  const intlText = {
    VIEW_WORKFLOW: intl.formatMessage({
      defaultMessage: 'View workflow',
      description: 'View workflow text',
    }),
  };

  return (
    <div className="msla-unit-test-results">
      <Text size={800} block>
        Title
      </Text>
      <Text size={300} block>
        Description
      </Text>
      <Button appearance="transparent">{intlText.VIEW_WORKFLOW}</Button>
    </div>
  );
};
