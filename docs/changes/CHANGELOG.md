## X.Y.Z (INSERT_DATE_HERE)

#### Minor Changes

- Add more fields as part of the bundling

## 3.0.2 (2018-11-30)

#### Minor Changes

- Skip stale versions (3.0.0, 3.0.1)

## 3.0.0 (2018-11-29)

#### Breaking Changes

- [BREAKING_CHANGES For V3.0](https://github.com/SAP/webide-client-tools/blob/master/docs/changes/BREAKING_CHANGES.md#_3-0-0)

## 2.4.4 (2018-11-29)

#### Minor Changes

- Override version 2.4.3 as it has breaking changes

## 2.4.3 (2018-11-29)

#### Minor Changes

- Use webide services mock data from the webide package. Requires webide package > 1.97.0

## 2.4.1 (2018-10-29)

#### Minor Changes

- Add missing mock to test framework

## 2.4.0 (10-28-2018)

#### Minor Changes

- UI5 will be loaded from a globally available resource **by default**
  in startWebIDE flows. To change this, see: "ui5Root" config option in
  ["startWebIDE"](https://sap.github.io/webide-client-tools/web/html_docs/interfaces/_api_d_.stf_api.html#startwebide).

## 2.3.4 (6-27-2018)

#### Bug Fixes

- Fixed "In Memory" mode in Tests and Local Env for Web IDE 1.84+

## 2.3.3 (6-25-2018)

#### Bug Fixes

- Fixed none AMD sources error message details link to point ot new docs website.

## 2.3.2 (6-20-2018)

#### Bug Fixes

- Experimental Webpack bundling - Module Loading must be lazy.

## 2.3.1 (6-14-2018)

#### Bug Fixes

- Experimental Webpack bundling - don't reject on warnings, only warn.

## 2.3.0 (6-14-2018)

#### Minor Changes

- Experimental Webpack bundling - [use a plugin's module property as an entry point](https://github.com/SAP/webide-client-tools/pull/45).

#### Bug Fixes

- [Updated transitive dependencies to avoid an issue when running under node.js version 10](https://github.com/SAP/webide-client-tools/commit/c2e99e8a556a7054cde2fcb62ef4e06605f803ce).
- [Fixed experimental webpack bundling under windows 10](https://github.com/SAP/webide-client-tools/commit/233bfaf761cb0443daed697c6b0fd5ebb7891074).
- [experimental webpack bundling ensure cleanup of generated entry point](https://github.com/SAP/webide-client-tools/commit/dcf702af5195aa6504631df82206d530d56f3b65).

## 2.2.0 (6-12-2018)

#### Minor Changes

- The example for using client-tools feature is less nested (no 'template' folder).
- The package.json created for caching contains the feature's version.

## 2.1.0 (2018-5-13)

#### Minor Changes

- The example for using client-tools feature is included in the npm package.

## 2.0.1 (2018-5-10)

#### Bug Fixes

- [STF.startWebIDE function nested defaults handling.](https://github.com/SAP/webide-client-tools/issues/37)

## 2.0.0 (2018-5-1)

#### Major Changes

- First npm Release.

## Template

#### Major Changes

#### Minor Changes

#### Bug Fixes