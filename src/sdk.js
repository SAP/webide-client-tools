"use strict"

const metadataReader = require("./utils/meta_data_reader")
const _ = require("lodash")
const fs = require("fs")
const path = require("path")

const _PUBLIC = "public"
const _INTERNAL = "internal"
const _SERVICES_APIS = {
  events: "event",
  methods: "method",
  configurationProperties: "configurationProperty"
}
const _INTERFACES_APIS = {
  events: "event",
  methods: "method",
  configurationProperties: "configurationProperty"
}
const _CLASSES_APIS = { events: "event", methods: "method" }
const _TYPE_AGGREGATIONS = {
  class: "Classes",
  interface: "Interfaces",
  service: "Services"
}

const _REGEXP = /\/\/\s*EXAMPLE_START:([\w.]+):(\w+):(\w+)$([\s\S]*?)\s*\/\/\s*EXAMPLE_END\s*$/gm
const internalJsonFileName = "internal_sdk_api.json";
const publicJsonFileName = "public_sdk_api.json"


function filterPropertiesByVisibility(oProperties, aVisibility) {
  if (oProperties) {
    return _.reduce(
      oProperties,
      function(result, value, key) {
        if (aVisibility.indexOf(value.visibility) !== -1) {
          result[key] = value
        }
        return result
      },
      {}
    )
  }
}

function generateExamples(sTestFileContent, oResultJson) {
  let aExampleBlockMatches = _REGEXP.exec(sTestFileContent)
  while (aExampleBlockMatches) {
    const sServiceName = aExampleBlockMatches[1]
    const sServiceTypeName = aExampleBlockMatches[2]
    const sServiceApiName = aExampleBlockMatches[3]
    const sExample = aExampleBlockMatches[4]

    oResultJson[sServiceName] = oResultJson[sServiceName] || {}
    oResultJson[sServiceName][sServiceTypeName] =
      oResultJson[sServiceName][sServiceTypeName] || {}
    let sExampleValue =
      oResultJson[sServiceName][sServiceTypeName][sServiceApiName] || ""
    sExampleValue = sExampleValue.concat(sExample)
    oResultJson[sServiceName][sServiceTypeName][sServiceApiName] = sExampleValue

    aExampleBlockMatches = _REGEXP.exec(sTestFileContent)
  }
}

function generateExamplesJsonRec(sPath, oExampleFileRegex, oResultJson) {
  if (fs.existsSync(sPath)) {
    fs.readdirSync(sPath).forEach(function(file) {
      const curPath = path.resolve(__dirname, sPath + "/" + file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // folder
        generateExamplesJsonRec(curPath, oExampleFileRegex, oResultJson)
      } else if (oExampleFileRegex.test(curPath)) {
        // test file and examples for tests
        const sTestFileContent = fs.readFileSync(curPath, "utf8")
        generateExamples(sTestFileContent, oResultJson)
      }
    })
  } else {
    throw new Error(
      "Error: The path given to the Examples files: " + sPath + " does not exists"
    )
  }

  return oResultJson
}

function generateExamplesJson(sPath, oExampleFileRegex, oResultJson) {
  // run recursion function
  const oExamplesJson = generateExamplesJsonRec(sPath, oExampleFileRegex, oResultJson);

  // check if examples were given
  if (_.isEmpty(oExamplesJson)) {
    throw new Error(
      "Error: No examples were found in the path: " + path.resolve(__dirname, sPath + "/test")
    )
  }

  return oExamplesJson
}

function addExamplesFromJsDoc(oSdkAPI, oExampleForType, sApiName, oSdkAPIName) {
  if(oSdkAPI.examples && oSdkAPI.examples[0] && !oExampleForType[sApiName]) {
    console.error(
      "Taking example for " +
      oSdkAPIName +
      "." +
      sApiName +
      " from jsdoc. Note: this will soon be removed. Please move the example to a test file."
    )
    oExampleForType[sApiName] = oSdkAPI.examples[0].text
  }
}

