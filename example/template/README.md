# Background

A Template for a WebIDE feature using the client-tools package

Note that the **official** template is maintained at: 
TBD: Should be released as open source too.
 
This is used as live docs and also for integration tests.
But when starting a new webide feature project it is suggested
to **start with** the official template first and use this template as
additional docs for more advanced use cases.

### Demonstrated Flows

The demonstrated flows are based around [npm scripts](https://docs.npmjs.com/misc/scripts).
See the previous link for in-depth docs on npm script.


* [Initial Setup](#SETUP)
* [Customizing The Flows](#CUSTOMIZE)
* [Dev Server](#DEV_SERVER)
* [Local DI](#LOCAL_DI)
* [Bundling](#BUNDLING)
* [Testing](#TESTING)

### <a name="SETUP"></a> Initial Setup

In this directory:

* ```npm update```

Note that the webide's static resources will be downloaded as well
because the webide is listed as a dev-depedency in the package.json.


### <a name="CUSTOMIZE"></a> Customizing The Flows
Nearly all APIs provided by the client-tools library can be customized.

* The APIs provided by the client tools are programatic (not limited to CLI/GUI).
* The [Config Object Pattern](https://stackoverflow.com/questions/7466817/javascript-configuration-pattern) is the de-facto standard for providing APIs by the client-tools (anything else is considered a **bug!**)

For example: Lets assume we want to customize the Local DI instance starting flow.
This example executes it by running:
```npm run di_start```

If we inspect the package.json of this example we will see the npm run command will execute the scripts/di_start.js.
which in turns executes a programatic API of the client tools library.

```javascript
const di = require("webide-client-tools").diBackend

di.start()
```

This start commands accepts an optional config argument.
Which is documented in the [JS Docs](http://sap.github.io/webide-client-tools/web/html_docs/diBackend.html)
But more importantly (and easily) can be inspected simplify by opening the relevant client-tools library source.
For example: in our case this would mean [opening node_modules/webide-client-tools/src/di_backend.js](https://github.com/SAP/webide-client-tools/blob/336735a2f3240133eb35ff076cfe51cb4e7be34d/src/di_backend.js#L188)
or even better **stepping into** it in our debugger.



### <a name="DEV_SERVER"></a> Dev Server

A Local Development server provides a static web server to host & serve a feature's resources.
This is used to run the WebIDE (and extensions) locally for development purposes.

First lets start our static webserver devleopment server.
* ```npm run dev_server```

Now we can open the webide locally by opening: [http://localhost:3000](http://localhost:3000)
in our favorites browser. 

* Note that the Example Plugin has been loaded, You can run the example plugin's service by choosing the menus:
  - ```Tools --> Samples --> Helloworld```
  
* Also Note that the WebIDE instance started will start with a mock backend
  So no DI server is required.


#### How Does the Dev Server Work?

localhost:3000 redirects to localhost:3000/index.html.
This [index.html](https://github.com/SAP/webide-client-tools/blob/master/example/template/index.html)
Starts the WebIDE in an IFrame, and injects configuration options such as adding our example plugin's package.json
to the root webide featureConfig.

This is aviliable as a programatic API (**startWebIDE**).
With several optional arguments.

Lets have a look at two variants to demonstrate the customizability:
* [index_dist.html](https://github.com/SAP/webide-client-tools/blob/master/example/template/index_dist.html)
  Will start the WebIDE and load the example plugin from the dist folder (after bundling).

* [index_di.html](https://github.com/SAP/webide-client-tools/blob/master/example/template/index_di.html)
  Will start the WebIDE without the mock backend, thus requiring a local DI server to be started beforehand.



### <a name="LOCAL_DI"></a> Local DI
A Local DI instance is used to provide the backend APIs required by the WebIDE.
This is currently limited to mainly the file system services.

The Local DI is a Java Application which is not part of the client tools.
Instead the client tools provide scripts to manage the life-cycle of the Local DI instance.

* Downloading: ```npm run di_download```
  - Will download the last snapshot version of the local DI server matching the WebIDE version used (in node_modules/webide).
* Starting: ```npm run di_start```
* Stopping: ```npm run di_stop```
* cleaning(workspaces): ```npm run di_clean```

Example Scenarios:
* Local Dev Server with Local DI - To have a **persistent** local workspace.
 1. Start Local DI
 2. Start Dev Server
 3. open localhost:3000/index_di.html
 
* Running Automated tests using a "real" backend (not mock in memory backend).
 1. Download DI
 2. Start DI.
 3. Start Tests.
 4. Stop DI.
 5. Clean DI
    - Cleaning is optional and depends on the persistance between sequencial runs of your automatation solution (docker/VMs/...).




### <a name="BUNDLING"></a> Bundling
Bundling enables a feature to package it's contents to fewer files, thus allows faster loading in the end user's browser.
There are three types of artifacts.
1. JavaScript resources.
   * Which are bundled using the [require.js optimizer](http://requirejs.org/docs/optimization.html).
2. WebIDE Metadata files (package.json/plugin.json/interface.json)
   * Which are bundled using propriarity logic.
3. I18n resources.
   * Also bundled using propriarity logic.
   
To examine the bundled artifacts first execute the bundling for this feature.
* ```npm run bundle```
And then inspect the dist folder of the example/template directory (where this readme resides).

Note that the majority (and most complex) of the resources bundled are the JavaScript resources (.js files).
And that the bundling API is just a wrapper for a standard tool (require.js optimizer) in that case.
This means that issues can normally be resolved by consulting "google".

Relevant Resources:
* http://requirejs.org/docs/node.html#optimizer
* http://requirejs.org/docs/api.html#config
* https://stackoverflow.com/questions/tagged/requirejs

Also note that the require.js optimizer is only meant to bundle files using the AMD module pattern.
See the [FAQ](https://github.com/SAP/webide-client-tools/blob/master/FAQ.md) for details on how to exclude files from bundling.




### <a name="TESTING"></a> Testing

See [separate documentation](https://github.com/SAP/webide-client-tools/blob/master/docs/unit_service_testing.md).





