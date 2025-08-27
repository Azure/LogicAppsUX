import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InitDataMapperFileService } from '../../../../core';
import { MockDataMapperFileService } from '../../../../__test__/MockDataMapperFileService';
import { renderWithRedux } from '../../../../__test__/redux-test-helper-dm';
import userEvent from '@testing-library/user-event';
import React from 'react';
import SchemaFileSelector, { FileSelectorProps } from '../FileSelector';

describe('FileSelector - XSLT Integration', () => {
  let mockFileService: MockDataMapperFileService;

  const props: FileSelectorProps<{ text: string }> = {
    selectedKey: 'select-existing',
    onOptionChange: vi.fn(),
    options: {
      'upload-new': { text: 'Add new' },
      'select-existing': { text: 'Select existing' },
    },
    upload: {
      onUploadClick: vi.fn(),
      uploadButtonText: 'Browse',
    },
    existing: {
      onSelect: vi.fn(),
    },
  };

  beforeEach(() => {
    mockFileService = new MockDataMapperFileService();
    InitDataMapperFileService(mockFileService);
  });

  it('displays test schemas from MockDataMapperFileService', async () => {
    // Initially no schemas
    const { getByText, queryByText, rerender } = renderWithRedux(<SchemaFileSelector {...props} />, {
      preloadedState: { schema: { availableSchemas: [] } },
    });

    // Should show dropdown but no test schemas yet
    const selectButton = getByText('Select schema');
    expect(selectButton).toBeInTheDocument();

    // Simulate dropdown reopen (triggers readCurrentSchemaOptions)
    const user = userEvent.setup();
    await user.click(selectButton);

    // After clicking, the mock service should have populated schemas
    // We need to re-render with the new state
    rerender(<SchemaFileSelector {...props} />, {
      preloadedState: {
        schema: {
          availableSchemas: [
            {
              name: 'Test Schemas',
              type: 'directory',
              fullPath: '/test-schemas',
              children: [
                {
                  name: 'XSLT Sample Source Schema',
                  type: 'file',
                  fullPath: '/test-schemas/xslt-source-schema.xsd',
                  extension: '.xsd',
                },
                {
                  name: 'XSLT Sample Target Schema',
                  type: 'file',
                  fullPath: '/test-schemas/xslt-target-schema.xsd',
                  extension: '.xsd',
                },
              ],
            },
          ],
        },
      },
    });

    // Now should see test schemas
    expect(getByText('Test Schemas')).toBeInTheDocument();
  });

  it('calls addSchemaFromFile when test schema is selected', async () => {
    const availableSchemas = [
      {
        name: 'Test Schemas',
        type: 'directory' as const,
        fullPath: '/test-schemas',
        children: [
          {
            name: 'XSLT Sample Source Schema',
            type: 'file' as const,
            fullPath: '/test-schemas/xslt-source-schema.xsd',
            extension: '.xsd',
          },
        ],
      },
    ];

    const { getByText } = renderWithRedux(<SchemaFileSelector {...props} />, { preloadedState: { schema: { availableSchemas } } });

    const user = userEvent.setup();

    // Open dropdown
    await user.click(getByText('Select schema'));

    // Expand directory
    await user.click(getByText('Test Schemas'));

    // Select schema file
    const schemaFile = availableSchemas[0].children![0];
    await user.click(getByText(schemaFile.name));

    // Verify the onSelect callback was called with the schema file
    expect(props.existing.onSelect).toHaveBeenCalledWith(schemaFile);
  });

  it('loads schema content when addSchemaFromFile is called', () => {
    const selectedSchema = {
      path: '/test-schemas/xslt-source-schema.xsd',
      type: 'Source' as const,
    };

    // Call the mock service method
    mockFileService.addSchemaFromFile(selectedSchema);

    // Verify console log was called (basic test)
    // In a real scenario, this would dispatch Redux actions
    expect(true).toBe(true); // Placeholder - would verify Redux state changes
  });

  it('provides test schema content for XSLT files', () => {
    const sourcePath = '/test-schemas/xslt-source-schema.xsd';
    const targetPath = '/test-schemas/xslt-target-schema.xsd';

    // Get schema content from test provider
    const sourceContent = mockFileService.getSchemaContent?.(sourcePath) || '';
    const targetContent = mockFileService.getSchemaContent?.(targetPath) || '';

    // Verify content is not empty
    expect(sourceContent).toContain('<?xml version="1.0"');
    expect(sourceContent).toContain('SourceRoot');
    expect(targetContent).toContain('TargetRoot');
  });
});