function addExamples(
  oSDK,
  oExamples,
  sApiType,
  sExampleType,
  strictMode
) {
  const oSdkTypeAPIs = oSDK && oSDK[sApiType]
  const oSdkAPIName = oSDK.name;
  if (oSdkTypeAPIs) {
    const oExampleForType = (oExamples && oExamples[sExampleType]) || {}
    _.forEach(oSdkTypeAPIs, function(oSdkAPI, sApiName) {
      // Allow examples from jsDoc only in non strict mode
      if (!strictMode) {
        addExamplesFromJsDoc(oSdkAPI, oExampleForType, sApiName, oSdkAPIName);
      }
      const oExample = oExampleForType[sApiName]
      if (oExample) {
        oSdkAPI.example = trimExample(oExample)
      } else if (oSdkAPI.visibility === _PUBLIC) {
        if (strictMode) {
          throw new Error(
            sApiType +
            ": " +
            oSDK.name +
            "." +
            sApiName +
            " is public and does not have an example"
          );
        } else {
          console.error(
            sApiType +
            ": " +
            oSDK.name +
            "." +
            sApiName +
            " is public and does not have an example"
          );
        }
      }
    })
  }
}

function trimExample(sString) {
  // Remove all empty lines at the beginning and all whitespace at the end.
  // We keep the whitespace at the beginning of the first non-empty line so the example will look paginated.
  return sString.replace(/^\s*\n+|\s+$/g, "")
}

function generateApiJson(
  sType,
  sApiName,
  oApiMeta,
  aVisibility,
  oAPIExample,
  mApiTypeToExampleType,
  strictMode
) {
  const oSdkApi = {}

  oSdkApi.name = _TYPE_AGGREGATIONS[sType] + "." + sApiName
  oSdkApi.basename = sApiName
  oSdkApi.visibility = oApiMeta.visibility
  oSdkApi.kind = sType

  // Validate that 'returns' isn't a string (for public/internal methods)
  if (oApiMeta.methods) {
    _.forEach(oApiMeta.methods, function(oMethod, sMethodName) {
      if (
        typeof oMethod.returns === "string" &&
        _.includes(aVisibility, oMethod.visibility)
      ) {
        throw new Error(
          "'returns' must be an object and not a string. " +
            oSdkApi.name +
            " -> " +
            sMethodName
        )
      }
    })
  }

  // Validate that the api has description
  if (!oApiMeta.description || !oApiMeta.description.trim()) {
    throw new Error(sType + " " + sApiName + " is missing a description")
  }
  oSdkApi.description = oApiMeta.description

  // Validate that if the API is interanl it has a component
  if (aVisibility.indexOf(_INTERNAL) !== -1) {
    if (!oApiMeta.component) {
      if (strictMode) {
        throw new Error(
          sType + " " + sApiName + " does not have a component defined"
        )
      } else {
        console.error(sType + " " + sApiName + " does not have a component defined");
      }
    }
    oSdkApi.component = oApiMeta.component
  }

  // Validate mApiTypeToExampleType [events, methods, configurationProperties] fields
  _.forEach(mApiTypeToExampleType, function(sExampleType, sApiType) {
    oSdkApi[sApiType] = _.defaults(
      oSdkApi[sApiType] || {},
      filterPropertiesByVisibility(oApiMeta[sApiType], aVisibility)
    )

    // Validate that if mApiTypeToExampleType fields are public and they have an example
    // If so add them to oSdkApi.example
    addExamples(
      oSdkApi,
      oAPIExample,
      sApiType,
      sExampleType,
      strictMode
    )
    // Validate that all mApiTypeToExampleType fields have a description
    _.forEach(oSdkApi[sApiType], function(oSdkAPI, sApiTypeName) {
      if (!oSdkAPI.description || !oSdkAPI.description.trim()) {
        if (strictMode) {
          throw new Error(
            sExampleType +
            " " +
            sApiTypeName +
            " from " +
            sType +
            " " +
            sApiName +
            " is missing a description"
          );
        } else {
          console.error(
            sExampleType +
            " " +
            sApiTypeName +
            " from " +
            sType +
            " " +
            sApiName +
            " is missing a description"
          );
        }
      }
    })
  })

  // Validate that examples type is a valid one
  if (oAPIExample) {
    const aBadExampleTypes = _.difference(
      _.keys(oAPIExample),
      _.values(mApiTypeToExampleType)
    )
    if (aBadExampleTypes && aBadExampleTypes.length > 0) {
      throw new Error(
        "Examples with type: " + aBadExampleTypes + ", are not allowed for: " +
          oSdkApi.name
      )
    }
  }

  return oSdkApi
}

