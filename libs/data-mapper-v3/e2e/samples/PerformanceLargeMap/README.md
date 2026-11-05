# Large map profiling sample

Generate the sample from the repository root:

```powershell
pnpm --dir libs/data-mapper-v3 run generate:profile-map
```

Then open `PerformanceLargeMap.btm` with the Logic App Data Mapper custom editor.

The default sample contains:

- 50 expanded groups and 1,000 leaf nodes in each schema
- 250 functoids
- 1,250 links

Use larger or smaller values when needed:

```powershell
pnpm --dir libs/data-mapper-v3 run generate:profile-map -- --groups=100 --fields=25 --functoids=500
```

Profile initial rendering, schema and canvas scrolling, functoid dragging, link selection, and group expansion/collapse with the VS Code webview developer tools.
