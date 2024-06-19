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
  Dropdown,
} from '@fluentui/react-components';
import { useStyles } from './styles';
import { AddRegular, DeleteRegular, ReOrderRegular } from '@fluentui/react-icons';
import { useState } from 'react';
import type { RootState } from '../../core/state/Store';
import { useDispatch, useSelector } from 'react-redux';
import type { FunctionData } from '../../models';
import { UnboundedInput } from '../../constants/FunctionConstants';
import type { InputConnection } from '../../models/Connection';
import { setConnectionInput } from '../../core/state/DataMapSlice';
import { isSchemaNodeExtended } from '../../utils';

export interface FunctionConfigurationPopoverProps {
  functionId: string;
}

type TabTypes = 'input' | 'output' | 'description';

export const FunctionConfigurationPopover = (props: FunctionConfigurationPopoverProps) => {
  const funcBoth = useSelector((state: RootState) => {
    return state.dataMap.present.curDataMapOperation.functionNodes[props.functionId];
  });

  const func = funcBoth?.functionData;

  const styles = useStyles();
  const [selectedTab, setSelectedTab] = useState<TabTypes>('input');

  const tab = (selectedTab: string) => {
    switch (selectedTab) {
      case 'input':
        return <InputTabContents func={func} functionKey={'abc'} />;
      case 'output':
        return <OutputTabContents func={func} functionId={'abc'} />;
      case 'description':
        return <DetailsTabContents func={func} />;
      default:
        return null;
    }
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
            icon={<DeleteRegular className={styles.deleteIcon} />}
          />
        </div>
        <TabList onTabSelect={(e, data) => setSelectedTab(data.value as TabTypes)}>
          <Tab value="description">Details</Tab>
          <Tab value="input">Input</Tab>
          <Tab value="output">Output</Tab>
        </TabList>
        {tab(selectedTab)}
        <div>
          <Button appearance="primary">Save</Button>
        </div>
      </PopoverSurface>
    )
  );
};

const DetailsTabContents = (props: { func: FunctionData }) => {
  return <div>{props.func.description}</div>;
};

const InputTabContents = (props: { func: FunctionData; functionKey: string }) => {
  const columns = [
    { columnKey: 'input', label: 'Input' },
    { columnKey: 'name', label: 'Name' },
    { columnKey: 'types', label: 'Accepted Types' },
  ];
  const styles = useStyles();
  const inputs = props.func.inputs;
  const dispatch = useDispatch();

  const connections = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);

  const updateInput = (inputIndex: number, newValue: InputConnection | null) => {
    // if (!selectedItemKey) {
    //   LogService.error(LogCategory.FunctionNodePropertiesTab, 'updateInput', {
    //     message: 'Attempted to update input with nothing selected on canvas',
    //   });

    //   return;
    // }

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

  let table = <div>ABC</div>

  if (props.func.maxNumberOfInputs !== UnboundedInput) {
    const functionConnection = connections[props.functionKey];
    table = props.func.inputs.map((input, index) => {
      const inputConnection = functionConnection
      ? Object.values(functionConnection.inputs).length > 1
        ? functionConnection.inputs[index][0]
        : functionConnection.inputs[0][index]
      : undefined;
      if (inputConnection === undefined || typeof inputConnection === 'string') {
        return;
      }
      return  <div key={index}>
      <div style={{display: 'flex', flexDirection: 'row'}}>
        <Caption1>{input.name}</Caption1>
        <Caption1>{input.allowedTypes}</Caption1>
      </div>
      <div>
        <Caption1>{isSchemaNodeExtended(inputConnection.node) ? inputConnection.node.name : inputConnection.node.displayName }</Caption1>
        <Caption1>Type</Caption1>
      </div>
      </div>
    });
  }  else table = (
    <Table size="extra-small">
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHeaderCell key={column.columnKey}>{column.label}</TableHeaderCell>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {inputs.map((input, index) => (
          <TableRow key={input.name + index}>
            <TableCell>
              <TableCellLayout>
                <Dropdown>{}</Dropdown>
              </TableCellLayout>
            </TableCell>
            <TableCell>
              <TableCellLayout>{input.name}</TableCellLayout>
            </TableCell>
            <TableCell>
              <TableCellLayout>{input.allowedTypes.join(', ')}</TableCellLayout>
            </TableCell>
            {props.func.maxNumberOfInputs === UnboundedInput && (
              <TableCell>
                <TableCellLayout>
                  <Button appearance="transparent" icon={<ReOrderRegular />} />
                </TableCellLayout>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
  const addInput = (
    <Button
      icon={<AddRegular className={styles.addIcon} />}
      onClick={() => updateInput(0, null)}
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

const OutputTabContents = (props: { func: FunctionData, functionId: string }) => {
  // const outputType = func.outputValueType;
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
                <TableCellLayout>
                  {output.node.name}
                </TableCellLayout>
              </TableCell>
              <TableCell>
                <TableCellLayout>
                  {output.node.type}
                </TableCellLayout>
              </TableCell>
            </TableRow>
          )
          } else {
            const outputFunc = connections[output.reactFlowKey];
            const funcInputSlot = outputFunc.inputs[output.reactFlowKey];
            return (
              <TableRow key={output.reactFlowKey}>  
                <TableCell>
                  <TableCellLayout>
                    {`${output.node.displayName}`}
                  </TableCellLayout>
                </TableCell>
                <TableCell>
                  <TableCellLayout>
                    {'abcd'}
                  </TableCellLayout>
                </TableCell>
              </TableRow>
            )
          }
})
        }
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