function arrayToMap(array) {
  return _.keyBy(array, function(o) {
    return o.name
  })
}

function generateSdkServices(
  oAllServicesMeta,
  oJSDocServices,
  oExamplesJson,
  strictMode,
  aVisibility
) {
  const oServicesJson = {}
  // Leave only existing services
  oJSDocServices = arrayToMap(
    _.filter(oJSDocServices, function(oJSDocService) {
      return !!oAllServicesMeta[oJSDocService.name]
    })
  )

  _.forEach(oJSDocServices, function(oServiceJsDoc, sServiceName) {
    const oServiceExample = oExamplesJson[sServiceName]
    // Public services must be documented and have examples. Internal services don't have to be documented.
    if (oServiceJsDoc.visibility !== _PUBLIC || oServiceExample) {
      oServicesJson[sServiceName] = generateApiJson(
        "service",
        sServiceName,
        oServiceJsDoc,
        aVisibility,
        oServiceExample,
        _SERVICES_APIS,
        strictMode
      )
    } else {
      throw new Error(
        "Public service " + sServiceName + " is missing an example"
      )
    }
  })

  return oServicesJson
}

function generateSdkClasses(oJSDocClasses, oExamplesJson, strictMode, aVisibility) {
  _.forEach(oJSDocClasses, function(oClassJsDoc, sClassName) {
    oJSDocClasses[sClassName] = generateApiJson(
      "class",
      sClassName,
      oClassJsDoc,
      aVisibility,
      oExamplesJson[sClassName],
      _CLASSES_APIS,
      strictMode
    )
  })
  return oJSDocClasses
}

function generateSdkInterfaces(oInterfacesMeta, oExamplesJson, strictMode, aVisibility) {
  const oInterfacesJson = {}

  const interfacesMetaFilteredByVisibilty = filterPropertiesByVisibility(
    oInterfacesMeta,
    aVisibility
  )
  _.forEach(interfacesMetaFilteredByVisibilty, function(
    interfacesMetaObject,
    sInterfaceName
  ) {
    const shorterNameWithCapital = sInterfaceName.substring(
      sInterfaceName.lastIndexOf(".") + 1
    )
    const shorterName =
      shorterNameWithCapital.charAt(0).toLowerCase() +
      shorterNameWithCapital.slice(1)
    const interfacesExample = oExamplesJson[shorterName]
    oInterfacesJson[sInterfaceName] = generateApiJson(
      "interface",
      sInterfaceName,
      interfacesMetaObject,
      aVisibility,
      interfacesExample,
      _INTERFACES_APIS,
      strictMode
    )
  })

  return oInterfacesJson
}

function filterArrayByVisibility(aSymbols, aVisibility) {
  return _.filter(aSymbols, function(o) {
    return _.includes(aVisibility, o.visibility)
  })
}

function findProperty(obj, prop, str) {
  if(obj.hasOwnProperty(prop)){
    return str;
  }
  let result, p
  for (p in obj) {
    if(obj.hasOwnProperty(p) && typeof obj[p] === 'object' ) {
      result = findProperty(obj[p], prop, str + "." + p.toString());
      if(result){
        return result;
      }
    }
  }
  return result;
}

function filterEqualeValuesToArray(array) {
  const count = names =>
    names.reduce((a, b) =>
      Object.assign(a, {[b]: (a[b] || 0) + 1}), {})

  const duplicates = dict =>
    Object.keys(dict).filter((a) => dict[a] > 1)

  return duplicates(count(array));
}

