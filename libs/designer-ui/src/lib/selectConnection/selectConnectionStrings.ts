export default {
  // There were a lot of strings / arias, so I pulled them out to this file to keep the index cleaner

  // Column Headings
  COLUMN_INVALID: {
    id: 'column_invalid',
    defaultMessage: 'Invalid',
    description: 'Column header for invalid connections',
  },
  COLUMN_DISPLAY_NAME: {
    id: 'column_display_name',
    defaultMessage: 'Display Name',
    description: 'Column header for connection display name',
  },
  COLUMN_NAME: {
    id: 'column_name',
    defaultMessage: 'Name',
    description: 'Column header for connection name',
  },
  COLUMN_GATEWAY: {
    id: 'column_gateway',
    defaultMessage: 'Gateway',
    description: 'Column header for connection gateway',
  },

  // Column Arias
  COLUMN_INVALID_ARIA: {
    id: 'column_invalid_aria',
    defaultMessage: 'Is connection invalid',
    description: 'aria label description for invalid connections',
  },
  COLUMN_DISPLAY_NAME_ARIA: {
    id: 'column_display_name_aria',
    defaultMessage: 'Display Name of the connection',
    description: 'aria label description for connection display name',
  },
  COLUMN_NAME_ARIA: {
    id: 'column_name_aria',
    defaultMessage: 'Name of the connection',
    description: 'aria label description for connection name',
  },
  COLUMN_GATEWAY_ARIA: {
    id: 'column_gateway_aria',
    defaultMessage: 'Gateway of the connection',
    description: 'aria label description for connection gateway',
  },

  // Other
  IDENTITY_ERROR: {
    id: 'identity_error',
    defaultMessage: 'Invalid connection.',
    description: 'Message shown when the current connection is invalid',
  },
  COMPONENT_DESCRIPTION: {
    id: 'component_description',
    defaultMessage: 'Select an existing connection or create a new one.',
    description: 'Select an existing connection or create a new one.',
  },
  CHECK_BUTTON_ARIA: {
    id: 'check_button_aria',
    defaultMessage: 'Check to select this connection',
    description: 'aria label description for check button',
  },

  // Action Buttons
  BUTTON_ADD: {
    id: 'button_add',
    defaultMessage: 'Add new',
    description: 'Button to add a new connection',
  },
  BUTTON_SAVE: {
    id: 'button_save',
    defaultMessage: 'Save',
    description: 'Button to save a connection',
  },
  BUTTON_CANCEL: {
    id: 'button_cancel',
    defaultMessage: 'Cancel',
    description: 'Button to cancel a connection',
  },

  // Action buttons aria labels
  BUTTON_ADD_ARIA: {
    id: 'button_add_aria',
    defaultMessage: 'Add a new connection',
    description: 'Aria label description for add button',
  },
  BUTTON_SAVE_ARIA: {
    id: 'button_save_aria',
    defaultMessage: 'Save the selected connection',
    description: 'Aria label description for save button',
  },
  BUTTON_CANCEL_ARIA: {
    id: 'button_cancel_aria',
    defaultMessage: 'Cancel the selection',
    description: 'Aria label description for cancel button',
  },
};
