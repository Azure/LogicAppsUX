import {
  Button,
  Tab,
  TabList,
  PopoverSurface,
  Subtitle2,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableBody,
  TableCell,
  TableCellLayout,
  Caption1,
  Caption2,
} from '@fluentui/react-components';
import { useStyles } from './styles';
import { AddRegular, DeleteRegular, LinkDismissRegular, ReOrderRegular } from '@fluentui/react-icons';
import { useMemo, useState } from 'react';
import type { RootState } from '../../core/state/Store';
import { useDispatch, useSelector } from 'react-redux';
import type { FunctionData } from '../../models';
import { UnboundedInput } from '../../constants/FunctionConstants';
import type { InputConnection } from '../../models/Connection';
import { createInputSlotForUnboundedInput, deleteFunction, setConnectionInput } from '../../core/state/DataMapSlice';
import { isSchemaNodeExtended } from '../../utils';
import { useIntl } from 'react-intl';
import { InputDropdown } from './inputDropdown/InputDropdown';
import { getInputName, getInputValue } from '../../utils/Function.Utils';

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
  return <div>{props.func.description}</div>;
};

const InputTabContents = (props: {
  func: FunctionData;
  functionKey: string;
}) => {
  const styles = useStyles();
  const inputsFromManifest = props.func.inputs;
  const dispatch = useDispatch();

  const addUnboundedInputSlot = () => {
    dispatch(createInputSlotForUnboundedInput(props.functionKey));
  };

  const connections = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);

  const updateInput = (inputIndex: number, newValue: InputConnection | null) => {
    const targetNodeReactFlowKey = props.functionKey;
    dispatch(
      setConnectionInput({
        targetNode: props.func,
        targetNodeReactFlowKey,
        inputIndex,
        input: newValue,
      })
    );
  };

  const removeUnboundedInput = (index: number) => {
    updateInput(index, null);
  };

  let table: JSX.Element;
  const functionConnection = connections[props.functionKey];

  if (props.func.maxNumberOfInputs !== UnboundedInput) {
    const tableContents = props.func.inputs.map((input, index) => {
      const inputConnection = functionConnection
        ? Object.values(functionConnection.inputs).length > 1
          ? functionConnection.inputs[index][0]
          : functionConnection.inputs[0][index]
        : undefined;
      return (
        <div className={styles.boundedInputRow} key={index}>
          <div className={styles.boundedInputTopRow}>
            <div className={styles.inputNameDiv}>
              <Caption1 className={styles.inputName}>{input.name}</Caption1>
              <Caption2>{input.placeHolder}</Caption2>
            </div>
            <Caption2 className={styles.allowedTypes}>Allowed types: {input.allowedTypes}</Caption2>
          </div>
          <InputDropdown
            functionId={props.functionKey}
            currentNode={props.func}
            inputName={getInputName(inputConnection, connections)}
            inputValue={getInputValue(inputConnection)}
            inputIndex={index}
            isUnboundedInput={true}
          />
        </div>
      );
    });
    table = <div>{tableContents}</div>;
  } else {
    table = (
      <Table size="medium" noNativeElements>
        <TableHeader>
          <TableRow>
            <TableHeaderCell className={styles.unlimitedInputHeaderCell} key="input-name">
              <Caption1>{inputsFromManifest[0].name}</Caption1>
            </TableHeaderCell>
            <TableHeaderCell className={styles.unlimitedInputHeaderCell} key="input-types">
              <Caption2>{`Accepted types: ${inputsFromManifest[0].allowedTypes}`}</Caption2>
            </TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(functionConnection.inputs[0]).map((input, index) => {
            return (
              <TableRow key={input[0] + index}>
                <TableCell style={{ width: '210px' }}>
                  <TableCellLayout style={{ width: '210px' }}>
                    <InputDropdown
                      functionId={props.functionKey}
                      currentNode={props.func}
                      inputName={getInputName(input[1], connections)}
                      inputValue={getInputValue(input[1])}
                      inputIndex={index}
                      isUnboundedInput={true}
                      placeholder={inputsFromManifest[0].placeHolder}
                    />
                  </TableCellLayout>
                </TableCell>
                <TableCell>
                  <TableCellLayout>
                    <Button appearance="transparent" icon={<LinkDismissRegular />} onClick={() => removeUnboundedInput(index)} />
                  </TableCellLayout>
                </TableCell>
                <TableCell>
                  <TableCellLayout>
                    <Button appearance="transparent" icon={<ReOrderRegular />} />
                  </TableCellLayout>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  }
  const addInput = (
    <Button
      icon={<AddRegular className={styles.addIcon} />}
      onClick={() => addUnboundedInputSlot()}
      className={styles.addButton}
      appearance="transparent"
    >
      <Caption1>Add Input</Caption1>
    </Button>
  );
  return (
    <div>
      <div>{table}</div> {props.func.maxNumberOfInputs === UnboundedInput && addInput}
    </div>
  );
};

const OutputTabContents = (props: {
  func: FunctionData;
  functionId: string;
}) => {
  const columns = [
    { columnKey: 'destination', label: 'Destination' },
    { columnKey: 'type', label: 'Output Type' },
  ];
  const connections = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);
  const styles = useStyles();
  const outputs = connections[props.functionId]?.outputs;

  const table = (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHeaderCell key={column.columnKey}>{column.label}</TableHeaderCell>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {outputs.map((output) => {
          if (isSchemaNodeExtended(output.node)) {
            return (
              <TableRow key={output.reactFlowKey}>
                <TableCell>
                  <TableCellLayout>{output.node.name}</TableCellLayout>
                </TableCell>
                <TableCell>
                  <TableCellLayout>{output.node.type}</TableCellLayout>
                </TableCell>
              </TableRow>
            );
          }
          return (
            <TableRow key={output.reactFlowKey}>
              <TableCell>
                <TableCellLayout>{`${output.node.displayName}`}</TableCellLayout>
              </TableCell>
              <TableCell>
                <TableCellLayout>placeholder</TableCellLayout>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
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
