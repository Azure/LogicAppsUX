import type { RootState } from '../../state/store';
import { VSCodeContext } from '../../webviewCommunication';
import { MediumText, XLargeText, XXLargeText } from '@microsoft/designer-ui';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { useContext } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { CheckmarkCircleFilled, CloudBeakerRegular, DismissCircleFilled } from '@fluentui/react-icons';
import type { AssertionResults } from '@microsoft/vscode-extension-logic-apps';
import { Link, tokens } from '@fluentui/react-components';
import { useUnitTestStyles } from './unitTestStyles';

export const UnitTestResults: React.FC = () => {
  const unitTestState = useSelector((state: RootState) => state.unitTest);
  const vscode = useContext(VSCodeContext);
  const styles = useUnitTestStyles();
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
    <div className={styles.unitTestResults}>
      <div className={styles.unitTestResultsHeader}>
        <CloudBeakerRegular aria-label={intlText.TEST_ICON} fontSize={40} />
        <XXLargeText text={unitTestName ?? ''} style={{ marginLeft: '10px' }} />
      </div>
      <div className={styles.unitTestResultsAssertionsList}>
        {AssertionResults.map((result: AssertionResults, index) => (
          <div key={index} className={styles.unitTestResultsAssertionsListItem}>
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

      <Link className={styles.unitTestResultsButton} onClick={handleViewWorkflow}>
        {intlText.VIEW_WORKFLOW}
      </Link>
    </div>
  );
};
