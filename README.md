[![CircleCI](https://circleci.com/gh/SAP/webide-client-tools.svg?style=svg&circle-token=3b17f31fb0d03686ffbabab018fab13b24e1e581)](https://circleci.com/gh/SAP/webide-client-tools)


# webide-client-tools


## Description

Tools and flows for developing client-side features and extensions for [SAP Web IDE](https://www.sap.com/germany/developer/topics/sap-webide.html) based on npm ecosystem and standard OSS packages.


## Features

- **Bundling and Minification** of SAP Web IDE features:
  * Mainly uses [require.js optimizer](http://requirejs.org/docs/optimization.html).

- **Testing**
  * Uses [Karma Test runner](https://github.com/karma-runner/karma).
  * Uses our home-brewed APIs, which allows programmatic access to SAP Web IDE Services (Service Test Framework).
  
- **Local development server** for static resources:
  * Provides fast feedback loops.
  * Runs the bundled version of your feature locally.
  * Uses the [Connect](https://github.com/senchalabs/connect) Node.js middleware layer.
  * Uses an "in memory" backend mock.


## Requirements and Compatibility
* A [maintained version](https://github.com/nodejs/Release) of node.js for versions later than 4.
  
  
## Installation

Run this command:
```npm install @devx/webide-client-tools --save-dev```


## Usage and Documentation

See these examples:
* [A feature demonstrating client-tool capabilities](https://github.com/SAP/webide-client-tools/tree/master/example/template).
* [HTML version](http://sap.github.io/webide-client-tools/web/html_docs/modules/_api_d_.html).


## Support

To get support, you can open [**issues**](https://github.com/SAP/webide-client-tools/issues) on Github.


## Known Issues

See [Known Bugs](https://github.com/SAP/webide-client-tools/issues?q=is%3Aissue+is%3Aopen+label%3Abug) on github issues page.


## Contributing

For information, see [CONTRIBUTING.md](./CONTRIBUTING.md).


## Limitations

There are peer dependencies for the **usage** of this library which are still in the process
of becoming available outside SAP corporate network. 
.
The major peer dependency is SAP Web IDE itself.
Without it, is not possible to run feature tests or the local development server.


## License

Copyright (c) 2018 SAP SE or an SAP affiliate company. All rights reserved.
This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the [LICENSE file](./LICENSE).
