/* global require, exports, env */
/* eslint strict: [2, "global"]*/

"use strict"

/**
 * SAPUI5 plugin for JSDoc3 (3.3.0-alpha5)
 *
 * The plugin adds the following SAPUI5 specific tag definitions to JSDoc3
 *
 *   disclaimer
 *
 *   experimental
 *
 *   final
 *
 *   interface
 *
 *   implements
 *
 *   methodof (compatibility)
 *
 *
 *
 * It furthermore listens to the following JSDco3 events to implement additional functionality
 *
 *   parseBegin
 *     to create short names for all file that are to be parsed
 *
 *   fileBegin
 *     to write some line to the log (kind of a progress indicator)
 *
 *   jsdocCommentFound
 *     to pre-process comments, empty lines are used as paragraph markers
 *     a default visibility is added, legacy tag combinations used in JSdoc2 are converted to JSDoc3 conventions
 *
 *   newDoclet
 *
 *   parseComplete
 *     remove undocumented/ignored/private doclets or duplicate doclets
 *
 *
 * Last but not least, it implements an astNodeVisitor to detect UI5 specific "extend" calls and to create
 * documentation for the properties, aggregations etc. that are created with the "extend" call.
 *
 * @module plugins/sapui5-jsdoc
 */

/* imports */
var Syntax = require("jsdoc/src/syntax").Syntax
var Doclet = require("jsdoc/doclet").Doclet
var fs = require("jsdoc/fs")
var path = require("jsdoc/path")

/* ---- global vars---- */

/**
 * Potential path prefixes.
 *
 * Will be determined in the handler for the parseBegin event
 */
var pathPrefixes = []

/**
 * Prefixes of the UI5 unified resource name for the source files is NOT part of the file name.
 * (e.g. when a common root namespaces has been omitted from the folder structure).
 *
 * The prefix will be prepended to all resource names.
 */
var resourceNamePrefixes = []

/**
 * A UI5 specific unique Id for all doclets.
 */
var docletUid = 0

var currentProgram
var currentModule

/**
 * Cached metadata for encountered classes.
 */
var classInfos = {}

/* ---- exports ---- */

exports.defineTags = function(dictionary) {
  /**
   * a special value that is not 'falsy' but results in an empty string when output
   * Used for the disclaimer and experimental tag
   */
  var EMPTY = {
    toString: function() {
      return ""
    }
  }

  /**
   * A sapui5 specific tag to add a disclaimer to a symbol
   */
  dictionary.defineTag("disclaimer", {
    // value is optional
    onTagged: function(doclet, tag) {
      doclet.disclaimer = tag.value || EMPTY
    }
  })

  /**
   * A sapui5 specific tag to mark a symbol as experimental.
   */
  dictionary.defineTag("experimental", {
    // value is optional
    onTagged: function(doclet, tag) {
      doclet.experimental = tag.value || EMPTY
    }
  })

  /**
   * Re-introduce the deprecated 'final tag. JSDoc used it as a synonym for readonly, but we use it to mark classes as final
   */
  dictionary.defineTag("final", {
    mustNotHaveValue: true,
    onTagged: function(doclet, tag) {
      doclet.final_ = true
    }
  })

  /**
   * Introduce a new kind of symbol: 'interface'
   * 'interface' is  like 'class', but without a constructor.
   * Support for 'interface' might not be complete (only standard UI5 use cases tested)
   */
  dictionary.defineTag("interface", {
    //mustNotHaveValue: true,
    onTagged: function(doclet, tag) {
      // verbose("setting kind of " + doclet.name + " to 'interface'");
      doclet.kind = "interface"
      if (tag.value) {
        doclet.classdesc = tag.value
      }
    }
  })

  /**
   * Classes can declare that they implement a set of interfaces
   */
  dictionary.defineTag("implements", {
    mustHaveValue: true,
    onTagged: function(doclet, tag) {
      // console.log("setting implements of " + doclet.name + " to 'interface'");
      if (tag.value) {
        doclet.implemented = doclet.implemented || []
        tag.value.split(/\s*,\s*/g).forEach(function($) {
          if (doclet.implemented.indexOf($) < 0) {
            doclet.implemented.push($)
          }
        })
      }
    }
  })

  /**
   * mark a doclet as synthetic
   */
  dictionary.defineTag("synthetic", {
    mustNotHaveValue: true,
    onTagged: function(doclet, tag) {
      doclet.synthetic = true
    }
  })

  /**
   * mark a doclet that intentionally updates a previous doclet
   */
  dictionary.defineTag("ui5-updated-doclet", {
    mustNotHaveValue: true,
    onTagged: function(doclet, tag) {
      doclet.ui5UpdatedDoclet = true
    }
  })

  /**
   * Just as a bugfix. Should be removed mid-term.
   */
  dictionary.defineTag("methodof", {
    // value is optional
    onTagged: function(doclet, tag) {
      doclet.addTag("memberof", tag.value)
    }
  })
}

