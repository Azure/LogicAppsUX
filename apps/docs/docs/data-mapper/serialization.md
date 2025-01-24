
# Serialization

The process of converting the format used to represent the visual map canvas to LML that can be edited by the user and processed by the backend

### GenerateMapDefinitionBody
- filters connections for the ones that end in a target node
- loops through these in random order and 
    - generates key-value pair array for this connection by calling createNewPathItems; this is every pair in the LML from root to final target item
    - calls applyValueAtPath for this array of pairs to insert it into the new LML, traversing down to where the pair belongs

### createNewPathItems

### applyValueAtPath
- goes from the target connection passed, and using 'pathToRoot', adding all loops and conditionals to the path
