import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { Button } from '@fluentui/react-components';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../core/state/Store';
import { Dismiss20Regular } from '@fluentui/react-icons';
import { Panel } from '../common/panel/Panel';
import { toggleTestPanel } from '../../core/state/PanelSlice';
import { useStyles } from './styles';
import { TestPanelBody } from './TestPanelBody';

type TestPanelProps = {};

export const TestPanel = (_props: TestPanelProps) => {
  const intl = useIntl();
  const styles = useStyles();
  const dispatch = useDispatch<AppDispatch>();
  const isTestPanelOpen = useSelector((state: RootState) => state.panel.testPanel.isOpen);
  const { sampleDataContent } = useSelector((state: RootState) => state.panel.testPanel);

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

  const onTestClick = useCallback(() => {}, []);

  return (
    <Panel
      id={'test-panel'}
      isOpen={isTestPanelOpen}
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
          <Button appearance="primary" onClick={onTestClick} disabled={!sampleDataContent}>
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