exports.handlers = {
  /**
   * Before all files are parsed, determine the common prefix of all filenames
   */
  parseBegin: function(e) {
    pathPrefixes = env.opts._.reduce(function(result, path) {
      if (fs.statSync(path).isDirectory()) {
        result.push(ensureEndingSlash(path.replace(/\\/g, "/")))
      }
      return result
    }, [])
    resourceNamePrefixes =
      (env.opts.sapui5 && env.opts.sapui5.resourceNamePrefixes) || []
    if (!Array.isArray(resourceNamePrefixes)) {
      resourceNamePrefixes = [resourceNamePrefixes]
    }
    resourceNamePrefixes.forEach(ensureEndingSlash)
    while (resourceNamePrefixes.length < pathPrefixes.length) {
      resourceNamePrefixes.push("")
    }

    verbose("path prefixes " + JSON.stringify(pathPrefixes))
    verbose("resource name prefixes " + JSON.stringify(resourceNamePrefixes))
  },

  /**
   * Log each file before it is parsed
   */
  fileBegin: function(e) {
    verbose("parsing " + getRelativePath(e.filename))
    currentProgram = undefined
    currentModule = undefined
  },

  fileComplete: function(e) {
    currentProgram = undefined
    currentModule = undefined
  },

  jsdocCommentFound: function(e) {
    // console.log("jsdocCommentFound: " + e.comment);
    e.comment = preprocessComment(e)
  },

  symbolFound: function(e) {
    // console.log("symbolFound: " + e.comment);
  },

  newDoclet: function(e) {
    e.doclet.__ui5 = { id: ++docletUid }

    // remove code: this is a try to reduce the required heap size
    if (e.doclet.meta) {
      if (e.doclet.meta.code) {
        e.doclet.meta.code = {}
      }
      var filepath =
        e.doclet.meta.path && e.doclet.meta.path !== "null"
          ? path.join(e.doclet.meta.path, e.doclet.meta.filename)
          : e.doclet.meta.filename
      e.doclet.meta.__shortpath = getRelativePath(filepath)
      e.doclet.__ui5.resource = getResourceName(filepath)
      e.doclet.__ui5.module =
        currentModule || getModuleName(e.doclet.__ui5.resource)
    }

    // JSDoc 3 has a bug when it encounters a property in an object literal with an empty string as name
    // (e.g. { "" : something } will result in a doclet without longname
    if (!e.doclet.longname) {
      if (e.doclet.memberof) {
        e.doclet.longname = e.doclet.memberof + "." + e.doclet.name // TODO '.' depends on scope?
        warning(
          "found doclet without longname, derived longname: " +
            e.doclet.longname +
            " " +
            location(e.doclet)
        )
      } else {
        error(
          "found doclet without longname, could not derive longname " +
            location(e.doclet)
        )
      }
      return
    }

    // try to detect misused memberof
    if (
      e.doclet.memberof &&
      e.doclet.longname.indexOf(e.doclet.memberof) !== 0
    ) {
      warning(
        "potentially unsupported use of @name and @memberof " +
          location(e.doclet)
      )
      //console.log(e.doclet);
    }

    if (
      e.doclet.returns &&
      e.doclet.returns.length > 0 &&
      e.doclet.returns[0] &&
      e.doclet.returns[0].type &&
      e.doclet.returns[0].type.names &&
      e.doclet.returns[0].type.names[0] === "this" &&
      e.doclet.memberof
    ) {
      warning("fixing return type 'this' with " + e.doclet.memberof)
      e.doclet.returns[0].type.names[0] = e.doclet.memberof
    }
  },

  parseComplete: function(e) {
    var doclets = e.doclets
    var l = doclets.length,
      i,
      j,
      doclet
    //var noprivate = !env.opts.private;
    var rAnonymous = /^<anonymous>(~|$)/

    // remove undocumented symbols, ignored symbols, anonymous functions and their members, scope members
    for (i = 0, j = 0; i < l; i++) {
      doclet = doclets[i]
      if (
        !doclet.undocumented &&
        !doclet.ignore &&
        !(doclet.memberof && rAnonymous.test(doclet.memberof)) &&
        doclet.longname.indexOf("~") < 0
      ) {
        doclets[j++] = doclet
      }
    }
    if (j < l) {
      doclets.splice(j, l - j)
      info("removed " + (l - j) + " undocumented, ignored or anonymous symbols")
      l = j
    }

    // sort doclets by name, synthetic, lineno, uid
    // 'ignore' is a combination of criteria, see function above
    verbose("sorting doclets by name")
    doclets.sort(function(a, b) {
      if (a.longname === b.longname) {
        if (a.synthetic === b.synthetic) {
          if (a.meta && b.meta && a.meta.filename == b.meta.filename) {
            if (a.meta.lineno !== b.meta.lineno) {
              return a.meta.lineno < b.meta.lineno ? -1 : 1
            }
          }
          return a.__ui5.id - b.__ui5.id
        }
        return a.synthetic && !b.synthetic ? -1 : 1
      }
      return a.longname < b.longname ? -1 : 1
    })
    verbose("sorting doclets by name done.")

    for (i = 0, j = 0; i < l; i++) {
      doclet = doclets[i]

      // add metadata to symbol
      if (classInfos[doclet.longname]) {
        doclet.__ui5.metadata = classInfos[doclet.longname]
      }

      /*
			if ( doclet.meta ) {
				var filepath = (doclet.meta.path && doclet.meta.path !== 'null' ) ? path.join(doclet.meta.path, doclet.meta.filename) : doclet.meta.filename;
				doclet.meta.__shortpath = getRelativePath(filepath);
				doclet.__ui5.resource = getResourceName(filepath); 
			}
			*/

      // NOTE: This logic removed useful doclets, e.g. private doclets overrode private ones. Since it doens't look like it
      // creates issues with the rest of the parsing it was removed (no removal of duplicate doclets takes place now).
      // check for duplicates: last one wins
      // if ( j > 0 && doclets[j - 1].longname === doclet.longname ) {
      // 	if ( !doclets[j - 1].synthetic && !doclet.ui5UpdatedDoclet ) {
      // 		// replacing synthetic comments or updating comments are trivial case. Just log non-trivial duplicates
      // 		verbose("ignoring duplicate doclet for " + doclet.longname + ":" + location(doclet) + " overrides " + location(doclets[j - 1]));
      // 	}
      // 	doclets[j - 1] = doclet;
      // } else {
      doclets[j++] = doclet
      // }
    }

    if (j < l) {
      doclets.splice(j, l - j)
      info(
        "removed " +
          (l - j) +
          " duplicate symbols - " +
          doclets.length +
          " remaining"
      )
    }

    if (env.opts.sapui5 && env.opts.sapui5.saveSymbols) {
      fs.mkPath(env.opts.destination)
      fs.writeFileSync(
        path.join(env.opts.destination, "symbols-parseComplete.json"),
        JSON.stringify(e.doclets, null, "\t"),
        "utf8"
      )
    }
  }
}

exports.astNodeVisitor = {
  visitNode: function(node, e, parser, currentSourceName) {
    var comment

    if (node.type === Syntax.Program) {
      currentProgram = node
    }

    function processExtendCall(extendCall, comment, commentAlreadyProcessed) {
      var doclet = comment && new Doclet(comment.raw, {})
      var classInfo = collectClassInfo(extendCall, doclet)
      if (classInfo) {
        createAutoDoc(
          classInfo,
          comment,
          extendCall,
          parser,
          currentSourceName,
          commentAlreadyProcessed
        )
      }
    }

    if (node.type === Syntax.ExpressionStatement) {
      if (
        isSapUiDefineCall(node.expression) &&
        node.expression.arguments.length > 0 &&
        node.expression.arguments[0].type === Syntax.Literal &&
        typeof node.expression.arguments[0].value === "string"
      ) {
        warning(
          "module explicitly defined a module name '" +
            node.expression.arguments[0].value +
            "'"
        )
        if (!currentModule) {
          currentModule = node.expression.arguments[0].value
        }
        /*
			} else if ( isJQuerySapDeclareCall(node.expression) 
				 && node.expression.arguments.length > 0
				 && node.expression.arguments[0].type === Syntax.Literal 
				 && typeof node.expression.arguments[0].value === "string" ) {
				warning("module has expliciti module name " + node.expression.arguments[0].value);
			*/
      }
    }

    if (
      node.type === Syntax.ExpressionStatement &&
      isExtendCall(node.expression)
    ) {
      // Something.extend(...) -- return value (new class) is not used in an assignment

      // className = node.expression.arguments[0].value;
      comment =
        getLeadingCommentNode(node) || getLeadingCommentNode(node.expression)
      // console.log("ast node with comment " + comment);
      processExtendCall(node.expression, comment)
    } else if (
      node.type === Syntax.VariableDeclaration &&
      node.declarations.length == 1 &&
      isExtendCall(node.declarations[0].init)
    ) {
      // var NewClass = Something.extend(...)

      // className = node.declarations[0].init.arguments[0].value;
      comment =
        getLeadingCommentNode(node) ||
        getLeadingCommentNode(node.declarations[0])
      // console.log("ast node with comment " + comment);
      processExtendCall(node.declarations[0].init, comment)
    } else if (
      node.type === Syntax.ReturnStatement &&
      isExtendCall(node.argument)
    ) {
      // return Something.extend(...)

      var className = node.argument.arguments[0].value
      comment =
        getLeadingCommentNode(node, className) ||
        getLeadingCommentNode(node.argument, className)
      // console.log("ast node with comment " + comment);
      processExtendCall(node.argument, comment, true)
    }
  }
}

/* ---- private functions ---- */

function info() {
  console.log.apply(console, arguments)
}

function warning(msg) {
  var args = Array.prototype.slice.apply(arguments)
  args[0] = "**** warning: " + args[0]
  console.log.apply(console, args)
}

function error(msg) {
  var args = Array.prototype.slice.apply(arguments)
  args[0] = "**** error: " + args[0]
  console.log.apply(console, args)
}

function verbose() {
  // TODO enable/disable by configuration
  console.log.apply(console, arguments)
}

//---- path handling ---------------------------------------------------------

function ensureEndingSlash(path) {
  path = path || ""
  return path && path.slice(-1) !== "/" ? path + "/" : path
}

function getRelativePath(path) {
  path = path.replace(/\\/g, "/")
  for (var i = 0; i < pathPrefixes.length; i++) {
    if (path.indexOf(pathPrefixes[i]) === 0) {
      return path.slice(pathPrefixes[i].length)
    }
  }
  return path
}

