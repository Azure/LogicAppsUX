# Logic Apps Designer
## [2.124.0](https://github.com/Azure/LogicAppsUX/compare/v2.123.0...v2.124.0) (2024-03-07)

## [2.123.0](https://github.com/Azure/LogicAppsUX/compare/v2.122.0...v2.123.0) (2024-03-06)


### Features

* **designer:** Add verbose telemetry for a number of scenarios ([#4307](https://github.com/Azure/LogicAppsUX/issues/4307)) ([4c93053](https://github.com/Azure/LogicAppsUX/commit/4c9305382f915e07de7cb609a3b5817e99be0ace))
* **designer:** Allow host to define conditions for built-in and custom connectors ([#4299](https://github.com/Azure/LogicAppsUX/issues/4299)) ([d6f81de](https://github.com/Azure/LogicAppsUX/commit/d6f81deeae7c667e31ffb8f80fad677b29a4544e))
* **vscode:**  Improve status step indicator for export experience ([#4305](https://github.com/Azure/LogicAppsUX/issues/4305)) ([19473ee](https://github.com/Azure/LogicAppsUX/commit/19473ee32c84f161b0914a24600d0942c19814ea))


### Bug Fixes

* **consumption:** Adding 'Invalid Parameter' message to Subgraph nodes ([#4314](https://github.com/Azure/LogicAppsUX/issues/4314)) ([97e26d7](https://github.com/Azure/LogicAppsUX/commit/97e26d7c2c4efebc7243eca69803ffcfee9652fe))
* **designer:** Fix linter errors happening on PRs from library consolodation ([#4315](https://github.com/Azure/LogicAppsUX/issues/4315)) ([96e0fff](https://github.com/Azure/LogicAppsUX/commit/96e0fff70a04b5a0797c571951685b259bf09c1d))

## [2.122.0](https://github.com/Azure/LogicAppsUX/compare/v2.121.0...v2.122.0) (2024-03-01)


### Features

* **designer:** Adding hidden parameter field in ConnectionCreationIn… ([#4275](https://github.com/Azure/LogicAppsUX/issues/4275)) ([49b2c9c](https://github.com/Azure/LogicAppsUX/commit/49b2c9c0098a97e8832d3f0b682c47c7b7d7c025))
* **vscode:** Download extension bundle in extension activation instead of project initialization ([#4287](https://github.com/Azure/LogicAppsUX/issues/4287)) ([a663771](https://github.com/Azure/LogicAppsUX/commit/a6637712e9b46eb87f24bcfae44ea1237abc9899))


### Bug Fixes

* **Consumption:** Adding node name to props to account for change ([#4286](https://github.com/Azure/LogicAppsUX/issues/4286)) ([e61a878](https://github.com/Azure/LogicAppsUX/commit/e61a8788070cdf5bc64e8622a3a10cdd49195688))
* **Designer:** Fixed issue where connection references would sometimes overlap ([#4290](https://github.com/Azure/LogicAppsUX/issues/4290)) ([01e8768](https://github.com/Azure/LogicAppsUX/commit/01e876871cdf421ee3c9653d66107b8cc35e089e))
* **designer:** Revert - Update to make connections name case-insensitive ([#4283](https://github.com/Azure/LogicAppsUX/issues/4283)) ([7fc19f7](https://github.com/Azure/LogicAppsUX/commit/7fc19f72329c00decf1064a112a9f40626a7cbc3)), closes [#4279](https://github.com/Azure/LogicAppsUX/issues/4279)

## [2.121.0](https://github.com/Azure/LogicAppsUX/compare/v2.120.0...v2.121.0) (2024-02-29)


### Features

* **designer:** Expose receiver URI on AS2 encode output ([#4247](https://github.com/Azure/LogicAppsUX/issues/4247)) ([495973f](https://github.com/Azure/LogicAppsUX/commit/495973f72c200b8fd08638a189108c013c7b0daf))
* **Designer:** Hybrid preload / active search ([#4233](https://github.com/Azure/LogicAppsUX/issues/4233)) ([94b168f](https://github.com/Azure/LogicAppsUX/commit/94b168f66bfee831b1778082418ef48957d37cfe))
* **designer:** moved intl ([#4245](https://github.com/Azure/LogicAppsUX/issues/4245)) ([d343bb9](https://github.com/Azure/LogicAppsUX/commit/d343bb96e11fcb2ac49060a6b5cdc2b90f07fa94))


### Bug Fixes

* **Designer:** Fixed connection reference bug for MI connections ([#4262](https://github.com/Azure/LogicAppsUX/issues/4262)) ([eefe252](https://github.com/Azure/LogicAppsUX/commit/eefe25226a2c6da6753e316cc2e7d71f3689503b))
* **Designer:** fixed some scripts related to moving libs ([#4268](https://github.com/Azure/LogicAppsUX/issues/4268)) ([48c61bf](https://github.com/Azure/LogicAppsUX/commit/48c61bfd93f54c8d2e8735d5788aec84672a0846))
* **designer:** Revert - Adding hidden parameter field in ConnectionCreationInfo to pass selected credential id ([#4193](https://github.com/Azure/LogicAppsUX/issues/4193)) ([#4265](https://github.com/Azure/LogicAppsUX/issues/4265)) ([2d57d57](https://github.com/Azure/LogicAppsUX/commit/2d57d57ac35e11e2554e5b34a1723873f1907d81))
* **designer:** Update to make connections name case-insensitive ([#4279](https://github.com/Azure/LogicAppsUX/issues/4279)) ([498fef9](https://github.com/Azure/LogicAppsUX/commit/498fef92d9d7c8e7abddf7c6b4c4af93bf92ce15))
* **vscode:** Add conditional clause for already initialized projects ([#4280](https://github.com/Azure/LogicAppsUX/issues/4280)) ([b464f64](https://github.com/Azure/LogicAppsUX/commit/b464f6486c6085e21b14f781a7ff69da9c0351dc))
* **vscode:** Add padding to overview page ([#4253](https://github.com/Azure/LogicAppsUX/issues/4253)) ([5105754](https://github.com/Azure/LogicAppsUX/commit/51057543e423563cf1a1b63fd97ae02716dd7771))
* **vscode:** Fix useEffect on workflows success data - export tool ([#4249](https://github.com/Azure/LogicAppsUX/issues/4249)) ([75bed99](https://github.com/Azure/LogicAppsUX/commit/75bed9978e73d0b8aa59d266732a97c17318fab7))
* **vscode:** Initialize vscode project correctly when project is created outside of vscode ([#4267](https://github.com/Azure/LogicAppsUX/issues/4267)) ([2a3ee91](https://github.com/Azure/LogicAppsUX/commit/2a3ee9159463ed14c5c8a87cb9d991ad52c08a4c))

## [2.120.0](https://github.com/Azure/LogicAppsUX/compare/v2.119.0...v2.120.0) (2024-02-22)

### Features

- **Designer:** moved utils into new library ([#4236](https://github.com/Azure/LogicAppsUX/issues/4236)) ([9c8c883](https://github.com/Azure/LogicAppsUX/commit/9c8c883fd6b8310cb18e231822f6cd50463e8651))
- **Designer:** Moving first lib into shared folder ([#4229](https://github.com/Azure/LogicAppsUX/issues/4229)) ([671689d](https://github.com/Azure/LogicAppsUX/commit/671689d22bf2cf686762d64d280b9f27200e681f))

### Bug Fixes

- **consumption:** Changing until timeout default based on Stateful vs Stateless ([#4235](https://github.com/Azure/LogicAppsUX/issues/4235)) ([c1e26ec](https://github.com/Azure/LogicAppsUX/commit/c1e26ecd26719cce6052a8c7d7817c55f38da194))

## [2.119.0](https://github.com/Azure/LogicAppsUX/compare/v2.118.0...v2.119.0) (2024-02-21)

### Bug Fixes

- **designer:** Parameter default value from manifest should be honored at load time ([#4204](https://github.com/Azure/LogicAppsUX/issues/4204)) ([50e0d92](https://github.com/Azure/LogicAppsUX/commit/50e0d92a621022555672f528efe18da7367205f1))
- **desinger:** made utfLength Expressions optional based on host options ([#4231](https://github.com/Azure/LogicAppsUX/issues/4231)) ([136a81d](https://github.com/Azure/LogicAppsUX/commit/136a81d1f8eb577275d8a836b5b6fe74f00efe69))

## [2.118.0](https://github.com/Azure/LogicAppsUX/compare/v2.117.0...v2.118.0) (2024-02-21)

## [2.117.0](https://github.com/Azure/LogicAppsUX/compare/v2.116.0...v2.117.0) (2024-02-21)

### Bug Fixes

- **designer:** Replace missing state reassignment ([#4228](https://github.com/Azure/LogicAppsUX/issues/4228)) ([1b03f5f](https://github.com/Azure/LogicAppsUX/commit/1b03f5f88f597211605c723487fa577a30a8132b)), closes [#4227](https://github.com/Azure/LogicAppsUX/issues/4227)

## [2.116.0](https://github.com/Azure/LogicAppsUX/compare/v2.115.0...v2.116.0) (2024-02-20)

### Features

- **designer:** [ConnectionCreation] Adding hidden parameter field in ConnectionCreationInfo to pass selected credential id ([#4193](https://github.com/Azure/LogicAppsUX/issues/4193)) ([2d43902](https://github.com/Azure/LogicAppsUX/commit/2d43902c95b9eeb9ec9536939309c3224431e8e9))

### Bug Fixes

- **designer-ui:** Retain tokens inserted into HTML editor if they contain `}` ([#4198](https://github.com/Azure/LogicAppsUX/issues/4198)) ([04caeae](https://github.com/Azure/LogicAppsUX/commit/04caeaefb70a68dd678c8ff52487cde9bc498110))
- **designer:** Fix issue in run history page where loops pager would only go to first error when clicking next failure ([#4216](https://github.com/Azure/LogicAppsUX/issues/4216)) ([94bcc06](https://github.com/Azure/LogicAppsUX/commit/94bcc06b171fa9c38bd629d8755ed4e23cd2e685))
- **designer:** Fix issue where some strings wouldn't be localized in azure portal and power automate ([#4213](https://github.com/Azure/LogicAppsUX/issues/4213)) ([620ba95](https://github.com/Azure/LogicAppsUX/commit/620ba953f0d45b3b1edc2a761de3f5f8e273c65a))
- **Designer:** Fixed Consumption split on issue ([#4206](https://github.com/Azure/LogicAppsUX/issues/4206)) ([547faaf](https://github.com/Azure/LogicAppsUX/commit/547faaf4978dda3630239a1435e8c211a2b4b411))
- **designer:** Have better validaiton for array values in parameters ([#4217](https://github.com/Azure/LogicAppsUX/issues/4217)) ([4ea8d9d](https://github.com/Azure/LogicAppsUX/commit/4ea8d9d57a6ceef1ca01f4bcf0746faf23158176))
- **designer:** Seperate values of degree of parallelism for triggers and actions ([#4224](https://github.com/Azure/LogicAppsUX/issues/4224)) ([b982008](https://github.com/Azure/LogicAppsUX/commit/b98200870d9c5eb85687da6c8c6e5caedad99d29))
- **designer:** Update Existing Input Parameters For Subsequent Actions Once Dynamic Data is Fetched ([#4215](https://github.com/Azure/LogicAppsUX/issues/4215)) ([f02d814](https://github.com/Azure/LogicAppsUX/commit/f02d81499b0374831573deecf324e13f66203c66))
- **vscode:** Fix total overwriting of host and local settings JSON files ([#4205](https://github.com/Azure/LogicAppsUX/issues/4205)) ([360405e](https://github.com/Azure/LogicAppsUX/commit/360405e3d2240db3c3ff968775e0ef77537ae658))
- **vscode:** Remove double onboarding binaries validation ([#4203](https://github.com/Azure/LogicAppsUX/issues/4203)) ([15e0ea8](https://github.com/Azure/LogicAppsUX/commit/15e0ea8fd991da4fee15ba0c8ac313ccaac8d4e4))

## [2.115.0](https://github.com/Azure/LogicAppsUX/compare/v2.114.0...v2.115.0) (2024-02-15)

## [2.114.0](https://github.com/Azure/LogicAppsUX/compare/v2.113.0...v2.114.0) (2024-02-14)

### Features

- **designer-ui:** Enable `PastePlugin` for HTML editor ([#4188](https://github.com/Azure/LogicAppsUX/issues/4188)) ([76c9549](https://github.com/Azure/LogicAppsUX/commit/76c9549c27590daad177373396c1352844a6da70))
- **designer:** Add Resubmit from action to the action panel for easier visibility ([#4182](https://github.com/Azure/LogicAppsUX/issues/4182)) ([fd0a041](https://github.com/Azure/LogicAppsUX/commit/fd0a041693b70224321cd729dfa1539a64e79655))
- **designer:** Added Validation to Static Results ([#4197](https://github.com/Azure/LogicAppsUX/issues/4197)) ([537256b](https://github.com/Azure/LogicAppsUX/commit/537256be49b43d320e8ec6bd1ed0879a63638ba9))
- **vscode:** Add open in portal gesture for slots ([#4185](https://github.com/Azure/LogicAppsUX/issues/4185)) ([ca8ae91](https://github.com/Azure/LogicAppsUX/commit/ca8ae918f8924fef24766153db01f1e6b14db789))
- **vscode:** Binaries dependencies opt-in by default ([#4175](https://github.com/Azure/LogicAppsUX/issues/4175)) ([7501571](https://github.com/Azure/LogicAppsUX/commit/75015718e96767759c0fc256ba3cc056feb05a94))

### Bug Fixes

- **Consumption:** Changing error message for invalid expression due to double quotes. ([#4141](https://github.com/Azure/LogicAppsUX/issues/4141)) ([cddc9a2](https://github.com/Azure/LogicAppsUX/commit/cddc9a293284e68508f6c9bf78545b978d8bd0a7))
- **designer:** Fix two places where `undefined` switch `cases` caused fatal errors ([#4191](https://github.com/Azure/LogicAppsUX/issues/4191)) ([4031b05](https://github.com/Azure/LogicAppsUX/commit/4031b05dc274025b656c009bc6ea1835f0a1f17a))
- **Designer:** Floating Link Doesn't Disappear On Outer Click ([#4108](https://github.com/Azure/LogicAppsUX/issues/4108)) ([2481280](https://github.com/Azure/LogicAppsUX/commit/24812803ce5e61592e70380adb437865e2168df1))
- **Designer:** Keyboard Focus Moves Out of TokenPicker Navigating Using Keyboard ([#4160](https://github.com/Azure/LogicAppsUX/issues/4160)) ([609c4c5](https://github.com/Azure/LogicAppsUX/commit/609c4c5c1fa689db9e817fbe156b8daff9431343))
- **Designer:** Removed resolving app settings within connection parameters during initialization ([#4184](https://github.com/Azure/LogicAppsUX/issues/4184)) ([4ba6a0c](https://github.com/Azure/LogicAppsUX/commit/4ba6a0c76ef7ec8a3b37803b8b4fafbdb5e73b9f))
- **vscode:** Remove deploy slot action to only slot and not slots tree item ([#4181](https://github.com/Azure/LogicAppsUX/issues/4181)) ([1b86f03](https://github.com/Azure/LogicAppsUX/commit/1b86f0304420d0ab4cfe7274c0f0b75fba508257))

## [2.113.0](https://github.com/Azure/LogicAppsUX/compare/v2.112.0...v2.113.0) (2024-02-13)

### Bug Fixes

- **designer-ui:** Ensure "update connection" shows even if connection (name) is missing ([#4171](https://github.com/Azure/LogicAppsUX/issues/4171)) ([22677d9](https://github.com/Azure/LogicAppsUX/commit/22677d954d119f003cc59ba7ff8fd84fe7865ace))
- **Designer:** Fixed issue causing schema parameters to not appear as required ([#4176](https://github.com/Azure/LogicAppsUX/issues/4176)) ([4a84d56](https://github.com/Azure/LogicAppsUX/commit/4a84d56da5612e4e1c8bee2b04f4625503ad8eb6))
- **designer:** Make Info Bubbles in search accessible by keyboard nav… ([#4180](https://github.com/Azure/LogicAppsUX/issues/4180)) ([02c6d5a](https://github.com/Azure/LogicAppsUX/commit/02c6d5ae0c6a6f0b8d4a3ce02ee0bd556da6d959))
- **Designer:** Operation parameters are now sorted by their dependent parameters ([#4159](https://github.com/Azure/LogicAppsUX/issues/4159)) ([ea22f54](https://github.com/Azure/LogicAppsUX/commit/ea22f54308d473f0104f3c8b088b5e9071c1da1a))
- **designer:** Removed new OpenAPI token behavior added in [#4122](https://github.com/Azure/LogicAppsUX/issues/4122) ([#4158](https://github.com/Azure/LogicAppsUX/issues/4158)) ([c72e9e9](https://github.com/Azure/LogicAppsUX/commit/c72e9e9e4214eb67a11544cc00c4eb5af045f34d))
- **Designer:** Update serialization handling for the dictionary editor with tokens ([#4124](https://github.com/Azure/LogicAppsUX/issues/4124)) ([60fe43a](https://github.com/Azure/LogicAppsUX/commit/60fe43ab3863bdc87df5d429ebec5425850e67f0))
- **vscode:** Add validation for no connections ([#4155](https://github.com/Azure/LogicAppsUX/issues/4155)) ([5692086](https://github.com/Azure/LogicAppsUX/commit/56920868cfd4137240c802ea12cada3c57f8f80d))
- **vscode:** Enable create/deploy slot commands ([#4172](https://github.com/Azure/LogicAppsUX/issues/4172)) ([6b20972](https://github.com/Azure/LogicAppsUX/commit/6b20972416c2d434a7aa2b07d7d3db389b81bb98)), closes [#4128](https://github.com/Azure/LogicAppsUX/issues/4128)
- **vscode:** Export experience code and UI improvements ([#4168](https://github.com/Azure/LogicAppsUX/issues/4168)) ([7e3547e](https://github.com/Azure/LogicAppsUX/commit/7e3547e44ba4eedf9aa2ea5a85b63fe45b5f8a2c))

## [2.112.0](https://github.com/Azure/LogicAppsUX/compare/v2.111.0...v2.112.0) (2024-02-08)

### Features

- **vscode:** Remove preview flags for onboarding experience ([#4147](https://github.com/Azure/LogicAppsUX/issues/4147)) ([1009c24](https://github.com/Azure/LogicAppsUX/commit/1009c24228d1f7103d764a9535e645b154c4a364))

### Bug Fixes

- **Designer:** Action card tooltip now read with screen reader ([#4138](https://github.com/Azure/LogicAppsUX/issues/4138)) ([b93b002](https://github.com/Azure/LogicAppsUX/commit/b93b00299b8cf5dea2146becfdd441631e933cbf))
- **designer:** Allowing nodes to share names with built-in Object prototype functions ([#4140](https://github.com/Azure/LogicAppsUX/issues/4140)) ([bea0c7c](https://github.com/Azure/LogicAppsUX/commit/bea0c7cd826e4f2de24b721d711e770e6d078a9a))
- **designer:** fix spliton token references for newly added triggers ([#4148](https://github.com/Azure/LogicAppsUX/issues/4148)) ([210b78c](https://github.com/Azure/LogicAppsUX/commit/210b78c8569f8db1e7e6e86545cea75a19370e84))
- **designer:** Fix the token merge for FAM and entity outputs for hybrid triggers ([#4144](https://github.com/Azure/LogicAppsUX/issues/4144)) ([763c56b](https://github.com/Azure/LogicAppsUX/commit/763c56b93e9a1c418c18c19ae3a1b9a8319e4513))
- **designer:** Prevent Key Stroke propagation in Lexical ([#4145](https://github.com/Azure/LogicAppsUX/issues/4145)) ([6b2064c](https://github.com/Azure/LogicAppsUX/commit/6b2064cbf43b9ca8578a3904efbd6db4d32acf31))

## [2.111.0](https://github.com/Azure/LogicAppsUX/compare/v2.110.0...v2.111.0) (2024-02-06)

### Bug Fixes

- **Designer:** Focus returns to search button after closing side panel ([#4126](https://github.com/Azure/LogicAppsUX/issues/4126)) ([95aaccf](https://github.com/Azure/LogicAppsUX/commit/95aaccfa05060a1a5660f5bf497e7df2e3055b0f))
- **designer:** OpenAPI tokens from SharePoint trigger use `triggerOutputs` instead of `triggerBody` ([#4122](https://github.com/Azure/LogicAppsUX/issues/4122)) ([1b54d75](https://github.com/Azure/LogicAppsUX/commit/1b54d752344ca2a1a28d52e71a6ca5c4ba4140b7))
- **vscode:** Parse interpolated connections data as JSON ([#4135](https://github.com/Azure/LogicAppsUX/issues/4135)) ([c855aee](https://github.com/Azure/LogicAppsUX/commit/c855aee8c9a657f01e43e3e34d349dd857f0f7b7))

## [2.110.0](https://github.com/Azure/LogicAppsUX/compare/v2.109.0...v2.110.0) (2024-02-05)

### Features

- **vscode:** Add Integration account source and export custom API actions to export advance options ([#4097](https://github.com/Azure/LogicAppsUX/issues/4097)) ([6559428](https://github.com/Azure/LogicAppsUX/commit/655942836f8317af5ba321a9774346ebdf07841a))

### Bug Fixes

- **comsumption:** Setting Default Recurrence Interval based on Sku ([#4066](https://github.com/Azure/LogicAppsUX/issues/4066)) ([160d636](https://github.com/Azure/LogicAppsUX/commit/160d636c4b4e53935963363cfe55f9a5e8a23d02))
- **designer-ui:** Ensure `isAdvanced: false` tokens are shown if far down in a list ([#4064](https://github.com/Azure/LogicAppsUX/issues/4064)) ([89ddb0b](https://github.com/Azure/LogicAppsUX/commit/89ddb0b3721c6f62ba6f4487aa742667027b3035))
- **Designer:** added aria-labelledby for searchable dropdown ([#4090](https://github.com/Azure/LogicAppsUX/issues/4090)) ([213b5f0](https://github.com/Azure/LogicAppsUX/commit/213b5f0e0e3cbe326e608f8f52767eff7e45ff04))
- **Designer:** Added catch for designer options race condition ([#4106](https://github.com/Azure/LogicAppsUX/issues/4106)) ([3373c32](https://github.com/Azure/LogicAppsUX/commit/3373c32490f5b6d508f90717e8ba2a75e44f8b98))
- **Designer:** Added connection name check to avoid known connection name strings ([#4104](https://github.com/Azure/LogicAppsUX/issues/4104)) ([3fc73e5](https://github.com/Azure/LogicAppsUX/commit/3fc73e57344b41b0eafd8cef8fc3cfe45e3aacb0))
- **Designer:** Added host option to force enable split-on ([#4098](https://github.com/Azure/LogicAppsUX/issues/4098)) ([54c133b](https://github.com/Azure/LogicAppsUX/commit/54c133bc02fbfbd9fa50fd832de86e04c106ab6e))
- **Designer:** Changed test connection request to not run through batch api ([#4103](https://github.com/Azure/LogicAppsUX/issues/4103)) ([d342027](https://github.com/Azure/LogicAppsUX/commit/d342027e5462e8b1a034ed1adff35c6bf359b6d6))
- **designer:** Fix issue where when token in htmleditor, link plugin not working ([#4099](https://github.com/Azure/LogicAppsUX/issues/4099)) ([6773fae](https://github.com/Azure/LogicAppsUX/commit/6773fae16065c26a200ebfa6cb39f05c5f7cf827))
- **designer:** Fix stateless workflow check in `getSplitOn` ([#4121](https://github.com/Azure/LogicAppsUX/issues/4121)) ([b0d825d](https://github.com/Azure/LogicAppsUX/commit/b0d825df24f84bf5a79a4c25b65161f479b816d7))
- **Designer:** Initializing invoker settings causes workflow to be dirty ([#4079](https://github.com/Azure/LogicAppsUX/issues/4079)) ([55109df](https://github.com/Azure/LogicAppsUX/commit/55109df6b36bfa2980e418d41351b2f2290c2ef7))
- **Designer:** Skip non-dependent parameters in updateParameterAndDependencies ([#4112](https://github.com/Azure/LogicAppsUX/issues/4112)) ([c1cb6d3](https://github.com/Azure/LogicAppsUX/commit/c1cb6d38364abcea674af3f55e71abfb07be3f8f))
- **vscode:** Update json file creation to overwrite values in workflow-designtime folder ([#4096](https://github.com/Azure/LogicAppsUX/issues/4096)) ([659a521](https://github.com/Azure/LogicAppsUX/commit/659a5215de07e016e60fb02e87a222747408b8f0))

## [2.109.0](https://github.com/Azure/LogicAppsUX/compare/v2.108.0...v2.109.0) (2024-02-01)

### Features

- **designer:** Adding support for warnings and custom messages to ErrorsPanel ([#4053](https://github.com/Azure/LogicAppsUX/issues/4053)) ([6b07460](https://github.com/Azure/LogicAppsUX/commit/6b0746062fea3e1a4189c032b90ad68954d33c7a))

### Bug Fixes

- **Designer:** Accessibility fix announcing to screen reader search results ([#4082](https://github.com/Azure/LogicAppsUX/issues/4082)) ([06f46fb](https://github.com/Azure/LogicAppsUX/commit/06f46fb92c5249f737b26c10a03d27ac7da137a4))
- **Designer:** Split on is now disabled for stateless workflows ([#4081](https://github.com/Azure/LogicAppsUX/issues/4081)) ([6971bca](https://github.com/Azure/LogicAppsUX/commit/6971bca1de14e19de7033a9433c1eff439deb4eb))

## [2.108.0](https://github.com/Azure/LogicAppsUX/compare/v2.107.0...v2.108.0) (2024-01-26)

### Features

- **Designer:** Added Consumption run service ([#4072](https://github.com/Azure/LogicAppsUX/issues/4072)) ([4a4e2ee](https://github.com/Azure/LogicAppsUX/commit/4a4e2ee96a01e90ae749dbd4a73b03deca44a787))

### Bug Fixes

- **designer:** Accessibility Issues in Settings ([#4070](https://github.com/Azure/LogicAppsUX/issues/4070)) ([cad9330](https://github.com/Azure/LogicAppsUX/commit/cad93308535325f83dec8829247f3be8d39938b0))
- **designer:** Add focus border to search cards for keyboard nav ([#4060](https://github.com/Azure/LogicAppsUX/issues/4060)) ([7931315](https://github.com/Azure/LogicAppsUX/commit/7931315746537c8523a98419b41d9b148c84ff3b))
- **designer:** Fix tab order for cards ([#4059](https://github.com/Azure/LogicAppsUX/issues/4059)) ([8ed5787](https://github.com/Azure/LogicAppsUX/commit/8ed5787805876c20d846e907271daba9f468687e))
- **Designer:** Fixed APIM required parameter issue in Standard ([#4065](https://github.com/Azure/LogicAppsUX/issues/4065)) ([b69cdfc](https://github.com/Azure/LogicAppsUX/commit/b69cdfcd95ede1606aa1fe653bd8b51738a584a2))
- **Designer:** Multi-select showing as single-select ([#4071](https://github.com/Azure/LogicAppsUX/issues/4071)) ([678ebbf](https://github.com/Azure/LogicAppsUX/commit/678ebbfb47629bd75e50986d80c4853fd8d2ad8c))
- **Designer:** String Expression Uncasting to Literal On Initialization ([#4073](https://github.com/Azure/LogicAppsUX/issues/4073)) ([9b9f623](https://github.com/Azure/LogicAppsUX/commit/9b9f62338e96c51b1c7ef24e5e5f34d4387ca106))

## [2.107.0](https://github.com/Azure/LogicAppsUX/compare/v2.106.0...v2.107.0) (2024-01-25)

### Bug Fixes

- **designer:** Add proper aria labeling to the close panel button for action search ([#4055](https://github.com/Azure/LogicAppsUX/issues/4055)) ([197d0bb](https://github.com/Azure/LogicAppsUX/commit/197d0bb1eb2f8a796d645f95c4d6fbf67b1e0f03))
- **Designer:** Export styling for html editor to remediate Power Automate html editor rendering bugs ([#4058](https://github.com/Azure/LogicAppsUX/issues/4058)) ([d577657](https://github.com/Azure/LogicAppsUX/commit/d57765745886f82fc7df56612bcad8eb4b189e1d))
- **designer:** Prevent collapsed left panel from hiding minimap ([#4056](https://github.com/Azure/LogicAppsUX/issues/4056)) ([6a129be](https://github.com/Azure/LogicAppsUX/commit/6a129bec97c090cc417b1fda8036b48413ebb96f))
- **VSCode:** Validate foldername ([#4032](https://github.com/Azure/LogicAppsUX/issues/4032)) ([f4e23a8](https://github.com/Azure/LogicAppsUX/commit/f4e23a8950a3db0312c13b493aabe2c7b256a7e9))

## [2.106.0](https://github.com/Azure/LogicAppsUX/compare/v2.105.0...v2.106.0) (2024-01-24)

### Features

- **copilot:** Add Support for Additional Params URL ([#4029](https://github.com/Azure/LogicAppsUX/issues/4029)) ([480ebb5](https://github.com/Azure/LogicAppsUX/commit/480ebb5a85ca471672bfcc722f8bd39f2657898d))
- **Designer:** Added two xml operation ids ([#4052](https://github.com/Azure/LogicAppsUX/issues/4052)) ([3c90a54](https://github.com/Azure/LogicAppsUX/commit/3c90a54254a5d0081719c5e527aff7eca727658a))

### Bug Fixes

- **designer-ui:** Action icons with no connector display name have bad ARIA text ([#4030](https://github.com/Azure/LogicAppsUX/issues/4030)) ([be01950](https://github.com/Azure/LogicAppsUX/commit/be01950a185196c8776d36800d3a7336a926166c)), closes [#1](https://github.com/Azure/LogicAppsUX/issues/1)
- **Designer:** Multi select drop down is not showing options in new designer ([#4028](https://github.com/Azure/LogicAppsUX/issues/4028)) ([00e536a](https://github.com/Azure/LogicAppsUX/commit/00e536a476dcad56f8b9a29591b16e47c87f64fe))
- **designer:** Small UI issues with Settings ([#4036](https://github.com/Azure/LogicAppsUX/issues/4036)) ([9397974](https://github.com/Azure/LogicAppsUX/commit/9397974e5cbc736e78bee5146b831240bfa432aa))

## [2.105.0](https://github.com/Azure/LogicAppsUX/compare/v2.104.0...v2.105.0) (2024-01-23)

## [2.104.0](https://github.com/Azure/LogicAppsUX/compare/v2.103.0...v2.104.0) (2024-01-18)

### Features

- **Consumption:** Changing XML Transform Options to have Custom Option ([#4017](https://github.com/Azure/LogicAppsUX/issues/4017)) ([c7e9b25](https://github.com/Azure/LogicAppsUX/commit/c7e9b255e2ca00be38dd13f5031820831c36d30b))
- **designer-ui:** Render Callback URL for new Teams Webhook Trigger Kind ([#4008](https://github.com/Azure/LogicAppsUX/issues/4008)) ([411c716](https://github.com/Azure/LogicAppsUX/commit/411c716a60284d636d2a54a1b689515643848519))

### Bug Fixes

- **designer-ui:** Indicate Lexical support for `<a>` and `<u>` tags ([#4019](https://github.com/Azure/LogicAppsUX/issues/4019)) ([dd6e1b1](https://github.com/Azure/LogicAppsUX/commit/dd6e1b1fd2d28692d85717fb45cb746a1ffc2a6d))
- **designer:** Adding tokens outside of any HTML elements in raw HTML view causes a visual bug ([#4016](https://github.com/Azure/LogicAppsUX/issues/4016)) ([babb15f](https://github.com/Azure/LogicAppsUX/commit/babb15f3a48553817d332967c6c3d15146126311))
- **Designer:** fix missing property in create connection payload JSON ([#4012](https://github.com/Azure/LogicAppsUX/issues/4012)) ([0354f1c](https://github.com/Azure/LogicAppsUX/commit/0354f1c302b8ef0dfe1d743c6ec4db865e7535ac))
- **Designer:** Fixed dynamic data inputs/outputs error message propogation ([#4014](https://github.com/Azure/LogicAppsUX/issues/4014)) ([5d0367a](https://github.com/Azure/LogicAppsUX/commit/5d0367a3328000eaac5a6cea80079747f307a471))
- **Designer:** Fixed split-on data bug when adding new trigger ([#4027](https://github.com/Azure/LogicAppsUX/issues/4027)) ([1d94343](https://github.com/Azure/LogicAppsUX/commit/1d943438c26ce89a920999e6a7c2a48f70d0c91e))
- **Designer:** pass isLoading props to custom CredentialsMappingEditor component ([#4013](https://github.com/Azure/LogicAppsUX/issues/4013)) ([ea3fe79](https://github.com/Azure/LogicAppsUX/commit/ea3fe7917d25c970dbf202109ce04e67fbf21165))
- **designer:** Regression where array editor no longer serialized casted value ([#4007](https://github.com/Azure/LogicAppsUX/issues/4007)) ([982aec2](https://github.com/Azure/LogicAppsUX/commit/982aec29b280d02d266d52d11f636df55b391590))
- **designer:** Some cleanup of auth serialization ([#3957](https://github.com/Azure/LogicAppsUX/issues/3957)) ([80a0a80](https://github.com/Azure/LogicAppsUX/commit/80a0a80f552bc67f8dca1fd665c2c15a08c66a57))
- **designer:** Split On is off by default in V3 ([#4026](https://github.com/Azure/LogicAppsUX/issues/4026)) ([6b24461](https://github.com/Azure/LogicAppsUX/commit/6b2446197cb42b6e0d377d1c092e7b12bee9d6ce))
- **Designer:** wrong parameter key for CreateConnection with Credentials enabled ([#4005](https://github.com/Azure/LogicAppsUX/issues/4005)) ([fc4cf66](https://github.com/Azure/LogicAppsUX/commit/fc4cf663f05252a2b6181148a36f113bfc6c1742))

## [2.104.0](https://github.com/Azure/LogicAppsUX/compare/v2.103.0...v2.104.0) (2024-01-18)

### Features

- **Designer:** Search preload is now delayed until nodes are initialized ([#3981](https://github.com/Azure/LogicAppsUX/issues/3981)) ([090bc6b](https://github.com/Azure/LogicAppsUX/commit/090bc6b2792612450666348b2179e13547ab2b01))

### Bug Fixes

- **consumption:** Disabled Spec Validation for incoming Swagger ([#3970](https://github.com/Azure/LogicAppsUX/issues/3970)) ([7bf609c](https://github.com/Azure/LogicAppsUX/commit/7bf609c47d6bc1c49a909e2a85277f397e9e643b))
- **designer-ui:** Prevent designer freezing when `@{` is typed into HTML editor ([#3999](https://github.com/Azure/LogicAppsUX/issues/3999)) ([d31de07](https://github.com/Azure/LogicAppsUX/commit/d31de072509e0f1ff1724dc88c4e2c765eff8a2f))
- **designer-ui:** Prevent expression `<>`s from being parsed by DOM parser ([#4000](https://github.com/Azure/LogicAppsUX/issues/4000)) ([e025cc5](https://github.com/Azure/LogicAppsUX/commit/e025cc59a9db3367492929cbe87ccec11fc2b4b3))
- **designer-ui:** Prevent users from switching to WYSIWYG view if raw HTML is not supported ([#3982](https://github.com/Azure/LogicAppsUX/issues/3982)) ([550c4b6](https://github.com/Azure/LogicAppsUX/commit/550c4b69d50a84f797c30f28506d5bc4c04d1605))
- **Designer:** Added AS2(v2) and RosettaNet Consumption actions ([#3977](https://github.com/Azure/LogicAppsUX/issues/3977)) ([a0621fd](https://github.com/Azure/LogicAppsUX/commit/a0621fd0ead22745b542d4cabcce89125e76d235))
- **Designer:** Create connection button appearance to primary ([#3980](https://github.com/Azure/LogicAppsUX/issues/3980)) ([40087e0](https://github.com/Azure/LogicAppsUX/commit/40087e0f16bd8b11cb7faf7e0a0b3e307a08b4da))
- **Designer:** Fixed crash when adding switch case ([#3991](https://github.com/Azure/LogicAppsUX/issues/3991)) ([f9e2c85](https://github.com/Azure/LogicAppsUX/commit/f9e2c850f76e1b58202395fd9936168761a339a6))
- **Designer:** Optimized some Redux intialization ([#3998](https://github.com/Azure/LogicAppsUX/issues/3998)) ([1e79196](https://github.com/Azure/LogicAppsUX/commit/1e79196c9a72953514320861168b11526b7e8bb6))

## [2.103.0](https://github.com/Azure/LogicAppsUX/compare/v2.102.0...v2.103.0) (2024-01-11)

## [2.103.0](https://github.com/Azure/LogicAppsUX/compare/v2.102.0...v2.103.0) (2024-01-11)

### Features

- **designer:** Add support for User Assigned identities for ServiceProviders ([#3907](https://github.com/Azure/LogicAppsUX/issues/3907)) ([01be309](https://github.com/Azure/LogicAppsUX/commit/01be3097dac188ba29e250514acd64c65f2717ec))
- **vscode:** Microsoft.Azure.Functions.ExtensionBundle.Workflows download on project activate ([#3958](https://github.com/Azure/LogicAppsUX/issues/3958)) ([cccdd3d](https://github.com/Azure/LogicAppsUX/commit/cccdd3d4d4bc87f6055ebf20d4587c09fee78603))

### Bug Fixes

- **vscode:** Update fallback version of function core tools ([#3955](https://github.com/Azure/LogicAppsUX/issues/3955)) ([5b5d031](https://github.com/Azure/LogicAppsUX/commit/5b5d03188a69ef74a2ba1ba6ffc862c80abc31fa))

## [2.102.0](https://github.com/Azure/LogicAppsUX/compare/v2.101.0...v2.102.0) (2024-01-10)

### Bug Fixes

- **Designer:** IM team enhacements ([#3959](https://github.com/Azure/LogicAppsUX/issues/3959)) ([b224446](https://github.com/Azure/LogicAppsUX/commit/b2244463e0d8f6c4c2c23d07726bdd508ceb6d53))

## [2.101.0](https://github.com/Azure/LogicAppsUX/compare/v2.100.0...v2.101.0) (2024-01-09)

### Features

- **vscode:** Improve Azurite experience ([#3937](https://github.com/Azure/LogicAppsUX/issues/3937)) ([e9464d5](https://github.com/Azure/LogicAppsUX/commit/e9464d53c56aeff111ef3c75980a9a1775ba2d6a))

### Bug Fixes

- **Data Mapper:** added prefix to dm logging ([#3948](https://github.com/Azure/LogicAppsUX/issues/3948)) ([28bf949](https://github.com/Azure/LogicAppsUX/commit/28bf949d8ccc9ae32468e538a646b315af5241f2))
- **Designer:** Fixed APIM action schema parameter issues ([#3941](https://github.com/Azure/LogicAppsUX/issues/3941)) ([b131fe3](https://github.com/Azure/LogicAppsUX/commit/b131fe3cd7e3bf410474e49105e24fdeb40b5d8b))
- **Designer:** Fixed search issue in (stage) locations ([#3936](https://github.com/Azure/LogicAppsUX/issues/3936)) ([9bbf2bb](https://github.com/Azure/LogicAppsUX/commit/9bbf2bb966f3be9fcbe3fab8ae67719b3fba1e63))
- **Designer:** OAuth in Standalone ([#3942](https://github.com/Azure/LogicAppsUX/issues/3942)) ([763d2f1](https://github.com/Azure/LogicAppsUX/commit/763d2f183130f81fbd2edf169e68c9c4b05b3487))

## [2.100.0](https://github.com/Azure/LogicAppsUX/compare/v2.99.0...v2.100.0) (2024-01-04)

### Bug Fixes

- **Data Mapper:** Serialize and deserialize XSD to JSON arrays ([#3893](https://github.com/Azure/LogicAppsUX/issues/3893)) ([60ed813](https://github.com/Azure/LogicAppsUX/commit/60ed8139ef8ec9b9e22fb0aa2287d4a0794fcd04))
- **Designer:** Canvas node rerender optimization ([#3932](https://github.com/Azure/LogicAppsUX/issues/3932)) ([a18c4ed](https://github.com/Azure/LogicAppsUX/commit/a18c4ed100ab3f50e370db12c5040f3c2cdd272e))
- **Designer:** Re-added the scratch tab visibility check ([#3933](https://github.com/Azure/LogicAppsUX/issues/3933)) ([32cb45d](https://github.com/Azure/LogicAppsUX/commit/32cb45d42b974d9c48302f36624cde1c009503f1))
- **vscode:** Add set function core tools command right after installing an update ([#3930](https://github.com/Azure/LogicAppsUX/issues/3930)) ([a3458cc](https://github.com/Azure/LogicAppsUX/commit/a3458cce64fd197c6b6d5a2461a491e374faee42))

## [2.99.0](https://github.com/Azure/LogicAppsUX/compare/v2.98.0...v2.99.0) (2024-01-02)

### Bug Fixes

- **vscode:** Add validation for design-time folder ([#3910](https://github.com/Azure/LogicAppsUX/issues/3910)) ([0c48a29](https://github.com/Azure/LogicAppsUX/commit/0c48a297e39403351dc6cdc3aefe3e1735cff13c))

## [2.98.0](https://github.com/Azure/LogicAppsUX/compare/v2.97.0...v2.98.0) (2023-12-30)

## [2.97.0](https://github.com/Azure/LogicAppsUX/compare/v2.96.0...v2.97.0) (2023-12-28)

## [2.96.0](https://github.com/Azure/LogicAppsUX/compare/v2.95.0...v2.96.0) (2023-12-21)

### Features

- **designer:** add support prevent casting in complex array editors ([#3873](https://github.com/Azure/LogicAppsUX/issues/3873)) ([5d96b77](https://github.com/Azure/LogicAppsUX/commit/5d96b77055776a3eb4a7067559fa03626d16a8a5))
- **designer:** enable support prevent casting in complex array editors ([#3886](https://github.com/Azure/LogicAppsUX/issues/3886)) ([ff0af65](https://github.com/Azure/LogicAppsUX/commit/ff0af65796ae24d562674caf0b913206cc422313))

### Bug Fixes

- **designer:** Add description for Condition action ([#3865](https://github.com/Azure/LogicAppsUX/issues/3865)) ([aec1286](https://github.com/Azure/LogicAppsUX/commit/aec12861bcb485d293b75b3468b9be0deda39605))
- **designer:** Changes not serializing when token deleted without editor being focused ([#3882](https://github.com/Azure/LogicAppsUX/issues/3882)) ([9f73a3c](https://github.com/Azure/LogicAppsUX/commit/9f73a3c331571ce897d847f7e2ffda49de8f38ec))
- **Designer:** Converted many fluent8 components to fluent9 ([#3872](https://github.com/Azure/LogicAppsUX/issues/3872)) ([9d06a1e](https://github.com/Azure/LogicAppsUX/commit/9d06a1edff0445053ee09b6d7025871b5528b336))
- **designer:** Fix regressions moving token parsing from $[ ]$ to @{} ([#3881](https://github.com/Azure/LogicAppsUX/issues/3881)) ([e005c8d](https://github.com/Azure/LogicAppsUX/commit/e005c8d5116dcef3237a1948888d0dc200c0f98b))
- **designer:** Fixed issue where lexicalPlainText did not have proper keyboard navigation for token nodes ([#3854](https://github.com/Azure/LogicAppsUX/issues/3854)) ([6d91c38](https://github.com/Azure/LogicAppsUX/commit/6d91c38450e4da7cc6f2482a8633dee5788035e9))
- **designer:** Revert change "tokens with 'body/value' should use triggerBody rather than triggerOutput" ([#3875](https://github.com/Azure/LogicAppsUX/issues/3875)) ([a09c39a](https://github.com/Azure/LogicAppsUX/commit/a09c39a7687fba0ee57b6d734299542fcce04cf8)), closes [#3782](https://github.com/Azure/LogicAppsUX/issues/3782)
- **designer:** Update condition on when to render monitoring view ([#3892](https://github.com/Azure/LogicAppsUX/issues/3892)) ([29cd1f8](https://github.com/Azure/LogicAppsUX/commit/29cd1f8f43b3611e5e2054c1381b52f5c3de5138))
- **localization:** Adding Indonesian as a language to intl provider ([#3868](https://github.com/Azure/LogicAppsUX/issues/3868)) ([40bc6f8](https://github.com/Azure/LogicAppsUX/commit/40bc6f894e38e955ff19a8fd942e36a84d5fe0bd))
- **vscode:** Add validate input for function name in workspace creation ([#3874](https://github.com/Azure/LogicAppsUX/issues/3874)) ([7abb3bf](https://github.com/Azure/LogicAppsUX/commit/7abb3bf663b79202cda4991252bf9e48137aa4d2))
- **vscode:** Dependency timeout ([#3846](https://github.com/Azure/LogicAppsUX/issues/3846)) ([e87a557](https://github.com/Azure/LogicAppsUX/commit/e87a5574d9d7e77a42596a9615b37992e5fd9aba))
- **vscode:** Fix project path in workflow-designtime folder ([#3867](https://github.com/Azure/LogicAppsUX/issues/3867)) ([712c4ff](https://github.com/Azure/LogicAppsUX/commit/712c4ff609ac8ea39b1231712121060e8a2a71d1))

## [2.95.0](https://github.com/Azure/LogicAppsUX/compare/v2.94.0...v2.95.0) (2023-12-15)

### Features

- **designer-ui:** Support raw code view in HTML editor ([#3849](https://github.com/Azure/LogicAppsUX/issues/3849)) ([13a76cc](https://github.com/Azure/LogicAppsUX/commit/13a76cc1be46c98e91526e887834a4e90d9b34ed))

## [2.94.0](https://github.com/Azure/LogicAppsUX/compare/v2.93.0...v2.94.0) (2023-12-15)

### Bug Fixes

- **Data Mapper:** fixing edifact nested loop mapping bug ([#3824](https://github.com/Azure/LogicAppsUX/issues/3824)) ([575f61d](https://github.com/Azure/LogicAppsUX/commit/575f61d22e9a413ddb30baea3bc582c6592ba548))
- **Designer:** Git-Removed the .vscode/settings.json file ([#3847](https://github.com/Azure/LogicAppsUX/issues/3847)) ([c769a5e](https://github.com/Azure/LogicAppsUX/commit/c769a5e83ce24c456f679f9ed42262a82ba02e86))

## [2.93.0](https://github.com/Azure/LogicAppsUX/compare/v2.92.0...v2.93.0) (2023-12-14)

### Bug Fixes

- **designer-ui:** Fix pill tooltip UX and corner rounding ([#3843](https://github.com/Azure/LogicAppsUX/issues/3843)) ([c06f9a5](https://github.com/Azure/LogicAppsUX/commit/c06f9a5ec5845de430acf84123fe78ceb3cfde45))
- **Designer:** Connections panel refactor ([#3815](https://github.com/Azure/LogicAppsUX/issues/3815)) ([92d28ee](https://github.com/Azure/LogicAppsUX/commit/92d28ee64116b765c8c483b40fdf02b9ae6a81e2))

## [2.92.0](https://github.com/Azure/LogicAppsUX/compare/v2.91.0...v2.92.0) (2023-12-14)

### Features

- **vscode:** Remove designer refresh and add window message ([#3816](https://github.com/Azure/LogicAppsUX/issues/3816)) ([8633353](https://github.com/Azure/LogicAppsUX/commit/8633353c6ef66510f6379caf7d26c8d09067e522))

### Bug Fixes

- **copilot:** Raising Telemetry Level of Copilot ([#3832](https://github.com/Azure/LogicAppsUX/issues/3832)) ([e787a25](https://github.com/Azure/LogicAppsUX/commit/e787a25b33fab39eb9afef95881c86c9bc53cab2))
- **Data Mapper:** Disabled allowing undo add schema ([#3837](https://github.com/Azure/LogicAppsUX/issues/3837)) ([f852e2a](https://github.com/Azure/LogicAppsUX/commit/f852e2a9d6d6e02d9c619b0d3b474328ff9e3414))
- **Data Mapper:** Display Error Message for Failing Schema Load ([#3839](https://github.com/Azure/LogicAppsUX/issues/3839)) ([4146cdc](https://github.com/Azure/LogicAppsUX/commit/4146cdc470e1f24bcf57e73866f72bb9ab724580))
- **designer:** Add connector type info to about panel and refactor how displayRuntimeInfo is passed in ([#3812](https://github.com/Azure/LogicAppsUX/issues/3812)) ([c2b2ef3](https://github.com/Azure/LogicAppsUX/commit/c2b2ef3e7e348fd3da843044201fb44e0f8178e8))
- **designer:** Add default text color for token picker pivot ([#3838](https://github.com/Azure/LogicAppsUX/issues/3838)) ([11ff584](https://github.com/Azure/LogicAppsUX/commit/11ff58428c0c06448ca43bbfe3b3ae6475edbc1e))
- **designer:** Fix toggle for collapsed and expanded dictionary view … ([#3811](https://github.com/Azure/LogicAppsUX/issues/3811)) ([b5690d5](https://github.com/Azure/LogicAppsUX/commit/b5690d52b157b283ea8f8ef24197d345b46bb72b))
- **designer:** Fixes an issue where we weren't properly creating new lines in the editor ([#3823](https://github.com/Azure/LogicAppsUX/issues/3823)) ([67ccddf](https://github.com/Azure/LogicAppsUX/commit/67ccddf3b3d0f48b6bcee6daa302ee2f7f833ef5))
- **designer:** issue where designer would constantly rerender if anything about hte window changed ([#3814](https://github.com/Azure/LogicAppsUX/issues/3814)) ([de11487](https://github.com/Azure/LogicAppsUX/commit/de114872891188cd45c4772a074b2a90c5da2e45))
- **vscode:** Add troubleshoot dependencies message [#3687](https://github.com/Azure/LogicAppsUX/issues/3687) ([#3833](https://github.com/Azure/LogicAppsUX/issues/3833)) ([992eb3f](https://github.com/Azure/LogicAppsUX/commit/992eb3f9356977f1e906bbbde1d279e167bc0197))
- **vscode:** Add workflow app kind to local.settings.json ([#3841](https://github.com/Azure/LogicAppsUX/issues/3841)) ([852b535](https://github.com/Azure/LogicAppsUX/commit/852b535e030730d1aadeb2f150318aa78ab2e24c))
- **vscode:** Check list of files in dotnet binary installation ([#3813](https://github.com/Azure/LogicAppsUX/issues/3813)) ([319e660](https://github.com/Azure/LogicAppsUX/commit/319e6604a9b7ac250df2e75dfd570d8ddc916f9b))

## [2.91.0](https://github.com/Azure/LogicAppsUX/compare/v2.90.0...v2.91.0) (2023-12-07)

## [2.90.0](https://github.com/Azure/LogicAppsUX/compare/v2.89.0...v2.90.0) (2023-12-07)

### Features

- **Vs code:** Move Data-Mapper Constants to Utils/Vscode-Extension ([#3803](https://github.com/Azure/LogicAppsUX/issues/3803)) ([e31fa8c](https://github.com/Azure/LogicAppsUX/commit/e31fa8c735e4a096bcf24c1a547f1679f775c425))

## [2.89.0](https://github.com/Azure/LogicAppsUX/compare/v2.88.0...v2.89.0) (2023-12-06)

### Features

- **designer:** Add credential mapping support to connector ([#3748](https://github.com/Azure/LogicAppsUX/issues/3748)) ([40c1da0](https://github.com/Azure/LogicAppsUX/commit/40c1da04c9efb0bb3530a92478cd070a7120390e))
- **designer:** Supporting Pasting Tokens in Editors ([#3793](https://github.com/Azure/LogicAppsUX/issues/3793)) ([64b4962](https://github.com/Azure/LogicAppsUX/commit/64b4962d2c9faad779cf52dfa834524831a56660))

### Bug Fixes

- **Consumption:** Fixing workflow parameter error ([#3798](https://github.com/Azure/LogicAppsUX/issues/3798)) ([04c4eb9](https://github.com/Azure/LogicAppsUX/commit/04c4eb9728951173e6d4b60a591c398c1e5fd84b))
- **Designer:** Add Bounding Box to Folder Level Button in Panel ([#3802](https://github.com/Azure/LogicAppsUX/issues/3802)) ([39b5bd3](https://github.com/Azure/LogicAppsUX/commit/39b5bd3f0b1519990e152e57702c7f21f48a704e))
- **Designer:** CustomEditor missing readonly/disabled state ([#3789](https://github.com/Azure/LogicAppsUX/issues/3789)) ([4813a07](https://github.com/Azure/LogicAppsUX/commit/4813a078138db00f0dbbee04ef1ee86bdc620f63))
- **designer:** Fix colors for some buttons in high contrast mode ([#3783](https://github.com/Azure/LogicAppsUX/issues/3783)) ([5b3ebdf](https://github.com/Azure/LogicAppsUX/commit/5b3ebdf3289a9586639e04fbc7f428b1ac3695b0))
- **designer:** Fixes using a token in expression editor not getting correct segment value ([#3791](https://github.com/Azure/LogicAppsUX/issues/3791)) ([65eae81](https://github.com/Azure/LogicAppsUX/commit/65eae81da4a818e02815cdc7b0abacb495099b3e))
- **Designer:** Run after settings dots are not ordered properly ([#3765](https://github.com/Azure/LogicAppsUX/issues/3765)) ([61522b1](https://github.com/Azure/LogicAppsUX/commit/61522b1a1353c6ca43e41dbc8176279a7172b1fe))
- **Designer:** Update check for foreach operation id to be case insensitive ([#3799](https://github.com/Azure/LogicAppsUX/issues/3799)) ([c475c38](https://github.com/Azure/LogicAppsUX/commit/c475c385067c6620f6b1ff5d4e4ef494d60f895a))
- **vscode:** Add validation for workspace folder path as string ([#3659](https://github.com/Azure/LogicAppsUX/issues/3659)) ([#3779](https://github.com/Azure/LogicAppsUX/issues/3779)) ([35cfa0b](https://github.com/Azure/LogicAppsUX/commit/35cfa0bef60672f9f31b6fd21f5f944297f4aae8))

## [2.88.0](https://github.com/Azure/LogicAppsUX/compare/v2.87.0...v2.88.0) (2023-11-30)

### Bug Fixes

- **designer:** Custom Code Workspace fix empty lib folder ([#3769](https://github.com/Azure/LogicAppsUX/issues/3769)) ([549f800](https://github.com/Azure/LogicAppsUX/commit/549f8002324b881fb9ae1d284ba4d0981dda129e))
- **designer:** Inconsistency in IGatewayService interface ([#3774](https://github.com/Azure/LogicAppsUX/issues/3774)) ([dbcdec2](https://github.com/Azure/LogicAppsUX/commit/dbcdec28472a9857872016f1026d59fcac60c146))
- **Designer:** Standalone - Errors command bar button now behaves as it does in portal ([#3771](https://github.com/Azure/LogicAppsUX/issues/3771)) ([83f155c](https://github.com/Azure/LogicAppsUX/commit/83f155c2f2fbd31b540de0f0a4b61c7fa36b108a))

## [2.87.0](https://github.com/Azure/LogicAppsUX/compare/v2.86.0...v2.87.0) (2023-11-29)

### Features

- **designer:** Adding an additional callout in parameters tab when connections are invalid ([#3739](https://github.com/Azure/LogicAppsUX/issues/3739)) ([040092f](https://github.com/Azure/LogicAppsUX/commit/040092fcf08a39001f73256c6085c668e91b953f))
- **Vs Code:** Merged Vs-code-react to one folder for Designer, DM, Workflow, etc ([#3757](https://github.com/Azure/LogicAppsUX/issues/3757)) ([7e26cd2](https://github.com/Azure/LogicAppsUX/commit/7e26cd207102be0d80bbb2c2e40a6235dc85e9f7)), closes [#3692](https://github.com/Azure/LogicAppsUX/issues/3692) [#3701](https://github.com/Azure/LogicAppsUX/issues/3701) [#3719](https://github.com/Azure/LogicAppsUX/issues/3719) [#3756](https://github.com/Azure/LogicAppsUX/issues/3756)

### Bug Fixes

- **Data Mapper:** amending source key with directAccess when brackets are in a string ([#3715](https://github.com/Azure/LogicAppsUX/issues/3715)) ([207b9cf](https://github.com/Azure/LogicAppsUX/commit/207b9cff105a85898880d92abba55f56f0169a94))
- **designer-ui:** Ensure `convertEditorState` returns a non-empty value ([#3742](https://github.com/Azure/LogicAppsUX/issues/3742)) ([449fbc6](https://github.com/Azure/LogicAppsUX/commit/449fbc6d30aee76f69f39294ee62e4fdff34a30e))
- **designer-ui:** Prevent expressions using `&...;` syntax disappearing from HTML editor ([#3760](https://github.com/Azure/LogicAppsUX/issues/3760)) ([b7b7aaa](https://github.com/Azure/LogicAppsUX/commit/b7b7aaa393bc0ca81b278f17c81532e46ee3de26))
- **designer:** Fix implicit foreach when added after a branch ([#3713](https://github.com/Azure/LogicAppsUX/issues/3713)) ([75f2c75](https://github.com/Azure/LogicAppsUX/commit/75f2c75fbcc3d6dedd0e41f40d665d86cd89a2c7))
- **designer:** Fix Padding in action search ([#3764](https://github.com/Azure/LogicAppsUX/issues/3764)) ([b75f328](https://github.com/Azure/LogicAppsUX/commit/b75f328036bede51ad7327c6b75fac2cd0e477c4))
- **designer:** Get correct expression value for callbackUrl ([#3753](https://github.com/Azure/LogicAppsUX/issues/3753)) ([82f0495](https://github.com/Azure/LogicAppsUX/commit/82f0495a1e3299aa4189ee4fe2d452b79502cc89))
- **designer:** Update dropzone automation ids to use node names and align with card … ([#3729](https://github.com/Azure/LogicAppsUX/issues/3729)) ([d567972](https://github.com/Azure/LogicAppsUX/commit/d567972b9f750536e2ab8025ca493db62ce60b4a))

## [2.86.0](https://github.com/Azure/LogicAppsUX/compare/v2.85.0...v2.86.0) (2023-11-23)

### Bug Fixes

- **designer-ui:** Fix '\n' being deleted by Lexical ([#3726](https://github.com/Azure/LogicAppsUX/issues/3726)) ([b098884](https://github.com/Azure/LogicAppsUX/commit/b0988848c6626af451ec90a75290f7a4e1294846))

## [2.85.0](https://github.com/Azure/LogicAppsUX/compare/v2.84.0...v2.85.0) (2023-11-16)

### Features

- **designer-ui:** Add "See More" to all token picker sections ([#3689](https://github.com/Azure/LogicAppsUX/issues/3689)) ([87fddfd](https://github.com/Azure/LogicAppsUX/commit/87fddfd43612047e4ba9f7ed24d7316cd69422c8))
- **designer-ui:** Improve token picker styling ([#3675](https://github.com/Azure/LogicAppsUX/issues/3675)) ([53976f0](https://github.com/Azure/LogicAppsUX/commit/53976f0c1cbf5b9395084776ca8bad0ecbd09b4d))
- **Designer:** Added support for dynamic data in the array editor ([#3686](https://github.com/Azure/LogicAppsUX/issues/3686)) ([b633488](https://github.com/Azure/LogicAppsUX/commit/b633488ea6d90d9d53072e41a8000476e5664d8a))
- **Designer:** Added token expressions `utf8Length` and `utf16Length` ([#3696](https://github.com/Azure/LogicAppsUX/issues/3696)) ([c5404d0](https://github.com/Azure/LogicAppsUX/commit/c5404d0c7cf548ee205c26c70253871b5140b53e))

### Bug Fixes

- **copilot:** Adding "the" to the greeting message ([#3674](https://github.com/Azure/LogicAppsUX/issues/3674)) ([b6c22a4](https://github.com/Azure/LogicAppsUX/commit/b6c22a4f8a59dabcd2e2979a57305c1a5ce89735))
- **copilot:** Changing icon in header ([#3663](https://github.com/Azure/LogicAppsUX/issues/3663)) ([a0f0eb1](https://github.com/Azure/LogicAppsUX/commit/a0f0eb1ee7c22e21bd9b8ff03192c7c15908e5db))
- **copilot:** Support for copilot copy in portal ([#3662](https://github.com/Azure/LogicAppsUX/issues/3662)) ([7c330ee](https://github.com/Azure/LogicAppsUX/commit/7c330eef0277cc169a99955f384e71baf96e18b4))
- **Data Mapper:** Reenabled Generate On Clean State ([#3651](https://github.com/Azure/LogicAppsUX/issues/3651)) ([b3f44e9](https://github.com/Azure/LogicAppsUX/commit/b3f44e909b0ae22fa3f352fe937d5268b1d0f9b1))
- **designer-ui:** Prevent text formatting in non-HTML inputs ([#3702](https://github.com/Azure/LogicAppsUX/issues/3702)) ([4403da8](https://github.com/Azure/LogicAppsUX/commit/4403da833c6bb103f984c548ad1598f04e03b720))
- **designer:** Add aria label to operation search card ([#3631](https://github.com/Azure/LogicAppsUX/issues/3631)) ([3a3ea00](https://github.com/Azure/LogicAppsUX/commit/3a3ea00d8615ac4f275392b73d801a885dc13969))
- **designer:** fix links in html editor when they have tokens ([#3697](https://github.com/Azure/LogicAppsUX/issues/3697)) ([a60222c](https://github.com/Azure/LogicAppsUX/commit/a60222c8915e99e9c0968e3b9348d6f07f2d4886))
- **designer:** Fixes an issue where after inserting a token, token picker button doesn't appear ([#3660](https://github.com/Azure/LogicAppsUX/issues/3660)) ([1b945e6](https://github.com/Azure/LogicAppsUX/commit/1b945e6cf8a8b404a052e0c5e70e6323422c0f2b))
- **designer:** Update Downstream Tokens in EditorViewModel ([#3673](https://github.com/Azure/LogicAppsUX/issues/3673)) ([767cc5d](https://github.com/Azure/LogicAppsUX/commit/767cc5d24ca044217b8129c9a1e5b26fd0f920c2))
- **designer:** Using segment values instead of token values, which fails in the Condition Editors ([#3664](https://github.com/Azure/LogicAppsUX/issues/3664)) ([7c79bff](https://github.com/Azure/LogicAppsUX/commit/7c79bff52c2e514214e6ab83c4f625a2f3c5a0d1))
- **vscode:** Add reset binaries dependencies command ([#3676](https://github.com/Azure/LogicAppsUX/issues/3676)) ([b0aec33](https://github.com/Azure/LogicAppsUX/commit/b0aec33da02624df483e353dd34c1e88c8fc108e))
- **vscode:** Add troubleshoot dependencies message ([#3687](https://github.com/Azure/LogicAppsUX/issues/3687)) ([b5c11f5](https://github.com/Azure/LogicAppsUX/commit/b5c11f50281c70d21130086b90bbd38bf5bac0f4))
- **vscode:** Add validation of func command ([#3658](https://github.com/Azure/LogicAppsUX/issues/3658)) ([d17f195](https://github.com/Azure/LogicAppsUX/commit/d17f1955d00f94c8bbd56bb0df94932310e670fb))
- **vscode:** Fix nullish setting when getting user settings ([#3690](https://github.com/Azure/LogicAppsUX/issues/3690)) ([dfaef25](https://github.com/Azure/LogicAppsUX/commit/dfaef25368a3b4f7f36e9b08c79106ed41565103))
- **vscode:** Use same ports and child proccess in designer and data mapper extension ([#3672](https://github.com/Azure/LogicAppsUX/issues/3672)) ([583f0c2](https://github.com/Azure/LogicAppsUX/commit/583f0c25a5937d0098440828963020d8c8119909))

## [2.84.0](https://github.com/Azure/LogicAppsUX/compare/v2.83.1...v2.84.0) (2023-11-09)

### [2.83.1](https://github.com/Azure/LogicAppsUX/compare/v2.83.0...v2.83.1) (2023-11-09)

### Bug Fixes

- **copilot:** Adding ellipses to placeholder text ([#3648](https://github.com/Azure/LogicAppsUX/issues/3648)) ([c142514](https://github.com/Azure/LogicAppsUX/commit/c142514492745123090c1a5babb4c66f5bbd7357))
- **Data Mapper:** Added Binary Depencency Call & Fixed Build Error from Lodash ([#3649](https://github.com/Azure/LogicAppsUX/issues/3649)) ([dc305cd](https://github.com/Azure/LogicAppsUX/commit/dc305cd5c9c5c2d746aa210142f49c0f7d79ef9d))
- **designer:** Fixed an issue where when selecting an expression token opens tokenpicker ([#3650](https://github.com/Azure/LogicAppsUX/issues/3650)) ([549515f](https://github.com/Azure/LogicAppsUX/commit/549515fa26ffcdcfec148a6163490fae0f96bd9b))
- **designer:** Update dependencies and use axios instead of request-p ([#3645](https://github.com/Azure/LogicAppsUX/issues/3645)) ([c3b65a0](https://github.com/Azure/LogicAppsUX/commit/c3b65a059d65b4b94fadee2b2627acebc60bcd5f))

## [2.83.0](https://github.com/Azure/LogicAppsUX/compare/v2.82.0...v2.83.0) (2023-11-08)

### Features

- **Copilot:** Adding copy button ([#3628](https://github.com/Azure/LogicAppsUX/issues/3628)) ([800e222](https://github.com/Azure/LogicAppsUX/commit/800e222fe8af83987666282b5b25633ddfe018cd))

### Bug Fixes

- **Data Mapper:** Fixed Data Mapper Build Error ([#3646](https://github.com/Azure/LogicAppsUX/issues/3646)) ([ecc9e83](https://github.com/Azure/LogicAppsUX/commit/ecc9e83451c5cb91fb104e4c733b02b26d73f00a))
- **designer:** Allow copy paste of a node's connection mapping ([#3643](https://github.com/Azure/LogicAppsUX/issues/3643)) ([926c49f](https://github.com/Azure/LogicAppsUX/commit/926c49fa77487701b7f2f6729514c28479d30f69))

## [2.82.0](https://github.com/Azure/LogicAppsUX/compare/v2.81.2...v2.82.0) (2023-11-08)

### Features

- **copilot:** Adding basic telemetry in copilot feedback ([#3642](https://github.com/Azure/LogicAppsUX/issues/3642)) ([b5a94eb](https://github.com/Azure/LogicAppsUX/commit/b5a94eb3499ba89b475eeda56936e80cca6440b7))
- **Data Mapper:** Change Command Bar UI ([#3601](https://github.com/Azure/LogicAppsUX/issues/3601)) ([522ee89](https://github.com/Azure/LogicAppsUX/commit/522ee89519d214ad7f22eea8aa5d11ce1637bc3d))
- **designer:** Adding ability for the host to customize the sort of the connectors in the browse view ([#3616](https://github.com/Azure/LogicAppsUX/issues/3616)) ([7ed4ecf](https://github.com/Azure/LogicAppsUX/commit/7ed4ecf623971ca4c22420c86878f1287c7b4f24))

### Bug Fixes

- **copilot:** Changing placeholder text ([#3615](https://github.com/Azure/LogicAppsUX/issues/3615)) ([0799770](https://github.com/Azure/LogicAppsUX/commit/0799770bf0ffec9220eb23aae2f00b5f867cdbd9))
- **copilot:** Dark Mode Adjustments ([#3614](https://github.com/Azure/LogicAppsUX/issues/3614)) ([5bc1c02](https://github.com/Azure/LogicAppsUX/commit/5bc1c020fef4f335ef4ae14d96d45503ff8f5c56))
- **copilot:** Increased Contrast for DarkMode Text ([#3617](https://github.com/Azure/LogicAppsUX/issues/3617)) ([c2c2dd6](https://github.com/Azure/LogicAppsUX/commit/c2c2dd6e89f3c29e24a1042c94834b46b05342b4))
- **Data Mapper:** added warning message content from PM team ([#3630](https://github.com/Azure/LogicAppsUX/issues/3630)) ([ee9dd90](https://github.com/Azure/LogicAppsUX/commit/ee9dd9038e2021736c9832a0497c6b3adcf1f17a))
- **Data Mapper:** Increase the connection area at the end of a property point ([#3599](https://github.com/Azure/LogicAppsUX/issues/3599)) ([3bbfddd](https://github.com/Azure/LogicAppsUX/commit/3bbfdddcfd4c149082adbc6360a8b2cfd03fef55))
- **designer:** Retaining Tokenpicker when navigating away in portal ([#3636](https://github.com/Azure/LogicAppsUX/issues/3636)) ([728bfca](https://github.com/Azure/LogicAppsUX/commit/728bfca8cd31f7da235ca5c4b16ae09e5593feb3))
- **vscode:** Get workspace folder based on Logic App project ([#3618](https://github.com/Azure/LogicAppsUX/issues/3618)) ([a9f0dfe](https://github.com/Azure/LogicAppsUX/commit/a9f0dfe63df13b59c3c6d60360b994a8756eb454))

### [2.81.2](https://github.com/Azure/LogicAppsUX/compare/v2.81.1...v2.81.2) (2023-11-06)

### Bug Fixes

- **desinger:** Clean up some tokenpicker code ([#3613](https://github.com/Azure/LogicAppsUX/issues/3613)) ([fa09701](https://github.com/Azure/LogicAppsUX/commit/fa0970183288f52f1c26c4d100681005e4505a79))
- **vscode:** Update permissions to binary func file ([#3612](https://github.com/Azure/LogicAppsUX/issues/3612)) ([d640899](https://github.com/Azure/LogicAppsUX/commit/d6408992d87d0839fe3c021f4a8d313241e6e03e))

### [2.81.1](https://github.com/Azure/LogicAppsUX/compare/v2.81.0...v2.81.1) (2023-11-06)

### Features

- **chatbot:** Adding Chatbot service ([#3603](https://github.com/Azure/LogicAppsUX/issues/3603)) ([ead9e16](https://github.com/Azure/LogicAppsUX/commit/ead9e1627ea10d892769a3fb95eb703ae608d99b))
- **designer:** Add ability to get tokens from current node in token selector ([#3598](https://github.com/Azure/LogicAppsUX/issues/3598)) ([9a507eb](https://github.com/Azure/LogicAppsUX/commit/9a507eb778512f4c3fba81e5315ac5fd826cc284))

### Bug Fixes

- **copilot:** Changing capitalization of workflow assistant ([#3594](https://github.com/Azure/LogicAppsUX/issues/3594)) ([fbf60c0](https://github.com/Azure/LogicAppsUX/commit/fbf60c02c3b6aec5b7332fe0f530cd02f1b660d4))

## [2.81.0](https://github.com/Azure/LogicAppsUX/compare/v2.80.3...v2.81.0) (2023-11-03)

### Features

- **Data Mapper:** uninstall legacy extension on activation of Designer extension ([#3597](https://github.com/Azure/LogicAppsUX/issues/3597)) ([437ca97](https://github.com/Azure/LogicAppsUX/commit/437ca97f9470986284f6e54f5fdefbd9376a2db6))

### [2.80.3](https://github.com/Azure/LogicAppsUX/compare/v2.80.2...v2.80.3) (2023-11-03)

### Features

- **copilot:** adding support for staging endpoint ([#3596](https://github.com/Azure/LogicAppsUX/issues/3596)) ([c6c2a2f](https://github.com/Azure/LogicAppsUX/commit/c6c2a2f7eefee0a7f41d7591dee152e26e124306))
- **vscode:** Introduce onboarding experience ([#3581](https://github.com/Azure/LogicAppsUX/issues/3581)) ([f28c4fa](https://github.com/Azure/LogicAppsUX/commit/f28c4fade69d032ec75d3fe0aea158d3f1b8d4cb)), closes [#2830](https://github.com/Azure/LogicAppsUX/issues/2830) [#3031](https://github.com/Azure/LogicAppsUX/issues/3031) [#3037](https://github.com/Azure/LogicAppsUX/issues/3037)

### [2.80.2](https://github.com/Azure/LogicAppsUX/compare/v2.80.0...v2.80.2) (2023-11-03)

### Bug Fixes

- **Copilot:** Changing from Copilot to Workflow Assistant ([#3590](https://github.com/Azure/LogicAppsUX/issues/3590)) ([3659e43](https://github.com/Azure/LogicAppsUX/commit/3659e4396cf25ee3296c643dca70a90907fbe03c))
- **designer:** Alert error messages for required editor fields ([#3592](https://github.com/Azure/LogicAppsUX/issues/3592)) ([7a3a0ef](https://github.com/Azure/LogicAppsUX/commit/7a3a0efde1d67db2af22907b97b58cb5d97038d7))

### [2.80.1](https://github.com/Azure/LogicAppsUX/compare/v2.80.0...v2.80.1) (2023-11-02)

## [2.80.0](https://github.com/Azure/LogicAppsUX/compare/v2.79.0...v2.80.0) (2023-11-02)

### Features

- **copilot:** Adding support for redirect to Azure Copilot ([#3589](https://github.com/Azure/LogicAppsUX/issues/3589)) ([56f5759](https://github.com/Azure/LogicAppsUX/commit/56f5759cc1dcced9e1e596f3e67a30b64735e7f4))

## [2.79.0](https://github.com/Azure/LogicAppsUX/compare/v2.78.0...v2.79.0) (2023-11-02)

### Features

- **Copilot:** Adding protected pill and message into chatbox ([#3530](https://github.com/Azure/LogicAppsUX/issues/3530)) ([c4d8a84](https://github.com/Azure/LogicAppsUX/commit/c4d8a849a647d5d0b250c8fa813974c649ee2d8f))
- **copilot:** support for dark mode in copilot ([#3565](https://github.com/Azure/LogicAppsUX/issues/3565)) ([f80ffa3](https://github.com/Azure/LogicAppsUX/commit/f80ffa3640ed09257df5ba19adba829a1862bc01))
- **Data Mapper:** Add Data Mapper Vs Command ([#3573](https://github.com/Azure/LogicAppsUX/issues/3573)) ([96019ae](https://github.com/Azure/LogicAppsUX/commit/96019aeb2d8c63c4b066c8f3210e6ff6c7257cf6))
- **Data Mapper:** Change Map Definition file extension to .lml ([#3580](https://github.com/Azure/LogicAppsUX/issues/3580)) ([35aabcf](https://github.com/Azure/LogicAppsUX/commit/35aabcfcfd77e1bd6e961d184b05c445132531f1))

### Bug Fixes

- **copilot:** Added extra margin for Firefox list items ([#3574](https://github.com/Azure/LogicAppsUX/issues/3574)) ([2c85de8](https://github.com/Azure/LogicAppsUX/commit/2c85de826cac19e1965ec86550b3904d5a0e08c0))
- **Copilot:** Changing Introduction Text in Chatbot ([#3568](https://github.com/Azure/LogicAppsUX/issues/3568)) ([3e9e61e](https://github.com/Azure/LogicAppsUX/commit/3e9e61e62625882c24c47de9c74efefdd403fe52))
- **Copilot:** Changing style of Preview tag ([#3566](https://github.com/Azure/LogicAppsUX/issues/3566)) ([8b21f0a](https://github.com/Azure/LogicAppsUX/commit/8b21f0a9544690e8ab2e592d454b91deb6ed6fb7))
- **Data Mapper:** Find LogicApp Root & Select as Workspace ([#3569](https://github.com/Azure/LogicAppsUX/issues/3569)) ([86a27a8](https://github.com/Azure/LogicAppsUX/commit/86a27a8569426b287dacd55079cdd3438d212f11))
- **Data Mapper:** Run XSLT function to recognize both .xslt and .xml ([#3571](https://github.com/Azure/LogicAppsUX/issues/3571)) ([e44d62c](https://github.com/Azure/LogicAppsUX/commit/e44d62cc40cbe0a8941aac4091d86f8768e1dd84))
- **designer:** Darken border around add step button for better a11y c… ([#3556](https://github.com/Azure/LogicAppsUX/issues/3556)) ([4e0aef0](https://github.com/Azure/LogicAppsUX/commit/4e0aef0483989f3773d2a4cc1fab092063b258b7))
- **designer:** Do not reset canvas position when reloading a workflow ([#3583](https://github.com/Azure/LogicAppsUX/issues/3583)) ([8296917](https://github.com/Azure/LogicAppsUX/commit/829691775d8f2db0dd33f4ba084369efbdbb1516))
- **designer:** Fix a11y bug where buttons in search would not show as… ([#3561](https://github.com/Azure/LogicAppsUX/issues/3561)) ([03a321e](https://github.com/Azure/LogicAppsUX/commit/03a321ebe3ab73ddeac0659da08b83db4ea5d297))
- **designer:** Token Picker Expression to use Extracted Value ([#3572](https://github.com/Azure/LogicAppsUX/issues/3572)) ([51727d2](https://github.com/Azure/LogicAppsUX/commit/51727d2989c422d8d0155f65bb3167d2ed736ccd))
- **Designer:** Update Combo box to sort alphabetically. ([#3499](https://github.com/Azure/LogicAppsUX/issues/3499)) ([657db93](https://github.com/Azure/LogicAppsUX/commit/657db93fba577a2a9f3fa95200dfaddc2c957b51))
- **designer:** Update outputs & inputs link for every loop ([#3575](https://github.com/Azure/LogicAppsUX/issues/3575)) ([210b3d3](https://github.com/Azure/LogicAppsUX/commit/210b3d37a4489c5645fcef35d3f47aef44724d9b))

## [2.78.0](https://github.com/Azure/LogicAppsUX/compare/v2.77.0...v2.78.0) (2023-10-28)

### Features

- **copilot:** Copilot Fixtures ([#3557](https://github.com/Azure/LogicAppsUX/issues/3557)) ([09c3783](https://github.com/Azure/LogicAppsUX/commit/09c37831cdc10cbd6dac18328acfb8405aadb20d))

## [2.77.0](https://github.com/Azure/LogicAppsUX/compare/v2.76.0...v2.77.0) (2023-10-27)

### Bug Fixes

- **designer:** Make info bubbles in settings work with screen reader ([#3555](https://github.com/Azure/LogicAppsUX/issues/3555)) ([9378775](https://github.com/Azure/LogicAppsUX/commit/93787757400d7dad6bae3f6f01ca568bf21a2207))
- **designer:** Remove action type filtering for where the prefetched operations is empty ([#3542](https://github.com/Azure/LogicAppsUX/issues/3542)) ([e49a5f7](https://github.com/Azure/LogicAppsUX/commit/e49a5f79c546510e3c1473f90c8794ad8c59faa6))

## [2.77.0](https://github.com/Azure/LogicAppsUX/compare/v2.76.0...v2.77.0) (2023-10-27)

### Bug Fixes

- **Data Mapper:** Paste into test tool using right mouse click not working ([#3531](https://github.com/Azure/LogicAppsUX/issues/3531)) ([a07cd56](https://github.com/Azure/LogicAppsUX/commit/a07cd561f676bc6a9798f89e65d3f9a1c45562fd))
- **Designer:** Filtering out tokens that should be inaccessible by loop scope logic ([#3547](https://github.com/Azure/LogicAppsUX/issues/3547)) ([3b834f8](https://github.com/Azure/LogicAppsUX/commit/3b834f86f443a386593069cd4f13f8d20565fb15))

## [2.76.0](https://github.com/Azure/LogicAppsUX/compare/v2.75.0...v2.76.0) (2023-10-26)

### Features

- **Data Mapper:** Merge with Designer Vs-code Extension ([#3461](https://github.com/Azure/LogicAppsUX/issues/3461)) ([c3a6d43](https://github.com/Azure/LogicAppsUX/commit/c3a6d430e8f0845c224790a54a1de0a1246fe816)), closes [#3443](https://github.com/Azure/LogicAppsUX/issues/3443) [#3465](https://github.com/Azure/LogicAppsUX/issues/3465) [#3500](https://github.com/Azure/LogicAppsUX/issues/3500) [#3508](https://github.com/Azure/LogicAppsUX/issues/3508) [#3513](https://github.com/Azure/LogicAppsUX/issues/3513)
- **designer:** Add support for recommendation view to work without depending on prefetched data ([#3525](https://github.com/Azure/LogicAppsUX/issues/3525)) ([661e099](https://github.com/Azure/LogicAppsUX/commit/661e099e9422880c4c53ff0f0a064a27c11d675e))
- **designer:** Add support for x12 and edifact batch encode opertation. ([#3479](https://github.com/Azure/LogicAppsUX/issues/3479)) ([7c669d6](https://github.com/Azure/LogicAppsUX/commit/7c669d619de4e75a0aadbbf283ef15fb7916ca2c))
- **desinger:** Export getTriggerNodeId and update outputToken schema ([#3489](https://github.com/Azure/LogicAppsUX/issues/3489)) ([054370c](https://github.com/Azure/LogicAppsUX/commit/054370ced1d9e403185bde7e367d1b12396b579f))

### Bug Fixes

- **Copilot:** Changing In-development to Preview ([#3494](https://github.com/Azure/LogicAppsUX/issues/3494)) ([f40d1e5](https://github.com/Azure/LogicAppsUX/commit/f40d1e5e257d207b0a3fafa547c94eef97b2e74e))
- **Copilot:** Removing add and edit from menu options ([#3515](https://github.com/Azure/LogicAppsUX/issues/3515)) ([2e1998a](https://github.com/Azure/LogicAppsUX/commit/2e1998a22900f4f26ae38d7a252e1bd025181683))
- **Data Mapper:** Property pane does not update deleted unbounded inputs properly ([#3514](https://github.com/Azure/LogicAppsUX/issues/3514)) ([7a48ab5](https://github.com/Azure/LogicAppsUX/commit/7a48ab5abc54e3e6ce52ec7fc94661445a44e016))
- **Designer:** Fix spliton for hybrid triggers with headers schema in outputs ([#3487](https://github.com/Azure/LogicAppsUX/issues/3487)) ([e2f004f](https://github.com/Azure/LogicAppsUX/commit/e2f004f14593a9d6e437e421290e179a4f1b43f9))
- **designer:** Html Editor not showing proper tokens ([#3504](https://github.com/Azure/LogicAppsUX/issues/3504)) ([e13c615](https://github.com/Azure/LogicAppsUX/commit/e13c615aeb62c8b6908cf20858a32c5725f13a96))
- **vscode:** Update recommendations for logic apps project ([#3485](https://github.com/Azure/LogicAppsUX/issues/3485)) ([9cac4d9](https://github.com/Azure/LogicAppsUX/commit/9cac4d90f07b03cb7d8dd50e0b909f2d76da8dcc))

## [2.75.0](https://github.com/Azure/LogicAppsUX/compare/v2.74.0...v2.75.0) (2023-10-19)

### Features

- **designer:** Add option to hide expression in token picker ([#3473](https://github.com/Azure/LogicAppsUX/issues/3473)) ([b077720](https://github.com/Azure/LogicAppsUX/commit/b077720c76344152ab9b0cad178479440bada109))

### Bug Fixes

- **Designer:** Do not update swagger parameter format when in is unde… ([#3478](https://github.com/Azure/LogicAppsUX/issues/3478)) ([9fd8d9b](https://github.com/Azure/LogicAppsUX/commit/9fd8d9b0fed454e202e7cde7a075df630de65e2c))
- **designer:** Fix copilot versioning ([#3474](https://github.com/Azure/LogicAppsUX/issues/3474)) ([6868390](https://github.com/Azure/LogicAppsUX/commit/6868390049bf087286871d9cdb4d19936bd82ea4))

## [2.74.0](https://github.com/Azure/LogicAppsUX/compare/v2.73.0...v2.74.0) (2023-10-18)

### Features

- **data-mapper:** create unique ID for function and load position ([#3432](https://github.com/Azure/LogicAppsUX/issues/3432)) ([33aea13](https://github.com/Azure/LogicAppsUX/commit/33aea13d9bc2fe5dc596750e3f073341c0c60bb0))
- **designer:** Adding a more versatile - collapsable panel ([#3471](https://github.com/Azure/LogicAppsUX/issues/3471)) ([aa9937d](https://github.com/Azure/LogicAppsUX/commit/aa9937d904b24add2441083cf1b557473594f5dd))
- **vscode:** Add Logger Configuration and Package Version Updates ([#3444](https://github.com/Azure/LogicAppsUX/issues/3444)) ([1b2f889](https://github.com/Azure/LogicAppsUX/commit/1b2f889663ffb86693bbf3bc69de8fe6bd970c9f))

### Bug Fixes

- **copilot:** Minor fixes to copilot UI including proper text formatting and correct api endpoint ([#3466](https://github.com/Azure/LogicAppsUX/issues/3466)) ([fb1a4ae](https://github.com/Azure/LogicAppsUX/commit/fb1a4aebd55bb5737a8aeed372ce35546f511b4a))
- **Data Mapper:** User able to paste path directly into "Select existing" ([#3436](https://github.com/Azure/LogicAppsUX/issues/3436)) ([6155d50](https://github.com/Azure/LogicAppsUX/commit/6155d501a35c27136ebfb44dfe63fdd095373a92))
- **designer:** Adding Expression Paste Functionality ([#3441](https://github.com/Azure/LogicAppsUX/issues/3441)) ([3d49b20](https://github.com/Azure/LogicAppsUX/commit/3d49b20f909bee95f3131daa56b58cffcf40510b))
- **designer:** Cleanup placeholder trigger when trigger is added ([#3472](https://github.com/Azure/LogicAppsUX/issues/3472)) ([e6e5299](https://github.com/Azure/LogicAppsUX/commit/e6e529920f4a3f56d4d65af4d8b81ddbd09d0139))
- **Designer:** Invoker connection UI toggle doesn't retain after flow save ([#3464](https://github.com/Azure/LogicAppsUX/issues/3464)) ([b5491e2](https://github.com/Azure/LogicAppsUX/commit/b5491e26a187527056396b1e79688b346f5bc892))
- **vscode:** Update logic app list in tree view after creating logic app in azure ([#3460](https://github.com/Azure/LogicAppsUX/issues/3460)) ([3b0d543](https://github.com/Azure/LogicAppsUX/commit/3b0d5439499f8ad6a9576b671c996afe736d00eb))

## [2.73.0](https://github.com/Azure/LogicAppsUX/compare/v2.72.0...v2.73.0) (2023-10-12)

### Features

- **data mapper:** Able to move functions on canvas ([#3042](https://github.com/Azure/LogicAppsUX/issues/3042)) ([822d4c3](https://github.com/Azure/LogicAppsUX/commit/822d4c3ee12b8265d15b8abb7515813dfa526993))
- **Data Mapper:** Enhanced Redo/Undo Using Redux-undo ([#3428](https://github.com/Azure/LogicAppsUX/issues/3428)) ([061478d](https://github.com/Azure/LogicAppsUX/commit/061478d6c7274f0343be559a04fa1a5ce02b3cd9))

### Bug Fixes

- **Data Mapper:** Cannot generate YML code with two unconnected functions ([#3423](https://github.com/Azure/LogicAppsUX/issues/3423)) ([6a845b0](https://github.com/Azure/LogicAppsUX/commit/6a845b00bc5b7f96e9816cc05b1f73f110e2a098))
- **designer:** Add gateway service config to allow hiding subscription dropdown for gateway connection creation ([#3404](https://github.com/Azure/LogicAppsUX/issues/3404)) ([187018d](https://github.com/Azure/LogicAppsUX/commit/187018d596233ae5b045110240e5e19a083759d5))
- **designer:** Allow event bubbling in json modal ([#3410](https://github.com/Azure/LogicAppsUX/issues/3410)) ([8f2490d](https://github.com/Azure/LogicAppsUX/commit/8f2490dd2795204afd2aeae4fa4d0dec8e453769))
- **Designer:** Fixed issue with nested openapi swagger parameter format ([#3420](https://github.com/Azure/LogicAppsUX/issues/3420)) ([bcaecda](https://github.com/Azure/LogicAppsUX/commit/bcaecda88aa1d226cb010d2c0df4b00e68e8fc52))
- **Designer:** simple query builder not parsing correct data ([#3418](https://github.com/Azure/LogicAppsUX/issues/3418)) ([bfd8efd](https://github.com/Azure/LogicAppsUX/commit/bfd8efd99710b5e0728a0de86da255868aed1bc7))

## [2.72.0](https://github.com/Azure/LogicAppsUX/compare/v2.71.0...v2.72.0) (2023-10-05)

### Bug Fixes

- **designer:** Fix designer load for existing hybrid triggers ([#3398](https://github.com/Azure/LogicAppsUX/issues/3398)) ([9f1a289](https://github.com/Azure/LogicAppsUX/commit/9f1a28953ed221779ab5983e428036a0bb7a47ab))
- **designer:** Fixing standalone test page to save workflow.json correctly ([#3397](https://github.com/Azure/LogicAppsUX/issues/3397)) ([69f866a](https://github.com/Azure/LogicAppsUX/commit/69f866a20fb5ad0aece432e12d08bd0b1e20ae01))
- **vscode:** Removing storing parameters inside definition in standard app ([#3405](https://github.com/Azure/LogicAppsUX/issues/3405)) ([c516f99](https://github.com/Azure/LogicAppsUX/commit/c516f995123e884a791e42f169194d45a7459e65))

## [2.71.0](https://github.com/Azure/LogicAppsUX/compare/v2.70.1...v2.71.0) (2023-09-28)

### Features

- **designer:** Added Node Copy/Paste Functionality ([#3378](https://github.com/Azure/LogicAppsUX/issues/3378)) ([5c35b0f](https://github.com/Azure/LogicAppsUX/commit/5c35b0f3c45aa2b2a2a59da597f00c50528a8e39))

### Bug Fixes

- **designer:** Do not throw error on unknown parameters during validation by default ([#3388](https://github.com/Azure/LogicAppsUX/issues/3388)) ([b3a91ea](https://github.com/Azure/LogicAppsUX/commit/b3a91eaf1c7892f23e96a0d7dbf0590fa87392a2))
- **designer:** Fix combobox filtering to use display name instead of value ([#3380](https://github.com/Azure/LogicAppsUX/issues/3380)) ([cbc2206](https://github.com/Azure/LogicAppsUX/commit/cbc2206ad682300dd9652acae5dc77aff40f6bf7))
- **Designer:** Fixed OpenAPI formatted dynamic data naming ([#3379](https://github.com/Azure/LogicAppsUX/issues/3379)) ([9441d74](https://github.com/Azure/LogicAppsUX/commit/9441d74287df79a9ebfef9a8d0290631fdf332e9))
- **designer:** Fixing the swagger schema returned for http swagger operation ([#3375](https://github.com/Azure/LogicAppsUX/issues/3375)) ([232322a](https://github.com/Azure/LogicAppsUX/commit/232322ac83cb3837afa81f8ba8553ed98b81cbc5))
- **designer:** Get the right parent id for scope actions inside conditionals ([#3381](https://github.com/Azure/LogicAppsUX/issues/3381)) ([ffd9df8](https://github.com/Azure/LogicAppsUX/commit/ffd9df833966ac52d2f77d50bd15388b2efc4994))

### [2.70.1](https://github.com/Azure/LogicAppsUX/compare/v2.70.0...v2.70.1) (2023-09-22)

### Features

- **Designer:** Recommendation panel now autofocuses to search bar ([#3372](https://github.com/Azure/LogicAppsUX/issues/3372)) ([858a243](https://github.com/Azure/LogicAppsUX/commit/858a2433a211eb16f22b614f31f7c8d713a0dd37))

### Bug Fixes

- **Data Mapper:** map not loading on some instances ([#3359](https://github.com/Azure/LogicAppsUX/issues/3359)) ([c90f76f](https://github.com/Azure/LogicAppsUX/commit/c90f76f1abde3dd04f7738d50392650dc2a026cf))
- **Data Mapper:** not showing initial source Schema with connections ([#3366](https://github.com/Azure/LogicAppsUX/issues/3366)) ([778cd46](https://github.com/Azure/LogicAppsUX/commit/778cd460f34e188d376c846c17af3a3b3ce1eaf3))
- **designer:** Add z-index to Errors panel ([#3353](https://github.com/Azure/LogicAppsUX/issues/3353)) ([f5cfdca](https://github.com/Azure/LogicAppsUX/commit/f5cfdcab108b819bbf0b887d09aa796a8927bce1))
- **designer:** Don't throw for MISSING_DATA error in IntlProvider ([#3362](https://github.com/Azure/LogicAppsUX/issues/3362)) ([c3a34a7](https://github.com/Azure/LogicAppsUX/commit/c3a34a7160602c3b402548bcbd28015e1508bb6f))
- **designer:** Fix exception due to usage of LoggingService in DesignerProvider ([#3365](https://github.com/Azure/LogicAppsUX/issues/3365)) ([a534dff](https://github.com/Azure/LogicAppsUX/commit/a534dff0b02faf3ce5abc5a8f5847e098c2331e3))
- **Designer:** Fixed an edge-node overlap bug ([#3360](https://github.com/Azure/LogicAppsUX/issues/3360)) ([a4eed91](https://github.com/Azure/LogicAppsUX/commit/a4eed914438e8f83dcb62a8128d0c522d5e8d3af))
- **Designer:** Fixed error bubbling on managed connector request error ([#3363](https://github.com/Azure/LogicAppsUX/issues/3363)) ([1620e15](https://github.com/Azure/LogicAppsUX/commit/1620e15cb45684eed18243adceb7af0a5b3d3f71))

## [2.70.0](https://github.com/Azure/LogicAppsUX/compare/v2.69.0...v2.70.0) (2023-09-21)

## [2.69.0](https://github.com/Azure/LogicAppsUX/compare/v2.68.0...v2.69.0) (2023-09-20)

### Features

- **copilot:** Integrating backend with copilot UI ([#3343](https://github.com/Azure/LogicAppsUX/issues/3343)) ([cee80be](https://github.com/Azure/LogicAppsUX/commit/cee80bea92e4a1344655fbe165c03d9f5eb5d8ff))
- **vscode:** Improve Logic Apps sites API call ([#3338](https://github.com/Azure/LogicAppsUX/issues/3338)) ([abe421a](https://github.com/Azure/LogicAppsUX/commit/abe421a25d1b239fb6305e49a4b788d33271e317))

### Bug Fixes

- **Data Mapper:** Browse dialog only includes .XSD and All files ([#3342](https://github.com/Azure/LogicAppsUX/issues/3342)) ([bece897](https://github.com/Azure/LogicAppsUX/commit/bece897d50c44e3ae0248622036ab5af096e70a2))
- **Data Mapper:** Clicking on action (and deleting it) will cause data mapper to crash ([#3341](https://github.com/Azure/LogicAppsUX/issues/3341)) ([65d0d4a](https://github.com/Azure/LogicAppsUX/commit/65d0d4a78dd8a2ac75a1841713aa19a2a5f7f898))
- **Data Mapper:** test button is disabled until you close and come back to test ([#3337](https://github.com/Azure/LogicAppsUX/issues/3337)) ([eaed46a](https://github.com/Azure/LogicAppsUX/commit/eaed46a67cbf0d758c6b725947a7fe168cf815e5))
- **Data Mapper:** unlimited inputs now show data type ([#3321](https://github.com/Azure/LogicAppsUX/issues/3321)) ([1aa496f](https://github.com/Azure/LogicAppsUX/commit/1aa496f5e2ef90ceb1ca6dc56729835a8ebee151))
- **designer:** Fixed a few Managed Identity bugs ([#3350](https://github.com/Azure/LogicAppsUX/issues/3350)) ([9a99ec8](https://github.com/Azure/LogicAppsUX/commit/9a99ec8b7419f3d1426e1d57113abbd1fc2a0422))
- **designer:** If possible convert expression into output token ([#3316](https://github.com/Azure/LogicAppsUX/issues/3316)) ([ddeecde](https://github.com/Azure/LogicAppsUX/commit/ddeecde1a849bc12cc634d86ade33b2528b75a17))
- **designer:** Update Validation Checks for URLs and Condition Editor ([#3346](https://github.com/Azure/LogicAppsUX/issues/3346)) ([d9b1eac](https://github.com/Azure/LogicAppsUX/commit/d9b1eac282bf09a7537a0b29bb4cc20d6d537872))
- **meta:** Fixed branch name in production build action ([#3336](https://github.com/Azure/LogicAppsUX/issues/3336)) ([c045b2b](https://github.com/Azure/LogicAppsUX/commit/c045b2b2fa16c6fb4d8bd641f77d85695bdaecfe))
- **vscode:** Add back feature to create logic apps when deploying ([#3352](https://github.com/Azure/LogicAppsUX/issues/3352)) ([6253ffe](https://github.com/Azure/LogicAppsUX/commit/6253ffe7dad274062c6524a65cbd2e52e03fe48a))

## [2.68.0](https://github.com/Azure/LogicAppsUX/compare/v2.67.0...v2.68.0) (2023-09-14)

### Features

- **Data Mapper:** Adding messaging to make input types more clear ([#3287](https://github.com/Azure/LogicAppsUX/issues/3287)) ([5bae2bb](https://github.com/Azure/LogicAppsUX/commit/5bae2bb5f58eaf24e8054fd80d139c0e81e2d4f4))

### Bug Fixes

- **designer:** Catch scenario when error object has an error object ([#3313](https://github.com/Azure/LogicAppsUX/issues/3313)) ([72af48a](https://github.com/Azure/LogicAppsUX/commit/72af48a46a3fd15bea6cabd28eb797229d6fff03))
- **designer:** FloatingActionMenuOutputs editor to lowercase serialized dynamically added property names (for consistency with V1) ([#3286](https://github.com/Azure/LogicAppsUX/issues/3286)) ([e30fd1e](https://github.com/Azure/LogicAppsUX/commit/e30fd1e7c3b317b546d0c22abb7f5ed7998c82af))

## [2.67.0](https://github.com/Azure/LogicAppsUX/compare/v2.66.0...v2.67.0) (2023-09-12)

### Features

- **Data Mapper:** deserialize sequence functions ([#3172](https://github.com/Azure/LogicAppsUX/issues/3172)) ([605dc39](https://github.com/Azure/LogicAppsUX/commit/605dc39e1ae0ecff812a827a2d01907ead17fd31))

### Bug Fixes

- **Data Mapper:** formatting fix for tool bar ([#3294](https://github.com/Azure/LogicAppsUX/issues/3294)) ([4059389](https://github.com/Azure/LogicAppsUX/commit/4059389dc67f213fac6c34dafaa2aaff7970e7c1))
- **data mapper:** able to add new connections to expanded cards ([#3278](https://github.com/Azure/LogicAppsUX/issues/3278)) ([dda2b0f](https://github.com/Azure/LogicAppsUX/commit/dda2b0f47288e7a650b213fe6b4a06dc7b0ff26c))
- **designer:** bind the search operations methods ([#3285](https://github.com/Azure/LogicAppsUX/issues/3285)) ([d4bce5b](https://github.com/Azure/LogicAppsUX/commit/d4bce5b10371325f71291273ea64a5029f6d0bf1))
- **designer:** Support Expression editor multiline ([#3290](https://github.com/Azure/LogicAppsUX/issues/3290)) ([7feeb17](https://github.com/Azure/LogicAppsUX/commit/7feeb1718cb20947a30e3030f943038f2600a01c))
- **standalone:** Resolve connection references in designer ([#3279](https://github.com/Azure/LogicAppsUX/issues/3279)) ([b6763e8](https://github.com/Azure/LogicAppsUX/commit/b6763e8b86fee0fda10d113a2e34e5ff03110a21))

## [2.66.0](https://github.com/Azure/LogicAppsUX/compare/v2.65.0...v2.66.0) (2023-09-07)

### Bug Fixes

- **Designer:** Add spaces in simple array editor to make more readable ([#3233](https://github.com/Azure/LogicAppsUX/issues/3233)) ([1907028](https://github.com/Azure/LogicAppsUX/commit/19070287a13a55badbe95efeb120a10551ceb0fa))
- **designer:** ErrorHandling - Added case to flow run error handling for flowStatus Running ([#3254](https://github.com/Azure/LogicAppsUX/issues/3254)) ([1d740a7](https://github.com/Azure/LogicAppsUX/commit/1d740a7f0bc82a0bc1c322b5c801b0e3816d153d))
- **designer:** Fixed Expression Editor have slow height change ([#3243](https://github.com/Azure/LogicAppsUX/issues/3243)) ([6cf6d29](https://github.com/Azure/LogicAppsUX/commit/6cf6d293ad409403641827a94d39853ece3a9655))
- **designer:** Settings Rework ([#3253](https://github.com/Azure/LogicAppsUX/issues/3253)) ([0577d6f](https://github.com/Azure/LogicAppsUX/commit/0577d6fe687916b2f8e309b82e85bb22c322dcc3))
- **designer:** Show skipped status for actions inside skipped scopes ([#3264](https://github.com/Azure/LogicAppsUX/issues/3264)) ([e1c49e1](https://github.com/Azure/LogicAppsUX/commit/e1c49e1e420fa9dbff856edcd8c4f9ce982b727f))
- **designer:** SimpleQueryBuilder Negatory Operators Deserializing Properly ([#3241](https://github.com/Azure/LogicAppsUX/issues/3241)) ([14c957e](https://github.com/Azure/LogicAppsUX/commit/14c957e67e53bdfad11578e1a36aef082ce4bf8c))
- **designer:** Update 'about' tab to handle falsy property values ([#3244](https://github.com/Azure/LogicAppsUX/issues/3244)) ([d538745](https://github.com/Azure/LogicAppsUX/commit/d53874573859295836b68d76d0610b1b3050ef0d))
- **vscode:** Fix check brew also when npm is package manager ([#3247](https://github.com/Azure/LogicAppsUX/issues/3247)) ([87fc027](https://github.com/Azure/LogicAppsUX/commit/87fc027626e2d4cc38dcd082255970d41a943ef8))

## [2.65.0](https://github.com/Azure/LogicAppsUX/compare/v2.64.0...v2.65.0) (2023-08-31)

### Bug Fixes

- **designer:** SimpleQueryBuilder Negatory Operators Serialization/Deserializing Properly ([#3232](https://github.com/Azure/LogicAppsUX/issues/3232)) ([3512b15](https://github.com/Azure/LogicAppsUX/commit/3512b1509b2f14b48e067354ccbc6ee18d97c075))

## [2.64.0](https://github.com/Azure/LogicAppsUX/compare/v2.63.0...v2.64.0) (2023-08-31)

### Features

- **designer:** Adding search service 2 to allow for custom search results ([#3201](https://github.com/Azure/LogicAppsUX/issues/3201)) ([0b8150a](https://github.com/Azure/LogicAppsUX/commit/0b8150af2e69bb26491a0194b8a7b95512e5914d))
- **designer:** inputsLocationSwapMap manifest property to support non-objects ([#3218](https://github.com/Azure/LogicAppsUX/issues/3218)) ([a670436](https://github.com/Azure/LogicAppsUX/commit/a670436fb78e9ec86c5e71a77a0b61d71a4718cc))
- **designer:** Split/Refactor FloatingActionMenu, adding FloatingActionMenuOutputs editor ([#3197](https://github.com/Azure/LogicAppsUX/issues/3197)) ([8c782a6](https://github.com/Azure/LogicAppsUX/commit/8c782a6dadaa8d76ed8a87807b438f66ad819bb7))

### Bug Fixes

- **designer:** Add property check for content in inputs/outputs object ([#3225](https://github.com/Azure/LogicAppsUX/issues/3225)) ([263b8f0](https://github.com/Azure/LogicAppsUX/commit/263b8f06042c98febb481e7bec27274d67972905))
- **designer:** Disable Browse preloading when in monitoring or readOnly view ([#3207](https://github.com/Azure/LogicAppsUX/issues/3207)) ([3bda939](https://github.com/Azure/LogicAppsUX/commit/3bda939a4cfe8a1c78cf1a99334af6529ef210e8))
- **designer:** Fix issue where deleting a token without focusing the editor would not update the property value ([#3220](https://github.com/Azure/LogicAppsUX/issues/3220)) ([b3504e0](https://github.com/Azure/LogicAppsUX/commit/b3504e0e3c72e93ef818cc9b6640a721a0efcb5f))
- **designer:** Fix search service operations ([#3212](https://github.com/Azure/LogicAppsUX/issues/3212)) ([56dd467](https://github.com/Azure/LogicAppsUX/commit/56dd4670318e0e23c29a55bf5f60541932d4f1ae))
- **Designer:** Fixed issue on the initialize variable action ([#3211](https://github.com/Azure/LogicAppsUX/issues/3211)) ([f679171](https://github.com/Azure/LogicAppsUX/commit/f679171bdef42a155746f4d1e2905c718fec862e))
- **Designer:** OAuth - Passed redirect url value from oauth setting in connection parameters ([#3224](https://github.com/Azure/LogicAppsUX/issues/3224)) ([47526fe](https://github.com/Azure/LogicAppsUX/commit/47526fe7a1223552113223e716dd06fdb9e95bf8))
- **designer:** Show Item token picker for loops ([#3208](https://github.com/Azure/LogicAppsUX/issues/3208)) ([a3c4360](https://github.com/Azure/LogicAppsUX/commit/a3c4360cf0bd3de66ee8e0eee309f46c4b261a81))

## [2.63.0](https://github.com/Azure/LogicAppsUX/compare/v2.62.2...v2.63.0) (2023-08-25)

## [2.62.0](https://github.com/Azure/LogicAppsUX/compare/v2.61.0...v2.62.0) (2023-08-25)

### Features

- **designer:** Allow a workflow to be resubmitted from a specific action if supported by the flow ([#3198](https://github.com/Azure/LogicAppsUX/issues/3198)) ([55d857f](https://github.com/Azure/LogicAppsUX/commit/55d857f0ec3fcde6fd63ca2900c0f88047c46483))

### Bug Fixes

- **Designer:** Modified several azure resource requests to be recursive ([#3193](https://github.com/Azure/LogicAppsUX/issues/3193)) ([5fc8fe1](https://github.com/Azure/LogicAppsUX/commit/5fc8fe15bcc4faa3b2999b162bffbe4e09e5b45b))

## [2.61.0](https://github.com/Azure/LogicAppsUX/compare/v2.60.0...v2.61.0) (2023-08-24)

### Features

- **designer:** Add no actions node for is read only mode ([#3173](https://github.com/Azure/LogicAppsUX/issues/3173)) ([252e12e](https://github.com/Azure/LogicAppsUX/commit/252e12e9aeca00268692173f8ff3130defe0430a))
- **Designer:** Added support for additional audiences on Managed Identity connections ([#3156](https://github.com/Azure/LogicAppsUX/issues/3156)) ([68eb661](https://github.com/Azure/LogicAppsUX/commit/68eb661a4179649ae69b5eb7b0a1a33d91a90e6f))
- **ia:** Support Premium IA in artifact service ([#3147](https://github.com/Azure/LogicAppsUX/issues/3147)) ([25ac33f](https://github.com/Azure/LogicAppsUX/commit/25ac33f2fe373e4542059198737286cf12f97d03))

### Bug Fixes

- **designer:** decode callback URL ([#3136](https://github.com/Azure/LogicAppsUX/issues/3136)) ([0e13f9b](https://github.com/Azure/LogicAppsUX/commit/0e13f9ba48644260ec830fb36b2a5a1ec2754f98))
- **designer:** Enable isDirty When removing Optional Parameter ([#3182](https://github.com/Azure/LogicAppsUX/issues/3182)) ([b5a3728](https://github.com/Azure/LogicAppsUX/commit/b5a372835da0d1899008e2005526737e9b6176d3))
- **Designer:** Ensure outputs merge only based on isRequestApiConnection FF ([#3180](https://github.com/Azure/LogicAppsUX/issues/3180)) ([add9d85](https://github.com/Azure/LogicAppsUX/commit/add9d85c2b49b6cfc3f2d573894b56917270752f))
- **Designer:** Fixed broken horizontal scrolling with shift + mouse wheel ([#3171](https://github.com/Azure/LogicAppsUX/issues/3171)) ([8f52469](https://github.com/Azure/LogicAppsUX/commit/8f5246907cfb95736eca73706933fbb0cc510f18))
- **Designer:** Fixed issue with some alternate swagger-based dynamic parameter formatting ([#3186](https://github.com/Azure/LogicAppsUX/issues/3186)) ([3b302a9](https://github.com/Azure/LogicAppsUX/commit/3b302a9f06baabd3bb7b89578a81d8dd3767757e))
- **Designer:** Fixing the foatingActionMenu root object for HybridTriggers ([#3148](https://github.com/Azure/LogicAppsUX/issues/3148)) ([d3e8f6a](https://github.com/Azure/LogicAppsUX/commit/d3e8f6a92bcc2007132675cc5491d53ce8e4844b))
- **designer:** Revert export function for deserialization of tokens ([#3160](https://github.com/Azure/LogicAppsUX/issues/3160)) ([2209bd0](https://github.com/Azure/LogicAppsUX/commit/2209bd0d6cd81ba543c1e13f53eb1f4558206843)), closes [#3137](https://github.com/Azure/LogicAppsUX/issues/3137)
- **designer:** swapInputsLocation replacing whole input instead of only replacing source item ([#3155](https://github.com/Azure/LogicAppsUX/issues/3155)) ([96ff127](https://github.com/Azure/LogicAppsUX/commit/96ff127a392fccf3fcb62f08201427fdf2812e50))

## [2.60.0](https://github.com/Azure/LogicAppsUX/compare/v2.59.0...v2.60.0) (2023-08-17)

### Bug Fixes

- **Designer:** Added alt text for the connector icon on action cards ([#3145](https://github.com/Azure/LogicAppsUX/issues/3145)) ([36ce47c](https://github.com/Azure/LogicAppsUX/commit/36ce47c1a8c298dd4bf6b621f02c88689559899c))
- **Designer:** Retry policy setting now de/serializing properly ([#3146](https://github.com/Azure/LogicAppsUX/issues/3146)) ([883390f](https://github.com/Azure/LogicAppsUX/commit/883390fe9358ec06ae896222d584247d71ff5c4f))

## [2.59.0](https://github.com/Azure/LogicAppsUX/compare/v2.58.0...v2.59.0) (2023-08-16)

### Features

- **data mapper:** Inline xslt filepicker ([#3085](https://github.com/Azure/LogicAppsUX/issues/3085)) ([2657fca](https://github.com/Azure/LogicAppsUX/commit/2657fca7a2e6b0fc7d5f5b3efccd4037f5565c27))
- **designer:** Export function for deserialization of tokens ([#3137](https://github.com/Azure/LogicAppsUX/issues/3137)) ([e5a6dde](https://github.com/Azure/LogicAppsUX/commit/e5a6ddef79a2e50cdf7c9a3ceacd28c80eb2ae63))
- **vscode:** Add icon to create command ([#3135](https://github.com/Azure/LogicAppsUX/issues/3135)) ([c89da93](https://github.com/Azure/LogicAppsUX/commit/c89da937907fecf05d6052eaae2600857e2fd8de))
- **vscode:** Logic App Workspace Local Settings Updates. ([#3087](https://github.com/Azure/LogicAppsUX/issues/3087)) ([d2501fb](https://github.com/Azure/LogicAppsUX/commit/d2501fb720cc61de534c799e364c517872e705b4))

### Bug Fixes

- **designer:** Settings not Deserializing ([#3143](https://github.com/Azure/LogicAppsUX/issues/3143)) ([5d393e0](https://github.com/Azure/LogicAppsUX/commit/5d393e0f4d272e0fed633731c87f016802fc981b))

## [2.58.0](https://github.com/Azure/LogicAppsUX/compare/v2.57.0...v2.58.0) (2023-08-14)

### Bug Fixes

- **Designer:** Fixed creation of phantom "cases" node input object ([#3119](https://github.com/Azure/LogicAppsUX/issues/3119)) ([9afeeb7](https://github.com/Azure/LogicAppsUX/commit/9afeeb78fd0419574a560e01344bbccf7320d0d9))
- **designer:** Ignore validation on parameterGroups without parameters ([#3129](https://github.com/Azure/LogicAppsUX/issues/3129)) ([84b5a8a](https://github.com/Azure/LogicAppsUX/commit/84b5a8ab23d49948ff38d40237c7ff9b1b527d54))
- **designer:** Show 'Edit in JSON' link for parameters ([#3108](https://github.com/Azure/LogicAppsUX/issues/3108)) ([49706b7](https://github.com/Azure/LogicAppsUX/commit/49706b71f585750c8c689af54eb7e030a49d0cf3))

## [2.57.0](https://github.com/Azure/LogicAppsUX/compare/v2.56.0...v2.57.0) (2023-08-10)

### Features

- **data mapper:** New category for custom functions ([#3074](https://github.com/Azure/LogicAppsUX/issues/3074)) ([8ca2121](https://github.com/Azure/LogicAppsUX/commit/8ca2121a4b7a1030f2e734bd4d221314e01036ac))

### Bug Fixes

- **designer:** Additional Parameters Not Fully Populating ([#3084](https://github.com/Azure/LogicAppsUX/issues/3084)) ([fb719fe](https://github.com/Azure/LogicAppsUX/commit/fb719fe891aa99b87e4b1aa85f6b72523a3ae920))
- **designer:** Auth Editor Deserialization ([#3105](https://github.com/Azure/LogicAppsUX/issues/3105)) ([b989829](https://github.com/Azure/LogicAppsUX/commit/b98982999b6394553d9c073f8b4e015996cac6c4))
- **Designer:** Fixed issue with empty Tracked Properties ([#3094](https://github.com/Azure/LogicAppsUX/issues/3094)) ([c0d1dc7](https://github.com/Azure/LogicAppsUX/commit/c0d1dc71bf897816eab764465e5f7f8e13aace79))
- **designer:** make it so that customEnums require enum property to also be set ([#3072](https://github.com/Azure/LogicAppsUX/issues/3072)) ([86c73a9](https://github.com/Azure/LogicAppsUX/commit/86c73a9f02e39ce868387873ccba1f71c95e8ae0))
- **designer:** querybuilder valdiation ([#3100](https://github.com/Azure/LogicAppsUX/issues/3100)) ([2f579f4](https://github.com/Azure/LogicAppsUX/commit/2f579f4338ab370217cfc4bc181c1c979942672f))
- **desinger:** Support Serialization of adding new lines in html editor ([#3099](https://github.com/Azure/LogicAppsUX/issues/3099)) ([446c854](https://github.com/Azure/LogicAppsUX/commit/446c85418ae2ceaecef6f4a07a387ea70b20cb58))

## [2.56.0](https://github.com/Azure/LogicAppsUX/compare/v2.55.0...v2.56.0) (2023-08-03)

### Features

- **data mapper:** XPath function now works (when backend makes metadata change) ([#3065](https://github.com/Azure/LogicAppsUX/issues/3065)) ([66a1666](https://github.com/Azure/LogicAppsUX/commit/66a16662bd2dd2bf585fed25bd85f9425b34eedd))
- **designer:** Add IConnectionParameterEditorService to support customization of connections fields ([#3038](https://github.com/Azure/LogicAppsUX/issues/3038)) ([402cf8a](https://github.com/Azure/LogicAppsUX/commit/402cf8a798dc507a7b6e8a6608df4edd09074699))
- **designer:** File system client configure password as App settings ([#3069](https://github.com/Azure/LogicAppsUX/issues/3069)) ([cb80021](https://github.com/Azure/LogicAppsUX/commit/cb800216e756e25836214945d9d0a823a2b4da1a))
- **ia:** Support Premium IA in artifact service ([#3063](https://github.com/Azure/LogicAppsUX/issues/3063)) ([07eaaed](https://github.com/Azure/LogicAppsUX/commit/07eaaed170001d6ac3753c61cdc93c859effe9ec))

### Bug Fixes

- **data mapper:** custom code input ([#3049](https://github.com/Azure/LogicAppsUX/issues/3049)) ([6de3020](https://github.com/Azure/LogicAppsUX/commit/6de302011f7387959dd7ae7f0758676bffe524ba))
- **Designer:** Disabled operation schema validation when parsing incoming swaggers ([#3066](https://github.com/Azure/LogicAppsUX/issues/3066)) ([b492287](https://github.com/Azure/LogicAppsUX/commit/b492287aa70d5999251dd62f28a7a353ce99f533))
- **vscode:** Add swagger to supported operations list ([#3076](https://github.com/Azure/LogicAppsUX/issues/3076)) ([b792a97](https://github.com/Azure/LogicAppsUX/commit/b792a977aee87feae3496c5e00a35097a0650f02))

## [2.55.0](https://github.com/Azure/LogicAppsUX/compare/v2.54.0...v2.55.0) (2023-07-31)

### Bug Fixes

- **designer:** Nested loops actions update in monitoring view ([#3050](https://github.com/Azure/LogicAppsUX/issues/3050)) ([24e71b3](https://github.com/Azure/LogicAppsUX/commit/24e71b34b7b60ac7df36da54b1a3a4743ac7de40))
- **vscode:** Update functions worker runtime to only node ([#3033](https://github.com/Azure/LogicAppsUX/issues/3033)) ([e052677](https://github.com/Azure/LogicAppsUX/commit/e0526773886774997116741223f93b20bfc7ff6c))

## [2.54.0](https://github.com/Azure/LogicAppsUX/compare/v2.53.0...v2.54.0) (2023-07-27)

### Features

- **designer:** Validate empty required actions inputs prior saving ([#3040](https://github.com/Azure/LogicAppsUX/issues/3040)) ([da2020d](https://github.com/Azure/LogicAppsUX/commit/da2020da3a36fff1a62344beff75306412124442))

## [2.53.0](https://github.com/Azure/LogicAppsUX/compare/v2.52.0...v2.53.0) (2023-07-25)

### Features

- **copilot:** Copilot Get Started input and suggested flow components ([#2992](https://github.com/Azure/LogicAppsUX/issues/2992)) ([0af6397](https://github.com/Azure/LogicAppsUX/commit/0af639728040b8560ce7450f7464dd7b0722064c))
- **designer:** Add EditorService to allow custom components ([#2996](https://github.com/Azure/LogicAppsUX/issues/2996)) ([7915771](https://github.com/Azure/LogicAppsUX/commit/7915771102a50490977b6a6048e16d27c94b2a3a))
- **designer:** Adding buttons to fill all / remove all advanced parameters ([#3007](https://github.com/Azure/LogicAppsUX/issues/3007)) ([c273aa5](https://github.com/Azure/LogicAppsUX/commit/c273aa5eebffc898e445ae2912740e41e31450cf))
- **designer:** Better surface workflow search as a button ([#3025](https://github.com/Azure/LogicAppsUX/issues/3025)) ([6d7ed51](https://github.com/Azure/LogicAppsUX/commit/6d7ed5151b64c231a46c07b173334fa8eb96d51e))
- **vscode:** Azurite Start & Default Location ([#3006](https://github.com/Azure/LogicAppsUX/issues/3006)) ([4c06ab9](https://github.com/Azure/LogicAppsUX/commit/4c06ab909f46fe9c355c3d23ce3f70bebe11d39d)), closes [#2958](https://github.com/Azure/LogicAppsUX/issues/2958)

### Bug Fixes

- **data mapper:** functions missing on load schema ([#3030](https://github.com/Azure/LogicAppsUX/issues/3030)) ([f359e29](https://github.com/Azure/LogicAppsUX/commit/f359e298476c31a7efd1a1d570c119c864cd9da2))
- **designer:** Add dynamic inputs for serialized workflow ([#3000](https://github.com/Azure/LogicAppsUX/issues/3000)) ([fa5670b](https://github.com/Azure/LogicAppsUX/commit/fa5670b778d945399c7a4b7a94a7964a626f9b9a))
- **Designer:** Fixed issue with some MI ServiceProvider connections failing ([#3020](https://github.com/Azure/LogicAppsUX/issues/3020)) ([b2730df](https://github.com/Azure/LogicAppsUX/commit/b2730df7a80a003b0b5376c75ce6e21602d8095d))
- **Designer:** Fixed regression with dynamic invoke requests ([#3024](https://github.com/Azure/LogicAppsUX/issues/3024)) ([6bd4461](https://github.com/Azure/LogicAppsUX/commit/6bd4461e9191740f822ffc0c6a08ff38524f511d))
- **Designer:** Fixed small type import build issue ([#3021](https://github.com/Azure/LogicAppsUX/issues/3021)) ([dfb72ff](https://github.com/Azure/LogicAppsUX/commit/dfb72fffa013f6dc11923c7fdb2e815ccf1a98a9))
- **designer:** html editor dropdown item active being darker than it should ([#3014](https://github.com/Azure/LogicAppsUX/issues/3014)) ([b47bacc](https://github.com/Azure/LogicAppsUX/commit/b47bacce80d6fecc8d913fa7168e26b4ca90059d))
- **designer:** token picker support for small screens ([#3013](https://github.com/Azure/LogicAppsUX/issues/3013)) ([eb4852c](https://github.com/Azure/LogicAppsUX/commit/eb4852caab70a40fa30589731fb1ba88cee61791))

## [2.52.0](https://github.com/Azure/LogicAppsUX/compare/v2.51.0...v2.52.0) (2023-07-20)

### Bug Fixes

- **desinger:** Fix type issue breaking portal build ([#3004](https://github.com/Azure/LogicAppsUX/issues/3004)) ([ae469f7](https://github.com/Azure/LogicAppsUX/commit/ae469f7ad63e39c5fc0cb42ce9e9a8b8c5d215a7))

## [2.51.0](https://github.com/Azure/LogicAppsUX/compare/v2.50.1...v2.51.0) (2023-07-20)

### [2.50.1](https://github.com/Azure/LogicAppsUX/compare/v2.50.0...v2.50.1) (2023-07-20)

### Bug Fixes

- **designer:** Update upstream nodes when updating run after ([#3002](https://github.com/Azure/LogicAppsUX/issues/3002)) ([3792db3](https://github.com/Azure/LogicAppsUX/commit/3792db39f4cdb957f3babb0c4fc4d5a38b1da0ce))
- **desinger:** Fix type issue breaking portal build ([#3003](https://github.com/Azure/LogicAppsUX/issues/3003)) ([2068d70](https://github.com/Azure/LogicAppsUX/commit/2068d70d16af3ea186b4ae6a698e4e16ac49d716))

## [2.50.0](https://github.com/Azure/LogicAppsUX/compare/v2.49.0...v2.50.0) (2023-07-20)

### Bug Fixes

- **designer:** Default to off on content transfer chunking in stateless workflows ([#2997](https://github.com/Azure/LogicAppsUX/issues/2997)) ([117c725](https://github.com/Azure/LogicAppsUX/commit/117c7257202162a32319dff196348be0df144e4c))

## [2.49.0](https://github.com/Azure/LogicAppsUX/compare/v2.48.0...v2.49.0) (2023-07-18)

### Features

- **Designer:** Added node selection functionality options ([#2988](https://github.com/Azure/LogicAppsUX/issues/2988)) ([e673d09](https://github.com/Azure/LogicAppsUX/commit/e673d09352dde8b1655c995e602beba439584910))

### Bug Fixes

- **designer:** Update operations connector id for x12 and edifact ([#2982](https://github.com/Azure/LogicAppsUX/issues/2982)) ([99c168e](https://github.com/Azure/LogicAppsUX/commit/99c168edea7a64f9c2255ebd30b62677307efb67))

## [2.48.0](https://github.com/Azure/LogicAppsUX/compare/v2.47.0...v2.48.0) (2023-07-17)

### Features

- **vscode:** Add microsoft csharp extension as dependency ([#2978](https://github.com/Azure/LogicAppsUX/issues/2978)) ([69fe613](https://github.com/Azure/LogicAppsUX/commit/69fe613f0374347136a46d615eccdb748a6fc105))

### Bug Fixes

- **designer:** Add missing template functions ([#2969](https://github.com/Azure/LogicAppsUX/issues/2969)) ([cadcffe](https://github.com/Azure/LogicAppsUX/commit/cadcffe1c12a16083daba984fd8a75b1d58ccc78))
- **designer:** Complex Array Editor - Support for nested items ([#2979](https://github.com/Azure/LogicAppsUX/issues/2979)) ([0eebf88](https://github.com/Azure/LogicAppsUX/commit/0eebf88bda57ecc45577ee85ee8fdabc37e94a91))
- **Designer:** Fixed bug with subscription fetch request `nextlink`s ([#2980](https://github.com/Azure/LogicAppsUX/issues/2980)) ([6dd8400](https://github.com/Azure/LogicAppsUX/commit/6dd840088789d2da83941eb2eb91e547dd049814))
- **vscode:** Api version in api hub service ([#2974](https://github.com/Azure/LogicAppsUX/issues/2974)) ([f6eb8a2](https://github.com/Azure/LogicAppsUX/commit/f6eb8a258d043f13e2f849ce62a595416a98d499))

## [2.47.0](https://github.com/Azure/LogicAppsUX/compare/v2.46.0...v2.47.0) (2023-07-13)

### Bug Fixes

- **Designer:** Fixed rare connection creation parameter null-safety issue ([#2960](https://github.com/Azure/LogicAppsUX/issues/2960)) ([f104bbb](https://github.com/Azure/LogicAppsUX/commit/f104bbb97b2edb6ae93a9d02ae74170f40e18492))

## [2.46.0](https://github.com/Azure/LogicAppsUX/compare/v2.45.0...v2.46.0) (2023-07-12)

### Features

- **chatbot:** Chatbot UI components ([#2869](https://github.com/Azure/LogicAppsUX/issues/2869)) ([1b78fde](https://github.com/Azure/LogicAppsUX/commit/1b78fde2629cc9e01de7e8970b30483d06f26c28))

### Bug Fixes

- **Designer:** Fixed dynamic data regression ([#2954](https://github.com/Azure/LogicAppsUX/issues/2954)) ([8f1c185](https://github.com/Azure/LogicAppsUX/commit/8f1c185f2e26e3652554ca2923a71addee1c5f95))
- **vscode:** Update services API version ([#2957](https://github.com/Azure/LogicAppsUX/issues/2957)) ([90cd9c0](https://github.com/Azure/LogicAppsUX/commit/90cd9c00044be5dc9dd9f44ec70fcd7c5063c8bc))

## [2.45.0](https://github.com/Azure/LogicAppsUX/compare/v2.44.0...v2.45.0) (2023-07-11)

### Features

- **Data Mapper:** Allow save and load of metadata file ([#2809](https://github.com/Azure/LogicAppsUX/issues/2809)) ([8beb9e0](https://github.com/Azure/LogicAppsUX/commit/8beb9e0f5ca37f4588b418f188580f390a0af955))

### Bug Fixes

- **Designer:** Added state variable for dynamic data load completeness ([#2928](https://github.com/Azure/LogicAppsUX/issues/2928)) ([f1681c5](https://github.com/Azure/LogicAppsUX/commit/f1681c59ebeb95da98f07afb05fc52e7d7943aad))
- **designer:** Fix unexpected caching for getTreeDynamicValues ([#2933](https://github.com/Azure/LogicAppsUX/issues/2933)) ([3becdc9](https://github.com/Azure/LogicAppsUX/commit/3becdc96dbede96c4dc1a67fc2a93a8ef56a4668))
- **Designer:** Terminate now shows `Code` and `Message` inputs on custom statuses ([#2940](https://github.com/Azure/LogicAppsUX/issues/2940)) ([8b288e8](https://github.com/Azure/LogicAppsUX/commit/8b288e8528de20779a4d689ff512a43003d6a5b4))
- **Designer:** Workflow Parameter empty error fixes ([#2926](https://github.com/Azure/LogicAppsUX/issues/2926)) ([254f0db](https://github.com/Azure/LogicAppsUX/commit/254f0db9d1bb3811e5f84cb5848cdeefc9ad7529))
- **vscode:** Add logic app icon path for light theme ([#2942](https://github.com/Azure/LogicAppsUX/issues/2942)) ([2d65a16](https://github.com/Azure/LogicAppsUX/commit/2d65a1696dea9eef2b6cf0eeff49904b568a6c75))

## [2.44.0](https://github.com/Azure/LogicAppsUX/compare/v2.43.0...v2.44.0) (2023-07-06)

### Bug Fixes

- **designer:** Added support for enums in simple array editor ([#2919](https://github.com/Azure/LogicAppsUX/issues/2919)) ([5ce5b33](https://github.com/Azure/LogicAppsUX/commit/5ce5b339b120cd084c80098fd650c4f092d045fd))

## [2.43.0](https://github.com/Azure/LogicAppsUX/compare/v2.42.0...v2.43.0) (2023-07-05)

### Features

- **designer:** Add support for x12 and edifact connector ([#2893](https://github.com/Azure/LogicAppsUX/issues/2893)) ([07d7bd0](https://github.com/Azure/LogicAppsUX/commit/07d7bd0166a86bccf9f859d570468f294349f826))

### Bug Fixes

- **designer:** Consumption - Fixing dynamic content api calls for Open Api Connection ([#2895](https://github.com/Azure/LogicAppsUX/issues/2895)) ([c9f7cab](https://github.com/Azure/LogicAppsUX/commit/c9f7cab61707d518817ccfa8330843303a3f4e95))
- **designer:** revert designer type dropdown ([#2911](https://github.com/Azure/LogicAppsUX/issues/2911)) ([7de0bfc](https://github.com/Azure/LogicAppsUX/commit/7de0bfc1388ca977456eb079eee136d8b89b8ac1))
- **Designer:** Select Connection panel now shows recently created connections ([#2890](https://github.com/Azure/LogicAppsUX/issues/2890)) ([045b698](https://github.com/Azure/LogicAppsUX/commit/045b698cf57feba4cd8a0a9338ad8cdd404a2902))
- **designer:** Serialization of expressions within casted parameters failing validation ([#2889](https://github.com/Azure/LogicAppsUX/issues/2889)) ([a6c975b](https://github.com/Azure/LogicAppsUX/commit/a6c975b9ccfd29b7f43958270b5f0d2a8c007af2))
- **vscode:** Revert invalid connection message when switching blades ([#2892](https://github.com/Azure/LogicAppsUX/issues/2892)) ([fcb4e34](https://github.com/Azure/LogicAppsUX/commit/fcb4e34e4b119023a710a648f05d389d851a6769)), closes [#2783](https://github.com/Azure/LogicAppsUX/issues/2783)

## [2.42.0](https://github.com/Azure/LogicAppsUX/compare/v2.41.0...v2.42.0) (2023-06-30)

### Bug Fixes

- **Data Mapper:** Added React Query to DM lib to fix app crash ([#2880](https://github.com/Azure/LogicAppsUX/issues/2880)) ([21ed784](https://github.com/Azure/LogicAppsUX/commit/21ed784a196f94475a4f749d99d224da544e9322))

## [2.41.0](https://github.com/Azure/LogicAppsUX/compare/v2.40.0...v2.41.0) (2023-06-29)

### Bug Fixes

- **Designer:** Fixed dropdown options state bug ([#2879](https://github.com/Azure/LogicAppsUX/issues/2879)) ([1cba92a](https://github.com/Azure/LogicAppsUX/commit/1cba92a697ba769ad48002dd50e9d426e57be3d6))
- **desinger:** Fix portal build ([#2877](https://github.com/Azure/LogicAppsUX/issues/2877)) ([294df77](https://github.com/Azure/LogicAppsUX/commit/294df774aa12543fb744bfcb5c59ac30b0cfdcc7))

## [2.40.0](https://github.com/Azure/LogicAppsUX/compare/v2.39.0...v2.40.0) (2023-06-29)

## [2.39.0](https://github.com/Azure/LogicAppsUX/compare/v2.38.0...v2.39.0) (2023-06-29)

### Bug Fixes

- **Designer:** Fixed consumption standalone connection serialization ([#2873](https://github.com/Azure/LogicAppsUX/issues/2873)) ([384145d](https://github.com/Azure/LogicAppsUX/commit/384145d9c375696ae1af53724ef4eb06d9a16b2c))

## [2.38.0](https://github.com/Azure/LogicAppsUX/compare/v2.37.0...v2.38.0) (2023-06-28)

## [2.38.0](https://github.com/Azure/LogicAppsUX/compare/v2.37.0...v2.38.0) (2023-06-28)

### Bug Fixes

- **designer:** Dictionary Editor - object support & Authentication Editor - support for collapsed editor ([#2854](https://github.com/Azure/LogicAppsUX/issues/2854)) ([a2fd568](https://github.com/Azure/LogicAppsUX/commit/a2fd5680a3469762691bc30a0ca04ddd156dbff3))
- **designer:** Disable selection of invalid connections for selectConnectionsTab ([#2816](https://github.com/Azure/LogicAppsUX/issues/2816)) ([2e76692](https://github.com/Azure/LogicAppsUX/commit/2e76692c45c7c5919a0176843d95e37a97d4e2ce))
- **designer:** Show lock icon for actions with secure inputs/outputs ([#2866](https://github.com/Azure/LogicAppsUX/issues/2866)) ([66c3899](https://github.com/Azure/LogicAppsUX/commit/66c38994c69f348ddda30dea9ad2b3e7aec5db01))
- **designer:** Update Lexical to fix componentGovernance security vulnerabilities ([#2868](https://github.com/Azure/LogicAppsUX/issues/2868)) ([dac86a9](https://github.com/Azure/LogicAppsUX/commit/dac86a93dff54f8b39275aee2f906783da7a7235))

## [2.37.0](https://github.com/Azure/LogicAppsUX/compare/v2.36.0...v2.37.0) (2023-06-27)

### Features

- **designer:** Consumption: Adding dynamic content api support for Open Api ([#2857](https://github.com/Azure/LogicAppsUX/issues/2857)) ([4eb98a2](https://github.com/Azure/LogicAppsUX/commit/4eb98a245e7db5108f23ecdc49cca26f8590b309))
- **Designer:** Errors Panel ([#2843](https://github.com/Azure/LogicAppsUX/issues/2843)) ([21d1ebe](https://github.com/Azure/LogicAppsUX/commit/21d1ebe74d3e6d8ffdb940657d9fb0ba1643c4bb))
- **vscode:** Organize Azure workspace commands into submenu ([#2840](https://github.com/Azure/LogicAppsUX/issues/2840)) ([da02da5](https://github.com/Azure/LogicAppsUX/commit/da02da598fac298a50baa88a4e9941859cb5d01a))

### Bug Fixes

- **Designer:** Fixed filtering of cloud capability parameters ([#2852](https://github.com/Azure/LogicAppsUX/issues/2852)) ([9582f56](https://github.com/Azure/LogicAppsUX/commit/9582f56f5f47d215e1d309bc8256bd63f1236735))
- **designer:** Moving Token Picker EntryPoint to Left ([#2406](https://github.com/Azure/LogicAppsUX/issues/2406)) ([7c9c883](https://github.com/Azure/LogicAppsUX/commit/7c9c8831c2ec651d1235c6ec24f1cffeb86ffdab))
- **designer:** Undefined edge on new workflow causing operation panel to get stuck ([#2862](https://github.com/Azure/LogicAppsUX/issues/2862)) ([ace56ec](https://github.com/Azure/LogicAppsUX/commit/ace56eccc779cc121b339cff51dbe67f32eb340e))
- **vscode:** Filter connectors and operations according to azure connection capabilities ([#2851](https://github.com/Azure/LogicAppsUX/issues/2851)) ([1e1eae8](https://github.com/Azure/LogicAppsUX/commit/1e1eae823fa9b1f80d35b77f66cdc9c9a4876840))
- **vscode:** Get correct resource group name to get connections in monitoring view ([#2844](https://github.com/Azure/LogicAppsUX/issues/2844)) ([80a74f1](https://github.com/Azure/LogicAppsUX/commit/80a74f1319946faa3c884f19e553e35235626097))

## [2.36.0](https://github.com/Azure/LogicAppsUX/compare/v2.35.0...v2.36.0) (2023-06-23)

- **designer:** Adding serialization and deserialization changes for Open Api Connection ([#2834](https://github.com/Azure/LogicAppsUX/issues/2834)) ([a1c7d41](https://github.com/Azure/LogicAppsUX/commit/a1c7d41f7d7a84ab8ace0f8cb59ba5316293574b))

- **Designer:** Fixed breaking log in Portal ([#2839](https://github.com/Azure/LogicAppsUX/issues/2839)) ([1883e05](https://github.com/Azure/LogicAppsUX/commit/1883e05965617754fbe31b9c31b6eec258a4e024))
- **Designer:** Removed duplicate service calls ([#2806](https://github.com/Azure/LogicAppsUX/issues/2806)) ([52741e2](https://github.com/Azure/LogicAppsUX/commit/52741e2415b5245b9b25bc72dcd855261b688d53))
- **vscode:** Resolution of local settings when creating access policy for connection ([#2824](https://github.com/Azure/LogicAppsUX/issues/2824)) ([531a286](https://github.com/Azure/LogicAppsUX/commit/531a286fecaf63a7f53ec0c6f655a42bfdcfef3b))

## [2.35.0](https://github.com/Azure/LogicAppsUX/compare/v2.34.0...v2.35.0) (2023-06-22)

### Features

- **designer:** Adding initial support for Open Api Connection for consumption ([#2812](https://github.com/Azure/LogicAppsUX/issues/2812)) ([6bb91c4](https://github.com/Azure/LogicAppsUX/commit/6bb91c4e9cc42864f6c1dca6ae7a5726b8b826c2))
- **vscode:** Allow custom code functions to be written in VSCode ([#2757](https://github.com/Azure/LogicAppsUX/issues/2757)) ([467d3cc](https://github.com/Azure/LogicAppsUX/commit/467d3ccf94d29f185774271efa66596204c42a96)), closes [#2644](https://github.com/Azure/LogicAppsUX/issues/2644) [#2427](https://github.com/Azure/LogicAppsUX/issues/2427)

### Bug Fixes

- **designer:** Parse of xml inputs/outputs in monitoring view ([#2798](https://github.com/Azure/LogicAppsUX/issues/2798)) ([f1c489c](https://github.com/Azure/LogicAppsUX/commit/f1c489c8aa7c1df964abad91ac1445c795b1ba98))
- **Designer:** Add connectionReferenceKeyFormat for hybrid triggers for deserialization ([#2787](https://github.com/Azure/LogicAppsUX/issues/2787)) ([eabb5f9](https://github.com/Azure/LogicAppsUX/commit/eabb5f93297febbca1181d594c8c448379f160f0))
- **Designer:** Added conditions for Parameters panel loading state ([#2785](https://github.com/Azure/LogicAppsUX/issues/2785)) ([b6b6fba](https://github.com/Azure/LogicAppsUX/commit/b6b6fba918ce3a090db5d18c59fd180307d68d17))
- **designer:** Added timeDifference template Function ([#2801](https://github.com/Azure/LogicAppsUX/issues/2801)) ([d499457](https://github.com/Azure/LogicAppsUX/commit/d499457d0b144a47cdab7a3388ce90c9bbd2411e))
- **designer:** Checks all nodes (including switch cases) for nodeIds when adding a new node ([#2814](https://github.com/Azure/LogicAppsUX/issues/2814)) ([3cf16e7](https://github.com/Azure/LogicAppsUX/commit/3cf16e75de5effa3957310101c78bf8b8a8aef99))
- **designer:** Parameters with visibility "internal" should hide in UI on flow load ([#2786](https://github.com/Azure/LogicAppsUX/issues/2786)) ([6e875f3](https://github.com/Azure/LogicAppsUX/commit/6e875f340b7a26401d9623beca6577465b40e794))
- **designer:** Removing isConsumption option to more feature specific one ([#2802](https://github.com/Azure/LogicAppsUX/issues/2802)) ([6bc85ae](https://github.com/Azure/LogicAppsUX/commit/6bc85ae149d0f1c5fcf3b81b155ff919978238b9))
- **Designer:** Workflows without triggers now properly deserialize ([#2804](https://github.com/Azure/LogicAppsUX/issues/2804)) ([4e5a294](https://github.com/Azure/LogicAppsUX/commit/4e5a29445442231f9b5fe0f5d2f10edd3b11009f))
- **vscode:** Invalid connection message when switching blades/tabs in vscode ([#2783](https://github.com/Azure/LogicAppsUX/issues/2783)) ([12c81dd](https://github.com/Azure/LogicAppsUX/commit/12c81dd9eb52d2282dbc3f1515bc2a55d212a94c))

## [2.34.0](https://github.com/Azure/LogicAppsUX/compare/v2.33.0...v2.34.0) (2023-06-20)

### Features

- **Designer:** Added request retry to all services ([#2794](https://github.com/Azure/LogicAppsUX/issues/2794)) ([53b64ba](https://github.com/Azure/LogicAppsUX/commit/53b64ba47dabef0e9d7943de6d892246ed69486a))

### Bug Fixes

- **Data Mapper:** Fix JSON loops to not be arrays ([#2781](https://github.com/Azure/LogicAppsUX/issues/2781)) ([d0619bb](https://github.com/Azure/LogicAppsUX/commit/d0619bb6766bdc214d0e87267472cf2c01c8e4ff))
- **designer:** Disable Change Connection when in readonly ([#2791](https://github.com/Azure/LogicAppsUX/issues/2791)) ([2e5cf63](https://github.com/Azure/LogicAppsUX/commit/2e5cf63231d8fb2aa3e01a6bf68a4b66dfeaf832))
- **designer:** Prevent panel from closing if `intl` is updated ([#2780](https://github.com/Azure/LogicAppsUX/issues/2780)) ([495cca4](https://github.com/Azure/LogicAppsUX/commit/495cca41765b5d61fc2a20205c73f907a2b92eca))
- **Designer:** Search requests now only rely on nextlinks, not the value length ([#2793](https://github.com/Azure/LogicAppsUX/issues/2793)) ([79f12f2](https://github.com/Azure/LogicAppsUX/commit/79f12f270a997d4e8b33f04ca84b4583a147c731))
- **designer:** Updating the connection service options according to their offering ([#2796](https://github.com/Azure/LogicAppsUX/issues/2796)) ([cefb6c9](https://github.com/Azure/LogicAppsUX/commit/cefb6c99b06e9ff013cf45177acdc39358bb4291))

## [2.33.0](https://github.com/Azure/LogicAppsUX/compare/v2.32.0...v2.33.0) (2023-06-19)

### Features

- **chatbot:** Chatbot input and user message component ([#2759](https://github.com/Azure/LogicAppsUX/issues/2759)) ([31ad7d0](https://github.com/Azure/LogicAppsUX/commit/31ad7d071fbfb9fe1bf4216724992a0c5fd8fe2e))

### Bug Fixes

- **Designer:** Consumption - Adding swagger function actions ([#2734](https://github.com/Azure/LogicAppsUX/issues/2734)) ([754080b](https://github.com/Azure/LogicAppsUX/commit/754080b83dc2ea9b8d421f63d6fd7c60f3210f0d))
- **designer:** Consumption - Fixing integration account operations and their manifests ([#2772](https://github.com/Azure/LogicAppsUX/issues/2772)) ([d31fdf1](https://github.com/Azure/LogicAppsUX/commit/d31fdf196ae06ecfa0ff9004fa948ca8d71f9eee))
- **desinger:** Simple Array Editor support for non-string types in expanded mode ([#2776](https://github.com/Azure/LogicAppsUX/issues/2776)) ([9a6024e](https://github.com/Azure/LogicAppsUX/commit/9a6024ef9e76a6ef89613636f2ae9d23a9766ec3))

## [2.32.0](https://github.com/Azure/LogicAppsUX/compare/v2.31.0...v2.32.0) (2023-06-16)

## [2.25.0](https://github.com/Azure/LogicAppsUX/compare/v2.24.0...v2.25.0) (2023-06-01)

### Features

- **designer:** Adding batch trigger operation and manifest in Consumption ([#2767](https://github.com/Azure/LogicAppsUX/issues/2767)) ([a50c18b](https://github.com/Azure/LogicAppsUX/commit/a50c18bae4d8d197de8750bb5f29dfe216bb6bfc))

### Bug Fixes

- **designer:** Consumption - Fixing API Management service serialization and deserialization ([#2761](https://github.com/Azure/LogicAppsUX/issues/2761)) ([34f419c](https://github.com/Azure/LogicAppsUX/commit/34f419c17a8cf8a40df59ba9b3c29ae4fd301d22))
- **designer:** Consumption - Fixing dynamic content in child workflow manifest and loading in designer ([#2771](https://github.com/Azure/LogicAppsUX/issues/2771)) ([044f177](https://github.com/Azure/LogicAppsUX/commit/044f177165cfbcd784d5d142a85380426b7f780f))

## [2.31.0](https://github.com/Azure/LogicAppsUX/compare/v2.30.0...v2.31.0) (2023-06-15)

### Features

- **Data Mapper:** JSON Sequence serialization ([#2738](https://github.com/Azure/LogicAppsUX/issues/2738)) ([6c2bfb7](https://github.com/Azure/LogicAppsUX/commit/6c2bfb78feb4906a6c6df902903b3386382a1788))

### Bug Fixes

- **Designer:** Add missing quotes around reference key for hybrid triggers ([#2745](https://github.com/Azure/LogicAppsUX/issues/2745)) ([97f5bbf](https://github.com/Azure/LogicAppsUX/commit/97f5bbf09d89b1a4da83fc5fd58de1a8a0e7eea5))
- **Power Automate:** Correctly set data-automation-ids on DOM elements ([#2672](https://github.com/Azure/LogicAppsUX/issues/2672)) ([def2d48](https://github.com/Azure/LogicAppsUX/commit/def2d4815f3a674cd81c52ab808c63cf273c1024))

## [2.30.0](https://github.com/Azure/LogicAppsUX/compare/v2.29.0...v2.30.0) (2023-06-15)

## [2.29.0](https://github.com/Azure/LogicAppsUX/compare/v2.28.0...v2.29.0) (2023-06-14)

### Features

- **designer:** Adding metadata as input parameters for manifest based custom swaggers ([#2747](https://github.com/Azure/LogicAppsUX/issues/2747)) ([82f2099](https://github.com/Azure/LogicAppsUX/commit/82f2099d58b642d6640e0f111b03c0258348b147))

### Bug Fixes

- **Designer:** Fixed trigger serialization check ([#2737](https://github.com/Azure/LogicAppsUX/issues/2737)) ([853ba40](https://github.com/Azure/LogicAppsUX/commit/853ba403e6f6ddcb54966c4d5462fbd7670a3864))

## [2.28.0](https://github.com/Azure/LogicAppsUX/compare/v2.27.0...v2.28.0) (2023-06-13)

## [2.23.0](https://github.com/Azure/LogicAppsUX/compare/v2.22.0...v2.23.0) (2023-05-31)

### Features

- **Data Mapper:** Able to select schemas from folders within 'Schemas' folder ([#2700](https://github.com/Azure/LogicAppsUX/issues/2700)) ([3999cd3](https://github.com/Azure/LogicAppsUX/commit/3999cd312d414e2a915ace6a65c0cda46d64db87))
- **Data Mapper:** XML sequence serialization ([#2731](https://github.com/Azure/LogicAppsUX/issues/2731)) ([c2e7189](https://github.com/Azure/LogicAppsUX/commit/c2e7189c55629b61d0f2608cdf5a3d4c75af1f1c))
- **designer:** Add 'search' function for conditional param dropdown ([#2718](https://github.com/Azure/LogicAppsUX/issues/2718)) ([aad4d33](https://github.com/Azure/LogicAppsUX/commit/aad4d3349f725568762825f5ab9f88dab3290bda))
- **designer:** Add retry history panel to the monitoring view ([#2721](https://github.com/Azure/LogicAppsUX/issues/2721)) ([4ca69f7](https://github.com/Azure/LogicAppsUX/commit/4ca69f75cf94fd9c3f7e5a46b59dd623a6d55c35))

### Bug Fixes

- **designer:** dictionary and array editor collapsed views erroring ([#2733](https://github.com/Azure/LogicAppsUX/issues/2733)) ([7bca872](https://github.com/Azure/LogicAppsUX/commit/7bca87278f2ea634de3cff7a0894130b6a1bedde))
- **designer:** Localize panel tab labels ([#2722](https://github.com/Azure/LogicAppsUX/issues/2722)) ([5cf8eb1](https://github.com/Azure/LogicAppsUX/commit/5cf8eb1a5a626c7a58658c63fd6c579579f54fa4))

## [2.27.0](https://github.com/Azure/LogicAppsUX/compare/v2.26.0...v2.27.0) (2023-06-12)

### Features

- **Data Mapper:** Start the map metadata generation ([#2709](https://github.com/Azure/LogicAppsUX/issues/2709)) ([0b29d70](https://github.com/Azure/LogicAppsUX/commit/0b29d702d004c96802253180383944a85c255891))
- **vscode:** Update logic to disable save button in designer ([#2713](https://github.com/Azure/LogicAppsUX/issues/2713)) ([2a93672](https://github.com/Azure/LogicAppsUX/commit/2a9367217a1cbd5a271e5b93cd43b4a1bd786e25))

### Bug Fixes

- **Designer:** Monitoring - StatusPill component `duration` in tooltip ([#2719](https://github.com/Azure/LogicAppsUX/issues/2719)) ([1d9ae8d](https://github.com/Azure/LogicAppsUX/commit/1d9ae8de797dd7993925bc72e8b565b665c63306))
- **vscode:** Validation and save of local workflow ([#2649](https://github.com/Azure/LogicAppsUX/issues/2649)) ([d193d41](https://github.com/Azure/LogicAppsUX/commit/d193d416b0a750f9f17942dad90f0bcb1f1558f8))

## [2.26.0](https://github.com/Azure/LogicAppsUX/compare/v2.25.0...v2.26.0) (2023-06-08)

## [2.26.0](https://github.com/Azure/LogicAppsUX/compare/v2.25.0...v2.26.0) (2023-06-08)

### Features

- **Data Mapper:** Functions will remain during navigation ([#2665](https://github.com/Azure/LogicAppsUX/issues/2665)) ([d9ef24c](https://github.com/Azure/LogicAppsUX/commit/d9ef24c9e66defae2ee15a72914dbfaef052721c))
- **Designer:** Browse View - Hiding connectors with no valid actions/triggers ([#2654](https://github.com/Azure/LogicAppsUX/issues/2654)) ([2aa81af](https://github.com/Azure/LogicAppsUX/commit/2aa81afd82b5e14617bdd36a79668c48d87725d4))
- **designer:** Initial setup work of the chatbot ([#2691](https://github.com/Azure/LogicAppsUX/issues/2691)) ([aaf33c0](https://github.com/Azure/LogicAppsUX/commit/aaf33c0972a61ac173887b72534faa719aafea9a))

### Bug Fixes

- **Data Mapper:** breakpoints work for vs-code-data-mapper ([#2684](https://github.com/Azure/LogicAppsUX/issues/2684)) ([c5f38a6](https://github.com/Azure/LogicAppsUX/commit/c5f38a6e2d68d9e2843d4fb4e98159fffe8a5c0e))
- **Data Mapper:** Fix undo and function deletion ([#2688](https://github.com/Azure/LogicAppsUX/issues/2688)) ([1b4bcbc](https://github.com/Azure/LogicAppsUX/commit/1b4bcbc0fb35b3b7a7e3a01c464947385e3eba70))
- **Data Mapper:** Shift toolbar functions down into view and over to not overlap schemas ([#2642](https://github.com/Azure/LogicAppsUX/issues/2642)) ([e08df0e](https://github.com/Azure/LogicAppsUX/commit/e08df0e888c390b340d60ce46ddcda3acf7d42b5))
- **designer:** Adding Preview tag for operations marked as preview in release status ([#2648](https://github.com/Azure/LogicAppsUX/issues/2648)) ([30c8846](https://github.com/Azure/LogicAppsUX/commit/30c884659aa5bc3197825750120dddfc1fa180e5))
- **designer:** Allow copying of tokens and allow select all/copy of monitoring view ([#2675](https://github.com/Azure/LogicAppsUX/issues/2675)) ([a8033bd](https://github.com/Azure/LogicAppsUX/commit/a8033bd4f949b42ab6f6ae00ac7c69a49ea440b6))
- **designer:** Allow drag and drop of nodes in/out of scopes ([#2658](https://github.com/Azure/LogicAppsUX/issues/2658)) ([44263cf](https://github.com/Azure/LogicAppsUX/commit/44263cf4bdc3164ccb31b4d560816295e0a8119c))
- **Designer:** Connection request errors now show in UI ([#2710](https://github.com/Azure/LogicAppsUX/issues/2710)) ([4d34ad1](https://github.com/Azure/LogicAppsUX/commit/4d34ad197585eb8c637b745f63890341d0203735))
- **Designer:** Fixed HTML editor parameter value initialization ([#2706](https://github.com/Azure/LogicAppsUX/issues/2706)) ([70e7c4f](https://github.com/Azure/LogicAppsUX/commit/70e7c4fa1f9f5ac6ce8dc562c98c91007158e149))
- **Designer:** Fixes Mooncake function app service issue ([#2694](https://github.com/Azure/LogicAppsUX/issues/2694)) ([e2fe250](https://github.com/Azure/LogicAppsUX/commit/e2fe2501b9146e89f1a745cf96d526ee0bc20d1f))
- **designer:** Fixing the visibility of internal and important parameters ([#2663](https://github.com/Azure/LogicAppsUX/issues/2663)) ([e97b037](https://github.com/Azure/LogicAppsUX/commit/e97b0377283ec8c719463f98e822612c3b4db35c))
- **designer:** focus editor with clicking x to delete token ([#2660](https://github.com/Azure/LogicAppsUX/issues/2660)) ([7465727](https://github.com/Azure/LogicAppsUX/commit/7465727d060ea63d8d9f99d77d1e36d2e214ddf7))
- **designer:** Parameter location should be read only from top level in property ([#2697](https://github.com/Azure/LogicAppsUX/issues/2697)) ([2effd6b](https://github.com/Azure/LogicAppsUX/commit/2effd6bbbc7e167594361555c50971a0d564bd84))
- **designer:** Persist pagination toggle setting info in store ([#2645](https://github.com/Azure/LogicAppsUX/issues/2645)) ([3af4a63](https://github.com/Azure/LogicAppsUX/commit/3af4a635b534b9eb22a8915489b306df9871d613))
- **designer:** Preserve original definition to read values during serialization ([#2651](https://github.com/Azure/LogicAppsUX/issues/2651)) ([2051fbd](https://github.com/Azure/LogicAppsUX/commit/2051fbd92246d395c1a5fd922e6d5b0ab75465f8))
- **designer:** Show error message when using invalid payload in schema editor ([#2666](https://github.com/Azure/LogicAppsUX/issues/2666)) ([535400c](https://github.com/Azure/LogicAppsUX/commit/535400c75e1dc0e9fa04625c9fc84e502e823f1c))
- **designer:** Showing error message when apim swagger is invalid ([#2668](https://github.com/Azure/LogicAppsUX/issues/2668)) ([71b3805](https://github.com/Azure/LogicAppsUX/commit/71b3805f86c338cb791ac824bcb05b9abe69570c))
- **designer:** Skip trigger serialization when Add operation panel is open for trigger ([#2685](https://github.com/Azure/LogicAppsUX/issues/2685)) ([bf64563](https://github.com/Azure/LogicAppsUX/commit/bf645633be279e5516c459a9aa8a9402e34391ef))
- **designer:** Support for dark mode in html editor ([#2678](https://github.com/Azure/LogicAppsUX/issues/2678)) ([47ea312](https://github.com/Azure/LogicAppsUX/commit/47ea312245600f967ab18c3dda5a798f8b9dace0))
- **designer:** Typo and text formatting ([#2689](https://github.com/Azure/LogicAppsUX/issues/2689)) ([5066208](https://github.com/Azure/LogicAppsUX/commit/5066208b1074ad7f28d7dd94447ecf41067cb3ec))
- **vscode:** Copy/Paste commands in vscode for Mac ([#2653](https://github.com/Azure/LogicAppsUX/issues/2653)) ([5010b8e](https://github.com/Azure/LogicAppsUX/commit/5010b8e7707c331eadb320b966586e3ab3d215ae))
- **vscode:** Create an OAuth connection to Key vault ([#2657](https://github.com/Azure/LogicAppsUX/issues/2657)) ([7f2f505](https://github.com/Azure/LogicAppsUX/commit/7f2f50531a11fe5bb158bfe95f2a0bb2e647c7bf))
- **vscode:** Resources image path in readme ([#2698](https://github.com/Azure/LogicAppsUX/issues/2698)) ([20dc4a8](https://github.com/Azure/LogicAppsUX/commit/20dc4a82c4e4174715b835e88593ad202066f903))

## [2.25.0](https://github.com/Azure/LogicAppsUX/compare/v2.24.0...v2.25.0) (2023-06-01)

## [2.25.0](https://github.com/Azure/LogicAppsUX/compare/v2.24.0...v2.25.0) (2023-06-01)

### Features

- **Data Mapper:** Handle situations where the generated XSLT and the mapping don't match ([#2630](https://github.com/Azure/LogicAppsUX/issues/2630)) ([4d3b287](https://github.com/Azure/LogicAppsUX/commit/4d3b287db36afe87de192b2456385bc65eeab9c5))
- **vscode:** Update templates for Custom Code ([#2629](https://github.com/Azure/LogicAppsUX/issues/2629)) ([1cd38df](https://github.com/Azure/LogicAppsUX/commit/1cd38dfc03da2e4294d54d58097f638799ccd206))

### Bug Fixes

- **designer:** Add validation for isRoot placeholder trigger node ([#2641](https://github.com/Azure/LogicAppsUX/issues/2641)) ([67855af](https://github.com/Azure/LogicAppsUX/commit/67855af93a9bc50d99f5dedbbc3f99e8f493460b))
- **Designer:** Fixed issue with case-insensitive dependency parameters ([#2635](https://github.com/Azure/LogicAppsUX/issues/2635)) ([89db58f](https://github.com/Azure/LogicAppsUX/commit/89db58f4c67712d5f4cc7a5ed0a2df843941c8d6))
- **designer:** Handling implicit foreach addition for nested arrays and also fixing multiple foreach additions when not needed ([#2636](https://github.com/Azure/LogicAppsUX/issues/2636)) ([3bf6f8b](https://github.com/Azure/LogicAppsUX/commit/3bf6f8b8bd73b5832018fb09748edbee7d096c3e))
- **vscode): Revert "feat(vscode:** Add New Code Project Command ([#2427](https://github.com/Azure/LogicAppsUX/issues/2427))" ([#2638](https://github.com/Azure/LogicAppsUX/issues/2638)) ([5fb81f6](https://github.com/Azure/LogicAppsUX/commit/5fb81f6b1adbb0aaf3e92e32760c15cecc94e7f0)), closes [#2629](https://github.com/Azure/LogicAppsUX/issues/2629)

## [2.24.0](https://github.com/Azure/LogicAppsUX/compare/v2.23.0...v2.24.0) (2023-05-31)

### Features

- **Power Automate:** Add automation ids for editors and token picker components ([#2583](https://github.com/Azure/LogicAppsUX/issues/2583)) ([548abda](https://github.com/Azure/LogicAppsUX/commit/548abda566f6a3028e61edbdcd714829f86b3c4a))
- **Power Automate:** Added data automation ids for main designer components for use in automated testing ([#2579](https://github.com/Azure/LogicAppsUX/issues/2579)) ([d32e2d5](https://github.com/Azure/LogicAppsUX/commit/d32e2d5d4dda34434183fc38224fd0a9d30f337f))
- **vscode:** Add host version to http headers in extension httpClient ([#2625](https://github.com/Azure/LogicAppsUX/issues/2625)) ([b6832c8](https://github.com/Azure/LogicAppsUX/commit/b6832c82c8e74d937ea18bbd32a05d969eac0afe))

### Bug Fixes

- **designer:** Fixed style change for token picker ([#2282](https://github.com/Azure/LogicAppsUX/issues/2282)) ([315ee3b](https://github.com/Azure/LogicAppsUX/commit/315ee3bdcfcdfae077ca71f9aa82c66a98b508be))
- **designer:** Recalculate token expression when adding it from picker to parameter ([#2617](https://github.com/Azure/LogicAppsUX/issues/2617)) ([a9a6aed](https://github.com/Azure/LogicAppsUX/commit/a9a6aed6a2ef1e728073216484af04eee863cac8))
- **designer:** Unfocusing an Editor ending in '/' would still show the typeahead menu ([#2624](https://github.com/Azure/LogicAppsUX/issues/2624)) ([99f4d7f](https://github.com/Azure/LogicAppsUX/commit/99f4d7f34b72a66a44e7177d17e2f5e9bb4e6aa2))

## [2.23.0](https://github.com/Azure/LogicAppsUX/compare/v2.22.0...v2.23.0) (2023-05-31)

### Features

- **vscode:** Add New Code Project Command ([#2427](https://github.com/Azure/LogicAppsUX/issues/2427)) ([6f50ee3](https://github.com/Azure/LogicAppsUX/commit/6f50ee3e73f471a2b8c34f2980963a75fe785881))
- **vscode:** Adding DLL Upload Experience and NetFxWorker upload ([#2588](https://github.com/Azure/LogicAppsUX/issues/2588)) ([0466e2b](https://github.com/Azure/LogicAppsUX/commit/0466e2b6e689aa7b3065446fa9fdc9b449fd247e))

### Bug Fixes

- **designer:** Doing output/body expression comparison for manifest based operation during implicit foreach addition ([#2616](https://github.com/Azure/LogicAppsUX/issues/2616)) ([6ef166d](https://github.com/Azure/LogicAppsUX/commit/6ef166d0301e204394c3b2259638cdaab3743ec0))
- **vscode): Revert "feat(vs-code-designer:** externalize connection parameterizati… ([#2613](https://github.com/Azure/LogicAppsUX/issues/2613)) ([7fa8b72](https://github.com/Azure/LogicAppsUX/commit/7fa8b7200d079989544839d4058298976b555aea)), closes [#2368](https://github.com/Azure/LogicAppsUX/issues/2368)

## [2.22.0](https://github.com/Azure/LogicAppsUX/compare/v2.21.0...v2.22.0) (2023-05-30)

### Features

- **designer:** HTML Editor ([#2601](https://github.com/Azure/LogicAppsUX/issues/2601)) ([0a03f6e](https://github.com/Azure/LogicAppsUX/commit/0a03f6e5c9985894afb3d9157317a3a83f6e2621))

### Bug Fixes

- **designer:** Issue where Filepicker was not showing subfolders ([#2603](https://github.com/Azure/LogicAppsUX/issues/2603)) ([a3ba491](https://github.com/Azure/LogicAppsUX/commit/a3ba491e46b411b7e7f2ecf105e51841ac7fc381))
- **designer:** Run after now triggers dirty state ([#2605](https://github.com/Azure/LogicAppsUX/issues/2605)) ([ea6455c](https://github.com/Azure/LogicAppsUX/commit/ea6455cce17043be9f3101408d1cc4a0c8bff6d3))
- **designer:** Settings were overridden during action/trigger addition ([#2610](https://github.com/Azure/LogicAppsUX/issues/2610)) ([8b48325](https://github.com/Azure/LogicAppsUX/commit/8b483258213fe6ac1d5a398d131e2ffd9b16b634))

## [2.21.0](https://github.com/Azure/LogicAppsUX/compare/v2.20.0...v2.21.0) (2023-05-26)

### Bug Fixes

- **Data Mapper:** Fall back to base file if the draft is invalid ([#2568](https://github.com/Azure/LogicAppsUX/issues/2568)) ([7d4033f](https://github.com/Azure/LogicAppsUX/commit/7d4033f0fffe5a5e1f828800e03772f6d5f4f11b))
- **designer:** Fixed issue where some connection parameter dropdowns were passing name text as value ([#2581](https://github.com/Azure/LogicAppsUX/issues/2581)) ([6f7e24f](https://github.com/Azure/LogicAppsUX/commit/6f7e24fefc0ac3c1e6bb46c610270f9a3d504175))
- **designer:** Load connection when not present in resource group ([#2570](https://github.com/Azure/LogicAppsUX/issues/2570)) ([9092cec](https://github.com/Azure/LogicAppsUX/commit/9092cec1c30a17f240ac581018e1be7d471f9b61))
- **designer:** Simple Query Builder Update (support for advanced mode) ([#2578](https://github.com/Azure/LogicAppsUX/issues/2578)) ([bfba9cb](https://github.com/Azure/LogicAppsUX/commit/bfba9cbb07b79601799ed6b9f8ad209bddf20344))

## [2.20.0](https://github.com/Azure/LogicAppsUX/compare/v2.19.0...v2.20.0) (2023-05-25)

### Bug Fixes

- **Data Mapper:** Have the customer start on the canvas directly after selecting schemas ([#2521](https://github.com/Azure/LogicAppsUX/issues/2521)) ([d5e6a36](https://github.com/Azure/LogicAppsUX/commit/d5e6a3680ceb7f0431efb0278e62acf8a1f674cc))
- **designer:** Add parse inputs and outputs in monitoring view ([#2551](https://github.com/Azure/LogicAppsUX/issues/2551)) ([5dd1ab7](https://github.com/Azure/LogicAppsUX/commit/5dd1ab7948d27b08515f5ac6f91f5edc1b37f619))
- **designer:** added support for objects in static results ([#2540](https://github.com/Azure/LogicAppsUX/issues/2540)) ([df17266](https://github.com/Azure/LogicAppsUX/commit/df17266b2d6876493ef861aa91a73ccea3bc84b2))
- **designer:** Do not allow naming cases same as action names in workflow ([#2552](https://github.com/Azure/LogicAppsUX/issues/2552)) ([2de0ebc](https://github.com/Azure/LogicAppsUX/commit/2de0ebc0872eac9cae690c9a3f5c7c67c56bff5d))
- **designer:** Don't stop propagation on click of the token segment delete button ([#2537](https://github.com/Azure/LogicAppsUX/issues/2537)) ([e88271e](https://github.com/Azure/LogicAppsUX/commit/e88271e5266a76c2a491512876931ecaf902c185))
- **designer:** Load spliton from definition during deserialization instead of default when disabled ([#2564](https://github.com/Azure/LogicAppsUX/issues/2564)) ([4b36d9b](https://github.com/Azure/LogicAppsUX/commit/4b36d9bdddba33f0b98c8dd985488cf970dac403))
- **designer:** make it so we split on outer most comma in simple query builder ([#2543](https://github.com/Azure/LogicAppsUX/issues/2543)) ([715be63](https://github.com/Azure/LogicAppsUX/commit/715be63496d8fefaaa3b0e96878d9c2908f88a98))
- **designer:** Preventing crash when switch cases have non-unique names ([#2561](https://github.com/Azure/LogicAppsUX/issues/2561)) ([9f5ee3a](https://github.com/Azure/LogicAppsUX/commit/9f5ee3a585d0a7c8231e346cd139ecb6cb5d13ba))
- **designer:** Showing only multi auth connection parameters when both legacy and multi auth is present ([#2563](https://github.com/Azure/LogicAppsUX/issues/2563)) ([e146707](https://github.com/Azure/LogicAppsUX/commit/e146707e19efba3bab3f60980cd8396b854af6b3))
- **designer:** SimpleQueryBuilder editor not updating on deserialization ([#2566](https://github.com/Azure/LogicAppsUX/issues/2566)) ([f897ec0](https://github.com/Azure/LogicAppsUX/commit/f897ec04a72f7728241a717835869ee8fa72ea7a))

## [2.19.0](https://github.com/Azure/LogicAppsUX/compare/v2.18.0...v2.19.0) (2023-05-24)

### Features

- **Data Mapper:** Brute force order some of the map definition ([#2483](https://github.com/Azure/LogicAppsUX/issues/2483)) ([fa622d8](https://github.com/Azure/LogicAppsUX/commit/fa622d88c5ae8c380290338ab1f5a5e5ccfc0d0b))
- **Data Mapper:** Collapse function category at start ([#2517](https://github.com/Azure/LogicAppsUX/issues/2517)) ([2820c00](https://github.com/Azure/LogicAppsUX/commit/2820c0035be67a8e7b3177b893e848e4dbf42716))
- **designer:** Increased search request size, search loading is now faster ([#2232](https://github.com/Azure/LogicAppsUX/issues/2232)) ([7de4199](https://github.com/Azure/LogicAppsUX/commit/7de4199ed89b2d57f5615fbc2eb8280bcb7b04dd))

### Bug Fixes

- **Data Mapper:** Reduce false positives for Map checker types ([#2119](https://github.com/Azure/LogicAppsUX/issues/2119)) ([8ffa25f](https://github.com/Azure/LogicAppsUX/commit/8ffa25f33d4c08c5d3eb5c0965a40eb269a549a9))
- **designer:** Catch exception for when cors is not established for monitoring view ([#2524](https://github.com/Azure/LogicAppsUX/issues/2524)) ([0613b2e](https://github.com/Azure/LogicAppsUX/commit/0613b2eb939ab28ed0f0b7ba044d8a2a60ba8c40))
- **designer:** Do not fail loading outputs when outputs do not have array schema or no schema at all ([#2510](https://github.com/Azure/LogicAppsUX/issues/2510)) ([559de37](https://github.com/Azure/LogicAppsUX/commit/559de37f2d7e767b1ffb4d2b5c1a0b24837471c7))
- **designer:** Fix filtering of function apps which have more than one type of kind ([#2536](https://github.com/Azure/LogicAppsUX/issues/2536)) ([3eef440](https://github.com/Azure/LogicAppsUX/commit/3eef440d6e2f51ab73f527da9b9d78468fe6c0a1))
- **designer:** Fix inputs/outputs and pager in nested for each loops ([#2480](https://github.com/Azure/LogicAppsUX/issues/2480)) ([836754b](https://github.com/Azure/LogicAppsUX/commit/836754b4c6ce6aee7a8bea1127257d8684b60dcd))
- **designer:** Fixed connections with non-optional gateway parameters ([#2519](https://github.com/Azure/LogicAppsUX/issues/2519)) ([ae583f0](https://github.com/Azure/LogicAppsUX/commit/ae583f008a25774bc25201ddf3bfb49ac9c29310))
- **designer:** Fixing recommendation header for trigger ([#2484](https://github.com/Azure/LogicAppsUX/issues/2484)) ([b412be9](https://github.com/Azure/LogicAppsUX/commit/b412be95621c0bae8dcc8ee83e80c42e77ad2c4d))
- **designer:** Mark dependent parameters as valid for even output token references for dynamic call ([#2518](https://github.com/Azure/LogicAppsUX/issues/2518)) ([a2aad55](https://github.com/Azure/LogicAppsUX/commit/a2aad55da9e3dfcb0f9650aa83e1496e5c2580ea))
- **designer:** Render schedule editor only when recurrence values are literal segments ([#2535](https://github.com/Azure/LogicAppsUX/issues/2535)) ([3f47c51](https://github.com/Azure/LogicAppsUX/commit/3f47c5199d06bf7f218359f1a986b07d8c8b8b4a))
- **designer:** support multiline for connection creation ([#2513](https://github.com/Azure/LogicAppsUX/issues/2513)) ([6975d35](https://github.com/Azure/LogicAppsUX/commit/6975d35c04cc93eea3cf3000ae72f31ffd16374a))
- **vscode:** Invoke workflow showing the input parameter fields ([#2515](https://github.com/Azure/LogicAppsUX/issues/2515)) ([72e215f](https://github.com/Azure/LogicAppsUX/commit/72e215f42ba6070b59853dd9574922bd933cadd5))

## [2.18.0](https://github.com/Azure/LogicAppsUX/compare/v2.17.0...v2.18.0) (2023-05-22)

### Features

- **Data Mapper:** Separate the save and generate command ([#2476](https://github.com/Azure/LogicAppsUX/issues/2476)) ([e1fd8bc](https://github.com/Azure/LogicAppsUX/commit/e1fd8bc4b98f8eb799c79a637e3effe823e3f2f8))
- **vscode:** Add APP_KIND and ProjectDirectoryPath values to settings file ([#2465](https://github.com/Azure/LogicAppsUX/issues/2465)) ([f850f55](https://github.com/Azure/LogicAppsUX/commit/f850f559f1358974cd62a844b381b5055599459a))
- **vscode:** Update readme with resources tab implementation ([#2466](https://github.com/Azure/LogicAppsUX/issues/2466)) ([7d8a1d6](https://github.com/Azure/LogicAppsUX/commit/7d8a1d6e0c61bc6576068b95920d236688651ebd))

### Bug Fixes

- **Data Mapper:** Fix custom values strings deserializing ([#2432](https://github.com/Azure/LogicAppsUX/issues/2432)) ([8db277e](https://github.com/Azure/LogicAppsUX/commit/8db277e0af999b3c326b050b30305e6c851b1f39))
- **Data Mapper:** Stop refs for identical items ([#2428](https://github.com/Azure/LogicAppsUX/issues/2428)) ([daada4a](https://github.com/Azure/LogicAppsUX/commit/daada4a083befa07277cc28379e41219f04c556d))
- **designer:** Add empty schema when dynamic input fails and has value in definition ([#2479](https://github.com/Azure/LogicAppsUX/issues/2479)) ([a648c17](https://github.com/Azure/LogicAppsUX/commit/a648c17982fd86efa1e08ab7b95028c8040ad631))
- **designer:** Fix issue where expanding or collapsing conditions would open panel ([#2468](https://github.com/Azure/LogicAppsUX/issues/2468)) ([e543927](https://github.com/Azure/LogicAppsUX/commit/e54392768790c7172135bb1d7241f5ff465d9cbd))
- **designer:** Fixed connections passing empty non-required parameters ([#2435](https://github.com/Azure/LogicAppsUX/issues/2435)) ([2ce2a73](https://github.com/Azure/LogicAppsUX/commit/2ce2a73a7c07f37bbbe9a0a571793310d66107db))
- **designer:** Fixing the output names when they have encoded properties ([#2438](https://github.com/Azure/LogicAppsUX/issues/2438)) ([240a900](https://github.com/Azure/LogicAppsUX/commit/240a9008dbad082541f9c3aac47db1f3240e7af5))
- **designer:** Generate relative path parameters properties correctly ([#2450](https://github.com/Azure/LogicAppsUX/issues/2450)) ([b96054e](https://github.com/Azure/LogicAppsUX/commit/b96054ef1c6cc93e937903fe4891750ca6d831f2))
- **designer:** Instead of converting casted segments to literal, use segments intead ([#2469](https://github.com/Azure/LogicAppsUX/issues/2469)) ([d187e0d](https://github.com/Azure/LogicAppsUX/commit/d187e0df13a792de74b7f250a770cbd5a8bcce09))
- **designer:** Properly catching invalid brand color values ([#2456](https://github.com/Azure/LogicAppsUX/issues/2456)) ([3957936](https://github.com/Azure/LogicAppsUX/commit/39579367750a1a20c00d63395499a3318a8a85f5))
- **designer:** Resolve parameters and appsettings tokens during parameter evaluation in dynamic calls ([#2434](https://github.com/Azure/LogicAppsUX/issues/2434)) ([fd520c3](https://github.com/Azure/LogicAppsUX/commit/fd520c3c86fa7d7ffa46270fbd559204f7173871))
- **designer:** segment values are not showing properly ([#2463](https://github.com/Azure/LogicAppsUX/issues/2463)) ([c2a3780](https://github.com/Azure/LogicAppsUX/commit/c2a3780237e8197186431a2eb65824148409830d))
- **designer:** Shows Tokenpicker on Triggers ([#2442](https://github.com/Azure/LogicAppsUX/issues/2442)) ([a58bf10](https://github.com/Azure/LogicAppsUX/commit/a58bf10b490e6d55581494d7e1c634f230621a75))
- **designer:** Special case array actions being converted to Object on initializing, then breaking Runtime on Save ([#2409](https://github.com/Azure/LogicAppsUX/issues/2409)) ([9923308](https://github.com/Azure/LogicAppsUX/commit/9923308050be9803fea1e049590c082cfb6ddca1))
- **designer:** SplitOn setting not showing up settings even on enabled ([#2464](https://github.com/Azure/LogicAppsUX/issues/2464)) ([7431d7d](https://github.com/Azure/LogicAppsUX/commit/7431d7db8717a87fed9db11fc75ec0b246d51b85))
- **designer:** Updating latest token action name for code editors ([#2467](https://github.com/Azure/LogicAppsUX/issues/2467)) ([d5f0059](https://github.com/Azure/LogicAppsUX/commit/d5f005941f3a6b5d4988fd62644ecceea2373a28))
- **designer:** Workflow crashing when getting outputs of schema with multiple types ([#2454](https://github.com/Azure/LogicAppsUX/issues/2454)) ([077021c](https://github.com/Azure/LogicAppsUX/commit/077021ca329c8134d8a928d214aca1c008e36dcb))
- **desinger:** Fixing deserialiation when operation cannot be loaded for triggers ([#2458](https://github.com/Azure/LogicAppsUX/issues/2458)) ([33bb52d](https://github.com/Azure/LogicAppsUX/commit/33bb52db1a64e387385fcad181160a4122a642f5))

## [2.17.0](https://github.com/Azure/LogicAppsUX/compare/v2.16.0...v2.17.0) (2023-05-18)

### Bug Fixes

- **designer:** Allow operations to specify unknown parameters to not be rendered or serialized ([#2401](https://github.com/Azure/LogicAppsUX/issues/2401)) ([8133450](https://github.com/Azure/LogicAppsUX/commit/81334507b944bffbae65bba7c7c1333e7eadb13e))
- **designer:** Clear preserved value when removing parameters from original view ([#2417](https://github.com/Azure/LogicAppsUX/issues/2417)) ([080b2b2](https://github.com/Azure/LogicAppsUX/commit/080b2b26f4bae33c41c13c564d4169531419a97d))

## [2.16.0](https://github.com/Azure/LogicAppsUX/compare/v2.15.25...v2.16.0) (2023-05-17)

### Bug Fixes

- **designer:** standalone to get workflow kind ([#2411](https://github.com/Azure/LogicAppsUX/issues/2411)) ([81cbf8e](https://github.com/Azure/LogicAppsUX/commit/81cbf8ed7d10891671827ada8537def25210223a))

### [2.15.25](https://github.com/Azure/LogicAppsUX/compare/v2.15.24...v2.15.25) (2023-05-17)

### Bug Fixes

- **designer): Revert "fix(designer:** Add "And" conditional if condition expression does not follow complex condition syntax, but the current condition is still valid" ([#2395](https://github.com/Azure/LogicAppsUX/issues/2395)) ([3acb4b1](https://github.com/Azure/LogicAppsUX/commit/3acb4b13dab5fd2e646b7063eba0cb7fc984a6d2)), closes [#2375](https://github.com/Azure/LogicAppsUX/issues/2375)
- **designer:** Add HybridQueryBuilder and isHybridEditor flag ([#2398](https://github.com/Azure/LogicAppsUX/issues/2398)) ([f75294d](https://github.com/Azure/LogicAppsUX/commit/f75294dd661b6bd2d1f0405f82c11ae4a30d5d54))
- **designer:** Cleanup of Dictionary Editor ([#2393](https://github.com/Azure/LogicAppsUX/issues/2393)) ([5c16b06](https://github.com/Azure/LogicAppsUX/commit/5c16b066121496c5d7f60954bd559c646476f7af))
- **designer:** Small dark mode node error colors fix ([#2400](https://github.com/Azure/LogicAppsUX/issues/2400)) ([97f8a5a](https://github.com/Azure/LogicAppsUX/commit/97f8a5a18f3eef80980cc02203b5c5e0d8f37260))

### [2.15.24](https://github.com/Azure/LogicAppsUX/compare/v2.15.23...v2.15.24) (2023-05-16)

### Bug Fixes

- **designer:** Add "And" conditional if condition expression does not follow complex condition syntax, but the current condition is still valid ([#2375](https://github.com/Azure/LogicAppsUX/issues/2375)) ([945e313](https://github.com/Azure/LogicAppsUX/commit/945e31336b8649d96d9daa89059a94d34cce5dca))

### [2.15.23](https://github.com/Azure/LogicAppsUX/compare/v2.15.22...v2.15.23) (2023-05-15)

### [2.15.22](https://github.com/Azure/LogicAppsUX/compare/v2.15.20...v2.15.22) (2023-05-14)

### Features

- **designer:** Added Casting to Array Editor/ Fixed Complex Array Editor ([#2362](https://github.com/Azure/LogicAppsUX/issues/2362)) ([794c0a8](https://github.com/Azure/LogicAppsUX/commit/794c0a88ce0b95a109660e6ed295cb51b7afda85))
- **vs-code-designer:** externalize connection parameterization when authoring ([#2368](https://github.com/Azure/LogicAppsUX/issues/2368)) ([becbc50](https://github.com/Azure/LogicAppsUX/commit/becbc503164fbb5a3c60ff0cdd68f0d9dd986f42))
- **vscode:** Mode deploy button to workspace deploy menu ([#2370](https://github.com/Azure/LogicAppsUX/issues/2370)) ([8c52252](https://github.com/Azure/LogicAppsUX/commit/8c52252f1212ced955f9cea3acd05e9d0ddd5c32))

### Bug Fixes

- **designer:** Fix Links in TokenPicker and About Tab ([#2367](https://github.com/Azure/LogicAppsUX/issues/2367)) ([89af76f](https://github.com/Azure/LogicAppsUX/commit/89af76f3a5ee1001a753d6bef09f8cd5671d5e04))
- **designer:** Fixing the title prefix for dynamic inputs in manifest based operations ([#2364](https://github.com/Azure/LogicAppsUX/issues/2364)) ([4790f5d](https://github.com/Azure/LogicAppsUX/commit/4790f5d77f7a1cf00aff949972436b1fdbc7d0f4))
- **designer:** making editorOptions optional values in editors ([#2371](https://github.com/Azure/LogicAppsUX/issues/2371)) ([1fc0963](https://github.com/Azure/LogicAppsUX/commit/1fc09635338091128a60991d4e913436e77763aa))
- **designer:** Persisting identity values for MSI auth in http ([#2369](https://github.com/Azure/LogicAppsUX/issues/2369)) ([4b23fa5](https://github.com/Azure/LogicAppsUX/commit/4b23fa5afece6afc3fea40c2c48aa80a04dda90f))
- **designer:** Treat empty string as though the parameter has no value ([#2348](https://github.com/Azure/LogicAppsUX/issues/2348)) ([16ad151](https://github.com/Azure/LogicAppsUX/commit/16ad1511862d529fc7ba4875d6ad39281dcc8725))
- **designer:** Update setVariable Boolean dropdown ([#2374](https://github.com/Azure/LogicAppsUX/issues/2374)) ([eb07ccd](https://github.com/Azure/LogicAppsUX/commit/eb07ccdc3d676d422b4f9fc9e51335f5fe6015a0))

### [2.15.21](https://github.com/Azure/LogicAppsUX/compare/v2.15.20...v2.15.21) (2023-05-13)

### Features

- **designer:** Added Casting to Array Editor/ Fixed Complex Array Editor ([#2362](https://github.com/Azure/LogicAppsUX/issues/2362)) ([794c0a8](https://github.com/Azure/LogicAppsUX/commit/794c0a88ce0b95a109660e6ed295cb51b7afda85))
- **vscode:** Mode deploy button to workspace deploy menu ([#2370](https://github.com/Azure/LogicAppsUX/issues/2370)) ([8c52252](https://github.com/Azure/LogicAppsUX/commit/8c52252f1212ced955f9cea3acd05e9d0ddd5c32))

### Bug Fixes

- **designer:** Fix Links in TokenPicker and About Tab ([#2367](https://github.com/Azure/LogicAppsUX/issues/2367)) ([89af76f](https://github.com/Azure/LogicAppsUX/commit/89af76f3a5ee1001a753d6bef09f8cd5671d5e04))
- **designer:** Fixing the title prefix for dynamic inputs in manifest based operations ([#2364](https://github.com/Azure/LogicAppsUX/issues/2364)) ([4790f5d](https://github.com/Azure/LogicAppsUX/commit/4790f5d77f7a1cf00aff949972436b1fdbc7d0f4))
- **designer:** making editorOptions optional values in editors ([#2371](https://github.com/Azure/LogicAppsUX/issues/2371)) ([1fc0963](https://github.com/Azure/LogicAppsUX/commit/1fc09635338091128a60991d4e913436e77763aa))
- **designer:** Persisting identity values for MSI auth in http ([#2369](https://github.com/Azure/LogicAppsUX/issues/2369)) ([4b23fa5](https://github.com/Azure/LogicAppsUX/commit/4b23fa5afece6afc3fea40c2c48aa80a04dda90f))
- **designer:** Treat empty string as though the parameter has no value ([#2348](https://github.com/Azure/LogicAppsUX/issues/2348)) ([16ad151](https://github.com/Azure/LogicAppsUX/commit/16ad1511862d529fc7ba4875d6ad39281dcc8725))

### [2.15.20](https://github.com/Azure/LogicAppsUX/compare/v2.15.19...v2.15.20) (2023-05-12)

### Bug Fixes

- **Designer:** Fixed crash with manifest not having connector property ([#2345](https://github.com/Azure/LogicAppsUX/issues/2345)) ([6bb3e4d](https://github.com/Azure/LogicAppsUX/commit/6bb3e4dfd23cb0e5a22e397b474afba7302f3f5a))
- **designer:** When outputs are too large to show, monitoring view will show a download link to the file ([#2344](https://github.com/Azure/LogicAppsUX/issues/2344)) ([7a0b9df](https://github.com/Azure/LogicAppsUX/commit/7a0b9dfe4a88ad0e3dd4d5147fe6cbb6982e1c5b))

### [2.15.19](https://github.com/Azure/LogicAppsUX/compare/v2.15.18...v2.15.19) (2023-05-11)

### Features

- **designer:** Add static results support for manifest operations ([#2325](https://github.com/Azure/LogicAppsUX/issues/2325)) ([9c9497d](https://github.com/Azure/LogicAppsUX/commit/9c9497dfc5a686d3563befeea8d033cba2087bc5))

### Bug Fixes

- **Data Mapper:** Allow events to pass through on the panel ([#2342](https://github.com/Azure/LogicAppsUX/issues/2342)) ([1d8201e](https://github.com/Azure/LogicAppsUX/commit/1d8201e1a75d2eb1db717ca01b4d87d0c3fe6f5a))
- **Designer:** Added extra icon and brand color fallbacks ([#2341](https://github.com/Azure/LogicAppsUX/issues/2341)) ([9f4b628](https://github.com/Azure/LogicAppsUX/commit/9f4b628f8b91bddfa32bfae539ad63629e9afc9d))
- **designer:** Fixing renaming of operation names with validation and token updates ([#2333](https://github.com/Azure/LogicAppsUX/issues/2333)) ([2d14124](https://github.com/Azure/LogicAppsUX/commit/2d14124dd235ba8ce3987094a72463a9e3473e94))
- **designer:** Loading dynamic values for dynamic parameters during deserializations ([#2337](https://github.com/Azure/LogicAppsUX/issues/2337)) ([66a06e5](https://github.com/Azure/LogicAppsUX/commit/66a06e59a34f3035dd5a3d7c836d4a628d80a15e))

### [2.15.18](https://github.com/Azure/LogicAppsUX/compare/v2.15.17...v2.15.18) (2023-05-11)

### Bug Fixes

- **Data Mapper:** Fix schemas with . in the file name ([#2328](https://github.com/Azure/LogicAppsUX/issues/2328)) ([e2f50d4](https://github.com/Azure/LogicAppsUX/commit/e2f50d4c0483d68c39ad47465288b8046355fe0e))

### [2.15.17](https://github.com/Azure/LogicAppsUX/compare/v2.15.16...v2.15.17) (2023-05-10)

### Features

- **designer:** Adding folder picker for manifest based operations ([#2284](https://github.com/Azure/LogicAppsUX/issues/2284)) ([69ef285](https://github.com/Azure/LogicAppsUX/commit/69ef28514e8bfbf0c0dee80329d6de9d14dfaf44))

### Bug Fixes

- **Data Mapper:** More loops improvements ([#2322](https://github.com/Azure/LogicAppsUX/issues/2322)) ([e5ca150](https://github.com/Azure/LogicAppsUX/commit/e5ca150375edb60f0ee91b373287dd80d6ccf114))
- **designer:** Deep copy for connections data ([#2306](https://github.com/Azure/LogicAppsUX/issues/2306)) ([9feb127](https://github.com/Azure/LogicAppsUX/commit/9feb1276982af20d1c3c4fd950efed3e63289001))
- **designer:** Deleting trigger no longer gives invalid RunAfter to children ([#2308](https://github.com/Azure/LogicAppsUX/issues/2308)) ([94728cf](https://github.com/Azure/LogicAppsUX/commit/94728cf58622413be4f083624077aefc3cf79ba6))
- **designer:** Deletion of ForEach operation causes designer to crash ([#2295](https://github.com/Azure/LogicAppsUX/issues/2295)) ([0dda96f](https://github.com/Azure/LogicAppsUX/commit/0dda96fc98a798814670083180619702c0b4deb2))

### [2.15.16](https://github.com/Azure/LogicAppsUX/compare/v2.15.15...v2.15.16) (2023-05-10)

### Features

- **designer:** Legacy Managed Identity connection support ([#2285](https://github.com/Azure/LogicAppsUX/issues/2285)) ([0a981c3](https://github.com/Azure/LogicAppsUX/commit/0a981c3a09fd0598179dd40a05358c7edde2a772))
- **designer:** Support Type Filtering in Token Picker ([#2292](https://github.com/Azure/LogicAppsUX/issues/2292)) ([459b9c6](https://github.com/Azure/LogicAppsUX/commit/459b9c684566b2e6d3a3f820f1b748bb55b7efbc))

### Bug Fixes

- **designer:** do not set Panel header horizontal padding when Panel is collapsed ([#2298](https://github.com/Azure/LogicAppsUX/issues/2298)) ([507ff58](https://github.com/Azure/LogicAppsUX/commit/507ff5807db290518c0b5e742be240b2bedb6f14))
- **designer:** Fixing request trigger settings for supress workflow headers ([#2291](https://github.com/Azure/LogicAppsUX/issues/2291)) ([1e3d8c5](https://github.com/Azure/LogicAppsUX/commit/1e3d8c5ffa6d0f6b8c79c4029f793bcf23655fee))
- **designer:** Fixing the value type being sent to workflow parameter… ([#2297](https://github.com/Azure/LogicAppsUX/issues/2297)) ([669e70d](https://github.com/Azure/LogicAppsUX/commit/669e70db8b7ddc90ad80feea9a07a2dc6a59615f))
- **designer:** TestConnection errors now show properly in panel ([#2301](https://github.com/Azure/LogicAppsUX/issues/2301)) ([698c176](https://github.com/Azure/LogicAppsUX/commit/698c17644acbba1800d3ff0d30b6dfce7df2aa18))

### [2.15.15](https://github.com/Azure/LogicAppsUX/compare/v2.15.14...v2.15.15) (2023-05-09)

### Features

- **designer:** Handling partially loaded or error nodes during serialization. ([#2275](https://github.com/Azure/LogicAppsUX/issues/2275)) ([cd2c9ec](https://github.com/Azure/LogicAppsUX/commit/cd2c9ec0dd48d245a534b7489068b4b421f4d1d3))

### Bug Fixes

- **designer:** adding unit tests for respecting workflow dimensions logic ([#2278](https://github.com/Azure/LogicAppsUX/issues/2278)) ([367f7b2](https://github.com/Azure/LogicAppsUX/commit/367f7b2bd58d1fde5b169dd5be87500e7d83faa1))
- **designer:** remove deprecated isGraphLocked property ([#2281](https://github.com/Azure/LogicAppsUX/issues/2281)) ([ff24eeb](https://github.com/Azure/LogicAppsUX/commit/ff24eeb0c0267a3b2ea878f6b5676a57ae3f14a5))
- **vscode:** Show creating remote logic app in activity log ([#2280](https://github.com/Azure/LogicAppsUX/issues/2280)) ([16bc653](https://github.com/Azure/LogicAppsUX/commit/16bc65316ab81c9f5c0620857e5f7520e0edb609))

### [2.15.14](https://github.com/Azure/LogicAppsUX/compare/v2.15.13...v2.15.14) (2023-05-08)

### Bug Fixes

- **designer:** Combobox ErrorDetails Fix + Update placeholders to wrap single quotation marks ([#2269](https://github.com/Azure/LogicAppsUX/issues/2269)) ([d8a5474](https://github.com/Azure/LogicAppsUX/commit/d8a54742152dea3a6522abb587d83d5f88ed86d3))
- **designer:** Current time operation produces an error on save ([#2272](https://github.com/Azure/LogicAppsUX/issues/2272)) ([846bb4a](https://github.com/Azure/LogicAppsUX/commit/846bb4a7c6c456a7a236a5ec225495d417cc2175))
- **designer:** fix serialization and deserialization of simple query builder (oldFormat Condition Editor) ([#2270](https://github.com/Azure/LogicAppsUX/issues/2270)) ([c0ff0be](https://github.com/Azure/LogicAppsUX/commit/c0ff0be720676cf4d12ddc74d338433b536f15e0))
- **designer:** pass the right parameters to respect node dimensions ([#2274](https://github.com/Azure/LogicAppsUX/issues/2274)) ([63bd644](https://github.com/Azure/LogicAppsUX/commit/63bd6440f73947b8aacd26967dda2bf6092b37a5))
- **designer:** properly link the correct aria label to the correct setting ([#2267](https://github.com/Azure/LogicAppsUX/issues/2267)) ([cff4648](https://github.com/Azure/LogicAppsUX/commit/cff4648c8842053f9847c629fbe0f8d24b22c0c8))
- **designer:** respect existing node dimensions when there is a workflow already loaded by the designer ([#2239](https://github.com/Azure/LogicAppsUX/issues/2239)) ([0f4a53f](https://github.com/Azure/LogicAppsUX/commit/0f4a53fdeb5a78b59883b9ac58757bdf6062419c))
- **designer:** Static Results not showing on add for swagger-based in connectors ([#2277](https://github.com/Azure/LogicAppsUX/issues/2277)) ([52f6033](https://github.com/Azure/LogicAppsUX/commit/52f603371f64e15602c1c63043b014a7ff008e71))
- **designer:** Update for darkmode for editorToggleButton ([#2273](https://github.com/Azure/LogicAppsUX/issues/2273)) ([04fc183](https://github.com/Azure/LogicAppsUX/commit/04fc18343483e7f322f6a0755737b0bbde04ddd5))
- **Power Automate:** Add static inputs option to floatingactionmenu editor ([#2265](https://github.com/Azure/LogicAppsUX/issues/2265)) ([ec1e0b4](https://github.com/Azure/LogicAppsUX/commit/ec1e0b492fe5bbb692544f3a8b0ab31e64f62afa))

### [2.15.13](https://github.com/Azure/LogicAppsUX/compare/v2.15.12...v2.15.13) (2023-05-08)

### [2.15.12](https://github.com/Azure/LogicAppsUX/compare/v2.15.11...v2.15.12) (2023-05-07)

### [2.15.2](https://github.com/Azure/LogicAppsUX/compare/v2.15.1...v2.15.2) (2023-04-29)

### Features

- **designer:** Showing dynamic content load errors in card ([#2264](https://github.com/Azure/LogicAppsUX/issues/2264)) ([b2ce1c1](https://github.com/Azure/LogicAppsUX/commit/b2ce1c1f4a774ce77ecc37ff4ba7df192efee44b))

### [2.15.11](https://github.com/Azure/LogicAppsUX/compare/v2.15.10...v2.15.11) (2023-05-06)

### Bug Fixes

- **designer:** Fix 'select connection' table sizing causing scrollbar ([#2260](https://github.com/Azure/LogicAppsUX/issues/2260)) ([3a2e9e5](https://github.com/Azure/LogicAppsUX/commit/3a2e9e5a397686c6b9b01a8e18ea5cbc0cb7b588))
- **designer:** Fix invoker connection toggle behavior ([#2194](https://github.com/Azure/LogicAppsUX/issues/2194)) ([07886b4](https://github.com/Azure/LogicAppsUX/commit/07886b424b52bb2d2cf1f8119be182877b9fb34f))
- **designer:** More user interactions now trigger dirty state ([#2259](https://github.com/Azure/LogicAppsUX/issues/2259)) ([94ef600](https://github.com/Azure/LogicAppsUX/commit/94ef6004778c69dcd476cd20c7bc52bb7f4e8d0b))
- **vscode:** Adding extra headers for user agent in all http calls ([#2257](https://github.com/Azure/LogicAppsUX/issues/2257)) ([34376bc](https://github.com/Azure/LogicAppsUX/commit/34376bce347a2e4595ce5e90845070a538ac61b3))

### [2.15.10](https://github.com/Azure/LogicAppsUX/compare/v2.15.9...v2.15.10) (2023-05-05)

### Features

- **designer:** Show appropriate error messages when loading operations during deserialization failures ([#2254](https://github.com/Azure/LogicAppsUX/issues/2254)) ([87c67b4](https://github.com/Azure/LogicAppsUX/commit/87c67b4c9cc7c6378d2d7d5c8fa9bb705b4f88e4))

### Bug Fixes

- **designer:** Usability improvements for Concurrency slider ([#2247](https://github.com/Azure/LogicAppsUX/issues/2247)) ([0e3e20d](https://github.com/Azure/LogicAppsUX/commit/0e3e20d0fa8b5d9cd983835352dae79d946874a8))
- **vscode:** Get credentials for designer ([#2256](https://github.com/Azure/LogicAppsUX/issues/2256)) ([0242a8e](https://github.com/Azure/LogicAppsUX/commit/0242a8eab6c498ab98bcc8e63a892b23e7db8c56))
- **vscode:** Run trigger in overview page ([#2246](https://github.com/Azure/LogicAppsUX/issues/2246)) ([a65a0dd](https://github.com/Azure/LogicAppsUX/commit/a65a0dd2904d4112b1222f35283539d4e30b0fe4))

### [2.15.9](https://github.com/Azure/LogicAppsUX/compare/v2.15.8...v2.15.9) (2023-05-05)

### Features

- **designer:** Workflow Parameters - Dirty State ([#2245](https://github.com/Azure/LogicAppsUX/issues/2245)) ([381e139](https://github.com/Azure/LogicAppsUX/commit/381e139c996a7602fca4059e666773f292f700ec))

### [2.15.8](https://github.com/Azure/LogicAppsUX/compare/v2.15.7...v2.15.8) (2023-05-05)

### Bug Fixes

- **designer:** Adding error details in panel and card when operation cannot be deserialized ([#2237](https://github.com/Azure/LogicAppsUX/issues/2237)) ([9229cdc](https://github.com/Azure/LogicAppsUX/commit/9229cdcdcf678f85da660608b5477e0447465e26))
- **designer:** Adding support for items token and updating repetition context for token addition ([#2222](https://github.com/Azure/LogicAppsUX/issues/2222)) ([78c7185](https://github.com/Azure/LogicAppsUX/commit/78c7185b6b1911ae5bab7987a84920ad26be45f3))
- **designer:** Integration of Complex Array Editor ([#2233](https://github.com/Azure/LogicAppsUX/issues/2233)) ([ff96edd](https://github.com/Azure/LogicAppsUX/commit/ff96edd42d0aed17f5ddd488b21dcdf261302ead))
- **designer:** Removing output token redundancies when dealing with outputs based on aliasing ([#2236](https://github.com/Azure/LogicAppsUX/issues/2236)) ([0d2c587](https://github.com/Azure/LogicAppsUX/commit/0d2c5873e1982aa635ebde4623a0bd1cf19296b6))
- **designer:** Use skipValidation to skip throwing errors in serializeWorkflow ([#2235](https://github.com/Azure/LogicAppsUX/issues/2235)) ([af448c3](https://github.com/Azure/LogicAppsUX/commit/af448c37cffd8631628138113597a6a60748d5c7))
- **openapi:** Fix dynamic schema params being duplicated ([#2238](https://github.com/Azure/LogicAppsUX/issues/2238)) ([6394c8b](https://github.com/Azure/LogicAppsUX/commit/6394c8b22a261729b277e48e1089228c653129b8))

### [2.15.7](https://github.com/Azure/LogicAppsUX/compare/v2.15.6...v2.15.7) (2023-05-04)

### Bug Fixes

- **designer:** Add a new connection host enum type for hybrid trigger ([#2200](https://github.com/Azure/LogicAppsUX/issues/2200)) ([21d0e92](https://github.com/Azure/LogicAppsUX/commit/21d0e92e4cbe0270b6bcb5575c8586e96a9eff97))
- **designer:** Address duplicate parameter pivot, showing pivots that should be hidden ([#2211](https://github.com/Azure/LogicAppsUX/issues/2211)) ([5e4bc4a](https://github.com/Azure/LogicAppsUX/commit/5e4bc4afdb344a5b656b3f611c8efe77f39e3e0a))
- **designer:** reverting a change to variable change ([#2217](https://github.com/Azure/LogicAppsUX/issues/2217)) ([dc4da10](https://github.com/Azure/LogicAppsUX/commit/dc4da10cd10871b2ff76977c0a7fa35121cea59a))

### [2.15.6](https://github.com/Azure/LogicAppsUX/compare/v2.15.5...v2.15.6) (2023-05-03)

### Bug Fixes

- **designer:** Add concurrency to for each action ([#2195](https://github.com/Azure/LogicAppsUX/issues/2195)) ([f4012eb](https://github.com/Azure/LogicAppsUX/commit/f4012eb4e2cc4f28852ee66be793fcacf45c9052))
- **designer:** Code & Message should be shown conditionally for Terminate action ([#2205](https://github.com/Azure/LogicAppsUX/issues/2205)) ([d3b2094](https://github.com/Azure/LogicAppsUX/commit/d3b2094bd6bd8ad37796a3182b58112793db77a8))
- **designer:** Dynamic content was incorrectly cached for swagger based operations ([#2206](https://github.com/Azure/LogicAppsUX/issues/2206)) ([3e62b1c](https://github.com/Azure/LogicAppsUX/commit/3e62b1c9f18e51d6e6295bb3d165622fe2400370))
- **designer:** Fix expression for dynamic trigger output tokens ([#2201](https://github.com/Azure/LogicAppsUX/issues/2201)) ([1527be1](https://github.com/Azure/LogicAppsUX/commit/1527be1cb083c8b965b5a779a7273cbd6fc2d413))
- **designer:** Fixing the operation setting for async pattern in http manifest ([#2207](https://github.com/Azure/LogicAppsUX/issues/2207)) ([f6df515](https://github.com/Azure/LogicAppsUX/commit/f6df51524e179bc5ece45331ad6ec47b1ed370e8))
- **openapi:** Make parameters optional in OpenAPI builder ([#2184](https://github.com/Azure/LogicAppsUX/issues/2184)) ([81f73f3](https://github.com/Azure/LogicAppsUX/commit/81f73f3be97473cfcadee788701a488f4419b97f))

### [2.15.5](https://github.com/Azure/LogicAppsUX/compare/v2.15.4...v2.15.5) (2023-05-02)

### Bug Fixes

- **designer:** Fix focus on comment box when comment is empty ([#2197](https://github.com/Azure/LogicAppsUX/issues/2197)) ([a86584b](https://github.com/Azure/LogicAppsUX/commit/a86584bba65692567555bab4b92afd9acb9ecaee))
- **designer:** add property to specify whether graph object is locked for updates [#2175](https://github.com/Azure/LogicAppsUX/issues/2175) ([#2196](https://github.com/Azure/LogicAppsUX/issues/2196)) ([6032618](https://github.com/Azure/LogicAppsUX/commit/6032618b7f364b5539d146aa86f9c79f865c3d94))
- **designer:** expose `updateParameterValidation` helper function ([#2179](https://github.com/Azure/LogicAppsUX/issues/2179)) ([8c4a3ac](https://github.com/Azure/LogicAppsUX/commit/8c4a3acd7314dcd937b2957b790dce159cf61dfc))
- **designer:** initializeVariable not showing correct boolean values ([#2186](https://github.com/Azure/LogicAppsUX/issues/2186)) ([5fccc83](https://github.com/Azure/LogicAppsUX/commit/5fccc831c025075b4f8e708fb5cee8da4ae42474))
- **designer:** respect horizontal padding when panel is on the left ([#2198](https://github.com/Azure/LogicAppsUX/issues/2198)) ([5ebc0c2](https://github.com/Azure/LogicAppsUX/commit/5ebc0c231dbf1ec7f72bd210ba497f9804717bd8))
- **designer:** Token Picker / Hide ([#2188](https://github.com/Azure/LogicAppsUX/issues/2188)) ([102adb0](https://github.com/Azure/LogicAppsUX/commit/102adb000f32c845622318cad491f04a40056257))

### [2.15.4](https://github.com/Azure/LogicAppsUX/compare/v2.15.3...v2.15.4) (2023-05-01)

### [2.15.3](https://github.com/Azure/LogicAppsUX/compare/v2.15.2...v2.15.3) (2023-04-30)

### [2.15.2](https://github.com/Azure/LogicAppsUX/compare/v2.15.1...v2.15.2) (2023-04-29)

### Features

- **designer:** File picker ([#2165](https://github.com/Azure/LogicAppsUX/issues/2165)) ([c30fa26](https://github.com/Azure/LogicAppsUX/commit/c30fa26dac619a84ec0800bb9bb398cb8dda0a79))

### Bug Fixes

- **powerautomate:** Update manual trigger serialization to match manifest and render only dynamically added parameters ([#2177](https://github.com/Azure/LogicAppsUX/issues/2177)) ([19b9b40](https://github.com/Azure/LogicAppsUX/commit/19b9b40f917d641111262c8a3931119a99af1415))

### [2.15.1](https://github.com/Azure/LogicAppsUX/compare/v2.15.0...v2.15.1) (2023-04-29)

### Bug Fixes

- **designer:** Consumption APIM dynamic data fetched properly, recurrence defaults passed properly ([#2182](https://github.com/Azure/LogicAppsUX/issues/2182)) ([0aa35b6](https://github.com/Azure/LogicAppsUX/commit/0aa35b624f72cb1c16b61d5cd3978706a50ee776))

## [2.15.0](https://github.com/Azure/LogicAppsUX/compare/v2.14.0...v2.15.0) (2023-04-28)

### Features

- **vscode:** Move extension tab to resources tab ([#2107](https://github.com/Azure/LogicAppsUX/issues/2107)) ([2a92423](https://github.com/Azure/LogicAppsUX/commit/2a92423abc7d02963416d11f5de44206baa7d69d))

### Bug Fixes

- **designer:** Update token picker location during scroll ([#2176](https://github.com/Azure/LogicAppsUX/issues/2176)) ([b89dbfa](https://github.com/Azure/LogicAppsUX/commit/b89dbfaa138b5301c6c6c7a9cbd75b3d83fa25bf))

## [2.14.0](https://github.com/Azure/LogicAppsUX/compare/v2.13.0...v2.14.0) (2023-04-28)

### Features

- **meta:** Release action update to specify release type ([#2180](https://github.com/Azure/LogicAppsUX/issues/2180)) ([c8fbff6](https://github.com/Azure/LogicAppsUX/commit/c8fbff639684e52532aedb1169c949642fb1b628))

### Bug Fixes

- **designer:** Disable action type dropdown when is trigger node ([#2178](https://github.com/Azure/LogicAppsUX/issues/2178)) ([dda688b](https://github.com/Azure/LogicAppsUX/commit/dda688b2021756e0f3306aa124eaecb574feb880))
- **designer:** Remove double quotation marks in parameters panel ([#2170](https://github.com/Azure/LogicAppsUX/issues/2170)) ([d033fce](https://github.com/Azure/LogicAppsUX/commit/d033fce9f1eec1239de642a4792ef5913bd4bfaf))

## [2.13.0](https://github.com/Azure/LogicAppsUX/compare/v2.12.0...v2.13.0) (2023-04-28)

### Features

- **designer:** Add Managed Identity picker in parameters view for MSI connections ([#2173](https://github.com/Azure/LogicAppsUX/issues/2173)) ([4637537](https://github.com/Azure/LogicAppsUX/commit/4637537110eb000fe081feb4816d06387091ebe6))
- **designer:** Recurrence parameter defaults ([#2171](https://github.com/Azure/LogicAppsUX/issues/2171)) ([9066e79](https://github.com/Azure/LogicAppsUX/commit/9066e7961c1321e8ff32ee4ac3c01e81df42af47))

## [2.12.0](https://github.com/Azure/LogicAppsUX/compare/v2.11.1...v2.12.0) (2023-04-28)

### Features

- **designer:** Add parameterSet name for multi auth connections in service providers ([#2152](https://github.com/Azure/LogicAppsUX/issues/2152)) ([074bf86](https://github.com/Azure/LogicAppsUX/commit/074bf8686c63950aabd4eec90bc62686fdcb94db))
- **designer:** Adding MSI support in connection creation and dynamic calls ([#2149](https://github.com/Azure/LogicAppsUX/issues/2149)) ([077bd80](https://github.com/Azure/LogicAppsUX/commit/077bd801a4dc9598187973d082bb84de15113d97))
- **designer:** Expose `validateParameter` helper function ([#2151](https://github.com/Azure/LogicAppsUX/issues/2151)) ([c2df373](https://github.com/Azure/LogicAppsUX/commit/c2df37306dd9ac26dec2273b4b4602cb893975e6))
- **designer:** HTML Editor ([#2146](https://github.com/Azure/LogicAppsUX/issues/2146)) ([6c2fc42](https://github.com/Azure/LogicAppsUX/commit/6c2fc42dcae9d25e4f10117d2acfe24305f38e15))

### Bug Fixes

- **designer:** "Run After" Bugfix around new root actions ([#2094](https://github.com/Azure/LogicAppsUX/issues/2094)) ([8974c7e](https://github.com/Azure/LogicAppsUX/commit/8974c7ebbaf9ca0df9a273da32c94c1241e90f1c))
- **designer:** Fixing loading of display values and metadata serialization in file picker ([#2164](https://github.com/Azure/LogicAppsUX/issues/2164)) ([08faf4a](https://github.com/Azure/LogicAppsUX/commit/08faf4ab1f48eb83bf89ea10773ed964ce3aaf37))
- **designer:** Fixing test connection call for service providers ([#2153](https://github.com/Azure/LogicAppsUX/issues/2153)) ([00dfc5b](https://github.com/Azure/LogicAppsUX/commit/00dfc5bd4fa97ce20ffb16bfa9120ce36f278c31))
- **types:** Move LogicApps types to exportable files ([#2168](https://github.com/Azure/LogicAppsUX/issues/2168)) ([67486cc](https://github.com/Azure/LogicAppsUX/commit/67486cc6c881dbb3b81edcd6e0d1a45ebed6b279))
- **vscode:** Update of connections and settings data in services ([#2169](https://github.com/Azure/LogicAppsUX/issues/2169)) ([a485450](https://github.com/Azure/LogicAppsUX/commit/a4854509869c574386bbbe8f139494fd82681716))

### [2.11.1](https://github.com/Azure/LogicAppsUX/compare/v2.11.0...v2.11.1) (2023-04-27)

### Bug Fixes

- **Data Mapper:** Reduce the feel of slowness with the prop pane ([#2104](https://github.com/Azure/LogicAppsUX/issues/2104)) ([d596377](https://github.com/Azure/LogicAppsUX/commit/d59637794a12a795e5a9926c8508c5ad49d7091f))
- **designer:** Trigger Spliton issue ([#1931](https://github.com/Azure/LogicAppsUX/issues/1931)) ([8400096](https://github.com/Azure/LogicAppsUX/commit/840009613137a05a4f93613b23975b50343b4331))
- **Power Automate:** Add conditional string rendering for designer when in xrmConnectionReferenceMode ([#2137](https://github.com/Azure/LogicAppsUX/issues/2137)) ([fd9bd6d](https://github.com/Azure/LogicAppsUX/commit/fd9bd6d4c2b5ce07553897371479cdd0982f8d9d))
- **powerautomate:** Return empty schema object when manual trigger editor is initially loaded ([#2147](https://github.com/Azure/LogicAppsUX/issues/2147)) ([02e0d1f](https://github.com/Azure/LogicAppsUX/commit/02e0d1ff218d13198fbf1fb7badfa2e4dc9b215e))

## [2.11.0](https://github.com/Azure/LogicAppsUX/compare/v2.10.0...v2.11.0) (2023-04-26)

## [2.8.0](https://github.com/Azure/LogicAppsUX/compare/v2.7.0...v2.8.0) (2023-04-21)

### Features

- **designer:** Adding authentication editor for Http webhook operations auth parameter ([#2130](https://github.com/Azure/LogicAppsUX/issues/2130)) ([559d81b](https://github.com/Azure/LogicAppsUX/commit/559d81bbd7a751084b0e39eb5e74881320b741d7))
- **designer:** Adding data flow to file-folder picker editor ([#2121](https://github.com/Azure/LogicAppsUX/issues/2121)) ([cecc43e](https://github.com/Azure/LogicAppsUX/commit/cecc43e5fe00973d11f47a16a7c6cc09dec342d0))

### Bug Fixes

- **Data Mapper:** Fix JSON multi-property loop assignment ([#2136](https://github.com/Azure/LogicAppsUX/issues/2136)) ([6d83dad](https://github.com/Azure/LogicAppsUX/commit/6d83dad2eb5b44dbdef65ca71d145548ad60b13e))
- **designer-ui:** Fix DynamicallyAddedParameter menu getting collapsed on mouseenter ([#2139](https://github.com/Azure/LogicAppsUX/issues/2139)) ([dd20166](https://github.com/Azure/LogicAppsUX/commit/dd20166a0b7f8bd0cbb8d4a61e7ca42ec8c27217))
- **designer-ui:** Fix incorrect type when creating new DynamicallyAddedParameter and match key generation with v1 designer ([#2116](https://github.com/Azure/LogicAppsUX/issues/2116)) ([0bd1576](https://github.com/Azure/LogicAppsUX/commit/0bd157689d6287a9b580548fdf9a249b938ea45a))
- **designer:** Change V3 token picker classname diff from V1 ([#2127](https://github.com/Azure/LogicAppsUX/issues/2127)) ([008237b](https://github.com/Azure/LogicAppsUX/commit/008237b017433f0ba90b618d9f41850f3c314dad))
- **designer:** prioritize items with false/undefined isCustomApi property ([#2128](https://github.com/Azure/LogicAppsUX/issues/2128)) ([91bbb8f](https://github.com/Azure/LogicAppsUX/commit/91bbb8f80c568e29715a807cc8a4f9fabf3cd916))
- **designer:** reverting Panel should validate params onBlur + Foreach shouldn't add another when selecting a token ([#2138](https://github.com/Azure/LogicAppsUX/issues/2138)) ([4947c8d](https://github.com/Azure/LogicAppsUX/commit/4947c8d74828d98ccaab1dc3ebfcb7fe7bdd3bc2)), closes [#2096](https://github.com/Azure/LogicAppsUX/issues/2096)

## [2.10.0](https://github.com/Azure/LogicAppsUX/compare/v2.9.1...v2.10.0) (2023-04-25)

### Features

- Add prop to specify whether to display Runtime dropdown and labels ([#2118](https://github.com/Azure/LogicAppsUX/issues/2118)) ([19e4cfe](https://github.com/Azure/LogicAppsUX/commit/19e4cfe081f6f89ba17d3317986f8840b070d711))
- **designer:** Add invoker connection support on toggle ([#2063](https://github.com/Azure/LogicAppsUX/issues/2063)) ([e6383aa](https://github.com/Azure/LogicAppsUX/commit/e6383aa8a0eac6893594ae17c4a6cb45cc3bb6fc))

### Bug Fixes

- **Data Mapper:** Fix source schema attributes and functions ([#2108](https://github.com/Azure/LogicAppsUX/issues/2108)) ([d146a52](https://github.com/Azure/LogicAppsUX/commit/d146a52445913fcf3a34f7f0b9470f2282cf707e))
- updating Panel z-Index so that it does not overlap external components ([#2113](https://github.com/Azure/LogicAppsUX/issues/2113)) ([a8ea427](https://github.com/Azure/LogicAppsUX/commit/a8ea427307225d1f5bbbdfdecaf022765b295391))
- **vscode:** Export url fail error ([#2115](https://github.com/Azure/LogicAppsUX/issues/2115)) ([6001fe1](https://github.com/Azure/LogicAppsUX/commit/6001fe1959bcb3f4a02e7333627f854f43d93701))

### [2.9.1](https://github.com/Azure/LogicAppsUX/compare/v2.9.0...v2.9.1) (2023-04-24)

## [2.9.0](https://github.com/Azure/LogicAppsUX/compare/v2.8.1...v2.9.0) (2023-04-23)

### Features

- **designer:** Adding initial data processing layer to support file-folder picker ([#2111](https://github.com/Azure/LogicAppsUX/issues/2111)) ([6216313](https://github.com/Azure/LogicAppsUX/commit/6216313c8864b07f8f8ceda2d0e5c97a0e526479))

### Bug Fixes

- **designer:** Revert my recent changes to `shouldAddForeach` due to double array regression ([#2110](https://github.com/Azure/LogicAppsUX/issues/2110)) ([e4cf418](https://github.com/Azure/LogicAppsUX/commit/e4cf4186687dc27f460c2afb9fb278fe72d4ca8a))
- **designer:** Update repetition name and index based on node type ([#2100](https://github.com/Azure/LogicAppsUX/issues/2100)) ([20cf577](https://github.com/Azure/LogicAppsUX/commit/20cf57772625dab37f79f1cf6a805c5c096b70cc))

### [2.8.1](https://github.com/Azure/LogicAppsUX/compare/v2.8.0...v2.8.1) (2023-04-22)

### Bug Fixes

- **designer:** Fixing the subsequent ListDynamicValues calls by adding correct cache key ([#1908](https://github.com/Azure/LogicAppsUX/issues/1908)) ([573db3c](https://github.com/Azure/LogicAppsUX/commit/573db3c4bb7ae51cb2f994cfa6b6535756a35a22))
- **designer:** Rename `comment` to `note` ([#2109](https://github.com/Azure/LogicAppsUX/issues/2109)) ([fb42a1b](https://github.com/Azure/LogicAppsUX/commit/fb42a1b9704d990c6372df43f771b21fed1313c9))
- Fix issue where Token Picker is clipped when Panel is rendered on the left ([#2106](https://github.com/Azure/LogicAppsUX/issues/2106)) ([5521136](https://github.com/Azure/LogicAppsUX/commit/5521136dd566a46f67e6eda9da63c42ded8680be))

## [2.8.0](https://github.com/Azure/LogicAppsUX/compare/v2.7.0...v2.8.0) (2023-04-21)

### Features

- **state:** Implement basis for workflow state `isDirty` ([#2095](https://github.com/Azure/LogicAppsUX/issues/2095)) ([dce056f](https://github.com/Azure/LogicAppsUX/commit/dce056f54044847e33a45059b78c3478a49a5972))

### Bug Fixes

- **designer:** Panel should validate params onBlur + Foreach shouldn't add another when selecting a token ([#2096](https://github.com/Azure/LogicAppsUX/issues/2096)) ([6a58723](https://github.com/Azure/LogicAppsUX/commit/6a587235d413cb3cf7047f06ccd7a1e2949ca331))

## [2.7.0](https://github.com/Azure/LogicAppsUX/compare/v2.6.3...v2.7.0) (2023-04-21)

### Features

- **Data Mapper:** Github issue template ([#2085](https://github.com/Azure/LogicAppsUX/issues/2085)) ([c23ea6b](https://github.com/Azure/LogicAppsUX/commit/c23ea6b74dc64038be30237a3aefad034223b969))
- **powerautomate:** Implement DynamicallyAddedParameter to support manual trigger ([#2068](https://github.com/Azure/LogicAppsUX/issues/2068)) ([e9b0118](https://github.com/Azure/LogicAppsUX/commit/e9b01187e85b5e6339d295f56a252ca53a40724a))

### Bug Fixes

- **Data Mapper:** Adjust functions left ([#2084](https://github.com/Azure/LogicAppsUX/issues/2084)) ([17d7c2c](https://github.com/Azure/LogicAppsUX/commit/17d7c2c8d964ee50780e25366c1ed4a0ac8e4941))
- **designer:** ensure all operations and connectors pages are fetched on fisrt search ([#2083](https://github.com/Azure/LogicAppsUX/issues/2083)) ([c330803](https://github.com/Azure/LogicAppsUX/commit/c330803865841482b9ffbc1164a25bfb0e6a447f))

### [2.6.3](https://github.com/Azure/LogicAppsUX/compare/v2.6.2...v2.6.3) (2023-04-20)

### Bug Fixes

- **designer:** Handle non-string types when converting string to value segments in editorviewmode ([#2079](https://github.com/Azure/LogicAppsUX/issues/2079)) ([b0dc77a](https://github.com/Azure/LogicAppsUX/commit/b0dc77adea01575b228b6d953d08263224544edc))

### [2.6.2](https://github.com/Azure/LogicAppsUX/compare/v2.6.1...v2.6.2) (2023-04-20)

### Bug Fixes

- **designer:** Add refetch for failed iterations ([#2072](https://github.com/Azure/LogicAppsUX/issues/2072)) ([de370e5](https://github.com/Azure/LogicAppsUX/commit/de370e535bb614cf14818b2a2ca98c09c4dc5460))

### [2.6.1](https://github.com/Azure/LogicAppsUX/compare/v2.6.0...v2.6.1) (2023-04-19)

## [2.6.0](https://github.com/Azure/LogicAppsUX/compare/v2.5.1...v2.6.0) (2023-04-19)

### Features

- **Data Mapper:** Enable everything test ([#2053](https://github.com/Azure/LogicAppsUX/issues/2053)) ([5e693f7](https://github.com/Azure/LogicAppsUX/commit/5e693f7f054021bf2873c098b37ae5d38461319d))
- **Data Mapper:** Enable JSON . test ([#2060](https://github.com/Azure/LogicAppsUX/issues/2060)) ([c88feef](https://github.com/Azure/LogicAppsUX/commit/c88feefda97e4fec3abf9206f0636caba71ae091))

### Bug Fixes

- **designer:** add logic to fallback to connector data from Operation Manifest when Connection Service data is undefined ([#2070](https://github.com/Azure/LogicAppsUX/issues/2070)) ([6858493](https://github.com/Azure/LogicAppsUX/commit/6858493fb5e2f9a31df06242c2bb2c0b6feb8f7a))
- **designer:** combobox showing UIUD when clicking on a loading dynamic data parameter ([#2067](https://github.com/Azure/LogicAppsUX/issues/2067)) ([9e75da7](https://github.com/Azure/LogicAppsUX/commit/9e75da76ca615e84c52e72dc663cbdc2e728ea38))
- **designer:** Output token expressions generated incorrectly for swagger based operations ([#2069](https://github.com/Azure/LogicAppsUX/issues/2069)) ([0b33a53](https://github.com/Azure/LogicAppsUX/commit/0b33a53ee77e0565bb621d585772d6df43d64548))

### [2.5.1](https://github.com/Azure/LogicAppsUX/compare/v2.5.0...v2.5.1) (2023-04-19)

### Bug Fixes

- **designer:** Fix issue where oAuth flow would crash the designer ([#2062](https://github.com/Azure/LogicAppsUX/issues/2062)) ([172763c](https://github.com/Azure/LogicAppsUX/commit/172763c797dd887ca9432142e0e494c1f83a9439))

## [2.5.0](https://github.com/Azure/LogicAppsUX/compare/v2.4.5...v2.5.0) (2023-04-19)

### Features

- **state:** Add hooks for connection refs & map, and input parameters ([#2059](https://github.com/Azure/LogicAppsUX/issues/2059)) ([bdfb328](https://github.com/Azure/LogicAppsUX/commit/bdfb328511c6f05f2f9d12cd8ee78d925db88c32))
- **state:** Add redux action to revert workflow state to initial ([#2058](https://github.com/Azure/LogicAppsUX/issues/2058)) ([43984e7](https://github.com/Azure/LogicAppsUX/commit/43984e73a62805ff6035142ddfcfc65e92959b3b))

### Bug Fixes

- **designer:** Move designer to the right or left on operation addition depending on where the panel is located ([#2055](https://github.com/Azure/LogicAppsUX/issues/2055)) ([c8a7bff](https://github.com/Azure/LogicAppsUX/commit/c8a7bff9eb0706534e3365beb3be61f86c890405))
- **designer:** Updating manifest and logic to support Http+swagger/Appservice serialization and deserialization generically ([#2015](https://github.com/Azure/LogicAppsUX/issues/2015)) ([68dc6c1](https://github.com/Azure/LogicAppsUX/commit/68dc6c163e6d4224fdfc4b9303a3526d4725c3f8))

### [2.4.5](https://github.com/Azure/LogicAppsUX/compare/v2.4.4...v2.4.5) (2023-04-18)

### [2.4.4](https://github.com/Azure/LogicAppsUX/compare/v2.4.3...v2.4.4) (2023-04-17)

### [2.4.4](https://github.com/Azure/LogicAppsUX/compare/v2.4.3...v2.4.4) (2023-04-17)

### Bug Fixes

- **designer:** add UI for invoker connection support ([#2044](https://github.com/Azure/LogicAppsUX/issues/2044)) ([1795d98](https://github.com/Azure/LogicAppsUX/commit/1795d9865b79a1d101610f49c106bc2137941047))
- **designer:** Updated and enabled multiple built-in triggers for Consumption ([#2028](https://github.com/Azure/LogicAppsUX/issues/2028)) ([51824a0](https://github.com/Azure/LogicAppsUX/commit/51824a016481b162d1e931b448ca79f3c9a14646))

### [2.4.3](https://github.com/Azure/LogicAppsUX/compare/v2.4.2...v2.4.3) (2023-04-17)

### Bug Fixes

- **designer:** removed accidental files ([#2042](https://github.com/Azure/LogicAppsUX/issues/2042)) ([d27227e](https://github.com/Azure/LogicAppsUX/commit/d27227e67ab9aa83ba8a72b993e14df2437b379f))

### [2.4.2](https://github.com/Azure/LogicAppsUX/compare/v2.4.1...v2.4.2) (2023-04-17)

### Bug Fixes

- **designer:** Delete StaticResults when node is deleted/ Support Combobox for enums ([#2032](https://github.com/Azure/LogicAppsUX/issues/2032)) ([4e2848f](https://github.com/Azure/LogicAppsUX/commit/4e2848f4d198f81822546e96c15590118c2eb8f9))

### [2.4.1](https://github.com/Azure/LogicAppsUX/compare/v2.4.0...v2.4.1) (2023-04-16)

### Bug Fixes

- **Designer:** Update Token metadata for editorviewmodel editors/ other bugs ([#2031](https://github.com/Azure/LogicAppsUX/issues/2031)) ([4adef0f](https://github.com/Azure/LogicAppsUX/commit/4adef0fe971774fdf8f41785b14b1168cee48280))

## [2.4.0](https://github.com/Azure/LogicAppsUX/compare/v2.3.1...v2.4.0) (2023-04-15)

### Features

- **designer:** Setup work for filepicker, Other Bug fixes ([#2020](https://github.com/Azure/LogicAppsUX/issues/2020)) ([3470c8e](https://github.com/Azure/LogicAppsUX/commit/3470c8eb2cb155084f55990ba7931181db245ad6))

### [2.3.1](https://github.com/Azure/LogicAppsUX/compare/v2.3.0...v2.3.1) (2023-04-14)

### [2.2.1](https://github.com/Azure/LogicAppsUX/compare/v2.2.0...v2.2.1) (2023-04-13)

### Bug Fixes

- **Services:** Gateway service now works in VSCode/Standalone ([#2030](https://github.com/Azure/LogicAppsUX/issues/2030)) ([f3483c3](https://github.com/Azure/LogicAppsUX/commit/f3483c36c1d068ee492bcbfe573b8e889682ee32))

## [2.3.0](https://github.com/Azure/LogicAppsUX/compare/v2.2.3...v2.3.0) (2023-04-14)

### Features

- **vscode:** Add header and noAuth properties to getContent api call ([#2016](https://github.com/Azure/LogicAppsUX/issues/2016)) ([7c9e201](https://github.com/Azure/LogicAppsUX/commit/7c9e2013c9bec7f944a5a69bf32bf9bddf2851e6))

### Bug Fixes

- **data mapper:** Add README file ([#2026](https://github.com/Azure/LogicAppsUX/issues/2026)) ([5dfcd9b](https://github.com/Azure/LogicAppsUX/commit/5dfcd9bb610c5726eae63c5836f79377630e4229))
- **designer:** added keyboard navigation to code editor ([#1976](https://github.com/Azure/LogicAppsUX/issues/1976)) ([111bb70](https://github.com/Azure/LogicAppsUX/commit/111bb7094aff1862f3870bafb25a767a714e9ea5))
- **designer:** Fixed token display issue in dictionary editors ([#2027](https://github.com/Azure/LogicAppsUX/issues/2027)) ([4aff726](https://github.com/Azure/LogicAppsUX/commit/4aff72615da91d05dcb3921429a4db97d6f03cde))
- **designer:** Revert of Add UI for invoker connection support ([#1990](https://github.com/Azure/LogicAppsUX/issues/1990)) ([#2029](https://github.com/Azure/LogicAppsUX/issues/2029)) ([3b71bce](https://github.com/Azure/LogicAppsUX/commit/3b71bce354b96acbcaabafe74adb36081e63e318))

### [2.2.3](https://github.com/Azure/LogicAppsUX/compare/v2.2.2...v2.2.3) (2023-04-14)

### Bug Fixes

- **designer:** move useId into the code instead of import to fix webpack issue ([058aa38](https://github.com/Azure/LogicAppsUX/commit/058aa38ef1071eb291c20dffb63a06eb0ab047e0))

### [2.2.2](https://github.com/Azure/LogicAppsUX/compare/v2.2.1...v2.2.2) (2023-04-14)

### Bug Fixes

- **Data Mapper:** Fix connected highlighting to not over highlight ([#2013](https://github.com/Azure/LogicAppsUX/issues/2013)) ([4415ce0](https://github.com/Azure/LogicAppsUX/commit/4415ce0ffec1a8375762da106697a8b85dec041e))
- **designer:** Add UI for invoker connection support ([#1990](https://github.com/Azure/LogicAppsUX/issues/1990)) ([9b167c8](https://github.com/Azure/LogicAppsUX/commit/9b167c830d2e48df36fc81ea46f7c324266597d9))
- **Designer:** Fixed trigger metadata serialization bug ([#2014](https://github.com/Azure/LogicAppsUX/issues/2014)) ([5fc907c](https://github.com/Azure/LogicAppsUX/commit/5fc907ca9fe7cf4699bf29fed940987dd7085b8a))
- **designer:** Parallel branch action visibility fix ([#2002](https://github.com/Azure/LogicAppsUX/issues/2002)) ([7746f38](https://github.com/Azure/LogicAppsUX/commit/7746f38789f2a60b176fc8b423027c75bc31714a))
- **designer:** Remove precaching for search/browse making initial loa… ([#1983](https://github.com/Azure/LogicAppsUX/issues/1983)) ([a797cf5](https://github.com/Azure/LogicAppsUX/commit/a797cf5b37dbca5078eadcfeeb8777e0010941a6))

### [2.2.1](https://github.com/Azure/LogicAppsUX/compare/v2.2.0...v2.2.1) (2023-04-13)

### Bug Fixes

- **vscode:** Assign maps and schema artifacts to panel metadata ([#1995](https://github.com/Azure/LogicAppsUX/issues/1995)) ([e2581f1](https://github.com/Azure/LogicAppsUX/commit/e2581f1656df5f3b976a65da472e27ee826b1e0e))

## [2.2.0](https://github.com/Azure/LogicAppsUX/compare/v2.1.0...v2.2.0) (2023-04-13)

### Features

- **Data Mapper:** Highlight all connected nodes when selecting something ([#1992](https://github.com/Azure/LogicAppsUX/issues/1992)) ([5f2486d](https://github.com/Azure/LogicAppsUX/commit/5f2486d39553e9e263047a1c2fcf8ab197b4420b))
- **powerautomate:** Add UI component for floating action menu ([#1949](https://github.com/Azure/LogicAppsUX/issues/1949)) ([abfdc0d](https://github.com/Azure/LogicAppsUX/commit/abfdc0d32d6a8c697e061f736e02499ef873fa93))

### Bug Fixes

- **all:** Turn off default refetch behavior for queryClients for more consistent network behavior ([#1975](https://github.com/Azure/LogicAppsUX/issues/1975)) ([4ed57e2](https://github.com/Azure/LogicAppsUX/commit/4ed57e22094feaf583083db43a9ab88c2de24359))
- **vscode:** Fix an issue with switching to NuGet-based project when executed from Command menu ([#1985](https://github.com/Azure/LogicAppsUX/issues/1985)) ([d07af44](https://github.com/Azure/LogicAppsUX/commit/d07af44e2dbf6746ae341d93d2b32b3c2300e3e6))

## [2.1.0](https://github.com/Azure/LogicAppsUX/compare/v2.0.32...v2.1.0) (2023-04-12)

### Features

- **Data Mapper:** Fix same source connections ([#1978](https://github.com/Azure/LogicAppsUX/issues/1978)) ([56c5935](https://github.com/Azure/LogicAppsUX/commit/56c5935d9543104b964a573432be28d0f6c73783))

### Bug Fixes

- **Data Mapper:** Fix deletes from same input ([#1981](https://github.com/Azure/LogicAppsUX/issues/1981)) ([ea56eaf](https://github.com/Azure/LogicAppsUX/commit/ea56eaf4212219a0c12b5da284dba02327d51c09))
- **vscode:** Set functions worker runtime according to OS ([#1980](https://github.com/Azure/LogicAppsUX/issues/1980)) ([4534bb3](https://github.com/Azure/LogicAppsUX/commit/4534bb3338a72b1e2eec49bc325f7ebed2a00dc6))

### [2.0.32](https://github.com/Azure/LogicAppsUX/compare/v2.0.31...v2.0.32) (2023-04-11)

### Logic Apps Designer Changes

- HTTP + Swagger Operation ([#1907](https://github.com/Azure/LogicAppsUX/issues/1907)) ([614ab72](https://github.com/Azure/LogicAppsUX/commit/614ab72400611530ecf65bd31ea0c2d4c27818ee))

### [2.0.31](https://github.com/Azure/LogicAppsUX/compare/v2.0.30...v2.0.31) (2023-04-11)

### [2.0.30](https://github.com/Azure/LogicAppsUX/compare/v2.0.29...v2.0.30) (2023-04-10)

### Logic Apps Designer Bug Fixes

- SimpleQueryBuilder Serialization + Code Editor Fixes ([#1957](https://github.com/Azure/LogicAppsUX/issues/1957)) ([b7c3fb4](https://github.com/Azure/LogicAppsUX/commit/b7c3fb434e7b138d94508e6bef73b83f31fcb9dc))

### [2.0.29](https://github.com/Azure/LogicAppsUX/compare/v2.0.28...v2.0.29) (2023-04-10)

### [2.0.28](https://github.com/Azure/LogicAppsUX/compare/v2.0.27...v2.0.28) (2023-04-09)

### Logic Apps Designer Bug Fixes

- Make the caret in editors have consistent color with a11y contrast ([#1943](https://github.com/Azure/LogicAppsUX/issues/1943)) ([0d30e79](https://github.com/Azure/LogicAppsUX/commit/0d30e7905e145bfbf893f4ade376b6ad8242826e))

### [2.0.27](https://github.com/Azure/LogicAppsUX/compare/v2.0.26...v2.0.27) (2023-04-08)

### [2.0.26](https://github.com/Azure/LogicAppsUX/compare/v2.0.25...v2.0.26) (2023-04-07)

### Logic Apps Designer Bug Fixes

- Add validation for node metadata ([#1946](https://github.com/Azure/LogicAppsUX/issues/1946)) ([1372b64](https://github.com/Azure/LogicAppsUX/commit/1372b64762c23d38d6171899b328e3641fa418b3))
- On escape of token picker, refocus on the editor ([#1937](https://github.com/Azure/LogicAppsUX/issues/1937)) ([43e724e](https://github.com/Azure/LogicAppsUX/commit/43e724ebf3dfcb8bf642987bddea6a6fe1f79ef8))
- Removing SingleLine Plugin, Clickable typeahead plugin buttons ([#1950](https://github.com/Azure/LogicAppsUX/issues/1950)) ([8ced0bf](https://github.com/Azure/LogicAppsUX/commit/8ced0bf7213668fdbeb1555ea3a4a5d5eac5ae4c))

### [2.0.25](https://github.com/Azure/LogicAppsUX/compare/v2.0.24...v2.0.25) (2023-04-07)

### Logic Apps Designer Bug Fixes

- Implementation of loops UI widgets ([#1925](https://github.com/Azure/LogicAppsUX/issues/1925)) ([9154253](https://github.com/Azure/LogicAppsUX/commit/91542534f8e47266e22fdc5ee36d88c59b8dbd21))

### Logic Apps Designer Changes

- Can now create Service Principal connections ([#1935](https://github.com/Azure/LogicAppsUX/issues/1935)) ([85b9d45](https://github.com/Azure/LogicAppsUX/commit/85b9d45d174bfd530b091a9807edaacc36baac30))

### [2.0.24](https://github.com/Azure/LogicAppsUX/compare/v2.0.23...v2.0.24) (2023-04-06)

### Logic Apps Designer Bug Fixes

- Conditional Bugs/ Other Bugs ([#1928](https://github.com/Azure/LogicAppsUX/issues/1928)) ([af4ad3d](https://github.com/Azure/LogicAppsUX/commit/af4ad3d722eed8a1a6706fab86877bee26167bc3))
- Fix serializer to flatten paths for OpenAPI ([#1882](https://github.com/Azure/LogicAppsUX/issues/1882)) ([2ce3956](https://github.com/Azure/LogicAppsUX/commit/2ce395687d8d061d40461bb7f1640cb0fa0f4bbd))

### [2.0.23](https://github.com/Azure/LogicAppsUX/compare/v2.0.22...v2.0.23) (2023-04-05)

### Logic Apps Designer Bug Fixes

- APIM Action does not add basePath to baseURL ([#1911](https://github.com/Azure/LogicAppsUX/issues/1911)) ([bdf7b52](https://github.com/Azure/LogicAppsUX/commit/bdf7b525537b3e64a96a9beca2b75c3ca7c38b2e))
- Associate labels with fields in panel properties ([#1916](https://github.com/Azure/LogicAppsUX/issues/1916)) ([5252426](https://github.com/Azure/LogicAppsUX/commit/5252426a15687d2ea74f0a9a283f2fce21f7afb2))
- Disable remove button and add parameters in readOnly mode ([#1920](https://github.com/Azure/LogicAppsUX/issues/1920)) ([49598e2](https://github.com/Azure/LogicAppsUX/commit/49598e261664747c37aa5c54ab26219dd9d7d1ba))

### Logic Apps Designer Changes

- Add design polish to token skittle ([#1923](https://github.com/Azure/LogicAppsUX/issues/1923)) ([1a8f4ed](https://github.com/Azure/LogicAppsUX/commit/1a8f4eda45f9f411fcc68fbf93eee6cfd2c8222b))

### [2.0.22](https://github.com/Azure/LogicAppsUX/compare/v2.0.21...v2.0.22) (2023-04-04)

### [2.0.21](https://github.com/Azure/LogicAppsUX/compare/v2.0.20...v2.0.21) (2023-04-03)

### Logic Apps Designer Changes

- add Recurrence Trigger editor ([#1888](https://github.com/Azure/LogicAppsUX/issues/1888)) ([c811015](https://github.com/Azure/LogicAppsUX/commit/c8110159263660f7b66dfe13baf5a2ef282c0727))

### [2.0.20](https://github.com/Azure/LogicAppsUX/compare/v2.0.19...v2.0.20) (2023-04-02)

### Logic Apps Designer Bug Fixes

- Fix issue where initialize variable array type had an extra pr… ([#1883](https://github.com/Azure/LogicAppsUX/issues/1883)) ([403e96c](https://github.com/Azure/LogicAppsUX/commit/403e96cad91f6fae506e100c31e2342911723aae))
- Remove erroring requests happening from manifest based operations ([#1884](https://github.com/Azure/LogicAppsUX/issues/1884)) ([f6e07e2](https://github.com/Azure/LogicAppsUX/commit/f6e07e2aa41f5072db2fa5d1a41aad6eeb55c354))

### [2.0.19](https://github.com/Azure/LogicAppsUX/compare/v2.0.18...v2.0.19) (2023-04-01)

### [2.0.19](https://github.com/Azure/LogicAppsUX/compare/v2.0.18...v2.0.19) (2023-04-01)

### Logic Apps Designer Changes

- Add keyboard typeahead for adding dymanic expressions and tokens ([#1879](https://github.com/Azure/LogicAppsUX/issues/1879)) ([7464ceb](https://github.com/Azure/LogicAppsUX/commit/7464cebecd999e2923f8c3eed49cb0c3a78ad1f3))

### Logic Apps Designer Bug Fixes

- Fix issue where query predicate would sometimes crash designer ([#1880](https://github.com/Azure/LogicAppsUX/issues/1880)) ([f06284d](https://github.com/Azure/LogicAppsUX/commit/f06284d40e2fb0baf6199fbbb1e39e1640a8b3b1))

### [2.0.18](https://github.com/Azure/LogicAppsUX/compare/v2.0.17...v2.0.18) (2023-03-31)

### Logic Apps Designer Changes

- Dont preload search operations before finished loading workflow data ([#1873](https://github.com/Azure/LogicAppsUX/issues/1873)) ([edc6d83](https://github.com/Azure/LogicAppsUX/commit/edc6d833e71c6bc5dfc81265a6eeabf5cb2ce0e4))

### Logic Apps Designer Bug Fixes

- Custom Connectors - sped up operations, fixed too many connectors ([#1876](https://github.com/Azure/LogicAppsUX/issues/1876)) ([1d0f135](https://github.com/Azure/LogicAppsUX/commit/1d0f1354dd6d14b712696a805cb963c8e2901fa3))
- Static Result Fix ([#1869](https://github.com/Azure/LogicAppsUX/issues/1869)) ([d7b64c4](https://github.com/Azure/LogicAppsUX/commit/d7b64c418f552e42b152b5d56675e409c44af63f))

### [2.0.17](https://github.com/Azure/LogicAppsUX/compare/v2.0.16...v2.0.17) (2023-03-31)

### [2.0.16](https://github.com/Azure/LogicAppsUX/compare/v2.0.15...v2.0.16) (2023-03-30)

### Logic Apps Designer Bug Fixes

- Adding scheme to apim url in connections ([#1857](https://github.com/Azure/LogicAppsUX/issues/1857)) ([28de4fe](https://github.com/Azure/LogicAppsUX/commit/28de4fe00b6462d79a427705d4a137aecb4d8484))
- defaultSplitOn And Display Array Editors without Schema ([#1862](https://github.com/Azure/LogicAppsUX/issues/1862)) ([14f807b](https://github.com/Azure/LogicAppsUX/commit/14f807b4db4c91f8b4a8dd7becab3c9231d25f57))

### [2.0.15](https://github.com/Azure/LogicAppsUX/compare/v2.0.14...v2.0.15) (2023-03-30)

### [2.0.14](https://github.com/Azure/LogicAppsUX/compare/v2.0.13...v2.0.14) (2023-03-30)

### Logic Apps Designer Bug Fixes

- Many RunAfter bug fixes ([#1855](https://github.com/Azure/LogicAppsUX/issues/1855)) ([d109df7](https://github.com/Azure/LogicAppsUX/commit/d109df7d76d3dd622fda8c0d81dcabf1bacd45f6))
- Small service cleanup ([#1845](https://github.com/Azure/LogicAppsUX/issues/1845)) ([f941216](https://github.com/Azure/LogicAppsUX/commit/f941216b9f38a72aa38ded521670f050230f4c56))

### [2.0.13](https://github.com/Azure/LogicAppsUX/compare/v2.0.12...v2.0.13) (2023-03-29)

### [2.0.12](https://github.com/Azure/LogicAppsUX/compare/v2.0.11...v2.0.12) (2023-03-28)

### [2.0.11](https://github.com/Azure/LogicAppsUX/compare/v2.0.10...v2.0.11) (2023-03-28)

### [2.0.10](https://github.com/Azure/LogicAppsUX/compare/v2.0.9...v2.0.10) (2023-03-27)

### [2.0.9](https://github.com/Azure/LogicAppsUX/compare/v2.0.8...v2.0.9) (2023-03-26)

### [2.0.8](https://github.com/Azure/LogicAppsUX/compare/v2.0.7...v2.0.8) (2023-03-25)

### [2.0.7](https://github.com/Azure/LogicAppsUX/compare/v2.0.6...v2.0.7) (2023-03-24)

### Logic Apps Designer Changes

- Consumption - Added Azure resource-based operations ([#1632](https://github.com/Azure/LogicAppsUX/issues/1632)) ([4f9d58e](https://github.com/Azure/LogicAppsUX/commit/4f9d58ecc2011d0ff97aed8553cbe0fe2f18c4c1))

### [2.0.6](https://github.com/Azure/LogicAppsUX/compare/v2.0.5...v2.0.6) (2023-03-24)

### [2.0.5](https://github.com/Azure/LogicAppsUX/compare/v2.0.4...v2.0.5) (2023-03-23)

### Logic Apps Designer Bug Fixes

- Dynamic Data value initialization fix ([#1799](https://github.com/Azure/LogicAppsUX/issues/1799)) ([dd3750c](https://github.com/Azure/LogicAppsUX/commit/dd3750cdaad8d966c4e0117f4954854dd0e521e6))

### [2.0.4](https://github.com/Azure/LogicAppsUX/compare/v2.0.3...v2.0.4) (2023-03-22)

### [2.0.3](https://github.com/Azure/LogicAppsUX/compare/v2.0.2...v2.0.3) (2023-03-21)

### Logic Apps Designer Bug Fixes

- Small dark mode changes ([#1789](https://github.com/Azure/LogicAppsUX/issues/1789)) ([9edfecb](https://github.com/Azure/LogicAppsUX/commit/9edfecb7748acda0e5fdb778ea38428487cc5894))
- Small token-picker layer host fix ([#1791](https://github.com/Azure/LogicAppsUX/issues/1791)) ([f2c70e8](https://github.com/Azure/LogicAppsUX/commit/f2c70e8650db4aa25b733fe84b962b467d289922))

### [2.0.2](https://github.com/Azure/LogicAppsUX/compare/v2.0.1...v2.0.2) (2023-03-21)

### [2.0.1](https://github.com/Azure/LogicAppsUX/compare/v0.2.117...v2.0.1) (2023-03-20)

### [0.2.117](https://github.com/Azure/LogicAppsUX/compare/v0.2.116...v0.2.117) (2023-03-20)

### [0.2.116](https://github.com/Azure/LogicAppsUX/compare/v0.2.115...v0.2.116) (2023-03-20)

### [0.2.115](https://github.com/Azure/LogicAppsUX/compare/v0.2.114...v0.2.115) (2023-03-19)

### [0.2.114](https://github.com/Azure/LogicAppsUX/compare/v0.2.113...v0.2.114) (2023-03-18)

### [0.2.113](https://github.com/Azure/LogicAppsUX/compare/v0.2.112...v0.2.113) (2023-03-17)

### Logic Apps Designer Changes

- Search + Browse speed boost ([#1760](https://github.com/Azure/LogicAppsUX/issues/1760)) ([edbbdb8](https://github.com/Azure/LogicAppsUX/commit/edbbdb8d1da148eb1b880dd6f5c3aad585026215))

### [0.2.112](https://github.com/Azure/LogicAppsUX/compare/v0.2.111...v0.2.112) (2023-03-17)

### [0.2.111](https://github.com/Azure/LogicAppsUX/compare/v0.2.110...v0.2.111) (2023-03-16)

### [0.2.110](https://github.com/Azure/LogicAppsUX/compare/v0.2.109...v0.2.110) (2023-03-15)

### [0.2.109](https://github.com/Azure/LogicAppsUX/compare/v0.2.108...v0.2.109) (2023-03-14)

### [0.2.108](https://github.com/Azure/LogicAppsUX/compare/v0.2.107...v0.2.108) (2023-03-13)

### [0.2.107](https://github.com/Azure/LogicAppsUX/compare/v0.2.106...v0.2.107) (2023-03-12)

### [0.2.106](https://github.com/Azure/LogicAppsUX/compare/v0.2.105...v0.2.106) (2023-03-11)

### [0.2.105](https://github.com/Azure/LogicAppsUX/compare/v0.2.104...v0.2.105) (2023-03-10)

### [0.2.104](https://github.com/Azure/LogicAppsUX/compare/v0.2.103...v0.2.104) (2023-03-10)

### [0.2.103](https://github.com/Azure/LogicAppsUX/compare/v0.2.102...v0.2.103) (2023-03-10)

### [0.2.102](https://github.com/Azure/LogicAppsUX/compare/v0.2.101...v0.2.102) (2023-03-09)

### [0.2.101](https://github.com/Azure/LogicAppsUX/compare/v0.2.100...v0.2.101) (2023-03-08)

### Logic Apps Designer Changes

- Added some extra setup for a new DataMapper action ([#1713](https://github.com/Azure/LogicAppsUX/issues/1713)) ([890b9ac](https://github.com/Azure/LogicAppsUX/commit/890b9ac834d97524430f74a7553131240f1e96f1))

### [0.2.100](https://github.com/Azure/LogicAppsUX/compare/v0.2.99...v0.2.100) (2023-03-08)

### Logic Apps Designer Changes

- TokenpickerV2 ([#1709](https://github.com/Azure/LogicAppsUX/issues/1709)) ([2f58d57](https://github.com/Azure/LogicAppsUX/commit/2f58d57698eca399df849e19b6a9b116f2260302))

### [0.2.99](https://github.com/Azure/LogicAppsUX/compare/v0.2.98...v0.2.99) (2023-03-07)

### Logic Apps Designer Bug Fixes

- Removed all references to the document and body elements ([#1710](https://github.com/Azure/LogicAppsUX/issues/1710)) ([68b3f38](https://github.com/Azure/LogicAppsUX/commit/68b3f383f8f969b7f61f6c11d3c8abb873905ada))

### [0.2.98](https://github.com/Azure/LogicAppsUX/compare/v0.2.97...v0.2.98) (2023-03-06)

### [0.2.97](https://github.com/Azure/LogicAppsUX/compare/v0.2.96...v0.2.97) (2023-03-05)

### [0.2.96](https://github.com/Azure/LogicAppsUX/compare/v0.2.95...v0.2.96) (2023-03-04)

### [0.2.95](https://github.com/Azure/LogicAppsUX/compare/v0.2.94...v0.2.95) (2023-03-03)

### [0.2.94](https://github.com/Azure/LogicAppsUX/compare/v0.2.93...v0.2.94) (2023-03-02)

### Logic Apps Designer Changes

- Adding support for recurrence editor ([#1687](https://github.com/Azure/LogicAppsUX/issues/1687)) ([714e0b6](https://github.com/Azure/LogicAppsUX/commit/714e0b6e37541e8f4f11db520ee2fda6bf9726a1))

### Logic Apps Designer Bug Fixes

- Add placeholder callout to Parameters ([#1697](https://github.com/Azure/LogicAppsUX/issues/1697)) ([5714d65](https://github.com/Azure/LogicAppsUX/commit/5714d65a29bda24ecb67054f35d3beb5980a7e4d))
- Custom Connectors - Removed unused/incorrect code ([#1694](https://github.com/Azure/LogicAppsUX/issues/1694)) ([b21d4dd](https://github.com/Azure/LogicAppsUX/commit/b21d4dd6838e7a9865dab235b604eceaceb7732a))
- Fixing Some Designer Bugs ([#1691](https://github.com/Azure/LogicAppsUX/issues/1691)) ([ecbe02e](https://github.com/Azure/LogicAppsUX/commit/ecbe02ed0e9c774a5da8a38f2623062936f23741))
- Trigger Deletion to Operation Selection bugfix ([#1695](https://github.com/Azure/LogicAppsUX/issues/1695)) ([397a393](https://github.com/Azure/LogicAppsUX/commit/397a393512c4f94068e20c8ace46a7a52ef87d5a))

### [0.2.93](https://github.com/Azure/LogicAppsUX/compare/v0.2.92...v0.2.93) (2023-03-01)

### [0.2.92](https://github.com/Azure/LogicAppsUX/compare/v0.2.91...v0.2.92) (2023-02-28)

### [0.2.92](https://github.com/Azure/LogicAppsUX/compare/v0.2.91...v0.2.92) (2023-02-28)

### Logic Apps Designer Changes

- Custom Connectors (standard) ([#1671](https://github.com/Azure/LogicAppsUX/issues/1671)) ([892c094](https://github.com/Azure/LogicAppsUX/commit/892c0942ec818baecc41bb2d3e01913382719773))

### [0.2.91](https://github.com/Azure/LogicAppsUX/compare/v0.2.90...v0.2.91) (2023-02-28)

### [0.2.90](https://github.com/Azure/LogicAppsUX/compare/v0.2.89...v0.2.90) (2023-02-27)

### [0.2.89](https://github.com/Azure/LogicAppsUX/compare/v0.2.88...v0.2.89) (2023-02-26)

### [0.2.88](https://github.com/Azure/LogicAppsUX/compare/v0.2.87...v0.2.88) (2023-02-25)

### Logic Apps Designer Bug Fixes

- Allow parallel node addition on all valid edge buttons ([#1674](https://github.com/Azure/LogicAppsUX/issues/1674)) ([bb7a900](https://github.com/Azure/LogicAppsUX/commit/bb7a9006a321e1cce451ae1cf217586713bb0d8e))
- Fix for code view breaking on empty workflows ([#1673](https://github.com/Azure/LogicAppsUX/issues/1673)) ([f5513cf](https://github.com/Azure/LogicAppsUX/commit/f5513cf2924190d82ab15e35068426b898cee2ad))
- Search+Browse pages UI tweaks ([#1672](https://github.com/Azure/LogicAppsUX/issues/1672)) ([d4b805a](https://github.com/Azure/LogicAppsUX/commit/d4b805a819885c4c51e0ddd4fb7cd88959dcc8ac))

### [0.2.87](https://github.com/Azure/LogicAppsUX/compare/v0.2.86...v0.2.87) (2023-02-24)

### [0.2.86](https://github.com/Azure/LogicAppsUX/compare/v0.2.85...v0.2.86) (2023-02-23)

### [0.2.85](https://github.com/Azure/LogicAppsUX/compare/v0.2.84...v0.2.85) (2023-02-22)

### [0.2.84](https://github.com/Azure/LogicAppsUX/compare/v0.2.83...v0.2.84) (2023-02-21)

### [0.2.83](https://github.com/Azure/LogicAppsUX/compare/v0.2.82...v0.2.83) (2023-02-20)

### Logic Apps Designer Changes

- Adding support for batch operations ([#1660](https://github.com/Azure/LogicAppsUX/issues/1660)) ([cb140b8](https://github.com/Azure/LogicAppsUX/commit/cb140b8707bdd5778c10035af749d4fb6cbceef2))

### [0.2.82](https://github.com/Azure/LogicAppsUX/compare/v0.2.81...v0.2.82) (2023-02-19)

### [0.2.81](https://github.com/Azure/LogicAppsUX/compare/v0.2.80...v0.2.81) (2023-02-18)

### [0.2.80](https://github.com/Azure/LogicAppsUX/compare/v0.2.79...v0.2.80) (2023-02-17)

### [0.2.79](https://github.com/Azure/LogicAppsUX/compare/v0.2.78...v0.2.79) (2023-02-16)

### [0.2.78](https://github.com/Azure/LogicAppsUX/compare/v0.2.77...v0.2.78) (2023-02-15)

### [0.2.77](https://github.com/Azure/LogicAppsUX/compare/v0.2.76...v0.2.77) (2023-02-14)

### [0.2.76](https://github.com/Azure/LogicAppsUX/compare/v0.2.75...v0.2.76) (2023-02-13)

### [0.2.75](https://github.com/Azure/LogicAppsUX/compare/v0.2.74...v0.2.75) (2023-02-12)

### [0.2.74](https://github.com/Azure/LogicAppsUX/compare/v0.2.73...v0.2.74) (2023-02-11)

### [0.2.73](https://github.com/Azure/LogicAppsUX/compare/v0.2.72...v0.2.73) (2023-02-10)

### Logic Apps Designer Changes

- Adding API Management action inputs/outputs support for dynamic parameters ([#1616](https://github.com/Azure/LogicAppsUX/issues/1616)) ([3bc920e](https://github.com/Azure/LogicAppsUX/commit/3bc920e45deb5f0c3494261c727b3411c4517508))

### [0.2.72](https://github.com/Azure/LogicAppsUX/compare/v0.2.71...v0.2.72) (2023-02-10)

### [0.2.71](https://github.com/Azure/LogicAppsUX/compare/v0.2.70...v0.2.71) (2023-02-09)

### [0.2.70](https://github.com/Azure/LogicAppsUX/compare/v0.2.69...v0.2.70) (2023-02-08)

### Logic Apps Designer Changes

- Monitoring tab ([#1602](https://github.com/Azure/LogicAppsUX/issues/1602)) ([c6070de](https://github.com/Azure/LogicAppsUX/commit/c6070dea2c0bec5b31e41ee8db8002c068732911))

### [0.2.69](https://github.com/Azure/LogicAppsUX/compare/v0.2.68...v0.2.69) (2023-02-07)

### [0.2.68](https://github.com/Azure/LogicAppsUX/compare/v0.2.67...v0.2.68) (2023-02-06)

### [0.2.67](https://github.com/Azure/LogicAppsUX/compare/v0.2.66...v0.2.67) (2023-02-05)

### [0.2.66](https://github.com/Azure/LogicAppsUX/compare/v0.2.65...v0.2.66) (2023-02-04)

### Logic Apps Designer Changes

- Adding connection creation experience for Api Management ([#1596](https://github.com/Azure/LogicAppsUX/issues/1596)) ([949e535](https://github.com/Azure/LogicAppsUX/commit/949e5351ddca5cc4d9aa97280338a15b71780a0a))
- Load dynamic run instance data to monitoring view mode ([#1598](https://github.com/Azure/LogicAppsUX/issues/1598)) ([3ee9c2c](https://github.com/Azure/LogicAppsUX/commit/3ee9c2c76c46afc15b3bc781d6eb0ecb2ee00999))

### [0.2.65](https://github.com/Azure/LogicAppsUX/compare/v0.2.64...v0.2.65) (2023-02-03)

### [0.2.64](https://github.com/Azure/LogicAppsUX/compare/v0.2.63...v0.2.64) (2023-02-02)

### [0.2.64](https://github.com/Azure/LogicAppsUX/compare/v0.2.63...v0.2.64) (2023-02-02)

### Logic Apps Designer Changes

- Consumption Workflow Parameter adjustments ([#1590](https://github.com/Azure/LogicAppsUX/issues/1590)) ([f3edc15](https://github.com/Azure/LogicAppsUX/commit/f3edc155ab0346249d8435a33749a6bbb6fa3753))

### [0.2.63](https://github.com/Azure/LogicAppsUX/compare/v0.2.62...v0.2.63) (2023-02-01)

### [0.2.62](https://github.com/Azure/LogicAppsUX/compare/v0.2.61...v0.2.62) (2023-01-31)

### [0.2.61](https://github.com/Azure/LogicAppsUX/compare/v0.2.60...v0.2.61) (2023-01-30)

### Logic Apps Designer Bug Fixes

- Fixed nightly release action ([#1580](https://github.com/Azure/LogicAppsUX/issues/1580)) ([9ff88c0](https://github.com/Azure/LogicAppsUX/commit/9ff88c06e88c7ee0061bf0c501600f169dd18b2b))

### [0.2.60](https://github.com/Azure/LogicAppsUX/compare/v0.2.59...v0.2.60) (2023-01-30)

### [0.2.59](https://github.com/Azure/LogicAppsUX/compare/v0.2.58...v0.2.59) (2023-01-29)

### [0.2.58](https://github.com/Azure/LogicAppsUX/compare/v0.2.57...v0.2.58) (2023-01-28)

### Logic Apps Designer Bug Fixes

- Fix status pill stories and add aborted status ([#1565](https://github.com/Azure/LogicAppsUX/issues/1565)) ([02bb9c5](https://github.com/Azure/LogicAppsUX/commit/02bb9c5fcd7f890360448de7700012a9eb0f3670))
- Fixed run-after-trigger bug ([#1575](https://github.com/Azure/LogicAppsUX/issues/1575)) ([15222b1](https://github.com/Azure/LogicAppsUX/commit/15222b18fc54665f15dcd40f4b6ff831387f64d1))

### [0.2.57](https://github.com/Azure/LogicAppsUX/compare/v0.2.56...v0.2.57) (2023-01-27)

### [0.2.56](https://github.com/Azure/LogicAppsUX/compare/v0.2.55...v0.2.56) (2023-01-26)

### Logic Apps Designer Changes

- Consumption Connection Service ([#1546](https://github.com/Azure/LogicAppsUX/issues/1546)) ([e7b2e58](https://github.com/Azure/LogicAppsUX/commit/e7b2e580072055676cd51e18e42a443b76ecb3fa))

### [0.2.55](https://github.com/Azure/LogicAppsUX/compare/v0.2.54...v0.2.55) (2023-01-25)

### [0.2.54](https://github.com/Azure/LogicAppsUX/compare/v0.2.53...v0.2.54) (2023-01-25)

### [0.2.53](https://github.com/Azure/LogicAppsUX/compare/v0.2.52...v0.2.53) (2023-01-24)

### Logic Apps Designer Bug Fixes

- Clear Editor before token insertion in Until Editor ([#1502](https://github.com/Azure/LogicAppsUX/issues/1502)) ([cfb2bd2](https://github.com/Azure/LogicAppsUX/commit/cfb2bd297045eecad179bcac5409492dda23f97a))
- Do-Until graph fix + Parameter sort fix ([#1486](https://github.com/Azure/LogicAppsUX/issues/1486)) ([1627876](https://github.com/Azure/LogicAppsUX/commit/1627876dfa3d1e4379aa29dcce08aa40def040aa))
- Fix issue where relative path parameters were inserted wrong ([#1430](https://github.com/Azure/LogicAppsUX/issues/1430)) ([02983fa](https://github.com/Azure/LogicAppsUX/commit/02983fab0670e4b244cc0ddef29fa408a383ab56))
- Reverting an OperationManifest change ([#1513](https://github.com/Azure/LogicAppsUX/issues/1513)) ([d4064e8](https://github.com/Azure/LogicAppsUX/commit/d4064e8ae8c52d3f17e72c06bd774977ccb5a71a))

### Logic Apps Designer Changes

- Consumption Connector Service ([#1521](https://github.com/Azure/LogicAppsUX/issues/1521)) ([6a4aba6](https://github.com/Azure/LogicAppsUX/commit/6a4aba66af5a8804739cc70436dce0cfcfd3951b))
- Consumption Search Service ([#1438](https://github.com/Azure/LogicAppsUX/issues/1438)) ([8a28b69](https://github.com/Azure/LogicAppsUX/commit/8a28b690f0b5fc1af15aae385246a6c95f51ae4b))
- Finished parameter validation and Until count/timeout validation ([#1506](https://github.com/Azure/LogicAppsUX/issues/1506)) ([193319c](https://github.com/Azure/LogicAppsUX/commit/193319c0a3b61d2ea066013ecf08fee586a048d5))
- OperationManifestService for Consumption Workflows ([#1448](https://github.com/Azure/LogicAppsUX/issues/1448)) ([679d8ab](https://github.com/Azure/LogicAppsUX/commit/679d8ab4ee13a895ce5c90e215408dd0ef1ec2e8))
- Optional Gateway Parameters ([#1465](https://github.com/Azure/LogicAppsUX/issues/1465)) ([639f1b1](https://github.com/Azure/LogicAppsUX/commit/639f1b11619369d6763e4a1043cfb35cb4aa00ae))
- Until Editor, Beginnings of Parameter Validation ([#1499](https://github.com/Azure/LogicAppsUX/issues/1499)) ([8f74b62](https://github.com/Azure/LogicAppsUX/commit/8f74b62a5a99113809468e198129cf64c54b6b15))

### [0.2.52](https://github.com/Azure/LogicAppsUX/compare/v0.2.51...v0.2.52) (2022-12-20)

### [0.2.51](https://github.com/Azure/LogicAppsUX/compare/v0.2.50...v0.2.51) (2022-12-19)

### [0.2.50](https://github.com/Azure/LogicAppsUX/compare/v0.2.49...v0.2.50) (2022-12-18)

### [0.2.49](https://github.com/Azure/LogicAppsUX/compare/v0.2.48...v0.2.49) (2022-12-17)

### [0.2.48](https://github.com/Azure/LogicAppsUX/compare/v0.2.47...v0.2.48) (2022-12-16)

### [0.2.47](https://github.com/Azure/LogicAppsUX/compare/v0.2.46...v0.2.47) (2022-12-15)

### [0.2.46](https://github.com/Azure/LogicAppsUX/compare/v0.2.45...v0.2.46) (2022-12-14)

### [0.2.45](https://github.com/Azure/LogicAppsUX/compare/v0.2.44...v0.2.45) (2022-12-13)

### [0.2.44](https://github.com/Azure/LogicAppsUX/compare/v0.2.43...v0.2.44) (2022-12-12)

### [0.2.43](https://github.com/Azure/LogicAppsUX/compare/v0.2.42...v0.2.43) (2022-12-11)

### [0.2.42](https://github.com/Azure/LogicAppsUX/compare/v0.2.41...v0.2.42) (2022-12-10)

### [0.2.41](https://github.com/Azure/LogicAppsUX/compare/v0.2.40...v0.2.41) (2022-12-09)

### [0.2.40](https://github.com/Azure/LogicAppsUX/compare/v0.2.39...v0.2.40) (2022-12-08)

### [0.2.39](https://github.com/Azure/LogicAppsUX/compare/v0.2.38...v0.2.39) (2022-12-07)

### [0.2.38](https://github.com/Azure/LogicAppsUX/compare/v0.2.37...v0.2.38) (2022-12-07)

### [0.2.37](https://github.com/Azure/LogicAppsUX/compare/v0.2.36...v0.2.37) (2022-12-07)

### [0.2.36](https://github.com/Azure/LogicAppsUX/compare/v0.2.35...v0.2.36) (2022-12-06)

### [0.2.35](https://github.com/Azure/LogicAppsUX/compare/v0.2.34...v0.2.35) (2022-12-05)

### [0.2.34](https://github.com/Azure/LogicAppsUX/compare/v0.2.33...v0.2.34) (2022-12-04)

### [0.2.33](https://github.com/Azure/LogicAppsUX/compare/v0.2.32...v0.2.33) (2022-12-03)

### Logic Apps Designer Changes

- Workflow is clamped to remain in view ([#1349](https://github.com/Azure/LogicAppsUX/issues/1349)) ([ce4adb6](https://github.com/Azure/LogicAppsUX/commit/ce4adb62564a2242811151fe9810aba34b09cb59))

### [0.2.32](https://github.com/Azure/LogicAppsUX/compare/v0.2.31...v0.2.32) (2022-12-02)

### [0.2.31](https://github.com/Azure/LogicAppsUX/compare/v0.2.30...v0.2.31) (2022-12-01)

### [0.2.30](https://github.com/Azure/LogicAppsUX/compare/v0.2.29...v0.2.30) (2022-12-01)

### [0.2.29](https://github.com/Azure/LogicAppsUX/compare/v0.2.28...v0.2.29) (2022-11-30)

### [0.2.28](https://github.com/Azure/LogicAppsUX/compare/v0.2.27...v0.2.28) (2022-11-29)

### [0.2.27](https://github.com/Azure/LogicAppsUX/compare/v0.2.26...v0.2.27) (2022-11-28)

### [0.2.26](https://github.com/Azure/LogicAppsUX/compare/v0.2.25...v0.2.26) (2022-11-27)

### [0.2.25](https://github.com/Azure/LogicAppsUX/compare/v0.2.24...v0.2.25) (2022-11-26)

### [0.2.24](https://github.com/Azure/LogicAppsUX/compare/v0.2.23...v0.2.24) (2022-11-25)

### [0.2.23](https://github.com/Azure/LogicAppsUX/compare/v0.2.22...v0.2.23) (2022-11-24)

### Logic Apps Designer Bug Fixes

- Fixed operation parameter visibility / optional dropdown bugs ([#1346](https://github.com/Azure/LogicAppsUX/issues/1346)) ([2cf2f71](https://github.com/Azure/LogicAppsUX/commit/2cf2f713497f0fb69114114718ad1cc7f221a46a))

### [0.2.22](https://github.com/Azure/LogicAppsUX/compare/v0.2.21...v0.2.22) (2022-11-23)

### [0.2.21](https://github.com/Azure/LogicAppsUX/compare/v0.2.20...v0.2.21) (2022-11-22)

### Logic Apps Designer Bug Fixes

- [#1282](https://github.com/Azure/LogicAppsUX/issues/1282) - Cloning action definition to avoid object mutation during deserialization ([#1319](https://github.com/Azure/LogicAppsUX/issues/1319)) ([094fc06](https://github.com/Azure/LogicAppsUX/commit/094fc066167628ebdec1727930de80a96c4a7395))

### Logic Apps Designer Changes

- Array Editor ([#1309](https://github.com/Azure/LogicAppsUX/issues/1309)) ([0ab696b](https://github.com/Azure/LogicAppsUX/commit/0ab696bd38812f463ef3943b847d56a7443d2455))
- Nodes now show error state on canvas card ([#1324](https://github.com/Azure/LogicAppsUX/issues/1324)) ([24771af](https://github.com/Azure/LogicAppsUX/commit/24771afa2650b429ff57c524c609d6c27616daad))

### [0.2.20](https://github.com/Azure/LogicAppsUX/compare/v0.2.19...v0.2.20) (2022-11-16)

### Logic Apps Designer Changes

- Added service provider connection test support ([#1296](https://github.com/Azure/LogicAppsUX/issues/1296)) ([3adc0bb](https://github.com/Azure/LogicAppsUX/commit/3adc0bb49b01d98251f0440a44f8a7a74ce04c69))

### [0.2.19](https://github.com/Azure/LogicAppsUX/compare/v0.2.16...v0.2.19) (2022-11-15)

### [0.2.16](https://github.com/Azure/LogicAppsUX/compare/v0.2.15...v0.2.16) (2022-11-14)

### [0.2.15](https://github.com/Azure/LogicAppsUX/compare/v0.2.14...v0.2.15) (2022-11-13)

### [0.2.14](https://github.com/Azure/LogicAppsUX/compare/v0.2.13...v0.2.14) (2022-11-12)

### [0.2.13](https://github.com/Azure/LogicAppsUX/compare/v0.2.12...v0.2.13) (2022-11-11)

### [0.2.13](https://github.com/Azure/LogicAppsUX/compare/v0.2.12...v0.2.13) (2022-11-11)

### Logic Apps Designer Changes

- Improved Conditional Parameter Visibility Logic ([#1288](https://github.com/Azure/LogicAppsUX/issues/1288)) ([db011cd](https://github.com/Azure/LogicAppsUX/commit/db011cd6ed244c9c57719d484eae92ba35f3dfc6))

### Logic Apps Designer Bug Fixes

- Remove Parameters Tab in Scope Nodes and Allow Action Namechange Within Subgraphs ([#1291](https://github.com/Azure/LogicAppsUX/issues/1291)) ([93edb7d](https://github.com/Azure/LogicAppsUX/commit/93edb7db86524892b397a4ec54ef1590fd60cef9))

### [0.2.12](https://github.com/Azure/LogicAppsUX/compare/v0.2.11...v0.2.12) (2022-11-10)

### Logic Apps Designer Bug Fixes

- Fixing upstream node calculations for nested scope nodes ([#1281](https://github.com/Azure/LogicAppsUX/issues/1281)) ([c7c6ad9](https://github.com/Azure/LogicAppsUX/commit/c7c6ad9da49bd6d850c2dcf49dc3e5fb54e220db))

### [0.2.11](https://github.com/Azure/LogicAppsUX/compare/v0.2.10...v0.2.11) (2022-11-09)

### Logic Apps Designer Changes

- Fixing node renaming / token data inconsistencies ([#1265](https://github.com/Azure/LogicAppsUX/issues/1265)) ([ad3a476](https://github.com/Azure/LogicAppsUX/commit/ad3a4761cce12a0a88276c8be727ee129edabf4f))

### Data Mapper Changes

- testing deserialization and beginning support for loops ([#1273](https://github.com/Azure/LogicAppsUX/issues/1273)) ([a62cbd2](https://github.com/Azure/LogicAppsUX/commit/a62cbd24f257709e53761ff23606f30b6add06c6))

### Logic Apps Designer Bug Fixes

- Allow trigger deletion and replacing them ([#1280](https://github.com/Azure/LogicAppsUX/issues/1280)) ([e0ae4cf](https://github.com/Azure/LogicAppsUX/commit/e0ae4cf2e992b8ec15787a5083e03b2e8d97c49b))
- Hide yellow warnings about unicode characters in code editor ([#1279](https://github.com/Azure/LogicAppsUX/issues/1279)) ([c38206f](https://github.com/Azure/LogicAppsUX/commit/c38206f788f2282aa044837380e314dd0ddee88a))

### [0.2.10](https://github.com/Azure/LogicAppsUX/compare/v0.2.9...v0.2.10) (2022-11-08)

### [0.2.9](https://github.com/Azure/LogicAppsUX/compare/v0.2.8...v0.2.9) (2022-11-08)

### Features

- Add support for interaction with the mini map ([#1270](https://github.com/Azure/LogicAppsUX/issues/1270)) ([8162142](https://github.com/Azure/LogicAppsUX/commit/8162142c17e55e8f4fb17f510373c47d13572ef7))

### [0.2.8](https://github.com/Azure/LogicAppsUX/compare/v0.2.7...v0.2.8) (2022-11-07)

### [0.2.7](https://github.com/Azure/LogicAppsUX/compare/v0.2.6...v0.2.7) (2022-11-06)

### [0.2.6](https://github.com/Azure/LogicAppsUX/compare/v0.2.5...v0.2.6) (2022-11-05)

### [0.2.5](https://github.com/Azure/LogicAppsUX/compare/v0.2.4...v0.2.5) (2022-11-04)

### [0.2.4](https://github.com/Azure/LogicAppsUX/compare/v0.2.3...v0.2.4) (2022-11-03)

### [0.2.3](https://github.com/Azure/LogicAppsUX/compare/v0.2.2...v0.2.3) (2022-11-03)

### [0.2.2](https://github.com/Azure/LogicAppsUX/compare/v0.2.1...v0.2.2) (2022-11-02)

### [0.2.1](https://github.com/Azure/LogicAppsUX/compare/v0.1.51...v0.2.1) (2022-11-01)

### [0.1.51](https://github.com/Azure/LogicAppsUX/compare/v0.1.50...v0.1.51) (2022-11-01)

### [0.1.50](https://github.com/Azure/LogicAppsUX/compare/v0.1.49...v0.1.50) (2022-11-01)

### [0.1.49](https://github.com/Azure/LogicAppsUX/compare/v0.1.48...v0.1.49) (2022-10-29)

### [0.1.48](https://github.com/Azure/LogicAppsUX/compare/v0.1.47...v0.1.48) (2022-10-27)

### [0.1.47](https://github.com/Azure/LogicAppsUX/compare/v0.1.46...v0.1.47) (2022-10-27)

### [0.1.46](https://github.com/Azure/LogicAppsUX/compare/v0.1.45...v0.1.46) (2022-10-27)

### [0.1.45](https://github.com/Azure/LogicAppsUX/compare/v0.1.44...v0.1.45) (2022-10-27)

### [0.1.44](https://github.com/Azure/LogicAppsUX/compare/v0.1.43...v0.1.44) (2022-10-26)

### [0.1.43](https://github.com/Azure/logic_apps_designer/compare/v0.1.42...v0.1.43) (2022-10-21)

### [0.1.42](https://github.com/Azure/logic_apps_designer/compare/v0.1.41...v0.1.42) (2022-10-21)

### [0.1.41](https://github.com/Azure/logic_apps_designer/compare/v0.1.40...v0.1.41) (2022-10-21)

### [0.1.40](https://github.com/Azure/logic_apps_designer/compare/v0.1.39...v0.1.40) (2022-10-20)

### [0.1.39](https://github.com/Azure/logic_apps_designer/compare/v0.1.38...v0.1.39) (2022-10-19)

### [0.1.38](https://github.com/Azure/logic_apps_designer/compare/v0.1.37...v0.1.38) (2022-10-18)

### [0.1.37](https://github.com/Azure/logic_apps_designer/compare/v0.1.36...v0.1.37) (2022-10-17)

### [0.1.36](https://github.com/Azure/logic_apps_designer/compare/v0.1.35...v0.1.36) (2022-10-16)

### [0.1.35](https://github.com/Azure/logic_apps_designer/compare/v0.1.34...v0.1.35) (2022-10-15)

### [0.1.34](https://github.com/Azure/logic_apps_designer/compare/v0.1.33...v0.1.34) (2022-10-14)

### [0.1.33](https://github.com/Azure/logic_apps_designer/compare/v0.1.32...v0.1.33) (2022-10-13)

### [0.1.32](https://github.com/Azure/logic_apps_designer/compare/v0.1.31...v0.1.32) (2022-10-13)

### [0.1.31](https://github.com/Azure/logic_apps_designer/compare/v0.1.30...v0.1.31) (2022-10-12)

### [0.1.30](https://github.com/Azure/logic_apps_designer/compare/v0.1.29...v0.1.30) (2022-10-11)

### [0.1.29](https://github.com/Azure/logic_apps_designer/compare/v0.1.28...v0.1.29) (2022-10-10)

### [0.1.28](https://github.com/Azure/logic_apps_designer/compare/v0.1.27...v0.1.28) (2022-10-09)

### [0.1.27](https://github.com/Azure/logic_apps_designer/compare/v0.1.26...v0.1.27) (2022-10-08)

### [0.1.26](https://github.com/Azure/logic_apps_designer/compare/v0.1.25...v0.1.26) (2022-10-07)

### [0.1.25](https://github.com/Azure/logic_apps_designer/compare/v0.1.24...v0.1.25) (2022-10-06)

### [0.1.24](https://github.com/Azure/logic_apps_designer/compare/v0.1.23...v0.1.24) (2022-10-05)

### [0.1.23](https://github.com/Azure/logic_apps_designer/compare/v0.1.22...v0.1.23) (2022-10-04)

### [0.1.22](https://github.com/Azure/logic_apps_designer/compare/v0.1.21...v0.1.22) (2022-10-03)

### [0.1.21](https://github.com/Azure/logic_apps_designer/compare/v0.1.20...v0.1.21) (2022-10-02)

### [0.1.20](https://github.com/Azure/logic_apps_designer/compare/v0.1.19...v0.1.20) (2022-10-01)

### [0.1.19](https://github.com/Azure/logic_apps_designer/compare/v0.1.18...v0.1.19) (2022-09-30)

### [0.1.18](https://github.com/Azure/logic_apps_designer/compare/v0.1.17...v0.1.18) (2022-09-30)

### [0.1.17](https://github.com/Azure/logic_apps_designer/compare/v0.1.16...v0.1.17) (2022-09-29)

### [0.1.16](https://github.com/Azure/logic_apps_designer/compare/v0.1.15...v0.1.16) (2022-09-28)

### [0.1.15](https://github.com/Azure/logic_apps_designer/compare/v0.1.14...v0.1.15) (2022-09-27)

### [0.1.14](https://github.com/Azure/logic_apps_designer/compare/v0.1.13...v0.1.14) (2022-09-26)

### [0.1.13](https://github.com/Azure/logic_apps_designer/compare/v0.1.12...v0.1.13) (2022-09-26)

### [0.1.12](https://github.com/Azure/logic_apps_designer/compare/v0.1.11...v0.1.12) (2022-09-25)

### [0.1.11](https://github.com/Azure/logic_apps_designer/compare/v0.1.10...v0.1.11) (2022-09-24)

### [0.1.10](https://github.com/Azure/logic_apps_designer/compare/v0.1.9...v0.1.10) (2022-09-23)

### [0.1.9](https://github.com/Azure/logic_apps_designer/compare/v0.1.8...v0.1.9) (2022-09-23)

### [0.1.8](https://github.com/Azure/logic_apps_designer/compare/v0.1.7...v0.1.8) (2022-09-22)

### [0.1.7](https://github.com/Azure/logic_apps_designer/compare/v0.1.6...v0.1.7) (2022-09-21)

### [0.1.6](https://github.com/Azure/logic_apps_designer/compare/v0.1.5...v0.1.6) (2022-09-20)

### [0.1.5](https://github.com/Azure/logic_apps_designer/compare/v0.1.4...v0.1.5) (2022-09-19)

### [0.1.4](https://github.com/Azure/logic_apps_designer/compare/v0.1.3...v0.1.4) (2022-09-18)

### [0.1.3](https://github.com/Azure/logic_apps_designer/compare/v0.1.2...v0.1.3) (2022-09-17)

### [0.1.2](https://github.com/Azure/logic_apps_designer/compare/v0.1.1...v0.1.2) (2022-09-16)

### [0.1.1](https://github.com/Azure/logic_apps_designer/compare/v0.0.100...v0.1.1) (2022-09-15)

### [0.0.100](https://github.com/Azure/logic_apps_designer/compare/v0.0.99...v0.0.100) (2022-09-14)

### [0.0.99](https://github.com/Azure/logic_apps_designer/compare/v0.0.98...v0.0.99) (2022-09-14)

### [0.0.98](https://github.com/Azure/logic_apps_designer/compare/v0.0.97...v0.0.98) (2022-09-13)

### [0.0.97](https://github.com/Azure/logic_apps_designer/compare/v0.0.96...v0.0.97) (2022-09-12)

### [0.0.96](https://github.com/Azure/logic_apps_designer/compare/v0.0.95...v0.0.96) (2022-09-11)

### [0.0.95](https://github.com/Azure/logic_apps_designer/compare/v0.0.94...v0.0.95) (2022-09-10)

### [0.0.94](https://github.com/Azure/logic_apps_designer/compare/v0.0.93...v0.0.94) (2022-09-09)

### [0.0.93](https://github.com/Azure/logic_apps_designer/compare/v0.0.92...v0.0.93) (2022-09-09)

### [0.0.92](https://github.com/Azure/logic_apps_designer/compare/v0.0.91...v0.0.92) (2022-09-08)

### [0.0.91](https://github.com/Azure/logic_apps_designer/compare/v0.0.90...v0.0.91) (2022-09-07)

### [0.0.90](https://github.com/Azure/logic_apps_designer/compare/v0.0.89...v0.0.90) (2022-09-06)

### [0.0.89](https://github.com/Azure/logic_apps_designer/compare/v0.0.88...v0.0.89) (2022-09-05)

### [0.0.88](https://github.com/Azure/logic_apps_designer/compare/v0.0.87...v0.0.88) (2022-09-05)

### [0.0.87](https://github.com/Azure/logic_apps_designer/compare/v0.0.86...v0.0.87) (2022-09-04)

### [0.0.86](https://github.com/Azure/logic_apps_designer/compare/v0.0.85...v0.0.86) (2022-09-04)

### [0.0.85](https://github.com/Azure/logic_apps_designer/compare/v0.0.84...v0.0.85) (2022-09-03)

### [0.0.84](https://github.com/Azure/logic_apps_designer/compare/v0.0.83...v0.0.84) (2022-09-03)

### [0.0.83](https://github.com/Azure/logic_apps_designer/compare/v0.0.82...v0.0.83) (2022-09-02)

### [0.0.82](https://github.com/Azure/logic_apps_designer/compare/v0.0.81...v0.0.82) (2022-09-02)

### [0.0.81](https://github.com/Azure/logic_apps_designer/compare/v0.0.79...v0.0.81) (2022-09-01)

### [0.0.79](https://github.com/Azure/logic_apps_designer/compare/v0.0.78...v0.0.79) (2022-09-01)

### [0.0.78](https://github.com/Azure/logic_apps_designer/compare/v0.0.77...v0.0.78) (2022-09-01)

### [0.0.77](https://github.com/Azure/logic_apps_designer/compare/v0.0.76...v0.0.77) (2022-09-01)

### [0.0.76](https://github.com/Azure/logic_apps_designer/compare/v0.0.75...v0.0.76) (2022-09-01)

### 0.0.75 (2022-09-01)

### 0.0.74 (2022-09-01)

### 0.0.73 (2022-09-01)

### 0.0.72 (2022-08-24)

### 0.0.71 (2022-08-24)

### 0.0.70 (2022-08-23)

### 0.0.69 (2022-08-23)

### 0.0.68 (2022-08-23)

### 0.0.67 (2022-08-19)

### 0.0.66 (2022-08-18)

### 0.0.65 (2022-08-16)

### 0.0.64 (2022-08-12)

### 0.0.63 (2022-08-12)

### 0.0.62 (2022-08-09)

### 0.0.61 (2022-08-08)

### 0.0.60 (2022-08-04)

### 0.0.59 (2022-08-02)

### 0.0.58 (2022-07-22)

### 0.0.57 (2022-07-20)

### 0.0.56 (2022-07-20)

### 0.0.55 (2022-07-20)

### 0.0.54 (2022-07-18)

### 0.0.53 (2022-07-13)

### 0.0.52 (2022-07-08)

### 0.0.51 (2022-06-28)

### 0.0.50 (2022-06-27)

### 0.0.49 (2022-06-22)

### 0.0.48 (2022-06-16)

### 0.0.47 (2022-06-15)

### 0.0.46 (2022-06-15)

### 0.0.45 (2022-06-15)

### 0.0.44 (2022-06-13)

### 0.0.43 (2022-06-11)

### 0.0.42 (2022-06-08)

### 0.0.41 (2022-06-08)

### 0.0.40 (2022-06-08)

### 0.0.39 (2022-06-07)

### 0.0.38 (2022-06-07)

### 0.0.37 (2022-06-03)

### 0.0.36 (2022-06-02)

### 0.0.35 (2022-05-19)

### 0.0.34 (2022-05-10)

### 0.0.33 (2022-05-10)

### 0.0.32 (2022-05-06)

### 0.0.31 (2022-05-05)

### 0.0.30 (2022-05-02)

### 0.0.29 (2022-03-15)

### 0.0.28 (2022-03-07)

### 0.0.27 (2022-03-07)

### Features

- Add infinite loading to run history in VSCode Overview ([#299](https://github.com/Azure/logic_apps_designer/issues/299)) ([04f1055](https://github.com/Azure/logic_apps_designer/commit/04f10558278210ee5fd79196b6960c63a010e1f2))

### 0.0.26 (2022-02-17)

### Features

- Add CHANGELOG to storybooks ([#251](https://github.com/Azure/logic_apps_designer/issues/251)) ([6e943fa](https://github.com/Azure/logic_apps_designer/commit/6e943fa78b79f53d083510736bb43ebc79016811))

### 0.0.25 (2022-02-12)

### Bug Fixes

- Fix issue where resolution service would break when the logic apps parameters format is used ([#195](https://github.com/Azure/logic_apps_designer/issues/195)) ([89b1903](https://github.com/Azure/logic_apps_designer/commit/89b1903dc32d424aa8f982cfe76f5e9b69c9887b))

### 0.0.0 (2022-02-03)
