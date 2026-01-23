import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, Spinner } from '@fluentui/react-components';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../core/state/Store';
import { Panel } from '../common/panel/Panel';
import { toggleTestPanel, updateTestOutput } from '../../core/state/PanelSlice';
import { useStyles } from './styles';
import { TestPanelBody } from './TestPanelBody';
import { DataMapperFileService } from '../../core/services/dataMapperFileService/dataMapperFileService';
import { LogCategory } from '../../utils/Logging.Utils';
import { guid, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { PanelXButton } from '../common/panel/PanelXButton';
type TestPanelProps = {};

export const TestPanel = (_props: TestPanelProps) => {
  const intl = useIntl();
  const styles = useStyles();
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);
  const { testMapInput, testMapOutput, testMapOutputError, isOpen } = useSelector((state: RootState) => state.panel.testPanel);
  const xsltContent = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.xsltContent);

  // Track if we're waiting for a test result
  const waitingForResultRef = useRef(false);

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
      SAVE_BEFORE_TEST: intl.formatMessage({
        defaultMessage: 'Please save the map before testing',
        id: 'aulGxd',
        description: 'Message when XSLT content is not available',
      }),
    }),
    [intl]
  );

  // Watch for test results to stop loading
  useEffect(() => {
    if (waitingForResultRef.current && (testMapOutput || testMapOutputError)) {
      waitingForResultRef.current = false;
      setLoading(false);

      if (testMapOutput) {
        LoggerService().log({
          level: LogEntryLevel.Verbose,
          area: `${LogCategory.TestMapPanel}/testDataMap`,
          message: 'Successfully tested data map',
          args: [
            {
              statusCode: testMapOutput.statusCode,
              statusText: testMapOutput.statusText,
            },
          ],
        });
      } else if (testMapOutputError) {
        LoggerService().log({
          level: LogEntryLevel.Error,
          area: `${LogCategory.TestMapPanel}/testDataMap`,
          message: testMapOutputError.message,
        });
      }
    }
  }, [testMapOutput, testMapOutputError]);

  const onTestClick = useCallback(() => {
    if (!!xsltContent && !!testMapInput) {
      const attempt = guid();
      setLoading(true);
      waitingForResultRef.current = true;

      // Clear out previous test output
      dispatch(updateTestOutput({}));

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: `${LogCategory.TestMapPanel}/testDataMap`,
        message: 'Starting local XSLT transformation test',
        args: [{ attempt }],
      });

      // Use local XSLT transformation via the file service
      // The result will come back through the DataMapDataProvider -> Redux flow
      try {
        DataMapperFileService().testXsltTransform(xsltContent, testMapInput);
      } catch (error) {
        // Handle synchronous errors (e.g., service not initialized)
        LoggerService().log({
          level: LogEntryLevel.Error,
          area: `${LogCategory.TestMapPanel}/testDataMap`,
          message: error instanceof Error ? error.message : 'Failed to start transformation',
          args: [{ attempt }],
        });

        dispatch(
          updateTestOutput({
            error: error instanceof Error ? error : new Error('Failed to start transformation'),
          })
        );

        waitingForResultRef.current = false;
        setLoading(false);
      }
    }
  }, [testMapInput, xsltContent, dispatch]);

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
      body={<TestPanelBody loading={loading} />}
      footer={
        <div>
          <Button
            appearance="primary"
            onClick={onTestClick}
            disabled={!testMapInput || !xsltContent || loading}
            title={xsltContent ? undefined : resources.SAVE_BEFORE_TEST}
          >
            {loading ? <Spinner size={'small'}>{resources.TEST}</Spinner> : resources.TEST}
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
