# Standalone

## Local browser experience for development

#### Run

To run Data Mapper Standalone:

```bash
pnpm turbo run dev
```

same as you would to run designer

to access different versions
- V1- /datamapperv1
- V2- /datamapperv2

From here (localhost:4200 in your browser), you can either:

- Choose map definitions (which will auto-load its associated schemas)
- Choose schemas from the toolbox's dropdowns (which then loads schema data
  as what we would expect to receive from GET schemaTree)
- Make sure you've followed all the setup steps for the VS Code extension + backend
  at lease once, then navigate to the/a LA-workflow folder you created, and run
  `func host start` to get the backend runtime started. From here, you can then plug in
  any schemas you'd like to test with to your Artifacts/Schemas folder **so long as** they're
  named Source.xsd and Target.xsd (as these are the only filename options provided by the DM standalone)