function getResourceName(path) {
  path = path.replace(/\\/g, "/")
  for (var i = 0; i < pathPrefixes.length; i++) {
    if (path.indexOf(pathPrefixes[i]) === 0) {
      return resourceNamePrefixes[i] + path.slice(pathPrefixes[i].length)
    }
  }
  return path
}

function getModuleName(resource) {
  return resource.replace(/\.js$/, "")
}

// ---- text handling ---------------------------------------------------------

var rPlural = /(children|ies|ves|oes|ses|ches|shes|xes|s)$/i
var mSingular = {
  children: -3,
  ies: "y",
  ves: "f",
  oes: -2,
  ses: -2,
  ches: -2,
  shes: -2,
  xes: -2,
  s: -1
}

function guessSingularName(sPluralName) {
  return sPluralName.replace(rPlural, function($, sPlural) {
    var vRepl = mSingular[sPlural.toLowerCase()]
    return typeof vRepl === "string" ? vRepl : sPlural.slice(0, vRepl)
  })
}

// JSDoc3 introduces a hidden assignment "____ = {}" for each @lends tag. unlend() is used to 'skip' this unexpected assignment
function unlend(node) {
  if (
    node &&
    node.type == Syntax.AssignmentExpression &&
    node.left.type == Syntax.Identifier &&
    node.right.type == Syntax.ObjectExpression
  ) {
    return node.right
  }
  return node
}

/**
 * Creates a map of property values from an AST 'object literal' node.
 *
 * The values in the map are again AST 'property' nodes (representing key/value pairs).
 * It would be more convenient to just return the values, but the property node is needed
 * to find the corresponding (preceding) documentation comment.
 *
 * @param node
 * @param defaultKey
 * @returns {Map<string,Property>}
 */
function createPropertyMap(node, defaultKey) {
  var result

  if (node != null) {
    //if ( node.type === Syntax.Property ) {
    //	node = node.value;
    //	//console.log("property found, skipped to " + node.type);
    //}

    // special handling of the synthetic ___ = {} assignments that JSDoc3 creats for @lends statements -> reduce them to the object literal (right hand side of assignment)
    node = unlend(node)

    // if, instead of an object literal only a literal is given and there is a defaultKey, then wrap the literal in a map
    if (node.type === Syntax.Literal && defaultKey != null) {
      result = {}
      result[defaultKey] = { type: Syntax.Property, value: node }
      return result
    }

    if (node.type != Syntax.ObjectExpression) {
      // something went wrong, it's not an object literal
      error("not an object literal:" + node.type + ":" + node.value)
      // console.log(node.toSource());
      return undefined
    }

    // invariant: node.type == Syntax.ObjectExpression
    result = {}
    for (var i = 0; i < node.properties.length; i++) {
      var prop = node.properties[i]
      var name
      //console.log("objectproperty " + prop.type);
      if (prop.key.type === Syntax.Identifier) {
        name = prop.key.name
      } else if (prop.key.type === Syntax.Literal) {
        name = String(prop.key.value)
      } else {
        name = prop.key.toSource()
      }
      //console.log("objectproperty " + prop.type + ":" + name);
      result[name] = prop
    }
  }
  return result
}

function isExtendCall(node) {
  return (
    node &&
    node.type === Syntax.CallExpression &&
    node.callee.type === Syntax.MemberExpression &&
    node.callee.property.type === Syntax.Identifier &&
    node.callee.property.name === "extend" &&
    node.arguments.length >= 2 &&
    node.arguments[0].type === Syntax.Literal &&
    typeof node.arguments[0].value === "string" &&
    unlend(node.arguments[1]).type === Syntax.ObjectExpression
  )
}

function isSapUiDefineCall(node) {
  return (
    node &&
    node.type === Syntax.CallExpression &&
    node.callee.type === Syntax.MemberExpression &&
    node.callee.object.type === Syntax.MemberExpression &&
    node.callee.object.type === Syntax.MemberExpression &&
    node.callee.object.object.type === Syntax.Identifier &&
    node.callee.object.object.name === "sap" &&
    node.callee.object.property.type === Syntax.Identifier &&
    node.callee.object.property.name === "ui" &&
    node.callee.property.type === Syntax.Identifier &&
    node.callee.property.name === "define"
  )
}

function getObjectName(node) {
  if (node.type === Syntax.MemberExpression && !node.computed) {
    var prefix = getObjectName(node.object)
    return prefix ? prefix + "." + node.property.name : null
  } else if (node.type === Syntax.Identifier) {
    return /* scope[node.name] ? scope[node.name] : */ node.name
  } else {
    return null
  }
}

function convertValue(node, type) {
  var value

  if (node.type === Syntax.Literal) {
    // 'string' or number or true or false
    return node.value
  } else if (
    node.type === Syntax.UnaryExpression &&
    node.prefix &&
    node.argument.type === Syntax.Literal &&
    typeof node.argument.value === "number" &&
    (node.operator === "-" || node.operator === "+")
  ) {
    // -n or +n
    value = node.argument.value
    return node.operator === "-" ? -value : value
  } else if (node.type === Syntax.MemberExpression && type) {
    // enum value (a.b.c)
    value = getObjectName(node)
    if (value.indexOf(type + ".") === 0) {
      // starts with fully qualified enum name -> cut off name
      return value.slice(type.length + 1)
    } else if (value.indexOf(type.split(".").slice(-1)[0] + ".") === 0) {
      // unqualified name might be a local name (just a guess - would need static code analysis for proper solution)
      return value.slice(type.split(".").slice(-1)[0].length + 1)
    } else {
      warning(
        "did not understand default value '%s', falling back to source",
        value
      )
      return value
    }
  } else if (node.type === Syntax.Identifier && node.name === "undefined") {
    // undefined
    return undefined
  } else if (
    node.type === Syntax.ArrayExpression &&
    node.elements.length === 0
  ) {
    // empty array literal
    return "[]" // TODO return this string or an empty array
  }

  error(
    "unexpected type of default value (type='%s', source='%s'), falling back to '???'",
    node.type,
    node.toString() /*JSON.stringify(node, null, "\t")*/
  )
  return "???"
}

