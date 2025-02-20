import { describe, it, expect, vi } from 'vitest';
import type { IDataMapperFileService } from '../../../../core';
import { InitDataMapperFileService } from '../../../../core';
import { renderWithRedux } from '../../../../__test__/redux-test-helper-dm';
import userEvent from '@testing-library/user-event';
import { FileDropdownTree } from '../../fileDropdownTree/FileDropdownTree';
import type { IFileSysTreeItem, ITreeDirectory } from '@microsoft/logic-apps-shared';
import React from 'react';
import SchemaFileSelector, { FileSelectorProps } from '../FileSelector';

describe('FileDropdownTree', async () => {
  class MockFileService {
    public readCurrentSchemaOptions = vi.fn();
  }

  const props: FileSelectorProps<{ text: string }> = {
    selectedKey: 'select-existing',
    onOptionChange: vi.fn(),
    options: {
      'upload-new': { text: 'upload new' },
      'select-existing': { text: 'select existing' },
    },
    upload: {
      onUploadClick: vi.fn(),
      uploadButtonText: 'upload',
    },
    existing: {
      onSelect: vi.fn(),
    },
  };

  it('renders nested files and calls selected item', async () => {
    InitDataMapperFileService(new MockFileService() as Partial<IDataMapperFileService> as IDataMapperFileService);
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
    const nestedFile = (availableSchemas[1] as ITreeDirectory).children[0];

    const renderedDropdown = renderWithRedux(
      <SchemaFileSelector
        options={props.options}
        selectedKey={props.selectedKey}
        onOptionChange={props.onOptionChange}
        upload={props.upload}
        existing={props.existing}
      />,
      { preloadedState: { schema: { availableSchemas } } }
    );
    const user = userEvent.setup();
    await user.click(renderedDropdown.getByText('Select schema'));
    await user.click(renderedDropdown.getByText('Folder'));
    await user.click(renderedDropdown.getByText(nestedFile.name));
    expect(props.existing.onSelect).toHaveBeenCalledWith(nestedFile);
  });
});
