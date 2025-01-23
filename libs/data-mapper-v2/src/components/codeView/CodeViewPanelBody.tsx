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

  const dataMapDefinition = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapLML);
  const resources = useMemo(
    () => ({
      EMPTY_MAP_DEFINITION: intl.formatMessage({
        defaultMessage: 'Unable to generate data map definition',
        id: 'sv+IcU',
        description: `Message to display when the data map definition can't be generated`,
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
        language={EditorLanguage.yaml}
        value={dataMapDefinition === '' ? resources.EMPTY_MAP_DEFINITION : dataMapDefinition}
        ref={editorRef}
        monacoContainerStyle={{ height: '100%' }}
        className={styles.editorStyle}
        lineNumbers={'on'}
        scrollbar={{ horizontal: 'hidden', vertical: 'visible' }}
        width="100%"
        wordWrap="on"
        wrappingIndent="same"
        readOnly
      />
    </div>
  );
};
