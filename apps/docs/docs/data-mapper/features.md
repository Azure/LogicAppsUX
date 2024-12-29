# Features

## Error Panel
Checks run by MapCheckerPanel
- Component MapCheckerPanel updates and runs map checks using the connections and schema
    - These are not currently stored in Redux, but could be if we allow users to dismiss warnings in the future
- Currently we type check for target schema nodes, but not functions until we get data from the backend
- Check for missing required inputs on target nodes
Deserialization Warnings
- We generate warnings during deserialization if we are unable to find nodes or functions
- These warnings are stored in Redux
