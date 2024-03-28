import type { RootState } from '../../state/store';
import { VSCodeContext } from '../../webviewCommunication';
import './unitTest.less';
import { Link, Text } from '@fluentui/react';
import { ExtensionCommand } from '@microsoft/vscode-extension';
import { useContext } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

export const UnitTestResults: React.FC = () => {
  const unitTestState = useSelector((state: RootState) => state.unitTest);
  const vscode = useContext(VSCodeContext);
  const { unitTestName, unitTestDescription } = unitTestState;

  const intl = useIntl();

  const intlText = {
    VIEW_WORKFLOW: intl.formatMessage({
      defaultMessage: 'View workflow',
      id: 'v15Fiq',
      description: 'View workflow text',
    }),
  };

  const handleViewWorkflow = () => {
    vscode.postMessage({
      command: ExtensionCommand.viewWorkflow,
    });
  };

  return (
    <div className="msla-unit-test-results">
      <Text variant="xxLarge" block>
        {unitTestName}
      </Text>
      <Text variant="large" block>
        {unitTestDescription}
      </Text>
      <Link onClick={handleViewWorkflow}>{intlText.VIEW_WORKFLOW}</Link>
    </div>
  );
};
