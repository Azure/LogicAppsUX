import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { Button } from '@fluentui/react-components';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../core/state/Store';
import { Code24Regular, Dismiss20Regular } from '@fluentui/react-icons';
import { Panel } from '../common/panel/Panel';
import { toggleTestPanel } from '../../core/state/PanelSlice';
import { useStyles } from './styles';

type TestPanelProps = {};

export const TestPanel = (_props: TestPanelProps) => {
  const intl = useIntl();
  const styles = useStyles();
  const dispatch = useDispatch<AppDispatch>();
  const isTestPanelOpen = useSelector((state: RootState) => state.panel.isTestPanelOpen);

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
    }),
    [intl]
  );

  return (
    <Panel
      id={'test-panel'}
      isOpen={isTestPanelOpen}
      title={{
        text: resources.TEST_MAP,
        icon: Code24Regular,
        rightAction: (
          <Button
            className={styles.closeButton}
            appearance="transparent"
            aria-label={resources.CLOSE_TEST_MAP}
            icon={<Dismiss20Regular />}
            onClick={onCloseClick}
          />
        ),
        size: 500,
      }}
      body={
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            flex: '1 1 auto',
          }}
        />
      }
      styles={{
        root: styles.root,
      }}
    />
  );
};
