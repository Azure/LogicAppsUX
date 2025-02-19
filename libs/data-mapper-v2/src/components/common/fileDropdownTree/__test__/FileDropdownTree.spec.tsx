import { describe, it, expect, vi } from 'vitest';
import type { IDataMapperFileService } from '../../../../core';
import { InitDataMapperFileService } from '../../../../core';
import { FileDropdownTree } from '../FileDropdownTree';
import { renderWithRedux } from '../../../../__test__/redux-test-helper-dm';
import userEvent from '@testing-library/user-event';
import type { IFileSysTreeItem } from '@microsoft/logic-apps-shared';

describe('FileDropdownTree', () => {
  class MockFileService {
    public readCurrentSchemaOptions = vi.fn();
  }

  it('should render', () => {
    InitDataMapperFileService(new MockFileService() as Partial<IDataMapperFileService> as IDataMapperFileService);
    const spySelect = vi.fn();
    const user = userEvent.setup();
    const availableSchemas: IFileSysTreeItem[] = [
      {
        name: 'Child1.xsd',
        type: 'file',
        fullPath: 'Child1.xsd',
      },
      {
        name: 'Folder',
        type: 'directory',
        children: [
          {
            name: 'Abc.json',
            type: 'file',
            fullPath: 'Folder/Abc.json',
          },
        ],
      },
      {
        name: 'sourceSchema.json',
        type: 'file',
        fullPath: 'sourceSchema.json',
      },
    ];
    const renderedDropdown = renderWithRedux(<FileDropdownTree onItemSelect={vi.fn()} />, {
      preloadedState: { schema: { availableSchemas } },
    });
    renderedDropdown.getByText('Select schema').click();
    renderedDropdown.getByText('Child1.xsd').click();
    expect(spySelect).toBeCalledWith('Child1.xsd');
    console.log(renderedDropdown);
  });
});
