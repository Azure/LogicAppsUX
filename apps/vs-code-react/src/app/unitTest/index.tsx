import type { RootState } from '../../state/store';
import { VSCodeContext } from '../../webviewCommunication';
import './unitTest.less';
import { FontIcon, Link, Text, mergeStyles } from '@fluentui/react';
import { ExtensionCommand } from '@microsoft/vscode-extension';
import { useContext } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

const iconClass = mergeStyles({
  fontSize: 40,
  height: 40,
  width: 40,
});

export const UnitTestResults: React.FC = () => {
  const unitTestState = useSelector((state: RootState) => state.unitTest);
  const vscode = useContext(VSCodeContext);
  const { unitTestName } = unitTestState;

  const intl = useIntl();

  const intlText = {
    VIEW_WORKFLOW: intl.formatMessage({
      defaultMessage: 'View workflow',
      id: 'v15Fiq',
      description: 'View workflow text',
    }),
    TEST_ICON: intl.formatMessage({
      defaultMessage: 'Test icon',
      id: 'qfmSaq',
      description: 'Test icon text',
    }),
  };

  const handleViewWorkflow = () => {
    vscode.postMessage({
      command: ExtensionCommand.viewWorkflow,
    });
  };

  return (
    <div className="msla-unit-test-results">
      <div className="msla-unit-test-results-header">
        <FontIcon aria-label={intlText.TEST_ICON} iconName="TestPlan" className={iconClass} />
        <Text variant="xxLarge" style={{ marginLeft: '10px' }}>
          {unitTestName}
        </Text>
      </div>

      <Link onClick={handleViewWorkflow}>{intlText.VIEW_WORKFLOW}</Link>
    </div>
  );
};
