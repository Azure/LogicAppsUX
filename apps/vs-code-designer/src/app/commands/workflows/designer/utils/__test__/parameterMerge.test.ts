import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../../utils/codeless/connection', () => ({
  getParametersFromFile: vi.fn(),
}));

import { mergeJsonParameters } from '../parameterMerge';
import { getParametersFromFile } from '../../../../../utils/codeless/connection';

describe('mergeJsonParameters', () => {
  const mockContext = { telemetry: { properties: {} } } as any;
  const mockFilePath = '/test/project/workflow/parameters.json';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds file-only parameters that are not in definition or panel', async () => {
    vi.mocked(getParametersFromFile).mockResolvedValue({
      fileOnlyParam: { type: 'String', value: 'from-file' },
    });

    const definitionParameters: Record<string, any> = {};
    const panelParameterRecord: Record<string, any> = {};

    await mergeJsonParameters(mockContext, mockFilePath, definitionParameters, panelParameterRecord);

    expect(definitionParameters.fileOnlyParam).toEqual({ type: 'String', value: 'from-file' });
  });

  it('does not add file parameter if it exists in panelParameterRecord', async () => {
    vi.mocked(getParametersFromFile).mockResolvedValue({
      sharedParam: { type: 'String', value: 'from-file' },
    });

    const definitionParameters: Record<string, any> = {};
    const panelParameterRecord: Record<string, any> = {
      sharedParam: { type: 'String', value: 'from-panel' },
    };

    await mergeJsonParameters(mockContext, mockFilePath, definitionParameters, panelParameterRecord);

    expect(definitionParameters.sharedParam).toBeUndefined();
  });

  it('deep-merges file-only properties into existing definition parameters', async () => {
    vi.mocked(getParametersFromFile).mockResolvedValue({
      existingParam: { type: 'String', value: 'file-value', metadata: { description: 'from file' } },
    });

    const definitionParameters: Record<string, any> = {
      existingParam: { type: 'Int', value: 'designer-value' },
    };
    const panelParameterRecord: Record<string, any> = {};

    await mergeJsonParameters(mockContext, mockFilePath, definitionParameters, panelParameterRecord);

    expect(definitionParameters.existingParam).toEqual({
      type: 'Int',
      value: 'designer-value',
      metadata: { description: 'from file' },
    });
  });

  it('preserves designer values when both file and definition have the same property', async () => {
    vi.mocked(getParametersFromFile).mockResolvedValue({
      param: { type: 'String', value: 'file-value' },
    });

    const definitionParameters: Record<string, any> = {
      param: { type: 'Int', value: 'designer-value' },
    };
    const panelParameterRecord: Record<string, any> = {};

    await mergeJsonParameters(mockContext, mockFilePath, definitionParameters, panelParameterRecord);

    expect(definitionParameters.param.type).toBe('Int');
    expect(definitionParameters.param.value).toBe('designer-value');
  });

  it('recursively merges nested objects preserving existing nested fields', async () => {
    vi.mocked(getParametersFromFile).mockResolvedValue({
      param: {
        type: 'Object',
        value: { nested: { a: 1, b: 2 } },
        metadata: { nested: { x: 10, y: 20 } },
      },
    });

    const definitionParameters: Record<string, any> = {
      param: {
        type: 'Object',
        value: { nested: { a: 99 } },
      },
    };
    const panelParameterRecord: Record<string, any> = {};

    await mergeJsonParameters(mockContext, mockFilePath, definitionParameters, panelParameterRecord);

    expect(definitionParameters.param.value.nested.a).toBe(99);
    expect(definitionParameters.param.value.nested.b).toBe(2);
    expect(definitionParameters.param.metadata).toEqual({ nested: { x: 10, y: 20 } });
  });

  it('does not merge arrays — designer array wins', async () => {
    vi.mocked(getParametersFromFile).mockResolvedValue({
      param: { type: 'Array', value: [1, 2, 3] },
    });

    const definitionParameters: Record<string, any> = {
      param: { type: 'Array', value: [4, 5] },
    };
    const panelParameterRecord: Record<string, any> = {};

    await mergeJsonParameters(mockContext, mockFilePath, definitionParameters, panelParameterRecord);

    expect(definitionParameters.param.value).toEqual([4, 5]);
  });

  it('handles empty file parameters gracefully', async () => {
    vi.mocked(getParametersFromFile).mockResolvedValue({});

    const definitionParameters: Record<string, any> = {
      param: { type: 'String', value: 'existing' },
    };
    const panelParameterRecord: Record<string, any> = {};

    await mergeJsonParameters(mockContext, mockFilePath, definitionParameters, panelParameterRecord);

    expect(definitionParameters.param).toEqual({ type: 'String', value: 'existing' });
  });

  it('handles null values in source without overwriting target', async () => {
    vi.mocked(getParametersFromFile).mockResolvedValue({
      param: { type: 'String', value: null },
    });

    const definitionParameters: Record<string, any> = {
      param: { type: 'String', value: 'designer-value' },
    };
    const panelParameterRecord: Record<string, any> = {};

    await mergeJsonParameters(mockContext, mockFilePath, definitionParameters, panelParameterRecord);

    expect(definitionParameters.param.value).toBe('designer-value');
  });
});
