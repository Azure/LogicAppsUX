import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { Button, mergeClasses } from '@fluentui/react-components';
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
  const showSelection = useSelector((state: RootState) => state.panel.testPanel.showSelection);

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
      body={<TestPanelBody />}
      styles={{
        root: mergeClasses(styles.root, showSelection ? styles.selection : ''),
      }}
    />
  );
};
