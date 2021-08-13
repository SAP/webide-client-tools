[![npm version](https://badge.fury.io/js/%40sap-webide%2Fwebide-client-tools.svg)](https://badge.fury.io/js/%40sap-webide%2Fwebide-client-tools)
[![CircleCI](https://circleci.com/gh/SAP/webide-client-tools.svg?style=svg&circle-token=3b17f31fb0d03686ffbabab018fab13b24e1e581)](https://circleci.com/gh/SAP/webide-client-tools) [![Greenkeeper badge](https://badges.greenkeeper.io/SAP/webide-client-tools.svg)](https://greenkeeper.io/)
[![REUSE status](https://api.reuse.software/badge/github.com/SAP/webide-client-tools)](https://api.reuse.software/info/github.com/SAP/webide-client-tools)

# webide-client-tools

## Description

Tools and flows for developing client-side features and extensions for [SAP Web IDE](https://developers.sap.com/topics/sap-webide.html)
based on npm ecosystem and standard OSS packages.

## Features

- **Bundling and Minification** of SAP Web IDE features:

  - Mainly uses [require.js optimizer](http://requirejs.org/docs/optimization.html).

- **Testing**

  - Uses [Karma Test runner](https://github.com/karma-runner/karma).
  - Uses our home-brewed APIs, which allows programmatic access to SAP Web IDE Services (Service Test Framework).

- **Local development server** for static resources:
  - Provides fast feedback loops.
  - Runs the bundled version of your feature locally.
  - Uses the [Connect](https://github.com/senchalabs/connect) Node.js middleware layer.
  - Uses an "in memory" backend mock.

## Requirements and Compatibility

- A [maintained version](https://github.com/nodejs/Release) of node.js.

## Installation

Run this command:
`npm install @sap-webide/webide-client-tools --save-dev`

## Usage and Documentation

See these examples:

- [Documentation Website](https://sap.github.io/webide-client-tools/web/site/)
- [A feature demonstrating client-tool capabilities](https://github.com/SAP/webide-client-tools/tree/master/example).

## Support

To get support, you can open [**issues**](https://github.com/SAP/webide-client-tools/issues) on Github.

## Known Issues

Full usage of this library requires the webide package as an npm peerDependency.
Specifically for testing and development server flows.
This is **currently** not possible outside SAP's coporate network.
Which means that the client-tools library can (**temporarily**) only be used for bundling flows.

## Contributing

For information, see [CONTRIBUTING.md](https://github.com/SAP/webide-client-tools/tree/master/CONTRIBUTING.md).

## Licensing

Please see our [LICENSE](LICENSE) for copyright and license information. Detailed information including third-party components and their licensing/copyright information is available [via the REUSE tool](https://api.reuse.software/info/github.com/SAP/webide-client-tools).