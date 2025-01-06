import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteNodeModal, DeleteNodeModalProps } from '../DeleteNodeModal';
import { describe, it, expect, vi } from 'vitest';
import { IntlProvider } from 'react-intl';

const renderComponent = (props: Partial<DeleteNodeModalProps> = {}) => {
  const defaultProps: DeleteNodeModalProps = {
    nodeId: '1',
    nodeName: 'Test Node',
    isOpen: true,
    onDismiss: vi.fn(),
    onConfirm: vi.fn(),
  };

  return render(
    <IntlProvider locale="en">
      <DeleteNodeModal {...defaultProps} {...props} />
    </IntlProvider>
  );
};

describe('DeleteNodeModal', () => {
  it('should render the modal with correct title and body', () => {
    renderComponent({ nodeType: 'OPERATION_NODE' });

    expect(screen.findByText('Delete workflow action')).toBeDefined();
    expect(screen.findByText('Are you sure you want to delete')).toBeDefined();
    expect(screen.findByText('This step will be removed from the Logic App.')).toBeDefined();
  });

  it('should call onConfirm when OK button is clicked', () => {
    const onConfirm = vi.fn();
    renderComponent({ onConfirm });

    fireEvent.click(screen.getByText('OK'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('should call onDismiss when Cancel button is clicked', () => {
    const onDismiss = vi.fn();
    renderComponent({ onDismiss });

    fireEvent.click(screen.getByText('Cancel'));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('should display spinner when nodeId is not provided', () => {
    renderComponent({ nodeId: '' });

    expect(screen.findByText('Deleting...')).toBeDefined();
  });

  it('should render correct title for graph node', () => {
    renderComponent({ nodeType: 'GRAPH_NODE' });

    expect(screen.findByText('Delete workflow graph')).toBeDefined();
  });

  it('should render correct title for switch case node', () => {
    renderComponent({ nodeType: 'SUBGRAPH_NODE' });
    expect(screen.findByText('Delete switch case')).toBeDefined();
  });

  it('should render correct title for other node types', () => {
    renderComponent({ nodeType: 'PLACEHOLDER_NODE' });

    expect(screen.findByText('Node')).toBeDefined();
  });
});

describe('DeleteNodeModal Snapshots', () => {
  it('should match snapshot for operation node', () => {
    const deleteNodeModal = renderComponent({ nodeType: 'OPERATION_NODE' });
    expect(deleteNodeModal).toMatchSnapshot();
  });

  it('should match snapshot for graph node', () => {
    const deleteNodeModal = renderComponent({ nodeType: 'GRAPH_NODE' });
    expect(deleteNodeModal).toMatchSnapshot();
  });

  it('should match snapshot for switch case node', () => {
    const deleteNodeModal = renderComponent({ nodeType: 'SUBGRAPH_NODE' });
    expect(deleteNodeModal).toMatchSnapshot();
  });

  it('should match snapshot for other node types', () => {
    const deleteNodeModal = renderComponent({ nodeType: 'PLACEHOLDER_NODE' });
    expect(deleteNodeModal).toMatchSnapshot();
  });

  it('should match snapshot when nodeId is not provided', () => {
    const deleteNodeModal = renderComponent({ nodeId: '' });
    expect(deleteNodeModal).toMatchSnapshot();
  });
});
