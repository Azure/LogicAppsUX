import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { Button } from '@fluentui/react-components';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../core/state/Store';
import { Panel } from '../common/panel/Panel';
import { toggleTestPanel, updateTestOutput } from '../../core/state/PanelSlice';
import { useStyles } from './styles';
import { TestPanelBody } from './TestPanelBody';
import { testDataMap } from '../../core/queries/datamap';
import { LogCategory } from '../../utils/Logging.Utils';
import { guid, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { PanelXButton } from '../common/panel/PanelXButton';
type TestPanelProps = {};

export const TestPanel = (_props: TestPanelProps) => {
  const intl = useIntl();
  const styles = useStyles();
  const dispatch = useDispatch<AppDispatch>();
  const { testMapInput, isOpen } = useSelector((state: RootState) => state.panel.testPanel);
  const xsltFilename = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.xsltFilename);

  const onCloseClick = useCallback(() => {
    dispatch(toggleTestPanel());
  }, [dispatch]);

  const resources = useMemo(
    () => ({
      TEST_MAP: intl.formatMessage({
        defaultMessage: 'Test map',
        id: 'GFnJQe',
        description: 'Code view title',
      }),
      CLOSE_TEST_MAP: intl.formatMessage({
        defaultMessage: 'Close test map',
        id: '6oOQnD',
        description: 'Close code view button',
      }),
      CLOSE: intl.formatMessage({
        defaultMessage: 'Close',
        id: 'Px7S/2',
        description: 'Close button',
      }),
      TEST: intl.formatMessage({
        defaultMessage: 'Test',
        id: 'ldn/IC',
        description: 'Test button',
      }),
    }),
    [intl]
  );

  const onTestClick = useCallback(() => {
    if (!!xsltFilename && !!testMapInput) {
      const attempt = guid();

      testDataMap(xsltFilename, testMapInput)
        .then((response) => {
          dispatch(
            updateTestOutput({
              response: response,
            })
          );

          LoggerService().log({
            level: LogEntryLevel.Verbose,
            area: `${LogCategory.TestMapPanel}/testDataMap`,
            message: 'Successfully tested data map',
            args: [
              {
                attempt,
                statusCode: response.statusCode,
                statusText: response.statusText,
              },
            ],
          });
        })
        .catch((error: Error) => {
          LoggerService().log({
            level: LogEntryLevel.Error,
            area: `${LogCategory.TestMapPanel}/testDataMap`,
            message: error.message,
            args: [
              {
                attempt,
              },
            ],
          });

          dispatch(
            updateTestOutput({
              error: error,
            })
          );
        });
    }
  }, [testMapInput, xsltFilename, dispatch]);

  return (
    <Panel
      id={'test-panel'}
      isOpen={isOpen}
      position={'end'}
      title={{
        text: resources.TEST_MAP,
        rightAction: <PanelXButton onCloseClick={onCloseClick} ariaLabel={resources.CLOSE_TEST_MAP} />,
        size: 500,
      }}
      body={<TestPanelBody />}
      footer={
        <div>
          <Button appearance="primary" onClick={onTestClick} disabled={!testMapInput}>
            {resources.TEST}
          </Button>
          <Button appearance="secondary" onClick={onCloseClick} className={styles.closeButton}>
            {resources.CLOSE}
          </Button>
        </div>
      }
      styles={{
        root: styles.root,
      }}
    />
  );
};
