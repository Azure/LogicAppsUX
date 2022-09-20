import { simpleMockSchema } from '../../__mocks__';
import type { Schema } from '../../models/Schema';
import { convertSchemaToSchemaExtended } from '../../utils/Schema.Utils';
import type { FloatingPanelProps } from '../floatingPanel/FloatingPanel';
import { FloatingPanel } from '../floatingPanel/FloatingPanel';
import { SchemaTree } from '../tree/SchemaTree';
import type { ButtonPivotProps } from './ButtonPivot';
import { ButtonPivot } from './ButtonPivot';
import type { SelectTabData, SelectTabEvent } from '@fluentui/react-components';
import { CubeTree20Filled, CubeTree20Regular, MathFormula20Filled, MathFormula20Regular } from '@fluentui/react-icons';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React, { useState } from 'react';

export default {
  component: ButtonPivot,
  title: 'Data Mapper/Button Groups/Button Pivot',
} as ComponentMeta<typeof ButtonPivot>;

export const Simple: ComponentStory<typeof ButtonPivot> = (args: ButtonPivotProps) => <ButtonPivot {...args} />;
Simple.args = {
  buttons: [
    {
      tooltip: 'Toolbox',
      regularIcon: CubeTree20Regular,
      filledIcon: CubeTree20Filled,
      value: 'toolbox',
    },
    {
      tooltip: 'Function',
      regularIcon: MathFormula20Regular,
      filledIcon: MathFormula20Filled,
      value: 'function',
    },
  ],
  horizontal: true,
  xPos: '16px',
  yPos: '16px',
};

export const MappingToolbox: ComponentStory<typeof ButtonPivot> = (args: ButtonPivotProps) => {
  const [showToolboxPane, setShowToolboxPane] = useState<string | undefined>();

  const schema: Schema = JSON.parse(JSON.stringify(simpleMockSchema));
  const extendedSchema = convertSchemaToSchemaExtended(schema);

  const onTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    if (data.value === showToolboxPane) {
      setShowToolboxPane(undefined);
    } else {
      setShowToolboxPane(data.value as string);
    }
  };

  const ToolboxPanelProps: FloatingPanelProps = {
    xPos: '16px',
    yPos: '76px',
    width: '250px',
    minHeight: '300px',
    maxHeight: '450px',
  };

  const updatedArgs = { ...args };
  updatedArgs.selectedValue = showToolboxPane;
  updatedArgs.onTabSelect = onTabSelect;

  return (
    <>
      <ButtonPivot {...updatedArgs} />
      {showToolboxPane === 'toolbox' && (
        <FloatingPanel {...ToolboxPanelProps}>
          <SchemaTree
            schema={extendedSchema}
            currentlySelectedNodes={[]}
            visibleConnectedNodes={[]}
            onNodeClick={() => console.log('Node clicked')}
          />
        </FloatingPanel>
      )}
      {showToolboxPane === 'functions' && (
        <FloatingPanel {...ToolboxPanelProps}>
          <span>This is where we will put function tree</span>
        </FloatingPanel>
      )}
    </>
  );
};
MappingToolbox.args = {
  buttons: [
    {
      tooltip: 'Toolbox',
      regularIcon: CubeTree20Regular,
      filledIcon: CubeTree20Filled,
      value: 'toolbox',
    },
    {
      tooltip: 'Functions',
      regularIcon: MathFormula20Regular,
      filledIcon: MathFormula20Filled,
      value: 'functions',
    },
  ],
  horizontal: true,
  xPos: '16px',
  yPos: '16px',
};
