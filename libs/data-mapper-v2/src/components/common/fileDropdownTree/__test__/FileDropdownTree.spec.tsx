import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { FileDropdownTree, type FileDropdownTreeProps } from '../FileDropdownTree';
import type { IFileSysTreeItem, ITreeDirectory } from '@microsoft/logic-apps-shared';
import React from 'react';
import { render, screen } from '@testing-library/react';

describe('FileDropdownTree', async () => {
  class MockFileService {
    public readCurrentSchemaOptions = vi.fn();
  }

  const createFileDropdownTree = (props: Partial<FileDropdownTreeProps>) => {
    const defaultProps: FileDropdownTreeProps = {
      onItemSelect: vi.fn(),
      placeholder: 'Select schema',
      fileTree: [],
      onReopen: vi.fn(),
    };
    return render(<FileDropdownTree {...defaultProps} {...props} />);
  };

  it('renders empty when no items in the list', async () => {
    const mocked = {
      readCurrentSchemaOptions: vi.fn(),
    };
    const spySelect = vi.spyOn(mocked, 'readCurrentSchemaOptions');
    const user = userEvent.setup();
    const availableSchemas: IFileSysTreeItem[] = [];

    const renderedDropdown = render(
      <FileDropdownTree
        placeholder="Schema"
        fileTree={availableSchemas}
        onItemSelect={mocked.readCurrentSchemaOptions}
        onReopen={vi.fn()}
      />
    );
    await user.click(renderedDropdown.getByText('Select schema'));
    expect(renderedDropdown.getByPlaceholderText('Search')).toBeTruthy();
  });

  it('updates tree list when file tree updates', async () => {
    const mocked = {
      readCurrentSchemaOptions: vi.fn(),
    };
    const spySelect = vi.spyOn(mocked, 'readCurrentSchemaOptions');
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

    const renderedDropdown = createFileDropdownTree({ fileTree: availableSchemas, onItemSelect: mocked.readCurrentSchemaOptions });
    const user = userEvent.setup();
    const { rerender } = renderedDropdown;

    // opens the dropdown
    await user.click(screen.getByText('Select schema'));

    // update input
    const newFileName = 'NewFileName.json';
    availableSchemas[1].name = newFileName;
    rerender(
      <FileDropdownTree
        placeholder="Schema"
        fileTree={availableSchemas}
        onItemSelect={mocked.readCurrentSchemaOptions}
        onReopen={vi.fn()}
      />
    );
    expect(screen.getByText(newFileName)).toBeTruthy();
  });

  it('renders nested files and calls selected item', async () => {
    const mocked = {
      readCurrentSchemaOptions: vi.fn(),
    };
    const spySelect = vi.spyOn(mocked, 'readCurrentSchemaOptions');
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
    const nestedFile = (availableSchemas[1] as ITreeDirectory).children[0];

    const renderedDropdown = createFileDropdownTree({ fileTree: availableSchemas, onItemSelect: mocked.readCurrentSchemaOptions });

    await user.click(renderedDropdown.getByText('Select schema'));
    await user.click(renderedDropdown.getByText('Folder'));
    await user.click(renderedDropdown.getByText(nestedFile.name));
    expect(mocked.readCurrentSchemaOptions).toBeCalledWith(nestedFile);
  });
});
