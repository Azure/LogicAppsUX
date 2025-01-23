import { useState, useMemo, useCallback } from 'react';
import { useStyles } from './styles';
import { ChevronDoubleRightRegular, ChevronDoubleLeftRegular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import { Button, mergeClasses } from '@fluentui/react-components';
import { FunctionList } from '../functionList/FunctionList';
import { FunctionsSVG } from '../../images/icons';
import { Panel } from '../../components/common/panel/Panel';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { toggleFunctionPanel } from '../../core/state/PanelSlice';

type PanelProps = {};

export const FunctionPanel = (_props: PanelProps) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { sourceSchema, targetSchema } = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);
  const styles = useStyles();
  const intl = useIntl();

  const dispatch = useDispatch<AppDispatch>();
  const isFunctionPanelOpen = useSelector((state: RootState) => state.panel.functionPanel.isOpen);

  const openFunctionPanel = useCallback(() => {
    dispatch(toggleFunctionPanel());
  }, [dispatch]);

  const onChevronClick = useCallback(() => {
    setSearchTerm('');
    dispatch(toggleFunctionPanel());
  }, [dispatch]);

  const stringResources = useMemo(
    () => ({
      FUNCTIONS: intl.formatMessage({
        defaultMessage: 'Functions',
        id: 'zsc+jp',
        description: 'Functions',
      }),
      DRAWER_CHEVRON_EXPANDED: intl.formatMessage({
        defaultMessage: 'open functions drawer',
        id: '1Xke9D',
        description: 'aria label to open functions drawer',
      }),
      COLLAPSE_FUNCTIONS_DRAWER: intl.formatMessage({
        defaultMessage: 'collapse functions drawer',
        id: 'iBArTB',
        description: 'aria label to collapse functions drawer',
      }),
      SEARCH_FUNCTIONS: intl.formatMessage({
        defaultMessage: 'Search Functions',
        id: '2xQWRt',
        description: 'Search Functions',
      }),
    }),
    [intl]
  );

  return isFunctionPanelOpen ? (
    <Panel
      id={'functions-panel'}
      isOpen={true}
      title={{
        text: stringResources.FUNCTIONS,
        rightAction: (
          <Button
            appearance="transparent"
            className={styles.collapseChevronButton}
            aria-label={stringResources.DRAWER_CHEVRON_EXPANDED}
            icon={<ChevronDoubleLeftRegular fontSize={18} />}
            onClick={onChevronClick}
          />
        ),
      }}
      body={<FunctionList searchTerm={searchTerm} />}
      search={{
        placeholder: stringResources.SEARCH_FUNCTIONS,
        onChange: (value?: string) => {
          setSearchTerm(value ?? '');
        },
        text: searchTerm,
      }}
      styles={{
        root: mergeClasses(
          styles.root,
          // Overlay if both source and target schema are not selected
          sourceSchema === undefined && targetSchema === undefined ? styles.overlay : ''
        ),
        search: mergeClasses(styles.search, sourceSchema?.name ? styles.searchWithSubTitle : ''),
      }}
    />
  ) : (
    <div className={styles.collapsedDataMapperFunctionPanel}>
      <div className={styles.collapsedDrawerBodyWrapper} onClick={openFunctionPanel}>
        <FunctionsSVG />
        <Button
          className={styles.chevronButton}
          appearance="transparent"
          disabled={!sourceSchema || !targetSchema}
          aria-label={stringResources.DRAWER_CHEVRON_EXPANDED}
          icon={<ChevronDoubleRightRegular fontSize={13} className={styles.functionsChevronIcon} />}
        />
      </div>
    </div>
  );
};
