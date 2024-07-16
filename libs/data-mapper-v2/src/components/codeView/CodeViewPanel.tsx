import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useStyles } from './styles';
import { Button } from '@fluentui/react-components';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../core/state/Store';
import { Code24Regular, Dismiss20Regular } from '@fluentui/react-icons';
import { Panel } from '../common/panel/Panel';
import { MonacoEditor } from '@microsoft/designer-ui';
import { EditorLanguage } from '@microsoft/logic-apps-shared';
import { toggleCodeView } from '../../core/state/PanelSlice';

type CodeViewPanelProps = {};

export const CodeViewPanel = (_props: CodeViewPanelProps) => {
  const intl = useIntl();
  const styles = useStyles();
  const dispatch = useDispatch<AppDispatch>();
  const isCodeViewOpen = useSelector((state: RootState) => state.panel.codeViewPanel.isOpen);
  const dataMapDefinition = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapLML);

  const onCloseClick = useCallback(() => {
    dispatch(toggleCodeView());
  }, [dispatch]);

  const resources = useMemo(
    () => ({
      CODE_VIEW: intl.formatMessage({
        defaultMessage: 'Code view',
        id: 'M0xrm+',
        description: 'Code view title',
      }),
      CLOSE_CODE_VIEW: intl.formatMessage({
        defaultMessage: 'Close code view',
        id: '3sJlV+',
        description: 'Close code view button',
      }),
      EMPTY_MAP_DEFINITION: intl.formatMessage({
        defaultMessage: 'Unable to generate data map definition',
        id: 'sv+IcU',
        description: `Message to display when the data map definition can't be generated`,
      }),
    }),
    [intl]
  );

  return (
    <Panel
      id={'code-view-panel'}
      isOpen={isCodeViewOpen}
      title={{
        text: resources.CODE_VIEW,
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
      body={
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            flex: '1 1 auto',
          }}
        >
          <MonacoEditor
            language={EditorLanguage.yaml}
            value={dataMapDefinition === '' ? resources.EMPTY_MAP_DEFINITION : dataMapDefinition}
            className={styles.editorStyle}
            lineNumbers={'on'}
            scrollbar={{ horizontal: 'hidden', vertical: 'auto' }}
            height="650px"
            wordWrap="on"
            wrappingIndent="same"
            readOnly
          />
        </div>
      }
      styles={{
        root: styles.root,
      }}
    />
  );
};