function collectClassInfo(extendCall, classDoclet) {
  var baseType
  if (
    classDoclet &&
    classDoclet.augments &&
    classDoclet.augments.length === 1
  ) {
    baseType = classDoclet.augments[0]
  }

  var oClassInfo = {
    name: extendCall.arguments[0].value,
    baseType: baseType,
    doc: classDoclet && classDoclet.description,
    deprecation: classDoclet && classDoclet.deprecated,
    since: classDoclet && classDoclet.since,
    experimental: classDoclet && classDoclet.experimental,
    specialSettings: {},
    properties: {},
    aggregations: {},
    associations: {},
    events: {},
    methods: {}
  }

  function upper(n) {
    return n.slice(0, 1).toUpperCase() + n.slice(1)
  }

  function each(node, defaultKey, callback) {
    var map, n, settings, doclet

    map = node && createPropertyMap(node.value)
    if (map) {
      for (n in map) {
        if (map.hasOwnProperty(n)) {
          doclet = getLeadingDoclet(map[n])
          settings = createPropertyMap(map[n].value, defaultKey)
          if (settings == null) {
            error(
              "no valid metadata for " +
                n +
                " (AST type '" +
                map[n].value.type +
                "')"
            )
            continue
          }

          callback(n, settings, doclet, map[n])
        }
      }
    }
  }

  var classInfoNode = unlend(extendCall.arguments[1])
  var classInfoMap = createPropertyMap(classInfoNode)
  if (
    classInfoMap &&
    classInfoMap.metadata &&
    classInfoMap.metadata.value.type !== Syntax.ObjectExpression
  ) {
    warning(
      "class metadata exists but can't be analyzed. It is not of type 'ObjectExpression', but a '" +
        classInfoMap.metadata.value.type +
        "'."
    )
    return null
  }

  var metadata =
    classInfoMap &&
    classInfoMap.metadata &&
    createPropertyMap(classInfoMap.metadata.value)
  if (metadata) {
    verbose("  analyzing metadata for '" + oClassInfo.name + "'")

    oClassInfo["abstract"] = !!(
      metadata["abstract"] && metadata["abstract"].value.value
    )
    oClassInfo["final"] = !!(metadata["final"] && metadata["final"].value.value)

    each(metadata.specialSettings, "readonly", function(n, settings, doclet) {
      oClassInfo.specialSettings[n] = {
        name: n,
        doc: doclet && doclet.description,
        since: doclet && doclet.since,
        deprecation: doclet && doclet.deprecated,
        experimental: doclet && doclet.experimental,
        visibility:
          (settings.visibility && settings.visibility.value.value) || "public",
        type: settings.type ? settings.type.value.value : "any",
        readonly: (settings.readyonly && settings.readonly.value.value) || true
      }
    })

    each(metadata.properties, "type", function(n, settings, doclet) {
      var type
      var N = upper(n)
      var methods
      oClassInfo.properties[n] = {
        name: n,
        doc: doclet && doclet.description,
        since: doclet && doclet.since,
        deprecation: doclet && doclet.deprecated,
        experimental: doclet && doclet.experimental,
        visibility:
          (settings.visibility && settings.visibility.value.value) || "public",
        type: (type = settings.type ? settings.type.value.value : "string"),
        defaultValue: settings.defaultValue
          ? convertValue(settings.defaultValue.value, type)
          : null,
        group: settings.group ? settings.group.value.value : "Misc",
        bindable: settings.bindable
          ? !!convertValue(settings.bindable.value)
          : false,
        methods: (methods = {
          get: "get" + N,
          set: "set" + N
        })
      }
      if (oClassInfo.properties[n].bindable) {
        methods["bind"] = "bind" + N
        methods["unbind"] = "unbind" + N
      }
      // if ( !settings.defaultValue ) {
      //	console.log("property without defaultValue: " + oClassInfo.name + "." + n);
      //}
    })

    oClassInfo.defaultAggregation =
      (metadata.defaultAggregation &&
        metadata.defaultAggregation.value.value) ||
      undefined

    each(metadata.aggregations, "type", function(n, settings, doclet) {
      var N = upper(n)
      var methods
      oClassInfo.aggregations[n] = {
        name: n,
        doc: doclet && doclet.description,
        deprecation: doclet && doclet.deprecated,
        since: doclet && doclet.since,
        experimental: doclet && doclet.experimental,
        visibility:
          (settings.visibility && settings.visibility.value.value) || "public",
        type: settings.type ? settings.type.value.value : "sap.ui.core.Control",
        singularName: settings.singularName
          ? settings.singularName.value.value
          : guessSingularName(n),
        cardinality:
          settings.multiple && !settings.multiple.value.value ? "0..1" : "0..n",
        bindable: settings.bindable
          ? !!convertValue(settings.bindable.value)
          : false,
        methods: (methods = {
          get: "get" + N,
          destroy: "destroy" + N
        })
      }
      if (oClassInfo.aggregations[n].cardinality === "0..1") {
        methods["set"] = "set" + N
      } else {
        var N1 = upper(oClassInfo.aggregations[n].singularName)
        methods["insert"] = "insert" + N1
        methods["add"] = "add" + N1
        methods["remove"] = "remove" + N1
        methods["indexOf"] = "indexOf" + N1
        methods["removeAll"] = "removeAll" + N
      }
      if (oClassInfo.aggregations[n].bindable) {
        methods["bind"] = "bind" + N
        methods["unbind"] = "unbind" + N
      }
    })

    each(metadata.associations, "type", function(n, settings, doclet) {
      var N = upper(n)
      var methods
      oClassInfo.associations[n] = {
        name: n,
        doc: doclet && doclet.description,
        deprecation: doclet && doclet.deprecated,
        since: doclet && doclet.since,
        experimental: doclet && doclet.experimental,
        visibility:
          (settings.visibility && settings.visibility.value.value) || "public",
        type: settings.type ? settings.type.value.value : "sap.ui.core.Control",
        singularName: settings.singularName
          ? settings.singularName.value.value
          : guessSingularName(n),
        cardinality:
          settings.multiple && settings.multiple.value.value ? "0..n" : "0..1",
        methods: (methods = {
          get: "get" + N
        })
      }
      if (oClassInfo.associations[n].cardinality === "0..1") {
        methods["set"] = "set" + N
      } else {
        var N1 = upper(oClassInfo.associations[n].singularName)
        methods["add"] = "add" + N1
        methods["remove"] = "remove" + N1
        methods["removeAll"] = "removeAll" + N
      }
    })

    each(metadata.events, null, function(n, settings, doclet) {
      var N = upper(n)
      var info = (oClassInfo.events[n] = {
        name: n,
        doc: doclet && doclet.description,
        deprecation: doclet && doclet.deprecated,
        since: doclet && doclet.since,
        experimental: doclet && doclet.experimental,
        allowPreventDefault: !!(
          settings.allowPreventDefault &&
          settings.allowPreventDefault.value.value
        ),
        parameters: {},
        methods: {
          attach: "attach" + N,
          detach: "detach" + N,
          fire: "fire" + N
        }
      })
      each(settings.parameters, null, function(pName, pSettings, pDoclet) {
        info.parameters[pName] = {
          name: pName,
          doc: pDoclet && pDoclet.description,
          deprecation: pDoclet && pDoclet.deprecated,
          since: pDoclet && pDoclet.since,
          experimental: pDoclet && pDoclet.experimental,
          type: pSettings && pSettings.type ? pSettings.type.value.value : ""
        }
      })
    })

    // console.log(oClassInfo.name + ":" + JSON.stringify(oClassInfo, null, "  "));
  }

  // remember class info by name
  classInfos[oClassInfo.name] = oClassInfo

  return oClassInfo
}

var rEmptyLine = /^\s*$/

