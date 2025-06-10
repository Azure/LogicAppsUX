import type { WorkflowparameterFieldProps } from '../workflowparametersField';
import { WorkflowparameterField } from '../workflowparametersField';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, vi, beforeEach, it, expect } from 'vitest';

// Mock makeStyles
vi.mock('../styles', () => ({
  useWorkflowParameterStyles: () => ({
    field: 'mock-field-class',
    fieldLabel: 'mock-field-label-class',
    fieldEditor: 'mock-field-editor-class',
    fieldError: 'mock-field-error-class',
  }),
}));

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en" messages={{}}>
    {children}
  </IntlProvider>
);

describe('ui/workflowparameters/workflowparameterField', () => {
  let mockOnChange: ReturnType<typeof vi.fn>;
  let mockSetName: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnChange = vi.fn();
    mockSetName = vi.fn();
  });

  describe('Basic Rendering', () => {
    it('should render basic parameter fields', () => {
      const props: WorkflowparameterFieldProps = {
        isEditable: true,
        name: 'testParam',
        definition: { id: 'test-id', value: 'test-value', name: 'testParam', type: 'String' },
        setName: mockSetName,
        onChange: mockOnChange,
      };

      render(
        <TestWrapper>
          <WorkflowparameterField {...props} />
        </TestWrapper>
      );

      // Check that name, type, and value fields are rendered
      expect(screen.getByDisplayValue('testParam')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test-value')).toBeInTheDocument();
    });

    it('should render parameter with description', () => {
      const props: WorkflowparameterFieldProps = {
        isEditable: true,
        name: 'testParam',
        definition: {
          id: 'test-id',
          value: 'test-value',
          name: 'testParam',
          type: 'String',
          description: 'Test parameter description',
        },
        setName: mockSetName,
        onChange: mockOnChange,
      };

      render(
        <TestWrapper>
          <WorkflowparameterField {...props} />
        </TestWrapper>
      );

      expect(screen.getByText('Test parameter description')).toBeInTheDocument();
    });
  });

  describe('Parameter Type Input Controls', () => {
    it('should render Input for Boolean type', () => {
      const props: WorkflowparameterFieldProps = {
        isEditable: true,
        name: 'boolParam',
        definition: { id: 'bool-id', value: 'true', name: 'boolParam', type: 'Bool' },
        setName: mockSetName,
        onChange: mockOnChange,
      };

      render(
        <TestWrapper>
          <WorkflowparameterField {...props} />
        </TestWrapper>
      );

      const valueInput = screen.getByDisplayValue('true');
      expect(valueInput).toBeInTheDocument();
      expect(valueInput.tagName).toBe('INPUT');
    });

    it('should render Input for Integer type', () => {
      const props: WorkflowparameterFieldProps = {
        isEditable: true,
        name: 'intParam',
        definition: { id: 'int-id', value: '42', name: 'intParam', type: 'Int' },
        setName: mockSetName,
        onChange: mockOnChange,
      };

      render(
        <TestWrapper>
          <WorkflowparameterField {...props} />
        </TestWrapper>
      );

      const valueInput = screen.getByDisplayValue('42');
      expect(valueInput).toBeInTheDocument();
      expect(valueInput.tagName).toBe('INPUT');
    });

    it('should render Input for Float type', () => {
      const props: WorkflowparameterFieldProps = {
        isEditable: true,
        name: 'floatParam',
        definition: { id: 'float-id', value: '3.14', name: 'floatParam', type: 'Float' },
        setName: mockSetName,
        onChange: mockOnChange,
      };

      render(
        <TestWrapper>
          <WorkflowparameterField {...props} />
        </TestWrapper>
      );

      const valueInput = screen.getByDisplayValue('3.14');
      expect(valueInput).toBeInTheDocument();
      expect(valueInput.tagName).toBe('INPUT');
    });

    it('should render Textarea for String type', () => {
      const props: WorkflowparameterFieldProps = {
        isEditable: true,
        name: 'stringParam',
        definition: { id: 'string-id', value: 'test string value', name: 'stringParam', type: 'String' },
        setName: mockSetName,
        onChange: mockOnChange,
      };

      render(
        <TestWrapper>
          <WorkflowparameterField {...props} />
        </TestWrapper>
      );

      const valueInput = screen.getByDisplayValue('test string value');
      expect(valueInput).toBeInTheDocument();
      expect(valueInput.tagName).toBe('TEXTAREA');
    });

    it('should render Textarea for Array type', () => {
      const props: WorkflowparameterFieldProps = {
        isEditable: true,
        name: 'arrayParam',
        definition: { id: 'array-id', value: '["item1", "item2"]', name: 'arrayParam', type: 'Array' },
        setName: mockSetName,
        onChange: mockOnChange,
      };

      render(
        <TestWrapper>
          <WorkflowparameterField {...props} />
        </TestWrapper>
      );

      const valueInput = screen.getByDisplayValue('["item1", "item2"]');
      expect(valueInput).toBeInTheDocument();
      expect(valueInput.tagName).toBe('TEXTAREA');
    });

    it('should render Textarea for Object type', () => {
      const props: WorkflowparameterFieldProps = {
        isEditable: true,
        name: 'objectParam',
        definition: { id: 'object-id', value: '{"key": "value"}', name: 'objectParam', type: 'Object' },
        setName: mockSetName,
        onChange: mockOnChange,
      };

      render(
        <TestWrapper>
          <WorkflowparameterField {...props} />
        </TestWrapper>
      );

      const valueInput = screen.getByDisplayValue('{"key": "value"}');
      expect(valueInput).toBeInTheDocument();
      expect(valueInput.tagName).toBe('TEXTAREA');
    });
  });

  describe('User Interactions', () => {
    it('should call setName when name field changes', () => {
      const props: WorkflowparameterFieldProps = {
        isEditable: true,
        name: 'testParam',
        definition: { id: 'test-id', value: 'test-value', name: 'testParam', type: 'String' },
        setName: mockSetName,
        onChange: mockOnChange,
      };

      render(
        <TestWrapper>
          <WorkflowparameterField {...props} />
        </TestWrapper>
      );

      const nameInput = screen.getByDisplayValue('testParam');
      fireEvent.change(nameInput, { target: { value: 'newParamName' } });

      expect(mockSetName).toHaveBeenCalledWith('newParamName');
    });

    it('should call onChange when value field changes for Boolean type', () => {
      const props: WorkflowparameterFieldProps = {
        isEditable: true,
        name: 'boolParam',
        definition: { id: 'bool-id', value: 'true', name: 'boolParam', type: 'Bool' },
        setName: mockSetName,
        onChange: mockOnChange,
      };

      render(
        <TestWrapper>
          <WorkflowparameterField {...props} />
        </TestWrapper>
      );

      const valueInput = screen.getByDisplayValue('true');
      fireEvent.change(valueInput, { target: { value: 'false' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        id: 'bool-id',
        newDefinition: expect.objectContaining({
          id: 'bool-id',
          name: 'boolParam',
          type: 'Bool',
          value: 'false',
        }),
        useLegacy: undefined,
      });
    });

    it('should call onChange when value field changes for String type', () => {
      const props: WorkflowparameterFieldProps = {
        isEditable: true,
        name: 'stringParam',
        definition: { id: 'string-id', value: 'initial', name: 'stringParam', type: 'String' },
        setName: mockSetName,
        onChange: mockOnChange,
      };

      render(
        <TestWrapper>
          <WorkflowparameterField {...props} />
        </TestWrapper>
      );

      const valueInput = screen.getByDisplayValue('initial');
      fireEvent.change(valueInput, { target: { value: 'updated string value' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        id: 'string-id',
        newDefinition: expect.objectContaining({
          id: 'string-id',
          name: 'stringParam',
          type: 'String',
          value: 'updated string value',
        }),
        useLegacy: undefined,
      });
    });

    it('should call onChange when type changes', () => {
      const props: WorkflowparameterFieldProps = {
        isEditable: true,
        name: 'testParam',
        definition: { id: 'test-id', value: 'test-value', name: 'testParam', type: 'String' },
        setName: mockSetName,
        onChange: mockOnChange,
      };

      render(
        <TestWrapper>
          <WorkflowparameterField {...props} />
        </TestWrapper>
      );

      // Find and click the type dropdown
      const typeDropdown = screen.getByRole('combobox');
      fireEvent.click(typeDropdown);

      // Select Boolean option
      const boolOption = screen.getByText('Boolean');
      fireEvent.click(boolOption);

      expect(mockOnChange).toHaveBeenCalledWith({
        id: 'test-id',
        newDefinition: expect.objectContaining({
          type: 'Bool',
        }),
        useLegacy: undefined,
      });
    });
  });

  describe('Boolean Parameter Specific Tests', () => {
    it('should handle boolean value "true" correctly', () => {
      const props: WorkflowparameterFieldProps = {
        isEditable: true,
        name: 'boolParam',
        definition: { id: 'bool-id', value: 'true', name: 'boolParam', type: 'Bool' },
        setName: mockSetName,
        onChange: mockOnChange,
      };

      render(
        <TestWrapper>
          <WorkflowparameterField {...props} />
        </TestWrapper>
      );

      const valueInput = screen.getByDisplayValue('true');
      expect(valueInput).toBeInTheDocument();
      expect(valueInput.tagName).toBe('INPUT');
    });

    it('should handle boolean value "false" correctly', () => {
      const props: WorkflowparameterFieldProps = {
        isEditable: true,
        name: 'boolParam',
        definition: { id: 'bool-id', value: 'false', name: 'boolParam', type: 'Bool' },
        setName: mockSetName,
        onChange: mockOnChange,
      };

      render(
        <TestWrapper>
          <WorkflowparameterField {...props} />
        </TestWrapper>
      );

      const valueInput = screen.getByDisplayValue('false');
      expect(valueInput).toBeInTheDocument();
    });

    it('should handle custom boolean values (app settings)', () => {
      const props: WorkflowparameterFieldProps = {
        isEditable: true,
        name: 'boolParam',
        definition: { id: 'bool-id', value: '@appsetting("MyBoolSetting")', name: 'boolParam', type: 'Bool' },
        setName: mockSetName,
        onChange: mockOnChange,
      };

      render(
        <TestWrapper>
          <WorkflowparameterField {...props} />
        </TestWrapper>
      );

      const valueInput = screen.getByDisplayValue('@appsetting("MyBoolSetting")');
      expect(valueInput).toBeInTheDocument();
      expect(valueInput.tagName).toBe('INPUT');
    });
  });

  describe('Legacy Mode', () => {
    it('should render default value field in legacy mode', () => {
      const props: WorkflowparameterFieldProps = {
        isEditable: true,
        name: 'testParam',
        definition: {
          id: 'test-id',
          value: 'test-value',
          name: 'testParam',
          type: 'String',
          defaultValue: 'default-value',
        },
        setName: mockSetName,
        onChange: mockOnChange,
        useLegacy: true,
      };

      render(
        <TestWrapper>
          <WorkflowparameterField {...props} />
        </TestWrapper>
      );

      expect(screen.getByDisplayValue('default-value')).toBeInTheDocument();
    });

    it('should render actual value field as disabled in legacy mode', () => {
      const props: WorkflowparameterFieldProps = {
        isEditable: true,
        name: 'testParam',
        definition: {
          id: 'test-id',
          value: 'test-value',
          name: 'testParam',
          type: 'String',
          defaultValue: 'default-value',
        },
        setName: mockSetName,
        onChange: mockOnChange,
        useLegacy: true,
      };

      render(
        <TestWrapper>
          <WorkflowparameterField {...props} />
        </TestWrapper>
      );

      const actualValueInput = screen.getByDisplayValue('test-value');
      expect(actualValueInput).toBeDisabled();
    });
  });

  describe('Read-only Mode', () => {
    it('should disable all inputs when isReadOnly is true', () => {
      const props: WorkflowparameterFieldProps = {
        isEditable: true,
        isReadOnly: true,
        name: 'testParam',
        definition: { id: 'test-id', value: 'test-value', name: 'testParam', type: 'String' },
        setName: mockSetName,
        onChange: mockOnChange,
      };

      render(
        <TestWrapper>
          <WorkflowparameterField {...props} />
        </TestWrapper>
      );

      const nameInput = screen.getByDisplayValue('testParam');
      const valueInput = screen.getByDisplayValue('test-value');

      expect(nameInput).toBeDisabled();
      expect(valueInput).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display validation errors', () => {
      const props: WorkflowparameterFieldProps = {
        isEditable: true,
        name: 'testParam',
        definition: { id: 'test-id', value: 'test-value', name: 'testParam', type: 'String' },
        setName: mockSetName,
        onChange: mockOnChange,
        validationErrors: {
          name: 'Name is required',
          value: 'Value is invalid',
        },
      };

      render(
        <TestWrapper>
          <WorkflowparameterField {...props} />
        </TestWrapper>
      );

      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Value is invalid')).toBeInTheDocument();
    });
  });

  describe('Secure Parameters', () => {
    it('should show warning for secure string with default value', () => {
      const props: WorkflowparameterFieldProps = {
        isEditable: true,
        name: 'secureParam',
        definition: {
          id: 'secure-id',
          value: 'secure-value',
          name: 'secureParam',
          type: 'securestring',
          defaultValue: 'default-secure-value',
        },
        setName: mockSetName,
        onChange: mockOnChange,
        useLegacy: true,
      };

      render(
        <TestWrapper>
          <WorkflowparameterField {...props} />
        </TestWrapper>
      );

      // Should show warning about default value for secure parameter
      expect(screen.getByText(/It is not recommended to set a default value/)).toBeInTheDocument();
    });
  });
});
