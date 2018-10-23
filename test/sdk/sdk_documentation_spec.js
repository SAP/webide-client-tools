"use strict"
jest.mock("vm")

const fs = require("fs")
const _ = require("lodash")
const path = require("path")
const sinon = require('sinon');
const chaiConfig = require("../chai.config")
const sdk = require("../../src/sdk")

const expect = chaiConfig.expect
const _PUBLIC = "public"
const _INTERNAL = "internal"
const testDir = path.resolve(__dirname, "resources/testfeature");
const outDir = path.resolve(__dirname, testDir + "/dist");
const expectedFinalJsonFilesDir = path.resolve(__dirname, "resources/expected_final_json_files");
const baseURI = path.resolve(__dirname, testDir + "/src/webide-plugin-example/service/Sample.json");
const sourceFilesExcludePattern = "\\w+\\.json";
const exampleFilesIncludePattern = /.+\\test\\\w+.js/

function eraseFilesFromSystem(filesPath) {
  const internalSdkJsonPath = path.resolve(__dirname, filesPath + "/" + sdk.test.internalJsonFileName);
  const publicSdkJsonPath = path.resolve(__dirname, filesPath + "/" + sdk.test.publicJsonFileName)

  try {
    fs.unlinkSync(internalSdkJsonPath);
  } catch(error) {
    console.error("Error: " + internalSdkJsonPath + " was NOT deleted\n\t" + error.message);
  }

  try {
    fs.unlinkSync(publicSdkJsonPath);
  } catch(error) {
    console.error("Error: " + publicSdkJsonPath + " was NOT deleted\n\t" + error.message);
  }
}

function readFiles(readPath) {
  const internalJsonPath = path.resolve(__dirname, readPath + "/" + sdk.test.internalJsonFileName);
  const publicJsonPath = path.resolve(__dirname, readPath + "/" + sdk.test.publicJsonFileName);
  return {
    internalJson: JSON.parse(
      fs.readFileSync(internalJsonPath, "utf8")
    ),
    publicJson: JSON.parse(
      fs.readFileSync(publicJsonPath, "utf8")
    )
  }
}

function deepFreeze(obj) {
  for (let p in obj) {
    if(obj.hasOwnProperty(p) && typeof obj[p] === 'object' ) {
      deepFreeze(obj[p]);
    }
  }
  Object.freeze(obj);
}