function createAutoDoc(
  oClassInfo,
  classComment,
  node,
  parser,
  filename,
  commentAlreadyProcessed
) {
  var newStyle = !!(env.opts.sapui5 && env.opts.sapui5.newStyle),
    p,
    n,
    n1,
    pName,
    info,
    lines,
    link

  function isEmpty(obj) {
    if (!obj) {
      return true
    }
    for (var n in obj) {
      if (obj.hasOwnProperty(n)) {
        return false
      }
    }
    return true
  }

  function jsdocCommentFound(comment) {
    parser.emit(
      "jsdocCommentFound",
      {
        event: "jsdocCommentFound",
        comment: comment,
        lineno: node.loc.start.line,
        filename: filename,
        range: [node.range[0], node.range[0]]
      },
      parser
    )
  }

  function removeDuplicateEmptyLines(lines) {
    var lastWasEmpty = false,
      i,
      j,
      l,
      line

    for (i = 0, j = 0, l = lines.length; i < l; i++) {
      line = lines[i]
      if (line == null || rEmptyLine.test(line)) {
        if (!lastWasEmpty) {
          lines[j++] = line
        }
        lastWasEmpty = true
      } else {
        lines[j++] = line
        lastWasEmpty = false
      }
    }
    return j < i ? lines.slice(0, j) : lines
  }

  function newJSDoc(lines) {
    //console.log("add completely new jsdoc comment to prog " + node.type + ":" + node.nodeId + ":" + Object.keys(node));

    lines = removeDuplicateEmptyLines(lines)
    lines.push("@synthetic")

    var comment = " * " + lines.join("\r\n * ")
    jsdocCommentFound("/**\r\n" + comment + "\r\n */")

    var m = /@name\s+([^\r\n\t ]+)/.exec(comment)
    verbose("  creating synthetic comment '" + (m && m[1]) + "'")
  }

  function rname(prefix, n, _static) {
    return (
      (_static ? "." : "#") + prefix + n.slice(0, 1).toUpperCase() + n.slice(1)
    )
  }

  function name(prefix, n, _static) {
    return oClassInfo.name + rname(prefix, n, _static)
  }

  //	function shortname(s) {
  //		return s.slice(s.lastIndexOf('.') + 1);
  //	}

  var HUNGARIAN_PREFIXES = {
    int: "i",
    boolean: "b",
    float: "f",
    string: "s",
    function: "fn",
    object: "o",
    regexp: "r",
    jQuery: "$",
    any: "o",
    variant: "v",
    map: "m"
  }

  function varname(n, type, property) {
    var prefix = HUNGARIAN_PREFIXES[type] || (property ? "s" : "o")
    return prefix + n.slice(0, 1).toUpperCase() + n.slice(1)
  }

  // add a list of the possible settings if and only if
  // - documentation for the constructor exists
  // - no (generated) documentation for settings exists already
  // - a suitable place for inserting the settings can be found
  var m =
    classComment &&
    /(?:^|\r\n|\n|\r)[ \t]*\**[ \t]*@[a-zA-Z]/.exec(classComment.raw)
  p = m ? m.index : -1
  var hasSettingsDocs = classComment
    ? classComment.raw.indexOf("The supported settings are:") >= 0
    : false

  // heuristic to recognize a ManagedObject
  var isManagedObject =
    /@extends\s+sap\.ui\.(?:base\.ManagedObject|core\.(?:Element|Control|Component))(?:\s|$)/.test(
      classComment
    ) ||
    oClassInfo.library ||
    !isEmpty(oClassInfo.specialSettings) ||
    !isEmpty(oClassInfo.properties) ||
    !isEmpty(oClassInfo.aggregations) ||
    !isEmpty(oClassInfo.associations) ||
    !isEmpty(oClassInfo.events)

  if (p >= 0 && !hasSettingsDocs) {
    lines = [""]

    if (isManagedObject) {
      // only a ManagedObject has settings

      if (oClassInfo.name !== "sap.ui.base.ManagedObject") {
        // add the hint for the general description only when the current class is not ManagedObject itself
        lines.push(
          "",
          "Accepts an object literal <code>mSettings</code> that defines initial",
          "property values, aggregated and associated objects as well as event handlers.",
          "See {@link sap.ui.base.ManagedObject#constructor} for a general description of the syntax of the settings object."
        )
      }

      // add the settings section only if there are any settings
      if (
        !isEmpty(oClassInfo.properties) ||
        !isEmpty(oClassInfo.aggregations) ||
        !isEmpty(oClassInfo.associations) ||
        !isEmpty(oClassInfo.events)
      ) {
        lines.push("", "@ui5-settings", "The supported settings are:", "<ul>")
        if (!isEmpty(oClassInfo.properties)) {
          lines.push("<li>Properties")
          lines.push("<ul>")
          for (n in oClassInfo.properties) {
            lines.push(
              "<li>{@link " +
                rname("get", n) +
                " " +
                n +
                "} : " +
                oClassInfo.properties[n].type +
                (oClassInfo.properties[n].defaultValue !== null
                  ? " (default: " + oClassInfo.properties[n].defaultValue + ")"
                  : "") +
                "</li>"
            )
          }
          lines.push("</ul>")
          lines.push("</li>")
        }
        if (!isEmpty(oClassInfo.aggregations)) {
          lines.push("<li>Aggregations")
          lines.push("<ul>")
          for (n in oClassInfo.aggregations) {
            if (oClassInfo.aggregations[n].visibility !== "hidden") {
              lines.push(
                "<li>{@link " +
                  rname("get", n) +
                  " " +
                  n +
                  "} : " +
                  oClassInfo.aggregations[n].type +
                  (oClassInfo.aggregations[n].cardinality === "0..n"
                    ? "[]"
                    : "") +
                  (oClassInfo.defaultAggregation == n ? " (default)" : "") +
                  "</li>"
              )
            }
          }
          lines.push("</ul>")
          lines.push("</li>")
        }
        if (!isEmpty(oClassInfo.assocations)) {
          lines.push("<li>Assocations")
          lines.push("<ul>")
          for (n in oClassInfo.assocations) {
            lines.push(
              "<li>{@link " +
                rname("get", n) +
                " " +
                n +
                "} : " +
                oClassInfo.assocations.type +
                (oClassInfo.assocations[n].cardinality === "0..n" ? "[]" : "") +
                "</li>"
            )
          }
          lines.push("</ul>")
          lines.push("</li>")
        }
        if (!isEmpty(oClassInfo.events)) {
          lines.push("<li>Events")
          lines.push("<ul>")
          for (n in oClassInfo.events) {
            lines.push(
              "<li>{@link " +
                "#event:" +
                n +
                " " +
                n +
                "} : fnListenerFunction or [fnListenerFunction, oListenerObject] or [oData, fnListenerFunction, oListenerObject]</li>"
            )
          }
          lines.push("</ul>")
          lines.push("</li>")
        }
        lines.push("</ul>")

        // add the reference to the base class only if this is not ManagedObject and if the base class is known
        if (
          oClassInfo.name !== "sap.ui.base.ManagedObject" &&
          oClassInfo.baseType
        ) {
          lines.push(
            "",
            "In addition, all settings applicable to the base type {@link " +
              oClassInfo.baseType +
              "#constructor " +
              oClassInfo.baseType +
              "}",
            "can be used as well."
          )
        }
        lines.push("")
      } else if (
        oClassInfo.name !== "sap.ui.base.ManagedObject" &&
        oClassInfo.baseType &&
        oClassInfo.hasOwnProperty("abstract")
      ) {
        // if a class has no settings, but metadata, point at least to the base class - if it makes sense
        lines.push(
          "",
          newStyle ? "@ui5-settings" : "",
          "This class does not have its own settings, but all settings applicable to the base type",
          "{@link " +
            oClassInfo.baseType +
            "#constructor " +
            oClassInfo.baseType +
            "} can be used."
        )
      }
    }

    verbose("  enhancing constructor documentation with settings")
    var enhancedComment =
      classComment.raw.slice(0, p) +
      "\n * " +
      removeDuplicateEmptyLines(lines).join("\n * ") +
      (commentAlreadyProcessed ? "@ui5-updated-doclet\n * " : "") +
      classComment.raw.slice(p)
    enhancedComment = preprocessComment({
      comment: enhancedComment,
      lineno: classComment.lineno
    })

    if (commentAlreadyProcessed) {
      jsdocCommentFound(enhancedComment)
    } else {
      classComment.raw = enhancedComment
    }
  }

  newJSDoc([
    "Returns a metadata object for class " + oClassInfo.name + ".",
    "",
    "@returns {sap.ui.base.Metadata} Metadata object describing this class",
    "@public",
    "@static",
    "@name " + name("getMetadata", "", true),
    "@function"
  ])

  if (!oClassInfo["final"]) {
    newJSDoc([
      "Creates a new subclass of class " +
        oClassInfo.name +
        " with name <code>sClassName</code>",
      "and enriches it with the information contained in <code>oClassInfo</code>.",
      "",
      "<code>oClassInfo</code> might contain the same kind of information as described in {@link " +
        (oClassInfo.baseType
          ? oClassInfo.baseType + ".extend"
          : "sap.ui.base.Object.extend Object.extend") +
        "}.",
      "",
      "@param {string} sClassName Name of the class being created",
      "@param {object} [oClassInfo] Object literal with information about the class",
      "@param {function} [FNMetaImpl] Constructor function for the metadata object; if not given, it defaults to <code>sap.ui.core.ElementMetadata</code>",
      "@returns {function} Created class / constructor function",
      "@public",
      "@static",
      "@name " + name("extend", "", true),
      "@function"
    ])
  }

  for (n in oClassInfo.properties) {
    info = oClassInfo.properties[n]
    if (info.visibility === "hidden") {
      continue
    }
    link = newStyle
      ? "{@link #setting:" + n + " " + n + "}"
      : "<code>" + n + "</code>"
    newJSDoc([
      "Gets current value of property " + link + ".",
      "",
      !newStyle && info.doc ? info.doc : "",
      "",
      info.defaultValue !== null
        ? "Default value is <code>" + info.defaultValue + "</code>."
        : "",
      "@returns {" + info.type + "} Value of property <code>" + n + "</code>",
      info.since ? "@since " + info.since : "",
      info.deprecation ? "@deprecated " + info.deprecation : "",
      info.experimental ? "@experimental " + info.experimental : "",
      "@public",
      "@name " + name("get", n),
      "@function"
    ])
    newJSDoc([
      "Sets a new value for property " + link + ".",
      "",
      !newStyle && info.doc ? info.doc : "",
      "",
      "When called with a value of <code>null</code> or <code>undefined</code>, the default value of the property will be restored.",
      "",
      info.defaultValue !== null
        ? "Default value is <code>" + info.defaultValue + "</code>."
        : "",
      "@param {" +
        info.type +
        "} " +
        varname(n, info.type, true) +
        " New value for property <code>" +
        n +
        "</code>",
      "@returns {" +
        oClassInfo.name +
        "} Reference to <code>this</code> in order to allow method chaining",
      info.since ? "@since " + info.since : "",
      info.deprecation ? "@deprecated " + info.deprecation : "",
      info.experimental ? "@experimental " + info.experimental : "",
      "@public",
      "@name " + name("set", n),
      "@function"
    ])
    if (info.bindable) {
      newJSDoc([
        "Binds property " + link + " to model data.",
        "",
        "See {@link sap.ui.base.ManagedObject#bindProperty ManagedObject.bindProperty} for a ",
        "detailed description of the possible properties of <code>oBindingInfo</code>",
        "@param {object} oBindingInfo The binding information",
        "@returns {" +
          oClassInfo.name +
          "} Reference to <code>this</code> in order to allow method chaining",
        info.since ? "@since " + info.since : "",
        info.deprecation ? "@deprecated " + info.deprecation : "",
        info.experimental ? "@experimental " + info.experimental : "",
        "@public",
        "@name " + name("bind", n),
        "@function"
      ])
      newJSDoc([
        "Unbinds property " + link + " from model data.",
        "@returns {" +
          oClassInfo.name +
          "} Reference to <code>this</code> in order to allow method chaining",
        info.since ? "@since " + info.since : "",
        info.deprecation ? "@deprecated " + info.deprecation : "",
        info.experimental ? "@experimental " + info.experimental : "",
        "@public",
        "@name " + name("unbind", n),
        "@function"
      ])
    }
  }

  for (n in oClassInfo.aggregations) {
    info = oClassInfo.aggregations[n]
    if (info.visibility === "hidden") {
      continue
    }
    link = newStyle
      ? "{@link #setting:" + n + " " + n + "}"
      : "<code>" + n + "</code>"
    newJSDoc([
      "Gets content of aggregation " + link + ".",
      "",
      !newStyle && info.doc ? info.doc : "",
      "",
      n === info.defaultAggregation
        ? "<strong>Note</strong>: this is the default aggregation for " +
          n +
          "."
        : "",
      "@returns {" +
        info.type +
        (info.cardinality === "0..n" ? "[]" : "") +
        "}", // TODO altTypes
      info.since ? "@since " + info.since : "",
      info.deprecation ? "@deprecated " + info.deprecation : "",
      info.experimental ? "@experimental " + info.experimental : "",
      "@public",
      "@name " + name("get", n),
      "@function"
    ])
    if (info.cardinality == "0..n") {
      n1 = info.singularName
      newJSDoc([
        "Inserts a " + n1 + " into the aggregation " + link + ".",
        "",
        "@param {" + info.type + "}",
        "           " +
          varname(n1, info.type) +
          " the " +
          n1 +
          " to insert; if empty, nothing is inserted",
        "@param {int}",
        "             iIndex the <code>0</code>-based index the " +
          n1 +
          " should be inserted at; for",
        "             a negative value of <code>iIndex</code>, the " +
          n1 +
          " is inserted at position 0; for a value",
        "             greater than the current size of the aggregation, the " +
          n1 +
          " is inserted at",
        "             the last position",
        "@returns {" +
          oClassInfo.name +
          "} Reference to <code>this</code> in order to allow method chaining",
        info.since ? "@since " + info.since : "",
        info.deprecation ? "@deprecated " + info.deprecation : "",
        info.experimental ? "@experimental " + info.experimental : "",
        "@public",
        "@name " + name("insert", n1),
        "@function"
      ])
      newJSDoc([
        "Adds some " + n1 + " to the aggregation " + link + ".",

        "@param {" + info.type + "}",
        "           " +
          varname(n1, info.type) +
          " the " +
          n1 +
          " to add; to add; if empty, nothing is inserted",
        "@returns {" +
          oClassInfo.name +
          "} Reference to <code>this</code> in order to allow method chaining",
        info.since ? "@since " + info.since : "",
        info.deprecation ? "@deprecated " + info.deprecation : "",
        info.experimental ? "@experimental " + info.experimental : "",
        "@public",
        "@name " + name("add", n1),
        "@function"
      ])
      newJSDoc([
        "Removes a " + n1 + " from the aggregation " + link + ".",
        "",
        "@param {int | string | " +
          info.type +
          "} " +
          varname(n1, "variant") +
          " The " +
          n1 +
          "to remove or its index or id",
        "@returns {" +
          info.type +
          "} The removed " +
          n1 +
          " or <code>null</code>",
        info.since ? "@since " + info.since : "",
        info.deprecation ? "@deprecated " + info.deprecation : "",
        info.experimental ? "@experimental " + info.experimental : "",
        "@public",
        "@name " + name("remove", n1),
        "@function"
      ])
      newJSDoc([
        "Removes all the controls from the aggregation " + link + ".",
        "",
        "Additionally, it unregisters them from the hosting UIArea.",
        "@returns {" +
          info.type +
          "[]} An array of the removed elements (might be empty)",
        info.since ? "@since " + info.since : "",
        info.deprecation ? "@deprecated " + info.deprecation : "",
        info.experimental ? "@experimental " + info.experimental : "",
        "@public",
        "@name " + name("removeAll", n),
        "@function"
      ])
      newJSDoc([
        "Checks for the provided <code>" +
          info.type +
          "</code> in the aggregation " +
          link +
          ".",
        "and returns its index if found or -1 otherwise.",
        "@param {" + info.type + "}",
        "          " +
          varname(n1, info.type) +
          " The " +
          n1 +
          " whose index is looked for",
        "@returns {int} The index of the provided control in the aggregation if found, or -1 otherwise",
        info.since ? "@since " + info.since : "",
        info.deprecation ? "@deprecated " + info.deprecation : "",
        info.experimental ? "@experimental " + info.experimental : "",
        "@public",
        "@name " + name("indexOf", n1),
        "@function"
      ])
    } else {
      newJSDoc([
        "Sets the aggregated " + link + ".",
        "@param {" +
          info.type +
          "} " +
          varname(n, info.type) +
          " The " +
          n +
          " to set",
        "@returns {" +
          oClassInfo.name +
          "} Reference to <code>this</code> in order to allow method chaining",
        info.since ? "@since " + info.since : "",
        info.deprecation ? "@deprecated " + info.deprecation : "",
        info.experimental ? "@experimental " + info.experimental : "",
        "@public",
        "@name " + name("set", n),
        "@function"
      ])
    }
    newJSDoc([
      "Destroys " +
        (info.cardinality === "0..n" ? "all " : "") +
        "the " +
        n +
        " in the aggregation " +
        link +
        ".",
      "@returns {" +
        oClassInfo.name +
        "} Reference to <code>this</code> in order to allow method chaining",
      info.since ? "@since " + info.since : "",
      info.deprecation ? "@deprecated " + info.deprecation : "",
      info.experimental ? "@experimental " + info.experimental : "",
      "@public",
      "@name " + name("destroy", n),
      "@function"
    ])
    if (info.bindable) {
      newJSDoc([
        "Binds aggregation " + link + " to model data.",
        "",
        "See {@link sap.ui.base.ManagedObject#bindAggregation ManagedObject.bindAggregation} for a ",
        "detailed description of the possible properties of <code>oBindingInfo</code>.",
        "@param {object} oBindingInfo The binding information",
        "@returns {" +
          oClassInfo.name +
          "} Reference to <code>this</code> in order to allow method chaining",
        info.since ? "@since " + info.since : "",
        info.deprecation ? "@deprecated " + info.deprecation : "",
        info.experimental ? "@experimental " + info.experimental : "",
        "@public",
        "@name " + name("bind", n),
        "@function"
      ])
      newJSDoc([
        "Unbinds aggregation " + link + " from model data.",
        "@returns {" +
          oClassInfo.name +
          "} Reference to <code>this</code> in order to allow method chaining",
        info.since ? "@since " + info.since : "",
        info.deprecation ? "@deprecated " + info.deprecation : "",
        info.experimental ? "@experimental " + info.experimental : "",
        "@public",
        "@name " + name("unbind", n),
        "@function"
      ])
    }
  }

  for (n in oClassInfo.associations) {
    info = oClassInfo.associations[n]
    if (info.visibility === "hidden") {
      continue
    }
    link = newStyle
      ? "{@link #setting:" + n + " " + n + "}"
      : "<code>" + n + "</code>"
    newJSDoc([
      info.cardinality === "0..n"
        ? "Returns array of IDs of the elements which are the current targets of the association " +
          link +
          "."
        : "ID of the element which is the current target of the association " +
          link +
          ", or <code>null</code>.",
      "",
      newStyle && info.doc ? info.doc : "",
      "",
      "@returns {" +
        info.type +
        (info.cardinality === "0..n" ? "[]" : "") +
        "}", // TODO altTypes
      info.since ? "@since " + info.since : "",
      info.deprecation ? "@deprecated " + info.deprecation : "",
      info.experimental ? "@experimental " + info.experimental : "",
      "@public",
      "@name " + name("get", n),
      "@function"
    ])
    if (info.cardinality === "0..n") {
      n1 = info.singularName
      newJSDoc([
        "Adds some " + n1 + " into the association " + link + ".",
        "",
        "@param {string | " +
          info.type +
          "} " +
          varname(n1, "variant") +
          " the " +
          n +
          " to add; if empty, nothing is inserted",
        "@returns {" +
          oClassInfo.name +
          "} Reference to <code>this</code> in order to allow method chaining",
        info.since ? "@since " + info.since : "",
        info.deprecation ? "@deprecated " + info.deprecation : "",
        info.experimental ? "@experimental " + info.experimental : "",
        "@public",
        "@name " + name("add", n1),
        "@function"
      ])
      newJSDoc([
        "Removes an " + n1 + " from the association named " + link + ".",
        "@param {int | string | " +
          info.type +
          "} " +
          varname(n1, "variant") +
          " The " +
          n1 +
          "to be removed or its index or ID",
        "@returns {" +
          info.type +
          "} the removed " +
          n1 +
          " or <code>null</code>",
        info.since ? "@since " + info.since : "",
        info.deprecation ? "@deprecated " + info.deprecation : "",
        info.experimental ? "@experimental " + info.experimental : "",
        "@public",
        "@name " + name("remove", n1),
        "@function"
      ])
      newJSDoc([
        "Removes all the controls in the association named " + link + ".",
        "@returns {" +
          info.type +
          "[]} An array of the removed elements (might be empty)",
        info.since ? "@since " + info.since : "",
        info.deprecation ? "@deprecated " + info.deprecation : "",
        info.experimental ? "@experimental " + info.experimental : "",
        "@public",
        "@name " + name("removeAll", n),
        "@function"
      ])
    } else {
      newJSDoc([
        "Sets the associated " + link + ".",
        "@param {" +
          info.type +
          "} " +
          varname(n, info.type) +
          " Id of an element which becomes the new target of this " +
          n +
          " association; alternatively, an element instance may be given",
        "@returns {" +
          oClassInfo.name +
          "} Reference to <code>this</code> in order to allow method chaining",
        info.since ? "@since " + info.since : "",
        info.deprecation ? "@deprecated " + info.deprecation : "",
        info.experimental ? "@experimental " + info.experimental : "",
        "@public",
        "@name " + name("set", n),
        "@function"
      ])
    }
  }

  for (n in oClassInfo.events) {
    info = oClassInfo.events[n]
    link = newStyle
      ? "{@link #event:" + n + " " + n + "}"
      : "<code>" + n + "</code>"

    lines = [
      info.doc ? info.doc : "",
      "",
      "@name " + oClassInfo.name + "#" + n,
      "@event",
      info.since ? "@since " + info.since : "",
      info.deprecation ? "@deprecated " + info.deprecation : "",
      info.experimental ? "@experimental " + info.experimental : "",
      "@param {sap.ui.base.Event} oControlEvent",
      "@param {sap.ui.base.EventProvider} oControlEvent.getSource",
      "@param {object} oControlEvent.getParameters"
    ]
    for (pName in info.parameters) {
      lines.push(
        "@param {" +
          (info.parameters[pName].type || "") +
          "} oControlEvent.getParameters." +
          pName +
          " " +
          (info.parameters[pName].doc || "")
      )
    }
    lines.push("@public")
    newJSDoc(lines)

    newJSDoc([
      "Attaches event handler <code>fnFunction</code> to the " +
        link +
        " event of this <code>" +
        oClassInfo.name +
        "</code>.",
      "",
      "When called, the context of the event handler (its <code>this</code>) will be bound to <code>oListener</code> if specified, ",
      "otherwise it will be bound to this <code>" +
        oClassInfo.name +
        "</code> itself.",
      "",
      !newStyle && info.doc ? info.doc : "",
      "",
      "@param {object}",
      "           [oData] An application-specific payload object that will be passed to the event handler along with the event object when firing the event",
      "@param {function}",
      "           fnFunction The function to be called when the event occurs",
      "@param {object}",
      "           [oListener] Context object to call the event handler with. Defaults to this <code>" +
        oClassInfo.name +
        "</code> itself",
      "",
      "@returns {" +
        oClassInfo.name +
        "} Reference to <code>this</code> in order to allow method chaining",
      "@public",
      info.since ? "@since " + info.since : "",
      info.deprecation ? "@deprecated " + info.deprecation : "",
      info.experimental ? "@experimental " + info.experimental : "",
      "@name " + name("attach", n),
      "@function"
    ])
    newJSDoc([
      "Detaches event handler <code>fnFunction</code> from the " +
        link +
        " event of this <code>" +
        oClassInfo.name +
        "</code>.",
      "",
      "The passed function and listener object must match the ones used for event registration.",
      "",
      "@param {function}",
      "           fnFunction The function to be called, when the event occurs",
      "@param {object}",
      "           oListener Context object on which the given function had to be called",
      "@returns {" +
        oClassInfo.name +
        "} Reference to <code>this</code> in order to allow method chaining",
      info.since ? "@since " + info.since : "",
      info.deprecation ? "@deprecated " + info.deprecation : "",
      info.experimental ? "@experimental " + info.experimental : "",
      "@public",
      "@name " + name("detach", n),
      "@function"
    ])

    // build documentation for fireEvent. It contains conditional parts which makes it a bit more complicated
    lines = ["Fires event " + link + " to attached listeners."]
    if (info.allowPreventDefault) {
      lines.push(
        "",
        "Listeners may prevent the default action of this event by using the <code>preventDefault</code>-method on the event object.",
        ""
      )
    }
    if (!isEmpty(info.parameters)) {
      lines.push("", "Expects the following event parameters:", "<ul>")
      for (pName in info.parameters) {
        //console.log("param " + pName + ": ");
        //console.log(pSettings);
        lines.push(
          "<li><code>" +
            pName +
            "</code> of type <code>" +
            (info.parameters[pName].type || "") +
            "</code>" +
            (info.parameters[pName].doc || "") +
            "</li>"
        )
      }
      lines.push("</ul>")
    }
    lines.push(
      "",
      "@param {Map} [mArguments] The arguments to pass along with the event"
    )
    if (info.allowPreventDefault) {
      lines.push(
        "@returns {boolean} Whether or not to prevent the default action"
      )
    } else {
      lines.push(
        "@returns {" +
          oClassInfo.name +
          "} Reference to <code>this</code> in order to allow method chaining"
      )
    }
    lines.push(
      "@protected",
      info.since ? "@since " + info.since : "",
      info.deprecation ? "@deprecated " + info.deprecation : "",
      info.experimental ? "@experimental " + info.experimental : "",
      "@name " + name("fire", n),
      "@function"
    )
    newJSDoc(lines)
  }
}

