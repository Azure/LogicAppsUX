import { Button, Tab, TabList, PopoverSurface, Subtitle2, Caption1 } from '@fluentui/react-components';
import { useStyles } from './styles';
import { DeleteRegular } from '@fluentui/react-icons';
import { useCallback, useMemo, useState } from 'react';
import type { RootState } from '../../core/state/Store';
import { useDispatch, useSelector } from 'react-redux';
import type { FunctionData } from '../../models';
import { deleteFunction } from '../../core/state/DataMapSlice';
import { useIntl } from 'react-intl';
import { InputTabContents } from './inputTab/inputTab';
import { OutputTabContents } from './outputTab/outputTab';
import { guid } from '@microsoft/logic-apps-shared';

export interface FunctionConfigurationPopoverProps {
  functionId: string;
}

type TabTypes = 'input' | 'output' | 'details';

export const FunctionConfigurationPopover = (props: FunctionConfigurationPopoverProps) => {
  const { functionId } = props;
  const dispatch = useDispatch();
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = useState<TabTypes>('input');
  const func = useSelector((state: RootState) => {
    return state.dataMap.present.curDataMapOperation.functionNodes[functionId];
  });
  const intl = useIntl();

  const stringResources = useMemo(
    () => ({
      OUTPUT: intl.formatMessage({
        defaultMessage: 'Output',
        id: 'fAB0Ww',
        description: 'output for the function',
      }),
      INPUT: intl.formatMessage({
        defaultMessage: 'Input',
        id: 't+h+KW',
        description: 'Inputs for the function',
      }),
      DETAILS: intl.formatMessage({
        defaultMessage: 'Details',
        id: 'EoRB1V',
        description: 'details about the function',
      }),
    }),
    [intl]
  );

  const tab = (selectedTab: string) => {
    switch (selectedTab) {
      case 'input':
        return <InputTabContents func={func} functionKey={props.functionId} />;
      case 'output':
        return <OutputTabContents func={func} functionId={props.functionId} />;
      case 'details':
        return <DetailsTabContents func={func} />;
      default:
        return null;
    }
  };

  const onModalClick = useCallback((e: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  const onDeleteClick = () => {
    dispatch(deleteFunction(props.functionId));
  };

  return (
    func && (
      <PopoverSurface className={styles.surface} data-selectableid={`${functionId}_${guid()}`} onClick={onModalClick}>
        <div className={styles.headerRow}>
          <Subtitle2>{func.displayName}</Subtitle2>
          <Button
            className={styles.deleteButton}
            appearance="transparent"
            size="small"
            onClick={onDeleteClick}
            icon={<DeleteRegular className={styles.deleteIcon} />}
          />
        </div>
        <TabList defaultSelectedValue={'input'} onTabSelect={(e, data) => setSelectedTab(data.value as TabTypes)}>
          <Tab value="input">{stringResources.INPUT}</Tab>
          <Tab value="output">{stringResources.OUTPUT}</Tab>
          <Tab className={styles.detailsButton} value="details">
            {stringResources.DETAILS}
          </Tab>
        </TabList>
        <div className={styles.tabWrapper}>{tab(selectedTab)}</div>
      </PopoverSurface>
    )
  );
};

const DetailsTabContents = (props: { func: FunctionData }) => {
  const styles = useStyles();
  return <Caption1 className={styles.detailsText}>{props.func.description}</Caption1>;
};
