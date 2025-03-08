import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useStyles } from './styles';
import { Button } from '@fluentui/react-components';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../core/state/Store';
import { Code24Regular, Dismiss20Regular } from '@fluentui/react-icons';
import { Panel } from '../common/panel/Panel';
import { toggleCodeView } from '../../core/state/PanelSlice';
import { CodeViewPanelBody } from './CodeViewPanelBody';

type CodeViewPanelProps = {};

export const CodeViewPanel = (_props: CodeViewPanelProps) => {
  const intl = useIntl();
  const styles = useStyles();
  const dispatch = useDispatch<AppDispatch>();
  const isCodeViewOpen = useSelector((state: RootState) => state.panel.codeViewPanel.isOpen);

  const onCloseClick = useCallback(() => {
    dispatch(toggleCodeView());
  }, [dispatch]);

  const resources = useMemo(
    () => ({
      CODE: intl.formatMessage({
        defaultMessage: 'Code',
        id: 'U9SHxw',
        description: 'Code view title',
      }),
      CLOSE_CODE_VIEW: intl.formatMessage({
        defaultMessage: 'Close code view',
        id: '3sJlV+',
        description: 'Close code view button',
      }),
    }),
    [intl]
  );

  return (
    <Panel
      position={'end'}
      id={'code-view-panel'}
      isOpen={isCodeViewOpen}
      title={{
        text: resources.CODE,
        icon: Code24Regular,
        rightAction: (
          <Button
            className={styles.closeButton}
            appearance="transparent"
            aria-label={resources.CLOSE_CODE_VIEW}
            icon={<Dismiss20Regular />}
            onClick={onCloseClick}
          />
        ),
        size: 500,
      }}
      body={<CodeViewPanelBody />}
      styles={{
        root: styles.root,
        body: styles.body,
      }}
    />
  );
};