describe("sdk test plan", () => {
  const testsData = {
    serveciesMetaData: {
      core: undefined,
      featureConfig: undefined,
      sample: {
        implements: "sap.webide.example.plugin.service.Sample",
        module: "sap.webide.example.plugin/service/Sample"
      }
    },
    interfacesMeta: {
      "sap.webide.example.plugin.service.Sample": {
        "name": "sap.webide.example.plugin.service.Sample",
        "description": "The sample service interface",
        "visibility": "public",
        "component": "CA-WDE-FPM",
        "configurationProperties": {
          "notificationObject": {
            "description": "notification object to organize the count",
            "type": {
              "notificationCount": {
                "type": "number",
                "description": "it is used to configure the number notification counter will start from"
              }
            },
            "multiple": true,
            "visibility": "public"
          }
        },
        "methods": {
          "modifyVar": {
            "description": "Display a greeting message notification",
            "params": [
              {
                "name": "sName",
                "type": "string",
                "description": "The name of the user to greet"
              }
            ],
            "visibility": "public"
          },
          "sayHello": {
            "description": "Display a greeting message notification",
            "params": [
              {
                "name": "sName",
                "type": "string",
                "description": "The name of the user to greet"
              }
            ],
            "visibility": "public"
          },
          "getNotificationCount": {
            "description": "Get the number of greeting notifications displayed so far",
            "returns": {
              "type": "number",
              "description": "Number of greeting notifications displayed so far"
            },
            "visibility": "public"
          }
        },
        "events": {
          "notificationDisplayed": {
            "description": "the event is triggered when the notification",
            "params": [
              {
                "name": "notificationCount",
                "type": "number",
                "description": "The number of greeting notifications displayed so far"
              }
            ],
            "visibility": "public"
          }
        },
        "baseURI": baseURI,
        "extends": []
      }
    },
    apiJson: {
      "xmlns": "http://www.sap.com/sap.ui.library.api.xsd",
      "_version": "1.0.0",
      "symbols": [
        {
          "kind": "class",
          "name": "helloUtils",
          "basename": "helloUtils",
          "component": "CA-WDE-FPM",
          "resource": "src/webide-plugin-example/service/helloUtils.js",
          "module": "src/webide-plugin-example/service/helloUtils",
          "visibility": "public",
          "description": "The <i>helloUtils</i> class manages functionality related to Our Example.",
          "constructor": {
            "visibility": "public",
            "parameters": [
              {
                "name": "msg",
                "type": "string",
                "optional": "false"
              }
            ]
          }
        },
        {
          "kind": "class",
          "name": "sample",
          "basename": "sample",
          "isService": true,
          "component": "CA-WDE-FPM",
          "resource": "src/webide-plugin-example/service/Sample.js",
          "module": "src/webide-plugin-example/service/Sample",
          "visibility": "public",
          "description": "The <i>Sample</i> service manages functionality related to Our Example.",
          "constructor": {
            "visibility": "public"
          },
          "events": [
            {
              "name": "notificationDisplayed",
              "visibility": "public",
              "static": true,
              "parameters": [
                {
                  "name": "notificationCount",
                  "type": "integer",
                  "description": "The number of greeting notifications displayed so far."
                }
              ],
              "description": "Fired when the notification message was displayed"
            }
          ],
          "methods": [
            {
              "name": "configure",
              "visibility": "public",
              "static": true,
              "parameters": [
                {
                  "name": "mConfig",
                  "type": "Object",
                  "optional": "false",
                  "parameterProperties": {
                    "notificationObject": {
                      "name": "notificationObject",
                      "type": "Object[]",
                      "parameterProperties": {
                        "notificationCount": {
                          "name": "notificationCount",
                          "type": "number",
                          "description": "a notification count to start the service from."
                        }
                      },
                      "description": "notification object to organize the count"
                    }
                  }
                }
              ]
            },
            {
              "name": "getNotificationCount",
              "visibility": "internal",
              "static": true,
              "returnValue": {
                "type": "Integer",
                "description": "the notification counter"
              },
              "description": "gets the notification counter"
            },
            {
              "name": "modifyVar",
              "visibility": "public",
              "static": true,
              "returnValue": {
                "type": "string",
                "description": "the modifyMe value"
              },
              "parameters": [
                {
                  "name": "sName",
                  "type": "string",
                  "optional": "false",
                  "description": "A value for 'modifyMe'"
                }
              ],
              "description": "Modifies the variable 'modifyMe'"
            },
            {
              "name": "sayHello",
              "visibility": "internal",
              "static": true,
              "parameters": [
                {
                  "name": "sName",
                  "type": "string",
                  "optional": "false",
                  "description": "An appendix to the Hello"
                }
              ],
              "description": "Displays greeting notification and fires 'notificationDisplayed' event"
            }
          ]
        }
      ]
    },
    jSDocPublic: {
      "classes": {
        "helloUtils": {
          "kind": "class",
          "name": "helloUtils",
          "basename": "helloUtils",
          "component": "CA-WDE-FPM",
          "resource": "src/webide-plugin-example/service/helloUtils.js",
          "module": "src/webide-plugin-example/service/helloUtils",
          "visibility": "public",
          "description": "The <i>helloUtils</i> class manages functionality related to Our Example."
        }
      },
      "services": {
        "sample": {
          "kind": "class",
          "name": "sample",
          "basename": "sample",
          "isService": true,
          "component": "CA-WDE-FPM",
          "resource": "src/webide-plugin-example/service/Sample.js",
          "module": "src/webide-plugin-example/service/Sample",
          "visibility": "public",
          "description": "The <i>Sample</i> service manages functionality related to Our Example.",
          "events": {
            "notificationDisplayed": {
              "name": "notificationDisplayed",
              "visibility": "public",
              "static": true,
              "description": "Fired when the notification message was displayed",
              "params": [
                {
                  "name": "notificationCount",
                  "type": "integer",
                  "description": "The number of greeting notifications displayed so far."
                }
              ]
            }
          },
          "methods": {
            "getNotificationCount": {
              "name": "getNotificationCount",
              "visibility": "internal",
              "static": true,
              "description": "gets the notification counter",
              "returns": {
                "type": "Integer",
                "description": "the notification counter"
              }
            },
            "modifyVar": {
              "name": "modifyVar",
              "visibility": "public",
              "static": true,
              "description": "Modifies the variable 'modifyMe'",
              "params": [
                {
                  "name": "sName",
                  "type": "string",
                  "optional": "false",
                  "description": "A value for 'modifyMe'"
                }
              ],
              "returns": {
                "type": "string",
                "description": "the modifyMe value"
              }
            },
            "sayHello": {
              "name": "sayHello",
              "visibility": "internal",
              "static": true,
              "description": "Displays greeting notification and fires 'notificationDisplayed' event",
              "params": [
                {
                  "name": "sName",
                  "type": "string",
                  "optional": "false",
                  "description": "An appendix to the Hello"
                }
              ]
            }
          },
          "configurationProperties": {
            "notificationObject": {
              "name": "notificationObject",
              "type": "Object[]",
              "description": "notification object to organize the count",
              "params": [
                {
                  "name": "notificationCount",
                  "type": "number",
                  "description": "a notification count to start the service from."
                }
              ],
              "visibility": "public"
            }
          }
        }
      }
    },
    interfacesInternal: {
      "sap.webide.example.plugin.service.Sample": {
        "name": "Interfaces.sap.webide.example.plugin.service.Sample",
        "basename": "sap.webide.example.plugin.service.Sample",
        "visibility": "public",
        "kind": "interface",
        "description": "The sample service interface",
        "component": "CA-WDE-FPM",
        "events": {
          "notificationDisplayed": {
            "description": "the event is triggered when the notification",
            "params": [
              {
                "name": "notificationCount",
                "type": "number",
                "description": "The number of greeting notifications displayed so far"
              }
            ],
            "visibility": "public",
            "example": "      var sampleService = getService(\"sample\")\r\n      var mSample = {\r\n        subscribes: {\r\n          \"sample:notificationDisplayed\":\r\n            \"sampleService:myNotificationDisplayedHandler\"\r\n        }\r\n      }\r\n      sampleService.prototype.myNotificationDisplayedHandler = function(\r\n        notificationCount\r\n      ) {\r\n        var notificationNumberSoFar = notificationCount\r\n      }"
          }
        },
        "methods": {
          "modifyVar": {
            "description": "Display a greeting message notification",
            "params": [
              {
                "name": "sName",
                "type": "string",
                "description": "The name of the user to greet"
              }
            ],
            "visibility": "public",
            "example": "      var sampleService = getService(\"sample\")\r\n\r\n      expect(sampleService.modifyVar(\"Elad\").to.equal(\"EladModifiedSample\"))"
          },
          "sayHello": {
            "description": "Display a greeting message notification",
            "params": [
              {
                "name": "sName",
                "type": "string",
                "description": "The name of the user to greet"
              }
            ],
            "visibility": "public",
            "example": "      var sampleService = getService(\"sample\")\r\n\r\n      return sampleService.sayHello(\"Elad\").then(function(notiCount) {\r\n        expect(notiCount.notificationCount).to.equal(1)\r\n      })"
          },
          "getNotificationCount": {
            "description": "Get the number of greeting notifications displayed so far",
            "returns": {
              "type": "number",
              "description": "Number of greeting notifications displayed so far"
            },
            "visibility": "public",
            "example": "      var sampleService = getService(\"sample\")\r\n\r\n      return sampleService.getNotificationCount().then(function(notiCount) {\r\n        expect(notiCount).to.equal(0)\r\n      })"
          }
        },
        "configurationProperties": {
          "notificationObject": {
            "description": "notification object to organize the count",
            "type": {
              "notificationCount": {
                "type": "number",
                "description": "it is used to configure the number notification counter will start from"
              }
            },
            "multiple": true,
            "visibility": "public",
            "example": "      var sampleService = getService(\"sample\")\r\n\r\n      return sampleService.configure({ notificationCount: 3 })"
          }
        }
      }
    },
    examples: {
      "sample": {
        "configurationProperty": {
          "notificationObject": "\r\n      var sampleService = getService(\"sample\")\r\n\r\n      return sampleService.configure({ notificationCount: 3 })"
        },
        "method": {
          "getNotificationCount": "\r\n      var sampleService = getService(\"sample\")\r\n\r\n      return sampleService.getNotificationCount().then(function(notiCount) {\r\n        expect(notiCount).to.equal(0)\r\n      })",
          "sayHello": "\r\n      var sampleService = getService(\"sample\")\r\n\r\n      return sampleService.sayHello(\"Elad\").then(function(notiCount) {\r\n        expect(notiCount.notificationCount).to.equal(1)\r\n      })",
          "modifyVar": "\r\n      var sampleService = getService(\"sample\")\r\n\r\n      expect(sampleService.modifyVar(\"Elad\").to.equal(\"EladModifiedSample\"))"
        },
        "event": {
          "notificationDisplayed": "\r\n      var sampleService = getService(\"sample\")\r\n      var mSample = {\r\n        subscribes: {\r\n          \"sample:notificationDisplayed\":\r\n            \"sampleService:myNotificationDisplayedHandler\"\r\n        }\r\n      }\r\n      sampleService.prototype.myNotificationDisplayedHandler = function(\r\n        notificationCount\r\n      ) {\r\n        var notificationNumberSoFar = notificationCount\r\n      }"
        }
      }
    }
  }

  deepFreeze(testsData);

  describe("happy path", () => {
    describe("unit tests", () => {
      it("tests conversion between metadata files to object", () => {
        const expectedInterfacesMeta = _.cloneDeep(testsData.interfacesMeta)
        const expectedServeciesMeta = _.cloneDeep(testsData.serveciesMetaData);

        const actualInterfacesAndServeriesMeta = sdk.test.getInterfacesAndServices(
          testDir
        )

        expect(actualInterfacesAndServeriesMeta.interfacesMeta).to.deep.equal(
          expectedInterfacesMeta
        )
        expect(actualInterfacesAndServeriesMeta.servicesMeta).to.deep.equal(
          expectedServeciesMeta
        )
      });

      it("tests conversion between source files to object", () => {
        const expectedApiJson = _.cloneDeep(testsData.apiJson);

        const actualApiJson = sdk.test.getApiJson(
          testDir,
          outDir,
          sourceFilesExcludePattern
        )

        expect(actualApiJson).to.deep.equal(expectedApiJson)
      });

      it("tests that the JSDoc object was built for public API", () => {
        const apijson = _.cloneDeep(testsData.apiJson);
        const expectedJSDocPublic = _.cloneDeep(testsData.jSDocPublic)

        const actualJSDocPublic = sdk.test.generateSdkJSDoc(
          [_PUBLIC, _INTERNAL],
          apijson)

        expect(actualJSDocPublic).to.deep.equal(expectedJSDocPublic)
      });

      it("tests that the JSDoc object was built for internal API", () => {
        const apijson = _.cloneDeep(testsData.apiJson);
        const expectedJSDocInternal = {
          "classes": {
            "helloUtils": {
              "kind": "class",
              "name": "helloUtils",
              "basename": "helloUtils",
              "component": "CA-WDE-FPM",
              "resource": "src/webide-plugin-example/service/helloUtils.js",
              "module": "src/webide-plugin-example/service/helloUtils",
              "visibility": "public",
              "description": "The <i>helloUtils</i> class manages functionality related to Our Example."
            }
          },
          "services": {
            "sample": {
              "kind": "class",
              "name": "sample",
              "basename": "sample",
              "isService": true,
              "component": "CA-WDE-FPM",
              "resource": "src/webide-plugin-example/service/Sample.js",
              "module": "src/webide-plugin-example/service/Sample",
              "visibility": "public",
              "description": "The <i>Sample</i> service manages functionality related to Our Example.",
              "events": {
                "notificationDisplayed": {
                  "name": "notificationDisplayed",
                  "visibility": "public",
                  "static": true,
                  "description": "Fired when the notification message was displayed",
                  "params": [
                    {
                      "name": "notificationCount",
                      "type": "integer",
                      "description": "The number of greeting notifications displayed so far."
                    }
                  ]
                }
              },
              "methods": {
                "getNotificationCount": {
                  "name": "getNotificationCount",
                  "visibility": "internal",
                  "static": true,
                  "description": "gets the notification counter",
                  "returns": {
                    "type": "Integer",
                    "description": "the notification counter"
                  }
                },
                "modifyVar": {
                  "name": "modifyVar",
                  "visibility": "public",
                  "static": true,
                  "description": "Modifies the variable 'modifyMe'",
                  "params": [
                    {
                      "name": "sName",
                      "type": "string",
                      "optional": "false",
                      "description": "A value for 'modifyMe'"
                    }
                  ],
                  "returns": {
                    "type": "string",
                    "description": "the modifyMe value"
                  }
                },
                "sayHello": {
                  "name": "sayHello",
                  "visibility": "internal",
                  "static": true,
                  "description": "Displays greeting notification and fires 'notificationDisplayed' event",
                  "params": [
                    {
                      "name": "sName",
                      "type": "string",
                      "optional": "false",
                      "description": "An appendix to the Hello"
                    }
                  ]
                }
              },
              "configurationProperties": {
                "notificationObject": {
                  "name": "notificationObject",
                  "type": "Object[]",
                  "description": "notification object to organize the count",
                  "params": [
                    {
                      "name": "notificationCount",
                      "type": "number",
                      "description": "a notification count to start the service from."
                    }
                  ],
                  "visibility": "public"
                }
              }
            }
          }
        };
        const actualJSDocInternal = sdk.test.generateSdkJSDoc(
          [_PUBLIC, _INTERNAL],
          apijson)

        expect(actualJSDocInternal).to.deep.equal(expectedJSDocInternal)
      });

      it("tests that the examples object was built", () => {
        const expectedExamples = _.cloneDeep(testsData.examples)

        const actualExamples = sdk.test.generateExamplesJson(
          testDir,
          exampleFilesIncludePattern,
          {})

        expect(actualExamples).to.deep.equal(expectedExamples)
      });

      it("tests that the Interfaces object was built for internal API", () => {
        const interfacesMeta = _.cloneDeep(testsData.interfacesMeta);
        const expectedInterfacesInternal = _.cloneDeep(testsData.interfacesInternal);
        const examples = _.cloneDeep(testsData.examples);

        const actualInterfacesInternal = sdk.test.generateSdkInterfaces(
          interfacesMeta,
          examples,
          true,
          [_PUBLIC, _INTERNAL])

        expect(actualInterfacesInternal).to.deep.equal(expectedInterfacesInternal)
      });

      it("tests that the Interfaces object was built for public API", () => {
        const interfacesMeta = _.cloneDeep(testsData.interfacesMeta);
        const expectedInterfacesPublic = {
          "sap.webide.example.plugin.service.Sample": {
            "name": "Interfaces.sap.webide.example.plugin.service.Sample",
            "basename": "sap.webide.example.plugin.service.Sample",
            "visibility": "public",
            "kind": "interface",
            "description": "The sample service interface",
            "events": {
              "notificationDisplayed": {
                "description": "the event is triggered when the notification",
                "params": [
                  {
                    "name": "notificationCount",
                    "type": "number",
                    "description": "The number of greeting notifications displayed so far"
                  }
                ],
                "visibility": "public",
                "example": "      var sampleService = getService(\"sample\")\r\n      var mSample = {\r\n        subscribes: {\r\n          \"sample:notificationDisplayed\":\r\n            \"sampleService:myNotificationDisplayedHandler\"\r\n        }\r\n      }\r\n      sampleService.prototype.myNotificationDisplayedHandler = function(\r\n        notificationCount\r\n      ) {\r\n        var notificationNumberSoFar = notificationCount\r\n      }"
              }
            },
            "methods": {
              "modifyVar": {
                "description": "Display a greeting message notification",
                "params": [
                  {
                    "name": "sName",
                    "type": "string",
                    "description": "The name of the user to greet"
                  }
                ],
                "visibility": "public",
                "example": "      var sampleService = getService(\"sample\")\r\n\r\n      expect(sampleService.modifyVar(\"Elad\").to.equal(\"EladModifiedSample\"))"
              },
              "sayHello": {
                "description": "Display a greeting message notification",
                "params": [
                  {
                    "name": "sName",
                    "type": "string",
                    "description": "The name of the user to greet"
                  }
                ],
                "visibility": "public",
                "example": "      var sampleService = getService(\"sample\")\r\n\r\n      return sampleService.sayHello(\"Elad\").then(function(notiCount) {\r\n        expect(notiCount.notificationCount).to.equal(1)\r\n      })"
              },
              "getNotificationCount": {
                "description": "Get the number of greeting notifications displayed so far",
                "returns": {
                  "type": "number",
                  "description": "Number of greeting notifications displayed so far"
                },
                "visibility": "public",
                "example": "      var sampleService = getService(\"sample\")\r\n\r\n      return sampleService.getNotificationCount().then(function(notiCount) {\r\n        expect(notiCount).to.equal(0)\r\n      })"
              }
            },
            "configurationProperties": {
              "notificationObject": {
                "description": "notification object to organize the count",
                "type": {
                  "notificationCount": {
                    "type": "number",
                    "description": "it is used to configure the number notification counter will start from"
                  }
                },
                "multiple": true,
                "visibility": "public",
                "example": "      var sampleService = getService(\"sample\")\r\n\r\n      return sampleService.configure({ notificationCount: 3 })"
              }
            }
          }
        };
        const examples = _.cloneDeep(testsData.examples);

        const actualInterfacesPublic = sdk.test.generateSdkInterfaces(
          interfacesMeta,
          examples,
          true,
          [_PUBLIC])

        expect(actualInterfacesPublic).to.deep.equal(expectedInterfacesPublic)
      });

      it("tests that only public and internal modifiers are filtered", () => {
        const interfacesMeta = _.cloneDeep(testsData.interfacesMeta);
        interfacesMeta["sap.webide.example.plugin.service.Sample"].methods.sayHello.visibility = "internal";
        interfacesMeta["sap.webide.example.plugin.service.Sample"].methods.getNotificationCount.visibility = "private";
        const expectedFilterObjectPublic = {
          modifyVar: interfacesMeta["sap.webide.example.plugin.service.Sample"].methods.modifyVar
        }
        const expectedFilterObjectInternal = {
          modifyVar: interfacesMeta["sap.webide.example.plugin.service.Sample"].methods.modifyVar,
          sayHello: interfacesMeta["sap.webide.example.plugin.service.Sample"].methods.sayHello
        }

        const actualFiltredObjectsPublic = sdk.test.filterPropertiesByVisibility(interfacesMeta["sap.webide.example.plugin.service.Sample"].methods, [_PUBLIC]);
        const actualFiltredObjectsInternal = sdk.test.filterPropertiesByVisibility(interfacesMeta["sap.webide.example.plugin.service.Sample"].methods, [_PUBLIC, _INTERNAL]);

        expect(actualFiltredObjectsPublic).to.deep.equal(expectedFilterObjectPublic);
        expect(actualFiltredObjectsInternal).to.deep.equal(expectedFilterObjectInternal);
      });
    });

    describe("end to end", () => {
      it("tests the whole scenerio for internal and public API", () => {
        const servicesMetadata = _.cloneDeep(testsData.serveciesMetaData)
        const interfacesMeta = _.cloneDeep(testsData.interfacesMeta);
        const apijson = _.cloneDeep(testsData.apiJson);
        const expectedPublicWebIdeJson = {
          "Interfaces": {
            "sap.webide.example.plugin.service.Sample": {
              "name": "Interfaces.sap.webide.example.plugin.service.Sample",
              "basename": "sap.webide.example.plugin.service.Sample",
              "visibility": "public",
              "kind": "interface",
              "description": "The sample service interface",
              "events": {
                "notificationDisplayed": {
                  "description": "the event is triggered when the notification",
                  "params": [
                    {
                      "name": "notificationCount",
                      "type": "number",
                      "description": "The number of greeting notifications displayed so far"
                    }
                  ],
                  "visibility": "public",
                  "example": "      var sampleService = getService(\"sample\")\r\n      var mSample = {\r\n        subscribes: {\r\n          \"sample:notificationDisplayed\":\r\n            \"sampleService:myNotificationDisplayedHandler\"\r\n        }\r\n      }\r\n      sampleService.prototype.myNotificationDisplayedHandler = function(\r\n        notificationCount\r\n      ) {\r\n        var notificationNumberSoFar = notificationCount\r\n      }"
                }
              },
              "methods": {
                "modifyVar": {
                  "description": "Display a greeting message notification",
                  "params": [
                    {
                      "name": "sName",
                      "type": "string",
                      "description": "The name of the user to greet"
                    }
                  ],
                  "visibility": "public",
                  "example": "      var sampleService = getService(\"sample\")\r\n\r\n      expect(sampleService.modifyVar(\"Elad\").to.equal(\"EladModifiedSample\"))"
                },
                "sayHello": {
                  "description": "Display a greeting message notification",
                  "params": [
                    {
                      "name": "sName",
                      "type": "string",
                      "description": "The name of the user to greet"
                    }
                  ],
                  "visibility": "public",
                  "example": "      var sampleService = getService(\"sample\")\r\n\r\n      return sampleService.sayHello(\"Elad\").then(function(notiCount) {\r\n        expect(notiCount.notificationCount).to.equal(1)\r\n      })"
                },
                "getNotificationCount": {
                  "description": "Get the number of greeting notifications displayed so far",
                  "returns": {
                    "type": "number",
                    "description": "Number of greeting notifications displayed so far"
                  },
                  "visibility": "public",
                  "example": "      var sampleService = getService(\"sample\")\r\n\r\n      return sampleService.getNotificationCount().then(function(notiCount) {\r\n        expect(notiCount).to.equal(0)\r\n      })"
                }
              },
              "configurationProperties": {
                "notificationObject": {
                  "description": "notification object to organize the count",
                  "type": {
                    "notificationCount": {
                      "type": "number",
                      "description": "it is used to configure the number notification counter will start from"
                    }
                  },
                  "multiple": true,
                  "visibility": "public",
                  "example": "      var sampleService = getService(\"sample\")\r\n\r\n      return sampleService.configure({ notificationCount: 3 })"
                }
              }
            }
          },
          "Services": {
            "sample": {
              "name": "Services.sample",
              "basename": "sample",
              "visibility": "public",
              "kind": "service",
              "description": "The <i>Sample</i> service manages functionality related to Our Example.",
              "events": {
                "notificationDisplayed": {
                  "name": "notificationDisplayed",
                  "visibility": "public",
                  "static": true,
                  "description": "Fired when the notification message was displayed",
                  "params": [
                    {
                      "name": "notificationCount",
                      "type": "integer",
                      "description": "The number of greeting notifications displayed so far."
                    }
                  ],
                  "example": "      var sampleService = getService(\"sample\")\r\n      var mSample = {\r\n        subscribes: {\r\n          \"sample:notificationDisplayed\":\r\n            \"sampleService:myNotificationDisplayedHandler\"\r\n        }\r\n      }\r\n      sampleService.prototype.myNotificationDisplayedHandler = function(\r\n        notificationCount\r\n      ) {\r\n        var notificationNumberSoFar = notificationCount\r\n      }"
                }
              },
              "methods": {
                "modifyVar": {
                  "name": "modifyVar",
                  "visibility": "public",
                  "static": true,
                  "description": "Modifies the variable 'modifyMe'",
                  "params": [
                    {
                      "name": "sName",
                      "type": "string",
                      "optional": "false",
                      "description": "A value for 'modifyMe'"
                    }
                  ],
                  "returns": {
                    "type": "string",
                    "description": "the modifyMe value"
                  },
                  "example": "      var sampleService = getService(\"sample\")\r\n\r\n      expect(sampleService.modifyVar(\"Elad\").to.equal(\"EladModifiedSample\"))"
                }
              },
              "configurationProperties": {
                "notificationObject": {
                  "name": "notificationObject",
                  "type": "Object[]",
                  "description": "notification object to organize the count",
                  "params": [
                    {
                      "name": "notificationCount",
                      "type": "number",
                      "description": "a notification count to start the service from."
                    }
                  ],
                  "visibility": "public",
                  "example": "      var sampleService = getService(\"sample\")\r\n\r\n      return sampleService.configure({ notificationCount: 3 })"
                }
              }
            }
          },
          "Classes": {
            "helloUtils": {
              "name": "Classes.helloUtils",
              "basename": "helloUtils",
              "visibility": "public",
              "kind": "class",
              "description": "The <i>helloUtils</i> class manages functionality related to Our Example.",
              "events": {},
              "methods": {}
            }
          }
        };
        const expectedInternalWebIdeJson = {
          "Interfaces": {
            "sap.webide.example.plugin.service.Sample": {
              "name": "Interfaces.sap.webide.example.plugin.service.Sample",
              "basename": "sap.webide.example.plugin.service.Sample",
              "visibility": "public",
              "kind": "interface",
              "description": "The sample service interface",
              "component": "CA-WDE-FPM",
              "events": {
                "notificationDisplayed": {
                  "description": "the event is triggered when the notification",
                  "params": [
                    {
                      "name": "notificationCount",
                      "type": "number",
                      "description": "The number of greeting notifications displayed so far"
                    }
                  ],
                  "visibility": "public",
                  "example": "      var sampleService = getService(\"sample\")\r\n      var mSample = {\r\n        subscribes: {\r\n          \"sample:notificationDisplayed\":\r\n            \"sampleService:myNotificationDisplayedHandler\"\r\n        }\r\n      }\r\n      sampleService.prototype.myNotificationDisplayedHandler = function(\r\n        notificationCount\r\n      ) {\r\n        var notificationNumberSoFar = notificationCount\r\n      }"
                }
              },
              "methods": {
                "modifyVar": {
                  "description": "Display a greeting message notification",
                  "params": [
                    {
                      "name": "sName",
                      "type": "string",
                      "description": "The name of the user to greet"
                    }
                  ],
                  "visibility": "public",
                  "example": "      var sampleService = getService(\"sample\")\r\n\r\n      expect(sampleService.modifyVar(\"Elad\").to.equal(\"EladModifiedSample\"))"
                },
                "sayHello": {
                  "description": "Display a greeting message notification",
                  "params": [
                    {
                      "name": "sName",
                      "type": "string",
                      "description": "The name of the user to greet"
                    }
                  ],
                  "visibility": "public",
                  "example": "      var sampleService = getService(\"sample\")\r\n\r\n      return sampleService.sayHello(\"Elad\").then(function(notiCount) {\r\n        expect(notiCount.notificationCount).to.equal(1)\r\n      })"
                },
                "getNotificationCount": {
                  "description": "Get the number of greeting notifications displayed so far",
                  "returns": {
                    "type": "number",
                    "description": "Number of greeting notifications displayed so far"
                  },
                  "visibility": "public",
                  "example": "      var sampleService = getService(\"sample\")\r\n\r\n      return sampleService.getNotificationCount().then(function(notiCount) {\r\n        expect(notiCount).to.equal(0)\r\n      })"
                }
              },
              "configurationProperties": {
                "notificationObject": {
                  "description": "notification object to organize the count",
                  "type": {
                    "notificationCount": {
                      "type": "number",
                      "description": "it is used to configure the number notification counter will start from"
                    }
                  },
                  "multiple": true,
                  "visibility": "public",
                  "example": "      var sampleService = getService(\"sample\")\r\n\r\n      return sampleService.configure({ notificationCount: 3 })"
                }
              }
            }
          },
          "Services": {
            "sample": {
              "name": "Services.sample",
              "basename": "sample",
              "visibility": "public",
              "kind": "service",
              "description": "The <i>Sample</i> service manages functionality related to Our Example.",
              "component": "CA-WDE-FPM",
              "events": {
                "notificationDisplayed": {
                  "name": "notificationDisplayed",
                  "visibility": "public",
                  "static": true,
                  "description": "Fired when the notification message was displayed",
                  "params": [
                    {
                      "name": "notificationCount",
                      "type": "integer",
                      "description": "The number of greeting notifications displayed so far."
                    }
                  ],
                  "example": "      var sampleService = getService(\"sample\")\r\n      var mSample = {\r\n        subscribes: {\r\n          \"sample:notificationDisplayed\":\r\n            \"sampleService:myNotificationDisplayedHandler\"\r\n        }\r\n      }\r\n      sampleService.prototype.myNotificationDisplayedHandler = function(\r\n        notificationCount\r\n      ) {\r\n        var notificationNumberSoFar = notificationCount\r\n      }"
                }
              },
              "methods": {
                "getNotificationCount": {
                  "name": "getNotificationCount",
                  "visibility": "internal",
                  "static": true,
                  "description": "gets the notification counter",
                  "returns": {
                    "type": "Integer",
                    "description": "the notification counter"
                  },
                  "example": "      var sampleService = getService(\"sample\")\r\n\r\n      return sampleService.getNotificationCount().then(function(notiCount) {\r\n        expect(notiCount).to.equal(0)\r\n      })"
                },
                "modifyVar": {
                  "name": "modifyVar",
                  "visibility": "public",
                  "static": true,
                  "description": "Modifies the variable 'modifyMe'",
                  "params": [
                    {
                      "name": "sName",
                      "type": "string",
                      "optional": "false",
                      "description": "A value for 'modifyMe'"
                    }
                  ],
                  "returns": {
                    "type": "string",
                    "description": "the modifyMe value"
                  },
                  "example": "      var sampleService = getService(\"sample\")\r\n\r\n      expect(sampleService.modifyVar(\"Elad\").to.equal(\"EladModifiedSample\"))"
                },
                "sayHello": {
                  "name": "sayHello",
                  "visibility": "internal",
                  "static": true,
                  "description": "Displays greeting notification and fires 'notificationDisplayed' event",
                  "params": [
                    {
                      "name": "sName",
                      "type": "string",
                      "optional": "false",
                      "description": "An appendix to the Hello"
                    }
                  ],
                  "example": "      var sampleService = getService(\"sample\")\r\n\r\n      return sampleService.sayHello(\"Elad\").then(function(notiCount) {\r\n        expect(notiCount.notificationCount).to.equal(1)\r\n      })"
                }
              },
              "configurationProperties": {
                "notificationObject": {
                  "name": "notificationObject",
                  "type": "Object[]",
                  "description": "notification object to organize the count",
                  "params": [
                    {
                      "name": "notificationCount",
                      "type": "number",
                      "description": "a notification count to start the service from."
                    }
                  ],
                  "visibility": "public",
                  "example": "      var sampleService = getService(\"sample\")\r\n\r\n      return sampleService.configure({ notificationCount: 3 })"
                }
              }
            }
          },
          "Classes": {
            "helloUtils": {
              "name": "Classes.helloUtils",
              "basename": "helloUtils",
              "visibility": "public",
              "kind": "class",
              "description": "The <i>helloUtils</i> class manages functionality related to Our Example.",
              "component": "CA-WDE-FPM",
              "events": {},
              "methods": {}
            }
          }
        };

        const publicAndInternalWebIdeJsonObject = sdk.test.generateSdkDocumentationObjects(
          servicesMetadata,
          interfacesMeta,
          apijson,
          testDir,
          exampleFilesIncludePattern
        )

        expect(publicAndInternalWebIdeJsonObject.publicWebIdeJson).to.deep.equal(
          expectedPublicWebIdeJson
        )
        expect(publicAndInternalWebIdeJsonObject.internalWebIdeJson).to.deep.equal(
          expectedInternalWebIdeJson
        )
      });

      describe("Whole scenerion using files", () => {
        beforeEach(() => {
          eraseFilesFromSystem(outDir)
        });

        it("tests the generating of sdk from source files and example files to output files", () => {
          const generateSdkDocumentation = () =>
            sdk.generateSdkDocumentation(testDir, {
              outDir: outDir,
              sourcesExcludePattern: sourceFilesExcludePattern,
              examplesIncludePattern: exampleFilesIncludePattern
            });

          expect(generateSdkDocumentation).to.not.throw();

          const actualJsonFiles = readFiles(
            outDir
          )
          const expectedJsonFiles = readFiles(
            expectedFinalJsonFilesDir
          )

          expect(actualJsonFiles.internalJson).to.deep.equal(
            expectedJsonFiles.internalJson
          );
          expect(actualJsonFiles.publicJson).to.deep.equal(
            expectedJsonFiles.publicJson
          );
        });

        it("tests the generating of sdk from source files and example files to output files with non strict mode", () => {
          const generateSdkDocumentation = () =>
            sdk.generateSdkDocumentation(testDir, {
              outDir: outDir,
              sourcesExcludePattern: sourceFilesExcludePattern,
              examplesIncludePattern: exampleFilesIncludePattern,
              strictMode: false
            });

          expect(generateSdkDocumentation).to.not.throw();

          const actualJsonFiles = readFiles(
            outDir
          )
          const expectedJsonFiles = readFiles(
            expectedFinalJsonFilesDir
          )

          expect(actualJsonFiles.internalJson).to.deep.equal(
            expectedJsonFiles.internalJson
          );
          expect(actualJsonFiles.publicJson).to.deep.equal(
            expectedJsonFiles.publicJson
          );
        });
      });
    });
  });

  describe("restrictions on source, example and metadata files", () => {
    describe("source and example files i/o issues", () => {
      it("throws an error when there are no source files or path doesn't exist", () => {
        const getApiJsonFunction = () =>
          sdk.test.getApiJson(
            path.resolve(__dirname, testDir + "/src/webide-plugin-example/i18n/fake"),
            outDir,
            sourceFilesExcludePattern
          )

        expect(getApiJsonFunction).to.throw(
          "ERROR: Unable to find the source file or directory"
        )
      });

      it("throws an error when there are no example files or path doesn't exist", () => {
        const actualExamples = () => sdk.test.generateExamplesJson(
          path.resolve(__dirname, testDir + "/fake"),
          exampleFilesIncludePattern,
          {})

        expect(actualExamples).to.throw("Error: The path given to the Examples files: " + path.resolve(__dirname, testDir + "/fake does not exists"))
      })

      it("throws an error when the example files don't contain examples", () => {
        const actualExamples = () => sdk.test.generateExamplesJson(
          path.resolve(__dirname, testDir + "/test/emptytest"),
          exampleFilesIncludePattern,
          {})

        expect(actualExamples).to.throw("Error: No examples were found in the path: " + path.resolve(__dirname, testDir + "/test/emptytest"))
      })

      describe("log warnings", () => {
        let consoleWarnSpy
        beforeEach(() => {
          consoleWarnSpy = sinon.spy(console, "warn");
        });

        it("logs a warn message when the api.json and symbols-pruned-ui5.json (temp files) don't exist", () => {
          const fakeOutDir = path.resolve(__dirname, "resources/testfeature/dist/fake");
          const fakeAPIPath = path.resolve(__dirname, fakeOutDir + "/api.json");
          const fakeSymbolsPath = path.resolve(__dirname, fakeOutDir + "/symbols-pruned-ui5.json");
          const eraseFilesFromSystem = ()=> sdk.test.eraseFilesFromSystem(
            fakeOutDir
          )

          expect(eraseFilesFromSystem).to.not.throw();
          expect(console.warn).to.have.been.called
          expect(consoleWarnSpy.args[0][0]).to.equal("temp SDK file: " + fakeAPIPath + " was NOT deleted\n\tENOENT: no such file or directory, unlink \'" + fakeAPIPath +"\'");
          expect(consoleWarnSpy.args[1][0]).to.equal("temp SDK file: " + fakeSymbolsPath + " was NOT deleted\n\tENOENT: no such file or directory, unlink \'" + fakeSymbolsPath + "\'");
        });

        afterEach(() => {
          console.warn.restore();
        });
      });
    });

    describe("restrictions on source, example and metadata files format", () => {
      it("throws an error when the source files have a service and a class with the same name", () => {
        const apijson = _.cloneDeep(testsData.apiJson);
        apijson.symbols[0].name = "sample"

        const actualJSDocInternal = () => sdk.test.generateSdkJSDoc(
          [_PUBLIC, _INTERNAL],
          apijson)

        expect(actualJSDocInternal).to.throw("Service and class with the same name exist, this could lead to inconsistencies in SDK navigation and in the service and class examples: sample")
      });

      it("throws an error when a metadata object has a public method that is not included in the example files", () => {
        const interfacesMeta = _.cloneDeep(testsData.interfacesMeta);

        const actualInterfacesPublic = () => sdk.test.generateSdkInterfaces(
          interfacesMeta,
          {},
          true,
          [_PUBLIC])

        expect(actualInterfacesPublic).to.throw("events: Interfaces.sap.webide.example.plugin.service.Sample.notificationDisplayed is public and does not have an example")
      });

      it("throws an error when a metadata object has a method with a return type of string", () => {
        const interfacesMeta = _.cloneDeep(testsData.interfacesMeta);
        interfacesMeta["sap.webide.example.plugin.service.Sample"].methods.getNotificationCount.returns = 'string';

        const actualInterfacesPublic = () => sdk.test.generateSdkInterfaces(
          interfacesMeta,
          {},
          true,
          [_PUBLIC])

        expect(actualInterfacesPublic).to.throw("'returns' must be an object and not a string. Interfaces.sap.webide.example.plugin.service.Sample -> getNotificationCount")
      });

      it("throws an error when a metadata object has no description", () => {
        const interfacesMeta = _.cloneDeep(testsData.interfacesMeta);
        interfacesMeta["sap.webide.example.plugin.service.Sample"].description = undefined;

        const actualInterfacesPublic = () => sdk.test.generateSdkInterfaces(
          interfacesMeta,
          {},
          true,
          [_PUBLIC])

        expect(actualInterfacesPublic).to.throw("interface sap.webide.example.plugin.service.Sample is missing a description")
      });

      it("throws an error when a metadata object has a method with an example but no description", () => {
        const interfacesMeta = _.cloneDeep(testsData.interfacesMeta);
        interfacesMeta["sap.webide.example.plugin.service.Sample"].methods.getNotificationCount.description = undefined;
        const examples = _.cloneDeep(testsData.examples);

        const actualInterfacesInternal = () => sdk.test.generateSdkInterfaces(
          interfacesMeta,
          examples,
          true,
          [_PUBLIC, _INTERNAL])

        expect(actualInterfacesInternal).to.throw("method getNotificationCount from interface sap.webide.example.plugin.service.Sample is missing a description")
      });

      it("throws an error when a metadata public object has no component", () => {
        const interfacesMeta = _.cloneDeep(testsData.interfacesMeta);
        interfacesMeta["sap.webide.example.plugin.service.Sample"].component = undefined;

        const actualInterfacesPublic = () => sdk.test.generateSdkInterfaces(
          interfacesMeta,
          {},
          true,
          [_PUBLIC, _INTERNAL])

        expect(actualInterfacesPublic).to.throw("interface sap.webide.example.plugin.service.Sample does not have a component defined")
      });

      it("throws an error when a public service doesn't have an example", () => {
        const servicesMetadata = _.cloneDeep(testsData.serveciesMetaData);
        const jSDocPublic = _.cloneDeep(testsData.jSDocPublic);

        const actualServiciesPublic = () => sdk.test.generateSdkServices(
          servicesMetadata,
          jSDocPublic.services,
          {},
          [_PUBLIC])

        expect(actualServiciesPublic).to.throw("Public service sample is missing an example")
      });

      it("throws an error when a metadata object has a an example, with type not allowed by object", () => {
        const interfacesMeta = _.cloneDeep(testsData.interfacesMeta);
        const examples = _.cloneDeep(testsData.examples);
        examples.sample.fakeAttribute = {}
        examples.sample.fakeAttribute.getNotificationCount = "fake example"

        const actualInterfacesPublic = () => sdk.test.generateSdkInterfaces(
          interfacesMeta,
          examples,
          true,
          [_PUBLIC, _INTERNAL])

        expect(actualInterfacesPublic).to.throw("Examples with type: fakeAttribute, are not allowed for: Interfaces.sap.webide.example.plugin.service.Sample")
      });

      it("throws an error when a service or class file has @example tag in it", () => {
        const apijson = _.cloneDeep(testsData.apiJson);
        apijson.symbols[1].methods[1].examples = {
          text: "example1"
        }

        const actualJSDocInternal = () => sdk.test.generateSdkJSDoc(
          [_PUBLIC, _INTERNAL],
          apijson,
          true
        );

        expect(actualJSDocInternal).to.throw("Error: @example is not allowed, found in: Service.sample.methods.getNotificationCount");
      });

      describe("non strict mode console log errors", () => {
        let consoleErrorSpy
        beforeEach(() => {
          consoleErrorSpy = sinon.spy(console, "error");
        });

        it("logs an error message when in non strict mode and a metadata class object has a public method without an example", () => {
          const jSDocPublic = _.cloneDeep(testsData.jSDocPublic);
          jSDocPublic.classes["helloUtils"].methods = {
            "method1": {
              "description": "Display a greeting message notification",
              "params": [
                {
                  "name": "sName",
                  "type": "string",
                  "description": "The name of the user to greet"
                }
              ],
              "visibility": "public",
              "examples": [
                {
                  "text": "example1;"
                }
              ]
            },
            "method2": {
              "description": "Display a greeting message notification",
              "params": [
                {
                  "name": "sName",
                  "type": "string",
                  "description": "The name of the user to greet"
                }
              ],
              "visibility": "public",
              "examples": [
                {
                  "text": "example2;"
                }
              ]
            },
            "method3": {
              "description": "Get the number of greeting notifications displayed so far",
              "returns": {
                "type": "number",
                "description": "Number of greeting notifications displayed so far"
              },
              "visibility": "public"
            }
          }
          const expectedClassPublic = {
            "helloUtils": {
              "name": "Classes.helloUtils",
              "basename": "helloUtils",
              "visibility": "public",
              "kind": "class",
              "description": "The <i>helloUtils</i> class manages functionality related to Our Example.",
              "events": {},
              "methods": {
                "method1": {
                  "description": "Display a greeting message notification",
                  "params": [
                    {
                      "name": "sName",
                      "type": "string",
                      "description": "The name of the user to greet"
                    }
                  ],
                  "visibility": "public",
                  "examples": [
                    {
                      "text": "example1;"
                    }
                  ],
                  "example": "example1;"
                },
                "method2": {
                  "description": "Display a greeting message notification",
                  "params": [
                    {
                      "name": "sName",
                      "type": "string",
                      "description": "The name of the user to greet"
                    }
                  ],
                  "visibility": "public",
                  "examples": [
                    {
                      "text": "example2;"
                    }
                  ],
                  "example": "example2;"
                },
                "method3": {
                  "description": "Get the number of greeting notifications displayed so far",
                  "returns": {
                    "type": "number",
                    "description": "Number of greeting notifications displayed so far"
                  },
                  "visibility": "public"
                }
              }
            }
          }

          const actualClassPublic = sdk.test.generateSdkClasses(
            jSDocPublic.classes,
            {},
            false,
            [_PUBLIC])

          expect(actualClassPublic).to.deep.equal(expectedClassPublic);
          expect(console.error).to.have.been.called
          expect(consoleErrorSpy.args[0][0]).to.equal("Taking example for Classes.helloUtils.method1 from jsdoc. Note: this will soon be removed. Please move the example to a test file.");
          expect(consoleErrorSpy.args[1][0]).to.equal("Taking example for Classes.helloUtils.method2 from jsdoc. Note: this will soon be removed. Please move the example to a test file.");
        });

        it("logs an error message when in non strict mode and a metadata public object doesn't have a component", () => {
          const interfacesMeta = _.cloneDeep(testsData.interfacesMeta);
          interfacesMeta["sap.webide.example.plugin.service.Sample"].component = undefined;
          const expectedInterfacesInternal = _.cloneDeep(testsData.interfacesInternal);
          expectedInterfacesInternal["sap.webide.example.plugin.service.Sample"].component = undefined;
          const examples = _.cloneDeep(testsData.examples);

          const actualInterfacesInternal = sdk.test.generateSdkInterfaces(
            interfacesMeta,
            examples,
            false,
            [_PUBLIC, _INTERNAL])

          expect(actualInterfacesInternal).to.deep.equal(expectedInterfacesInternal);
          expect(console.error).to.have.been.called
          expect(consoleErrorSpy.args[0][0]).to.equal("interface sap.webide.example.plugin.service.Sample does not have a component defined")
        });

        it("logs an error message when in non strict mode and a metadata object has a method with an example but no description", () => {
          const interfacesMeta = _.cloneDeep(testsData.interfacesMeta);
          interfacesMeta["sap.webide.example.plugin.service.Sample"].methods.getNotificationCount.description = undefined;
          const expectedInterfacesInternal = _.cloneDeep(testsData.interfacesInternal);
          expectedInterfacesInternal["sap.webide.example.plugin.service.Sample"].methods.getNotificationCount.description = undefined;
          const examples = _.cloneDeep(testsData.examples);

          const actualInterfacesInternal = sdk.test.generateSdkInterfaces(
            interfacesMeta,
            examples,
            false,
            [_PUBLIC, _INTERNAL]);

          expect(actualInterfacesInternal).to.deep.equal(expectedInterfacesInternal);
          expect(console.error).to.have.been.called;
          expect(consoleErrorSpy.args[0][0]).to.equal("method getNotificationCount from interface sap.webide.example.plugin.service.Sample is missing a description")
        });

        afterEach(() => {
          console.error.restore();
        });
      });
    });
  });
});


