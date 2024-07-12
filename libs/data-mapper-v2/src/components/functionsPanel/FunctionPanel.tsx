import { useState, useMemo } from 'react';
import { useStyles } from './styles';
import { ChevronDoubleRightRegular, ChevronDoubleLeftRegular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import { Button } from '@fluentui/react-components';
import { FunctionList } from '../functionList/FunctionList';
import { FunctionsSVG } from '../../images/icons';
import { Panel } from '../../components/common/panel/Panel';

type PanelProps = {};

export const FunctionPanel = (_props: PanelProps) => {
  const [isFunctionsPanelExpanded, setExpandFunctionsPanel] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const styles = useStyles();
  const intl = useIntl();

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

  return isFunctionsPanelExpanded ? (
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
            onClick={() => {
              setExpandFunctionsPanel(false);
            }}
          />
        ),
      }}
      body={<FunctionList searchTerm={searchTerm} />}
      search={{
        placeholder: stringResources.SEARCH_FUNCTIONS,
        onChange: (value?: string) => {
          setSearchTerm(value ?? '');
        },
      }}
      styles={{
        root: styles.root,
      }}
    />
  ) : (
    <div className={styles.collapsedDataMapperFunctionPanel}>
      <div
        className={styles.collapsedDrawerBodyWrapper}
        onClick={() => {
          setExpandFunctionsPanel(true);
        }}
      >
        <FunctionsSVG />
        <Button
          className={styles.chevronButton}
          appearance="transparent"
          aria-label={stringResources.DRAWER_CHEVRON_EXPANDED}
          icon={<ChevronDoubleRightRegular fontSize={13} className={styles.functionsChevronIcon} />}
          onClick={() => {
            setExpandFunctionsPanel(true);
          }}
        />
      </div>
    </div>
  );
};