/**
 * Creates a human readable location info for a given doclet.
 * @param doclet
 * @returns {String}
 */
function location(doclet) {
  var filename = (doclet.meta && doclet.meta.filename) || "unknown"
  return (
    " #" +
    doclet.__ui5.id +
    "@" +
    filename +
    (doclet.meta.lineno != null ? ":" + doclet.meta.lineno : "") +
    (doclet.synthetic ? "(synthetic)" : "")
  )
}

function getLeadingCommentNode(node, longname) {
  var comment = null
  var leadingComments = node.leadingComments

  if (
    Array.isArray(leadingComments) &&
    leadingComments.length &&
    leadingComments[0].raw
  ) {
    comment = leadingComments[0]
  }

  if (
    longname &&
    currentProgram &&
    currentProgram.leadingComments &&
    currentProgram.leadingComments.length
  ) {
    leadingComments = currentProgram.leadingComments
    var rLongname = new RegExp(
      "@(name|alias|class|namespace)\\s+" + longname.replace(/\./g, "\\.")
    )
    for (var i = 0; i < leadingComments.length; i++) {
      if (
        /^\/\*\*[\s\S]*\*\//.test(leadingComments[i].raw) &&
        rLongname.test(leadingComments[i].raw)
      ) {
        comment = leadingComments[i]
        break
      }
    }
  }

  return comment
}

