# Development service data

Search and run services no longer include development fixtures. Existing callers
using `isDev: true` must provide their own `devData` for fixture-backed methods:

- Search: `azureOperations` and `azureConnectors` for Azure search, and
  `builtInOperations` and `builtInConnectors` for Standard built-in search.
- Standard and Consumption run: `inputs` and `outputs` records keyed by node ID
  for `getActionLinks`.

Only fields used by the caller are required. A fixture-backed method rejects
when its data is missing; a missing node in the run records still returns empty
inputs and outputs. The Standalone local designers supply the existing fixture
data explicitly. Production callers do not need `devData`.
