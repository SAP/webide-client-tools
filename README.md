# webide-client-tools


### Description

Tools & Dev-Flows for developing client side features/extensions for the [SAP WebIDE](https://www.sap.com/germany/developer/topics/sap-webide.html).
based around npm eco-system and standard OSS packages.


## Features

- Bundling & Minification of WebIDE Features.
  * Mainly using [require.js optimizer](http://requirejs.org/docs/optimization.html).

- Testing.
  * Using [Karma Test runner](https://github.com/karma-runner/karma)
  * And our home brewed APIs which allow programmatic access to the WebIDE Services (a.k.a Service Test Framework).
  
- Local development server for static resources.
  * Fast feedback loops.
  * Also run the bundled version of your feature locally.
  * Using [Connect](https://github.com/senchalabs/connect) Node.js middleware layer.
  
- Local Di instance Life Cycle.
  * Download/Start/Stop.
  * This currently has only very limited capabilities (no builders/runners support).
  * Local DI jar is **not** yet available outside SAP. 


## Requirements & Compatibility
* A [maintained version](https://github.com/nodejs/Release) of node.js
  this currently means node.js > 4.
  
  
## Installation

```npm install @devx/webide-client-tools --save-dev```


## Usage & Documentation

* [An Example Feature demonstrating the client-tools capabilities](https://github.com/SAP/webide-client-tools/tree/master/example/template)
* [Html Docs](http://sap.github.io/webide-client-tools/web/html_docs/modules/_api_d_.html)


## Support

Please open [**issues**](https://github.com/SAP/webide-client-tools/) on github to obtain support.


## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).


## Limitations

There are peer-dependencies for the **usage** of this library which are still in the process
of becoming available outside SAP. 

The major one is the webide itself, without it is not possible to run feature tests or the local dev-server.
And the minor one being the local env DI backend, without it the tests are limited to
those using a "fake" backend mock.


## License

Copyright (c) 2018 SAP SE or an SAP affiliate company. All rights reserved.
This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the [LICENSE file](./LICENSE).