function getLeadingComment(node) {
  var comment = getLeadingCommentNode(node)
  return comment ? comment.raw : null
}

function getLeadingDoclet(node) {
  var comment = getLeadingComment(node)
  return comment ? new Doclet(comment, {}) : null
}

/**
 * Removes the mandatory comment markers and the optional but common asterisks at the beginning of each jsdoc comment line.
 *
 * The result is easier to parse/analyze.
 *
 * @param docletSrc
 * @returns
 */
function unwrap(docletSrc) {
  if (!docletSrc) {
    return ""
  }

  // note: keep trailing whitespace for @examples
  // extra opening/closing stars are ignored
  // left margin is considered a star and a space
  // use the /m flag on regex to avoid having to guess what this platform's newline is
  docletSrc = docletSrc
    .replace(/^\/\*\*+/, "") // remove opening slash+stars
    .replace(/\**\*\/$/, "\\Z") // replace closing star slash with end-marker
    .replace(/^\s*(\* ?|\\Z)/gm, "") // remove left margin like: spaces+star or spaces+end-marker
    .replace(/\s*\\Z$/g, "") // remove end-marker

  return docletSrc
}

function wrap(lines) {
  if (typeof lines === "string") {
    lines = lines.split(/\r\n?|\n/)
  }
  return "/**\n * " + lines.join("\n * ") + "\n */"
}

