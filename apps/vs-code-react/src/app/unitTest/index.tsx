import type { RootState } from '../../state/store';
import { VSCodeContext } from '../../webviewCommunication';
import './unitTest.less';
import { Link } from '@fluentui/react';
import { LargeText, MediumText, XLargeText, XXLargeText } from '@microsoft/designer-ui';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { useContext } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { CheckmarkCircleFilled, CloudBeakerRegular, DismissCircleFilled } from '@fluentui/react-icons';
import type { AssertionResults } from '@microsoft/vscode-extension-logic-apps';

export const UnitTestResults: React.FC = () => {
  const unitTestState = useSelector((state: RootState) => state.unitTest);
  const vscode = useContext(VSCodeContext);
  const { unitTestName, testResult } = unitTestState;

  const { AssertionResults = [] } = testResult?.Results ?? {};

  console.log('charlie AssertionResults', AssertionResults);

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
        <CloudBeakerRegular aria-label={intlText.TEST_ICON} fontSize={40} />
        <XXLargeText text={unitTestName ?? ''} style={{ marginLeft: '10px' }} />
      </div>
      {AssertionResults.map((result: AssertionResults, index) => (
        <div key={index} className="msla-unit-test-results-assertion">
          {result.Status ? <CheckmarkCircleFilled fontSize={30} /> : <DismissCircleFilled fontSize={30} />}
          <div>
            <div className="msla-unit-test-results-assertion-content-header">
              <XLargeText text={result.Name ?? ''} style={{ marginLeft: '10px' }} />
              <XLargeText text={'-'} style={{ margin: '0 10px' }} />
              <MediumText text={result.Description ?? ''} />
            </div>
            <LargeText text={result.AssertionString} style={{ margin: '10px', display: 'block' }} />
          </div>
        </div>
      ))}
      <Link style={{ margin: '20px' }} onClick={handleViewWorkflow}>
        {intlText.VIEW_WORKFLOW}
      </Link>
    </div>
  );
};
