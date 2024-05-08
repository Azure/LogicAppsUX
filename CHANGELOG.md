# Logic Apps Designer
## [4.14.0](https://github.com/Azure/LogicAppsUX/compare/v4.13.0...v4.14.0) (2024-05-02)


### Features

* **Data Mapper:**  Add initial schema ([#4740](https://github.com/Azure/LogicAppsUX/issues/4740)) ([705b846](https://github.com/Azure/LogicAppsUX/commit/705b846f742ee26ef74f0646df9a4882e48f44f7))
* **designer:** Adding support for file parameters for Appservice and Api Management operations ([#4734](https://github.com/Azure/LogicAppsUX/issues/4734)) ([3ff85d7](https://github.com/Azure/LogicAppsUX/commit/3ff85d7ac918f78849ee9399abffc9d0097c6032))
* **Template:** Set up Standalone with Submodule Connection + Models ([#4748](https://github.com/Azure/LogicAppsUX/issues/4748)) ([6c7ffba](https://github.com/Azure/LogicAppsUX/commit/6c7ffba8a8d739d1f0e14760eae81f57b94d18ae))


### Bug Fixes

* **designer:** [BREAKING]upgrade react-query and rework react-query integration to be singular and support devtools ([#4718](https://github.com/Azure/LogicAppsUX/issues/4718)) ([63c91e8](https://github.com/Azure/LogicAppsUX/commit/63c91e8ac9b9f915c8cd7b0f5650ad8048308d26))
* **designer:** Adding an action in V3 could create a duplicate named action resulting in data loss.  ([#4721](https://github.com/Azure/LogicAppsUX/issues/4721)) ([730d34a](https://github.com/Azure/LogicAppsUX/commit/730d34aef29fbb8a5baf4823164211e6e22cfea4))
* **Designer:** Copy Paste Fixes ([#4725](https://github.com/Azure/LogicAppsUX/issues/4725)) ([4f4e704](https://github.com/Azure/LogicAppsUX/commit/4f4e704c0214f9028cdebd459ff65c3f80de2a3e))
* **designer:** Deleting a scope node brings panel to wrong id ([#4726](https://github.com/Azure/LogicAppsUX/issues/4726)) ([c0573d1](https://github.com/Azure/LogicAppsUX/commit/c0573d162a89639d27f8164761bc75c1218c8bc1))
* **designer:** Fix issue where characters later in a token name would carry less relevence in a search ([#4736](https://github.com/Azure/LogicAppsUX/issues/4736)) ([2dfc193](https://github.com/Azure/LogicAppsUX/commit/2dfc19395a8209e989818db664cdc33843bcd8e0))
* **designer:** Fix loading indicator while adding new action ([#4716](https://github.com/Azure/LogicAppsUX/issues/4716)) ([9f8f239](https://github.com/Azure/LogicAppsUX/commit/9f8f239f0bdd160cf3eef17c3491de736241b5e8))
* **Designer:** Fix Request Body JSON Deserialization Bug ([#4745](https://github.com/Azure/LogicAppsUX/issues/4745)) ([f78a5e5](https://github.com/Azure/LogicAppsUX/commit/f78a5e533b8d94b175bfa4dba4c04e18ec74938c))
* **designer:** Fixes Expression Editor styling to ensure it is not clipped/hidden. ([#4744](https://github.com/Azure/LogicAppsUX/issues/4744)) ([e9a5297](https://github.com/Azure/LogicAppsUX/commit/e9a52977e0763a2de17398d73670515c6e70681e))
* **designer:** Managed Identity picker does not show up on new connection creation ([#4719](https://github.com/Azure/LogicAppsUX/issues/4719)) ([cbac876](https://github.com/Azure/LogicAppsUX/commit/cbac876bc779fc9b6b6c8bf48626b1c80772f9ac))
* **designer:** More Custom Code improvements ([#4720](https://github.com/Azure/LogicAppsUX/issues/4720)) ([ecbcbfe](https://github.com/Azure/LogicAppsUX/commit/ecbcbfe5bda5e8d0774d17bf9a0df96e71b987ef))
* **designer:** Null Literal are casted as String Literals ([#4733](https://github.com/Azure/LogicAppsUX/issues/4733)) ([e90a3d8](https://github.com/Azure/LogicAppsUX/commit/e90a3d80e6b8286390451e7c9e07110b78cc9f1a))
* **Designer:** Removed css "webkit-fill-available" ([#4754](https://github.com/Azure/LogicAppsUX/issues/4754)) ([f2fb386](https://github.com/Azure/LogicAppsUX/commit/f2fb386d7d92ddab8c0a94872139b2e3f8c2b383))
* **designer:** Small customcode boilerplate code fix ([#4742](https://github.com/Azure/LogicAppsUX/issues/4742)) ([1ade024](https://github.com/Azure/LogicAppsUX/commit/1ade024950f28729a67ebf3731d07faaccf842de))
* **vscode:** Fix project build cache and designer loading ([#4739](https://github.com/Azure/LogicAppsUX/issues/4739)) ([27dd4c0](https://github.com/Azure/LogicAppsUX/commit/27dd4c0511904b52bedfd26eaa3eb792d6aa0f60))
* **vscode:** Update pack command and function to check path exists ([#4746](https://github.com/Azure/LogicAppsUX/issues/4746)) ([ebad1be](https://github.com/Azure/LogicAppsUX/commit/ebad1beffaf8f7214378eed9ec6e510beffaa0d4))

## [4.13.0](https://github.com/Azure/LogicAppsUX/compare/v4.12.0...v4.13.0) (2024-04-25)

## [4.12.0](https://github.com/Azure/LogicAppsUX/compare/v4.11.0...v4.12.0) (2024-04-25)


### Bug Fixes

* **deisgner:** Fix a11y issue where info bubbles had no announcement to description in tooltip ([#4705](https://github.com/Azure/LogicAppsUX/issues/4705)) ([00600b6](https://github.com/Azure/LogicAppsUX/commit/00600b6b586a8f46f6329bf6d1a7ea2c5920e9c7))
* **designer:** Adding dispatch call in clear dynamic inputs ([#4712](https://github.com/Azure/LogicAppsUX/issues/4712)) ([88da7bc](https://github.com/Azure/LogicAppsUX/commit/88da7bc34effb024d080bbec2e0de7c4a40cdd91))
* **designer:** Small fix to get fileExtension on custom code action add ([#4711](https://github.com/Azure/LogicAppsUX/issues/4711)) ([8dff14c](https://github.com/Azure/LogicAppsUX/commit/8dff14c5e6c8acfc13a9967234b80fd1b21aad79))
* **vite:** bypass cache when running dev ([624ce2e](https://github.com/Azure/LogicAppsUX/commit/624ce2e67c23c4b6f1c5cedd0dfe4e29e8bc02af))

## [4.11.0](https://github.com/Azure/LogicAppsUX/compare/v4.10.0...v4.11.0) (2024-04-25)


### Features

* **Data Mapper:** Data Mapper Command Bar v2 UI ([#4674](https://github.com/Azure/LogicAppsUX/issues/4674)) ([a317c2e](https://github.com/Azure/LogicAppsUX/commit/a317c2ea16351b6d303eff3ff4b453eb49d6481a))
* **Data Mapper:** Display DM V2 for VsCode with Internal Setting ([#4661](https://github.com/Azure/LogicAppsUX/issues/4661)) ([b0d6343](https://github.com/Azure/LogicAppsUX/commit/b0d6343adf08c9bd609d186991f587a7311e74d6))
* **Designer:** Add Custom Editor Type to align with backend type ([#4701](https://github.com/Azure/LogicAppsUX/issues/4701)) ([c308480](https://github.com/Azure/LogicAppsUX/commit/c3084801b09da0ea0c512b6d185b2af034be26db))


### Bug Fixes

* **designer:** Fixing clearing of dynamic inputs of parameter value changes ([#4702](https://github.com/Azure/LogicAppsUX/issues/4702)) ([ea76614](https://github.com/Azure/LogicAppsUX/commit/ea7661412866b8eb3686cc6b293865c2268d879c))
* **designer:** Update Auth typo ([#4700](https://github.com/Azure/LogicAppsUX/issues/4700)) ([a1421e3](https://github.com/Azure/LogicAppsUX/commit/a1421e3ca1e5a4a92a34c99316e21d8f10873805))

## [4.10.0](https://github.com/Azure/LogicAppsUX/compare/v4.9.0...v4.10.0) (2024-04-24)

## [4.9.0](https://github.com/Azure/LogicAppsUX/compare/v4.8.0...v4.9.0) (2024-04-24)


### Features

* **designer:** Adding MSI capability for Azure functions ([#4662](https://github.com/Azure/LogicAppsUX/issues/4662)) ([4b60f37](https://github.com/Azure/LogicAppsUX/commit/4b60f37973cf53c1eacdc13203cc746b66e2c0b2))
* **designer:** Scope Copy + Paste ([#4668](https://github.com/Azure/LogicAppsUX/issues/4668)) ([0429c55](https://github.com/Azure/LogicAppsUX/commit/0429c55f7b93f173679cff209f67f140b04a7118))
* **designer:** Updates to Custom Code (boilerplate, host.json, optimizations) ([#4690](https://github.com/Azure/LogicAppsUX/issues/4690)) ([e911432](https://github.com/Azure/LogicAppsUX/commit/e911432d82e28b2f14f2bf8c3f84061a87bc6b5c))


### Bug Fixes

* **Designer:** Add Ctrl to our hotkeys bindings ([#4678](https://github.com/Azure/LogicAppsUX/issues/4678)) ([851c9b6](https://github.com/Azure/LogicAppsUX/commit/851c9b679da23ae7d319add56229000564f589d7))
* **designer:** Auth Editor Changes ([#4691](https://github.com/Azure/LogicAppsUX/issues/4691)) ([9b11f86](https://github.com/Azure/LogicAppsUX/commit/9b11f867318a622efa673ad3f7fb184c4bfdbcd0))
* **Designer:** Downgrade Monaco ([#4682](https://github.com/Azure/LogicAppsUX/issues/4682)) ([749a978](https://github.com/Azure/LogicAppsUX/commit/749a97882905aa9a37b46440c714a3d1aa95e3a3))
* **designer:** fix issue where scope nodes didn't get focused when they were jumped to ([#4677](https://github.com/Azure/LogicAppsUX/issues/4677)) ([5676b12](https://github.com/Azure/LogicAppsUX/commit/5676b12a0fbc84c868939e5599051e700f31e89e))
* **designer:** Fix issue where scopes could drag/drop into themselves ([#4669](https://github.com/Azure/LogicAppsUX/issues/4669)) ([419a9d9](https://github.com/Azure/LogicAppsUX/commit/419a9d98573c147e2b99bf51726eb3a551775da7))
* **designer:** Make sure to only add the shouldAdd array expressions for implicit For Each ([#4683](https://github.com/Azure/LogicAppsUX/issues/4683)) ([a792a22](https://github.com/Azure/LogicAppsUX/commit/a792a22060cf88aef3cd76f088a408e5286b9ca2))
* **designer:** Remove double quotes wrapping from uncasted single tokens in array editor ([#4670](https://github.com/Azure/LogicAppsUX/issues/4670)) ([a9639dd](https://github.com/Azure/LogicAppsUX/commit/a9639ddae9e579775f79eef321986c12638b4709))
* **Designer:** Remove react query for dynamic data ([#4693](https://github.com/Azure/LogicAppsUX/issues/4693)) ([87340c3](https://github.com/Azure/LogicAppsUX/commit/87340c399d09c4765f5b912eba8bea85d695ce08))

## [4.8.0](https://github.com/Azure/LogicAppsUX/compare/v4.7.0...v4.8.0) (2024-04-19)


### Features

* **Designer:** Hide side panel when no node is selected and we are suppressing default node click functionality ([#4660](https://github.com/Azure/LogicAppsUX/issues/4660)) ([b37c660](https://github.com/Azure/LogicAppsUX/commit/b37c660b834b83b21f811f275ce25a4152d79fe8))

## [4.7.0](https://github.com/Azure/LogicAppsUX/compare/v4.6.0...v4.7.0) (2024-04-19)


### Features

* **Designer:** Add Custom Editor for Vs-Code To Display DM Editor ([#4592](https://github.com/Azure/LogicAppsUX/issues/4592)) ([3a936cd](https://github.com/Azure/LogicAppsUX/commit/3a936cda0143801ffbb4874ad95f498af67a3552))
* **Designer:** Hide side panel when no node is selected and we are suppressing default node click functionality ([#4653](https://github.com/Azure/LogicAppsUX/issues/4653)) ([24f8794](https://github.com/Azure/LogicAppsUX/commit/24f879471f5094c68e6fcf4ee835ffe41f84b841))


### Bug Fixes

* **Designer:** Renamed Desginer Typo to Designer ([#4647](https://github.com/Azure/LogicAppsUX/issues/4647)) ([88df97d](https://github.com/Azure/LogicAppsUX/commit/88df97dcb76f24b3e8ab24c974717aa68bc3cfed))
* **Designer:** Updated HTML Editor to support newline characters (for dynamic content) ([#4635](https://github.com/Azure/LogicAppsUX/issues/4635)) ([f4e1f8b](https://github.com/Azure/LogicAppsUX/commit/f4e1f8bd2e287e4f254c55d0f0b9ea03593cb1a0))
* **desinger:** Move non-outputschema dynamic data outside fetch ([#4656](https://github.com/Azure/LogicAppsUX/issues/4656)) ([3afadda](https://github.com/Azure/LogicAppsUX/commit/3afaddab2ba48440ecf6669bb6b8223cdb96120c))
* **Doc:** Fixing Typo in the Development Doc ([#4646](https://github.com/Azure/LogicAppsUX/issues/4646)) ([7a6a2ac](https://github.com/Azure/LogicAppsUX/commit/7a6a2acf1a23af94c0792bd8674f40078cf36b8c))
* **vscode:** Fix typos in code ([#4654](https://github.com/Azure/LogicAppsUX/issues/4654)) ([6648d7c](https://github.com/Azure/LogicAppsUX/commit/6648d7c3e496284aec4b4c82decd3a3aed8b5a5f))

## [4.6.0](https://github.com/Azure/LogicAppsUX/compare/v4.5.1...v4.6.0) (2024-04-18)


### Bug Fixes

* **dataMapper:** Fix issue loading schemas in stand alone ([#4642](https://github.com/Azure/LogicAppsUX/issues/4642)) ([294ca75](https://github.com/Azure/LogicAppsUX/commit/294ca75768cf3433fabb2d556a57747396204b27))
* **vscode:** Fix new typescript version issues and import libraries ([#4636](https://github.com/Azure/LogicAppsUX/issues/4636)) ([79d8e20](https://github.com/Azure/LogicAppsUX/commit/79d8e20badbafa835e1cbad27a4dd2ab9b1ef75b))

### [4.5.1](https://github.com/Azure/LogicAppsUX/compare/v4.5.0...v4.5.1) (2024-04-18)

## [4.5.0](https://github.com/Azure/LogicAppsUX/compare/v4.4.1...v4.5.0) (2024-04-18)


### Features

* **vscode:** Update README.md - Deployment Scripts ([#4612](https://github.com/Azure/LogicAppsUX/issues/4612)) ([1fd4d84](https://github.com/Azure/LogicAppsUX/commit/1fd4d840758ce63256e1b43e2019d78c987ccd54))


### Bug Fixes

* **all:** Fix ESLint for repo ([#4617](https://github.com/Azure/LogicAppsUX/issues/4617)) ([4d8ce84](https://github.com/Azure/LogicAppsUX/commit/4d8ce84ee521adad486171fcadeda74e313ae309))
* **Designer:** Add a log when user sees invalid connection error on operation deserialization ([#4628](https://github.com/Azure/LogicAppsUX/issues/4628)) ([5f746d4](https://github.com/Azure/LogicAppsUX/commit/5f746d4f0b221ffc83c113190017806400fb0fb9))
* **Designer:** Added proper settings to the Azure Function operation ([#4605](https://github.com/Azure/LogicAppsUX/issues/4605)) ([5f6aab5](https://github.com/Azure/LogicAppsUX/commit/5f6aab530b87a20779d5ed64f8d5d3b8de273c97))
* **designer:** html editor styles not showing in v3 ([#4627](https://github.com/Azure/LogicAppsUX/issues/4627)) ([85430e3](https://github.com/Azure/LogicAppsUX/commit/85430e36aca6ece6c4e70fed996175a04fb2a342))
* **designer:** Performance improvement by removing spread accumulators in the code ([#4619](https://github.com/Azure/LogicAppsUX/issues/4619)) ([3c8128c](https://github.com/Azure/LogicAppsUX/commit/3c8128cf5ed254c1946e0e08bb6c02695059ac4e))
* **designer:** simplify the email validation regex ([#4626](https://github.com/Azure/LogicAppsUX/issues/4626)) ([f5c8485](https://github.com/Azure/LogicAppsUX/commit/f5c8485eafb6b5f5d6fe20cd5ffce34566a36812))
* **vscode:** Add eslint configuration to vs-code-designer and vs-code-react ([#4620](https://github.com/Azure/LogicAppsUX/issues/4620)) ([efe4e50](https://github.com/Azure/LogicAppsUX/commit/efe4e500719adbf22199f782e63b44d9e8d27007))
* **vscode:** Update calls to check for dotnet installation ([#4621](https://github.com/Azure/LogicAppsUX/issues/4621)) ([97706a6](https://github.com/Azure/LogicAppsUX/commit/97706a609bdf9bd58dc29277e3d87b2d667f7e6c))
* **vscode:** Update version in README ([#4615](https://github.com/Azure/LogicAppsUX/issues/4615)) ([c555d59](https://github.com/Azure/LogicAppsUX/commit/c555d5983b123a4250dfab8fa5b8146a30a5df2c))

### [4.4.1](https://github.com/Azure/LogicAppsUX/compare/v4.4.0...v4.4.1) (2024-04-11)


### Features

* **Designer:** Node details panel updates ([#4600](https://github.com/Azure/LogicAppsUX/issues/4600)) ([5fba416](https://github.com/Azure/LogicAppsUX/commit/5fba416b18d34ce759d84212ffca211fa3cab47f))
* **vscode:** Introducing iac to vscode extension ([#4599](https://github.com/Azure/LogicAppsUX/issues/4599)) ([6b8f6e9](https://github.com/Azure/LogicAppsUX/commit/6b8f6e98be57ba4f2fd148e0d67aa58812536cb3)), closes [#2830](https://github.com/Azure/LogicAppsUX/issues/2830) [#3031](https://github.com/Azure/LogicAppsUX/issues/3031) [#3037](https://github.com/Azure/LogicAppsUX/issues/3037)

## [4.4.0](https://github.com/Azure/LogicAppsUX/compare/v4.3.0...v4.4.0) (2024-04-11)


### Features

* **Data Mapper:** creating new data mapper library ([#4575](https://github.com/Azure/LogicAppsUX/issues/4575)) ([1bec11b](https://github.com/Azure/LogicAppsUX/commit/1bec11bb24832a396a246a7459e016cbc737b1ce))


### Bug Fixes

* **designer:** Adding upload and download chunk size missing settings ([#4594](https://github.com/Azure/LogicAppsUX/issues/4594)) ([027574f](https://github.com/Azure/LogicAppsUX/commit/027574f3d21eee15c91d9ea5ec366aca4c92dbe8))
* **designer:** Fix issue that was causing designer to crashw hen clicking on settings ([#4598](https://github.com/Azure/LogicAppsUX/issues/4598)) ([0df2bf6](https://github.com/Azure/LogicAppsUX/commit/0df2bf6ad1447d4167b16dce7882a8877eb8b65f))
* **Designer:** Fixed issue where we weren't handling null connection references fully ([#4596](https://github.com/Azure/LogicAppsUX/issues/4596)) ([62622f7](https://github.com/Azure/LogicAppsUX/commit/62622f74a77781cf9fbb7e22039a7098235ddd86))
* **vscode:** Building vs-code-react with vite ([#4595](https://github.com/Azure/LogicAppsUX/issues/4595)) ([211e785](https://github.com/Azure/LogicAppsUX/commit/211e785f35b627ac3ec092af8d9ce563dc31204c))

## [4.3.0](https://github.com/Azure/LogicAppsUX/compare/v4.2.2...v4.3.0) (2024-04-10)


### Bug Fixes

* **designer:** Ensure stringified parameter value type when initializing parameter ([#4588](https://github.com/Azure/LogicAppsUX/issues/4588)) ([86e554e](https://github.com/Azure/LogicAppsUX/commit/86e554eb7f51ece5b4af7e00e791775f4932af3b))
* **designer:** Fix code editor when non-string gets uploaded to custom code file ([#4587](https://github.com/Azure/LogicAppsUX/issues/4587)) ([620f685](https://github.com/Azure/LogicAppsUX/commit/620f6850a8d23b2c05b47b9dc1bc34b682607aa1))
* **designer:** Fix react-flow CSS path and a couple exports ([#4585](https://github.com/Azure/LogicAppsUX/issues/4585)) ([57869ac](https://github.com/Azure/LogicAppsUX/commit/57869ac5934191c6f3d3f2aedb1fb3832aec4621))
* **Designer:** Fixed issue where dynamic data call would fail when value is non-string ([#4584](https://github.com/Azure/LogicAppsUX/issues/4584)) ([65e9ab6](https://github.com/Azure/LogicAppsUX/commit/65e9ab684ac27de51b48e2511c86ffe6cdc556aa))

### [4.2.2](https://github.com/Azure/LogicAppsUX/compare/v4.2.1...v4.2.2) (2024-04-08)


### Bug Fixes

* **designer:** Fix custom code bug ([#4577](https://github.com/Azure/LogicAppsUX/issues/4577)) ([614178e](https://github.com/Azure/LogicAppsUX/commit/614178e7b7047d2b3ff6902ab974ea9a0bba0db8))

### [4.2.1](https://github.com/Azure/LogicAppsUX/compare/v4.2.0...v4.2.1) (2024-04-08)


### Features

* **Designer:** Dynamic data performance improvements ([#4483](https://github.com/Azure/LogicAppsUX/issues/4483)) ([1f6477c](https://github.com/Azure/LogicAppsUX/commit/1f6477c8d3251b4f384c56d73e294027cd739345))


### Bug Fixes

* **Data Mapper:** deserialization string bug fix ([#4567](https://github.com/Azure/LogicAppsUX/issues/4567)) ([f48f2fe](https://github.com/Azure/LogicAppsUX/commit/f48f2fe40abf3869082caaaf6e8242ed3c01762c))
* **designer:** Custom Code Fixes from Internal BugBash ([#4576](https://github.com/Azure/LogicAppsUX/issues/4576)) ([eb8803e](https://github.com/Azure/LogicAppsUX/commit/eb8803e71ffd80feff9c72c11f2519b5df29826b))

## [4.2.0](https://github.com/Azure/LogicAppsUX/compare/v4.1.1...v4.2.0) (2024-04-06)


### Features

* **designer:** Adding changes to support xml operations ([#4552](https://github.com/Azure/LogicAppsUX/issues/4552)) ([7e9abd9](https://github.com/Azure/LogicAppsUX/commit/7e9abd9d514e16e8d90bb442d7a2cc7aaee91e14))


### Bug Fixes

* **designer-ui:** Prevent certain malicious HTML from executing in raw HTML editor ([#4553](https://github.com/Azure/LogicAppsUX/issues/4553)) ([275fa95](https://github.com/Azure/LogicAppsUX/commit/275fa95c81b1b3f1ca903a7a81263f9b4e58d519))
* **designer:** MonacoEditor Erroring in Standalone ([#4563](https://github.com/Azure/LogicAppsUX/issues/4563)) ([f720684](https://github.com/Azure/LogicAppsUX/commit/f7206847333b1b5d6edb6c84eb4c9108db5c2714))
* **designer:** Prevent filtering of Until Nodes when getting upstream nodes for output tokens ([#4560](https://github.com/Azure/LogicAppsUX/issues/4560)) ([86fafd0](https://github.com/Azure/LogicAppsUX/commit/86fafd0a81068512b9d4104c7414d983fdc34bae))
* **designer:** Standalone Error Fixes ([#4564](https://github.com/Azure/LogicAppsUX/issues/4564)) ([e2c09c0](https://github.com/Azure/LogicAppsUX/commit/e2c09c0b13aa9be05de7f8253a077e468c0f1e0c))
* **vscode:** Add keepNames to tsup config ([#4565](https://github.com/Azure/LogicAppsUX/issues/4565)) ([0aa9da0](https://github.com/Azure/LogicAppsUX/commit/0aa9da00f0ffc8a7cff3b005c4df8e06021e9f4a))

### [4.1.1](https://github.com/Azure/LogicAppsUX/compare/v4.1.0...v4.1.1) (2024-04-04)


### Bug Fixes

* **designer:** Fix Combobox erroring when non-string displayName are used ([#4549](https://github.com/Azure/LogicAppsUX/issues/4549)) ([28f196a](https://github.com/Azure/LogicAppsUX/commit/28f196a58000634b39569313dd047dc2deb1e9f1))

## [4.1.0](https://github.com/Azure/LogicAppsUX/compare/v4.0.0...v4.1.0) (2024-04-04)


### Bug Fixes

* **desinger:** Fix unable to drag, optimize if no customcode changes ([#4546](https://github.com/Azure/LogicAppsUX/issues/4546)) ([58c17d3](https://github.com/Azure/LogicAppsUX/commit/58c17d39f942cc6a0c8d07b146df80ea1078c0aa))

## [4.0.0](https://github.com/Azure/LogicAppsUX/compare/v3.3.5...v4.0.0) (2024-04-04)

### [3.3.5](https://github.com/Azure/LogicAppsUX/compare/v3.3.1...v3.3.5) (2024-04-04)


### Bug Fixes

* **vscode:** Keep host.json when converting to NuGet based project ([#4533](https://github.com/Azure/LogicAppsUX/issues/4533)) ([58f1f47](https://github.com/Azure/LogicAppsUX/commit/58f1f47521efa712c6054f07eeb8e7bfd711b9e1))