function preprocessComment(e) {
  var src = e.comment

  // add a default visibility
  if (!/@private|@public|@protected/.test(src)) {
    src = unwrap(src)
    src = src + "\n@private"
    src = wrap(src)
    // console.log("added default visibility to '" + src + "'");
  }

  if (/@class/.test(src) && /@static/.test(src)) {
    warning(
      "combination of @class and @static is no longer supported with jsdoc3, converting it to @namespace and @classdesc: (line " +
        e.lineno +
        ")"
    )
    src = unwrap(src)
    src = src.replace(/@class/, "@classdesc").replace(/@static/, "@namespace")
    src = wrap(src)
    //console.log(src);
  }

  // if there are no empty lines in the comment, the following preprocessing wouldn't do anything meanigful, so we can skip it
  if (!/(\r\n|\r|\n)\s*\*\s*(\r\n|\r|\n)/.test(src)) {
    return src
  }

  // console.log("comment with empty lines found: " + src);

  src = unwrap(src)

  var modified = false

  var lines = src.split(/\r\n?|\n/),
    j = 0

  // remove trailing blank lines
  var preformatted = false
  while (j <= lines.length) {
    if (j == lines.length || lines[j].match(/^\s*@/)) {
      if (!preformatted) {
        while (j > 0 && lines[j - 1].match(/^\s*$/)) {
          j--
          lines.splice(j, 1)
          modified = true
        }
      }
    } else if (lines[j].match(/<PRE>/i)) {
      // TODO should check for unbalanced <PRE> </PRE>
      preformatted = true
    } else if (lines[j].match(/<\/PRE>/i)) {
      // TODO should check for unbalanced <PRE> </PRE>
      preformatted = false
    }
    j++
  }

  // replace remaining blank lines with a line break
  preformatted = false
  for (j = 0; j < lines.length; j++) {
    if (!preformatted && lines[j].match(/^\s*$/)) {
      lines[j] = "</p><p>"
      modified = true
    } else if (lines[j].match(/<PRE>/i)) {
      // TODO should check for unbalanced <PRE> </PRE>
      preformatted = true
    } else if (lines[j].match(/<\/PRE>/i)) {
      // TODO should check for unbalanced <PRE> </PRE>
      preformatted = false
    }
  }

  // check for real modifications to reduce log noise
  if (modified) {
    src = wrap(lines)
    // console.log("converted to : " + src);
  }

  return src
}

// HACK: override cli.exit() to avoid that JSDoc3 exits the VM
if (env.opts.sapui5 && env.opts.sapui5.noExit) {
  info("disabling exit() call")
  require(path.join(global.env.dirname, "cli")).exit = function(retval) {
    info("cli.exit(): do nothing (ret val=" + retval + ")")
  }
}

/*
 * TODO
 *
 * '(@)lends': to automatically add the lends tag for class definitions:
 *  JSDoc3 handles lends tags already before parsing. it gives the object literal a dummy name '____'
 *  Only with that dummy name, JSdoc3 can process the lends tag.
 *  If we want to automatically enrich an extend call with a lends tag, we have to do the following steps
 *  in the preprocessing:
 *  - recognize extend calls (maybe combination of special tag in comment + extend + structure)
 *  - insert the lends tag
 *
 * Property documentation
 * Learnings:
 * - node visitors in 3.3.0-alpha5 still visit the mozilla AST nodes
 * - there is a new hook astNodeVisitor that visits astNodes
 * - Mozilla AST Nodes (or any object derived from a Java class) can only be enriched by using object.defineProperty()
 *
 * Things that don't work without global type resolution
 * - determine the proper hungarian prefix for variables
 * - resolve default values for enum types (depends on whether string literal or BYFIELD expression is given)
 *
 */
