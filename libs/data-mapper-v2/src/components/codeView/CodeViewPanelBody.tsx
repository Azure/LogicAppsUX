import { useEffect, useMemo, useRef } from 'react';
import { useIntl } from 'react-intl';
import { useStyles } from './styles';
import { useSelector } from 'react-redux';
import type { RootState } from '../../core/state/Store';
import { MonacoEditor } from '@microsoft/designer-ui';
import { EditorLanguage } from '@microsoft/logic-apps-shared';

type CodeViewPanelBodyProps = {};

export const CodeViewPanelBody = (_props: CodeViewPanelBodyProps) => {
  const intl = useIntl();
  const bodyContainerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<any>(null);
  const styles = useStyles();

  // Show XSLT content (the actual saved format) instead of LML
  const xsltContent = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.xsltContent);
  const resources = useMemo(
    () => ({
      EMPTY_XSLT_CONTENT: intl.formatMessage({
        defaultMessage: 'XSLT not yet generated. Save the map to generate XSLT output.',
        id: '7V737/',
        description: `Message to display when XSLT content hasn't been generated yet`,
      }),
    }),
    [intl]
  );

  useEffect(() => {
    if (editorRef?.current?.layout) {
      editorRef.current.layout();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyContainerRef?.current?.getBoundingClientRect().height, editorRef]);

  return (
    <div className={styles.bodyContainer} ref={bodyContainerRef}>
      <MonacoEditor
        language={EditorLanguage.xml}
        value={xsltContent === '' ? resources.EMPTY_XSLT_CONTENT : xsltContent}
        ref={editorRef}
        monacoContainerStyle={{ height: '100%' }}
        className={styles.editorStyle}
        lineNumbers={'on'}
        scrollbar={{ horizontal: 'hidden', vertical: 'visible' }}
        width="100%"
        wordWrap="on"
        readOnly
      />
    </div>
  );
};
