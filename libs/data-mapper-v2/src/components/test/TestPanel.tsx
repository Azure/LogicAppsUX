import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { Button } from '@fluentui/react-components';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../core/state/Store';
import { Dismiss20Regular } from '@fluentui/react-icons';
import { Panel } from '../common/panel/Panel';
import { toggleTestPanel, updateTestOutput } from '../../core/state/PanelSlice';
import { useStyles } from './styles';
import { TestPanelBody } from './TestPanelBody';
import { testDataMap } from '../../core/queries/datamap';
import { LogCategory, LogService } from '../../utils/Logging.Utils';
import { guid } from '@microsoft/logic-apps-shared';
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

          LogService.log(LogCategory.TestMapPanel, 'testDataMap', {
            message: 'Successfully tested data map',
            data: {
              attempt,
              statusCode: response.statusCode,
              statusText: response.statusText,
            },
          });
        })
        .catch((error: Error) => {
          LogService.error(LogCategory.TestMapPanel, 'testDataMap', {
            message: error.message,
            data: {
              attempt,
            },
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
      title={{
        text: resources.TEST_MAP,
        rightAction: (
          <Button
            className={styles.closeHeaderButton}
            appearance="transparent"
            aria-label={resources.CLOSE_TEST_MAP}
            icon={<Dismiss20Regular />}
            onClick={onCloseClick}
          />
        ),
        size: 500,
      }}
      body={<TestPanelBody />}
      footer={
        <div>
          <Button appearance="primary" onClick={onTestClick} disabled={!testMapInput || !xsltFilename}>
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
