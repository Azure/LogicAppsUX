/* global module */

function formatErrorForDiagnostics(error) {
  if (error && typeof error === 'object' && typeof error.stack === 'string' && error.stack.trim()) {
    return error.stack.trim();
  }
  try {
    return String(error);
  } catch {
    return '<unprintable thrown value>';
  }
}

module.exports = {
  formatErrorForDiagnostics,
};
