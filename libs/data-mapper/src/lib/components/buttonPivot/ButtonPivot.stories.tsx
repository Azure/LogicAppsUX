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
  title: 'Data Mapper Components/Floaties',
} as ComponentMeta<typeof ButtonPivot>;

export const SimpleMappingToolbox: ComponentStory<typeof ButtonPivot> = (args: ButtonPivotProps) => <ButtonPivot {...args} />;
SimpleMappingToolbox.args = {
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

export const CompositeMappingToolbox: ComponentStory<typeof ButtonPivot> = (args: ButtonPivotProps) => {
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
          <SchemaTree schema={extendedSchema} currentlySelectedNodes={[]} onLeafNodeClick={() => console.log('Node clicked')} />
        </FloatingPanel>
      )}
      {showToolboxPane === 'expressions' && (
        <FloatingPanel {...ToolboxPanelProps}>
          <span>This is where we will put expression tree</span>
        </FloatingPanel>
      )}
    </>
  );
};
CompositeMappingToolbox.args = {
  buttons: [
    {
      tooltip: 'Toolbox',
      regularIcon: CubeTree20Regular,
      filledIcon: CubeTree20Filled,
      value: 'toolbox',
    },
    {
      tooltip: 'Expressions',
      regularIcon: MathFormula20Regular,
      filledIcon: MathFormula20Filled,
      value: 'expressions',
    },
  ],
  horizontal: true,
  xPos: '16px',
  yPos: '16px',
};