// TODO: break to smaller functions
function generateSdkJSDoc(aVisibility, oApiJson, strictMode) {
  const copyApiJson = _.cloneDeep(oApiJson)
  // Take only the classes with requested visibility
  let classes = filterArrayByVisibility(copyApiJson.symbols, aVisibility)
  classes = _.filter(classes, function(o) {
    return o.kind === "class"
  })

  // Adapting original JSDoc format, to the format accepted by SDK application
  // 1) Filtering methods and events by visibility
  // 2) Removing the constructor
  // 3) Converting services configure method parameter to configuration properties and deleting the configure method
  // 4) Turning methods and events arrays to maps
  // 5) Replacing methods and events "parameters" to "params"
  // 6) Replacing method's "returnValue" to "returns"
  // TODO: Check why original JSDoc format is not used
  _.forEach(classes, function(c) {
    c.name = c.name.replace(/\//g, ".")
    c.basename = c.name
    c.description = c.description
    // TODO: Meanwhile we do not expose constructors
    if (c.constructor) {
      delete c.constructor
    }

    if (c.methods) {
      c.methods = filterArrayByVisibility(c.methods, aVisibility)
      c.methods = arrayToMap(c.methods)
      if (
        c.isService &&
        c.methods &&
        c.methods.configure &&
        c.methods.configure.parameters &&
        c.methods.configure.parameters[0] &&
        c.methods.configure.parameters[0].parameterProperties
      ) {
        const configureVisibility = c.methods.configure.visibility
        c.configurationProperties =
          c.methods.configure.parameters[0].parameterProperties
        delete c.methods.configure
        _.forEach(c.configurationProperties, function(cp) {
          if (cp.parameterProperties) {
            cp.params = _.values(cp.parameterProperties)
            delete cp.parameterProperties
          }
          cp.visibility = configureVisibility
        })
      }
      _.forEach(c.methods, function(m) {
        if (m.parameters) {
          m.params = m.parameters
          delete m.parameters
        }
        if (m.returnValue) {
          m.returns = m.returnValue
          delete m.returnValue
        }
      })
    }
    if (c.events) {
      c.events = filterArrayByVisibility(c.events, aVisibility)
      c.events = arrayToMap(c.events)
      _.forEach(c.events, function(e) {
        if (e.parameters) {
          e.params = e.parameters
          delete e.parameters
        }
      })
    }
  })

  const classNames = classes.map(classObject => classObject.name);
  const sameClassNames = filterEqualeValuesToArray(classNames);
  if (Array.isArray(sameClassNames) && sameClassNames.length) {
    throw new Error (
      "Service and class with the same name exist, " +
      "this could lead to inconsistencies in SDK navigation and in the service and class examples: " +
      _.join(sameClassNames, ",")
    )
  }

  // check that @example is not in object
  const classesMap = arrayToMap(classes)
  if (strictMode) {
    let classPrefix, objectName
    _.forEach(classesMap, function(oClass) {
      classPrefix = oClass.isService ? "Service" : "Class";
      objectName = findProperty(oClass, "examples", classPrefix + "." + oClass.name);
      if(objectName) {
        throw new Error ("Error: @example is not allowed, found in: " + objectName);
      }
    });
  }

  const oJSDocObjects = {
    classes: {},
    services: {}
  }

  _.forEach(classesMap, function(oClass) {
    if (oClass.isService) {
      oJSDocObjects.services[oClass.name] = oClass
    } else {
      oJSDocObjects.classes[oClass.name] = oClass
    }
  })

  return oJSDocObjects
}

function generateApiJsonFile(oOptions) {
  const sSourcesRoot = oOptions.source.include
  const sExcludePattern = oOptions.source.excludePattern
  const tmp = require("tmp")
  const tempArtifactsDir = oOptions.tempArtifactsDir
  // Paths specified inside the config are relative to this path
  const sWorkingDirectoryPath = __dirname
  const config = {
    plugins: [path.resolve(__dirname, "utils/jsDoc/lib/sapui5-jsdoc3-plugin/sapui5-jsdoc3.js")],
    opts: {
      destination: tempArtifactsDir,
      recurse: true,
      lenient: true,
      template: path.resolve(__dirname, "utils/jsDoc/lib/sapui5-jsdoc3-template"),
      sapui5: {
        saveSymbols: false
      }
    },
    source: {
      include: [sSourcesRoot],
      excludePattern: sExcludePattern
    },
    templates: {
      "sapui5-jsdoc3": {
        outputSourceFiles: false,
        variants: ["apijson"]
      }
    }
  }
  console.info("SDK: JSDoc config:\n" + JSON.stringify(config, undefined, 2))
  const configFilePath = tmp.fileSync().name // Using a temporary file so it will be deleted upon process exit
  console.info("SDK: Writing config to " + configFilePath)
  fs.writeFileSync(configFilePath, JSON.stringify(config))

  const child_process = require("child_process")
  const jsdocPath = path.resolve(__dirname, "../node_modules/jsdoc/jsdoc.js")

  const args = [jsdocPath, "-c", configFilePath]
  //const args = [jsdocPath];
  console.info("SDK: Generating api.json (this can take a while)...")
  const childStatus = child_process.spawnSync(process.execPath, args, {
    cwd: sWorkingDirectoryPath
  })

  // Write the output from jsdoc
  const infoMessage = childStatus.stdout.toString("utf-8")
  console.info(infoMessage)
  const errorMessage = childStatus.stderr.toString("utf-8")
  if (errorMessage) {
    console.error(errorMessage)
  }
  if (childStatus.status === 0) {
    console.info("SDK: Generated api.json")
    return path.resolve(__dirname, tempArtifactsDir + "/api.json");
  } else {
    const message =
      "JSDoc returned with error code " +
      childStatus.status +
      ", see errors in the previous output"
    console.error("SDK: " + message)
    throw childStatus.error || new Error(errorMessage)
  }
}

function eraseFilesFromSystem(filesPath) {
  const apiJsonPath = path.resolve(__dirname, filesPath + "/api.json")
  try {
    fs.unlinkSync(apiJsonPath);
  } catch(error) {
    console.warn("temp SDK file: " + apiJsonPath + " was NOT deleted\n\t" + error.message);
  }

  const symbolsJsonPath = path.resolve(__dirname, filesPath + "/symbols-pruned-ui5.json")
  try {
    fs.unlinkSync(symbolsJsonPath);
  } catch(error) {
    console.warn("temp SDK file: " + symbolsJsonPath + " was NOT deleted\n\t" + error.message);
  }
}

function getApiJson(target, outDir, sourcesExcludePattern) {
  // create api.json and symbols-pruned-ui5.json files
  var sApiJsonFilePath = generateApiJsonFile({
    source: {
      include: target,
      excludePattern: sourcesExcludePattern
    },
    tempArtifactsDir: outDir
  })

  // convert api.json file to object
  var oApiJson = JSON.parse(fs.readFileSync(sApiJsonFilePath, "utf8"))

  // erase api.json and symbols-pruned-ui5.json files
  eraseFilesFromSystem(outDir);

  return oApiJson
}

function getInterfacesAndServices(sPackageJsonPath) {
  const oMetadata = metadataReader(sPackageJsonPath, "package.json")
  return {
    interfacesMeta: oMetadata.interfacesMeta,
    servicesMeta: oMetadata.servicesMeta
  }
}

function generateSdkJson(
  oServicesMeta,
  oInterfacesMeta,
  oApiJson,
  sExamplesPath,
  oExampleFileRegex,
  strictMode,
  aVisibility
) {
  console.info("SDK: Reading documentation from jsdoc comments")
  const oJSDocObjects = generateSdkJSDoc(aVisibility, oApiJson, strictMode)
  console.info("SDK: Reading examples")
  const oExamplesJson = generateExamplesJson(
    sExamplesPath,
    oExampleFileRegex,
    {}
  )
  console.info("SDK: Generating documentation for interfaces")
  const oInterfaces = generateSdkInterfaces(
    oInterfacesMeta,
    oExamplesJson,
    strictMode,
    aVisibility
  )
  console.info("SDK: Generating documentation for services")
  const oServices = generateSdkServices(
    oServicesMeta,
    oJSDocObjects.services,
    oExamplesJson,
    strictMode,
    aVisibility
  )
  console.info("SDK: Generating documentation for classes")
  const oClasses = generateSdkClasses(
    oJSDocObjects.classes,
    oExamplesJson,
    strictMode,
    aVisibility
  )
  return {
    Interfaces: oInterfaces,
    Services: oServices,
    Classes: oClasses
  }
}

function generateSdkDocumentationObjects(
  servicesMeta,
  interfacesMeta,
  apiJson,
  target,
  examplesIncludePattern,
  strictMode
) {
  return {
    publicWebIdeJson: generateSdkJson(
      servicesMeta,
      interfacesMeta,
      apiJson,
      target,
      examplesIncludePattern,
      strictMode,
      [_PUBLIC]
    ),
    internalWebIdeJson: generateSdkJson(
      servicesMeta,
      interfacesMeta,
      apiJson,
      target,
      examplesIncludePattern,
      strictMode,
      [_INTERNAL, _PUBLIC]
    )
  }
}

function writeJsonToFiles(outDir, publicAndInternalWebIdeJsonObject) {
  const publicWebIdeJson = JSON.stringify(
    publicAndInternalWebIdeJsonObject.publicWebIdeJson,
    null,
    4
  )
  const internalWebIdeJson = JSON.stringify(
    publicAndInternalWebIdeJsonObject.internalWebIdeJson,
    null,
    4
  )

  fs.writeFileSync(path.resolve(__dirname, outDir + "/" + publicJsonFileName), publicWebIdeJson)

  fs.writeFileSync(path.resolve(__dirname, outDir + "/" + internalJsonFileName), internalWebIdeJson)
}

function generateSdkDocumentation(target, options) {
  // convert package.json file to interfaces and servecies dynamicly
  const oInterfacesAndServeries = getInterfacesAndServices(target)

  // execute JSDoc and parse result
  const sourcesDir = options.sourcesDir || path.resolve(__dirname, target + "/src");
  const oApiJson = getApiJson(
    sourcesDir,
    options.outDir,
    options.sourcesExcludePattern
  )

  // create json object from uniting the api.json, serveries and interfaces
  const examplesDir = options.examplesDir || path.resolve(__dirname, target + "/test");
  const strictMode = options.hasOwnProperty("strictMode") ? options.strictMode : true;
  const publicAndInternalWebIdeJsonObject = generateSdkDocumentationObjects(
    oInterfacesAndServeries.servicesMeta,
    oInterfacesAndServeries.interfacesMeta,
    oApiJson,
    examplesDir,
    options.examplesIncludePattern,
    strictMode
  )

  // write json object to file
  writeJsonToFiles(options.outDir, publicAndInternalWebIdeJsonObject)
}

module.exports = {
  generateSdkDocumentation: generateSdkDocumentation,
  test: {
    getInterfacesAndServices: getInterfacesAndServices,
    getApiJson: getApiJson,
    eraseFilesFromSystem: eraseFilesFromSystem,
    generateSdkInterfaces: generateSdkInterfaces,
    generateSdkJSDoc: generateSdkJSDoc,
    generateExamplesJson: generateExamplesJson,
    generateSdkServices: generateSdkServices,
    generateSdkClasses: generateSdkClasses,
    filterPropertiesByVisibility: filterPropertiesByVisibility,
    generateSdkDocumentationObjects: generateSdkDocumentationObjects,
    internalJsonFileName: internalJsonFileName,
    publicJsonFileName: publicJsonFileName
  }
}
