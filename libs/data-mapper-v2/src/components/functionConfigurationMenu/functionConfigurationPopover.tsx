import { Button, Tab, TabList, PopoverSurface, Subtitle2, Caption1 } from '@fluentui/react-components';
import { useStyles } from './styles';
import { AddRegular, DeleteRegular } from '@fluentui/react-icons';
import { useMemo, useState } from 'react';
import type { RootState } from '../../core/state/Store';
import { useDispatch, useSelector } from 'react-redux';
import type { FunctionData } from '../../models';
import { UnboundedInput } from '../../constants/FunctionConstants';
import { deleteFunction } from '../../core/state/DataMapSlice';
import { useIntl } from 'react-intl';
import { InputTabContents, UnboundedDropdownListItem } from './inputTab/inputTab';
import { List } from '@fluentui/react';
import type { InputOptionProps } from './inputDropdown/InputDropdown';
import type { ConnectionUnit } from '../../models/Connection';

export interface FunctionConfigurationPopoverProps {
  functionId: string;
}

type TabTypes = 'input' | 'output' | 'details';

export const FunctionConfigurationPopover = (props: FunctionConfigurationPopoverProps) => {
  const dispatch = useDispatch();
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = useState<TabTypes>('input');
  const func = useSelector((state: RootState) => {
    return state.dataMap.present.curDataMapOperation.functionNodes[props.functionId];
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

  const onDeleteClick = () => {
    dispatch(deleteFunction(props.functionId));
  };

  return (
    func && (
      <PopoverSurface className={styles.surface}>
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
        <TabList onTabSelect={(e, data) => setSelectedTab(data.value as TabTypes)}>
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

const OutputTabContents = (props: {
  func: FunctionData;
  functionId: string;
}) => {
  const connections = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);
  const styles = useStyles();
  const outputs: (ConnectionUnit | undefined)[] = [...connections[props.functionId].outputs];
  const createConnection = (_optionValue: string | undefined, _option: InputOptionProps | undefined) => {
    return;
  };

  if (outputs.length === 0) {
    outputs[0] = undefined;
  }

  const table = (
    <div>
      <List>
        {outputs.map((output, index) => {
          return (
            <UnboundedDropdownListItem
              key={`output-list-item-${index}`}
              inputName={undefined}
              inputValue={undefined}
              inputType={undefined}
              validateAndCreateConnection={createConnection}
              functionKey={props.functionId}
              func={props.func}
              draggable={false}
              removeItem={() => {
                return;
              }}
            />
          );
        })}
      </List>
    </div>
  );
  const addOutput = (
    <Button icon={<AddRegular className={styles.addIcon} />} className={styles.addButton} appearance="transparent">
      <Caption1>Add Output</Caption1>
    </Button>
  );
  return (
    <>
      <div>{table}</div> {props.func.maxNumberOfInputs === UnboundedInput && addOutput}
    </>
  );
};
