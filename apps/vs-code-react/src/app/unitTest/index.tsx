import type { RootState } from '../../state/store';
import { VSCodeContext } from '../../webviewCommunication';
import './unitTest.less';
import { Link } from '@fluentui/react';
import { MediumText, XLargeText, XXLargeText } from '@microsoft/designer-ui';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { useContext } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { CheckmarkCircleFilled, CloudBeakerRegular, DismissCircleFilled } from '@fluentui/react-icons';
import type { AssertionResults } from '@microsoft/vscode-extension-logic-apps';
import { tokens } from '@fluentui/react-components';

export const UnitTestResults: React.FC = () => {
  const unitTestState = useSelector((state: RootState) => state.unitTest);
  const vscode = useContext(VSCodeContext);
  const { unitTestName, testResult } = unitTestState;

  const { AssertionResults = [] } = testResult?.Results ?? {};

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
      <div className="msla-unit-test-results-assertions-list">
        {AssertionResults.map((result: AssertionResults, index) => (
          <div key={index} className="msla-unit-test-results-assertions-list-item">
            {result.Status ? (
              <CheckmarkCircleFilled color={tokens.colorPaletteGreenBackground3} fontSize={25} />
            ) : (
              <DismissCircleFilled color={tokens.colorPaletteRedBackground3} fontSize={25} />
            )}
            <div>
              <XLargeText text={result.Name ?? ''} style={{ marginLeft: '10px', display: 'block' }} />
              <MediumText text={result.Description ?? ''} style={{ margin: '10px', display: 'block' }} />
              <MediumText text={result.AssertionString} style={{ margin: '10px', display: 'block' }} />
            </div>
          </div>
        ))}
      </div>

      <Link className="msla-unit-test-results-button" onClick={handleViewWorkflow}>
        {intlText.VIEW_WORKFLOW}
      </Link>
    </div>
  );
};
