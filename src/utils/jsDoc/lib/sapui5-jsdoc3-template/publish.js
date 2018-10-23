/*global env: true */
/*eslint strict: [2, "global"]*/

"use strict"

/* imports */

var template = require("jsdoc/template"),
  helper = require("jsdoc/util/templateHelper"),
  fs = require("jsdoc/fs"),
  doclet = require("jsdoc/doclet"),
  path = require("jsdoc/path")

/* globals, constants */

var MY_TEMPLATE_NAME = "sapui5-jsdoc3",
  ANONYMOUS_LONGNAME = doclet.ANONYMOUS_LONGNAME,
  INTERNAL_VISIBILITY = "internal"

var templateConf = (env.conf.templates || {})[MY_TEMPLATE_NAME] || {},
  conf = {},
  view

var __db
var __longnames
var __missingLongnames = {}

/**
 * Maps the symbol 'longname's to the unique filename that contains the documentation of that symbol.
 * This map is maintained to deal with names that only differ in case (e.g. the namespace sap.ui.model.type and the class sap.ui.model.Type).
 */
var __uniqueFilenames = {}

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

function merge(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i]
    Object.keys(source).forEach(function(p) {
      var v = source[p]
      target[p] = v.constructor === Object ? merge(target[p] || {}, v) : v
    })
  }
  return target
}

function lookup(longname /*, variant*/) {
  var key = longname // variant ? longname + "|" + variant : longname;
  if (__longnames[key] == null) {
    __missingLongnames[key] = (__missingLongnames[key] || 0) + 1
    var oResult = __db({
      longname: longname /*, variant: variant ? variant : {isUndefined: true}*/
    })
    __longnames[key] = oResult.first()
  }
  return __longnames[key]
}

function isaClass($) {
  return (
    /^(namespace|interface|class|typedef)$/.test($.kind) ||
    ($.kind === "member" && $.isEnum) /* isNonEmptyNamespace($) */
  )
}

var REGEXP_ARRAY_TYPE = /^Array\.<(.*)>$/

// ---- Version class -----------------------------------------------------------------------------------------------------------------------------------------------------------

var Version = (function() {
  var rVersion = /^[0-9]+(?:\.([0-9]+)(?:\.([0-9]+))?)?(.*)$/

  /**
   * Returns a Version instance created from the given parameters.
   *
   * This function can either be called as a constructor (using <code>new</code>) or as a normal function.
   * It always returns an immutable Version instance.
   *
   * The parts of the version number (major, minor, patch, suffix) can be provided in several ways:
   * <ul>
   * <li>Version("1.2.3-SNAPSHOT") - as a dot-separated string. Any non-numerical char or a dot followed by a non-numerical char starts the suffix portion.
   * Any missing major, minor or patch versions will be set to 0.</li>
   * <li>Version(1,2,3,"-SNAPSHOT") - as individual parameters. Major, minor and patch must be integer numbers or empty, suffix must be a string not starting with digits.</li>
   * <li>Version([1,2,3,"-SNAPSHOT"]) - as an array with the individual parts. The same type restrictions apply as before.</li>
   * <li>Version(otherVersion) - as a Version instance (cast operation). Returns the given instance instead of creating a new one.</li>
   * </ul>
   *
   * To keep the code size small, this implementation mainly validates the single string variant.
   * All other variants are only validated to some degree. It is the responsibility of the caller to
   * provide proper parts.
   *
   * @param {int|string|any[]|jQuery.sap.Version} vMajor the major part of the version (int) or any of the single parameter variants explained above.
   * @param {int} iMinor the minor part of the version number
   * @param {int} iPatch the patch part of the version number
   * @param {string} sSuffix the suffix part of the version number
   * @return {jQuery.sap.Version} the version object as determined from the parameters
   *
   * @class Represents a version consisting of major, minor, patch version and suffix, e.g. '1.2.7-SNAPSHOT'.
   *
   * @author SAP SE
   * @version ${version}
   * @constructor
   * @public
   * @since 1.15.0
   * @name jQuery.sap.Version
   */
  function Version(versionStr) {
    var match = rVersion.exec(versionStr) || []

    function norm(v) {
      v = parseInt(v, 10)
      return isNaN(v) ? 0 : v
    }

    Object.defineProperty(this, "major", {
      enumerable: true,
      value: norm(match[0])
    })
    Object.defineProperty(this, "minor", {
      enumerable: true,
      value: norm(match[1])
    })
    Object.defineProperty(this, "patch", {
      enumerable: true,
      value: norm(match[2])
    })
    Object.defineProperty(this, "suffix", {
      enumerable: true,
      value: String(match[3] || "")
    })
  }

  Version.prototype.toMajorMinor = function() {
    return new Version(this.major + "." + this.minor)
  }

  Version.prototype.toString = function() {
    return this.major + "." + this.minor + "." + this.patch + this.suffix
  }

  Version.prototype.compareTo = function(other) {
    return (
      this.major - other.major ||
      this.minor - other.minor ||
      this.patch - other.patch ||
      (this.suffix < other.suffix ? -1 : this.suffix === other.suffix ? 0 : 1)
    )
  }

  return Version
})()

// ---- Link class --------------------------------------------------------------------------------------------------------------------------------------------------------------

//TODO move to separate module

var Link = (function() {
  var Link = function() {}

  Link.prototype.toSymbol = function(longname) {
    if (longname != null) {
      this.longname = String(longname)
    }
    return this
  }

  Link.prototype.withText = function(text) {
    this.text = text
    return this
  }

  Link.prototype.withTooltip = function(text) {
    this.tooltip = text
    return this
  }

  Link.prototype.inner = function(inner) {
    this.innerName = inner
    return this
  }

  Link.prototype.toClass = function(longname) {
    this.classLink = true
    return this.toSymbol(longname)
  }

  Link.prototype.toFile = function(file) {
    if (file != null) {
      this.file = file
    }
    return this
  }

  function _makeLink(href, target, tooltip, text) {
    return (
      "<a" +
      (tooltip ? ' title="' + tooltip + '"' : "") +
      ' href="' +
      href +
      '"' +
      (target ? ' target="' + target + '"' : "") +
      ">" +
      text +
      "</a>"
    )
  }

  Link.prototype.toString = function() {
    var longname = this.longname,
      m,
      linkString

    if (longname) {
      if (/^(?:ftp|https?):\/\//.test(longname)) {
        // handle real hyperlinks (TODO should be handled with a different "to" method
        linkString = _makeLink(
          longname,
          this.targetName,
          this.tooltip,
          this.text || longname
        )
      } else if ((m = REGEXP_ARRAY_TYPE.exec(longname))) {
        // normalize array types
        linkString = this._makeSymbolLink(m[1]) + "[]"
      } else if (longname.slice(-2) == "[]") {
        // normalize array types
        linkString = this._makeSymbolLink(longname.slice(0, -2)) + "[]"
      } else {
        linkString = this._makeSymbolLink(longname)
      }
      // console.log("  link.toSymbol('" + this.longname + "').toString() = " + linkString);
    } else if (this.src) {
      if (!conf.linkToSources) {
        // if source output is suppressed, just display the links to the source file
        linkString = "&lt;" + this.src + "&gt;" // TODO doesn't look nice
      } else {
        // transform filepath into a filename
        var srcFile = this.src
          .replace(/\.\.?[\\\/]/g, "")
          .replace(/[:\\\/]/g, "_")
        var href = Link.base + conf.srcDir + srcFile + conf.ext
        linkString = _makeLink(
          href,
          this.targetName,
          null,
          this.text || path.basename(this.src)
        )
      }
    } else if (this.file) {
      linkString = _makeLink(
        Link.base + this.file,
        this.targetName,
        null,
        this.text || this.file
      )
    }

    return linkString
  }

  Link.prototype._makeSymbolLink = function(longname) {
    var isLocalRef = longname.charAt(0) == "#"
    var linkTo = isLocalRef ? null : lookup(longname)
    var linkPath

    if (longname.charAt(0) === "#") {
      // is it an internal link?

      linkPath = longname
    } else if (!linkTo) {
      // if there is no symbol by that name just return the name unaltered

      return this.text || longname
    } else {
      // it's a symbol in another file

      linkPath = Link.baseSymbols

      if (
        (linkTo.kind === "member" && !linkTo.isEnum) ||
        linkTo.kind === "constant" ||
        linkTo.kind === "function" ||
        linkTo.kind === "event"
      ) {
        // it's a method or property

        linkPath =
          linkPath +
          __uniqueFilenames[linkTo.memberof] +
          conf.ext +
          "#" +
          (linkTo.kind === "event" ? "event:" : "") +
          Link.symbolNameToLinkName(linkTo)
      } else {
        linkPath = linkPath + __uniqueFilenames[linkTo.longname] + conf.ext
      }
    }

    return _makeLink(
      linkPath + (this.innerName ? "#" + this.innerName : ""),
      this.targetName,
      this.tooltip,
      this.text || longname
    )
  }

  Link.symbolNameToLinkName = function(symbol) {
    var linker = ""
    if (symbol.scope === "static") {
      linker = "."
    } else if (symbol.isInner) {
      linker = "-" // TODO-migrate?
    }
    return linker + symbol.name
  }

  return Link
})()

// ---- publish() - main entry point for JSDoc templates -------------------------------------------------------------------------------------------------------

/** Called automatically by JsDoc Toolkit. */
function publish(symbolSet) {
  info("entering sapui5 template")

  info("before prune: " + symbolSet().count() + " symbols.")
  symbolSet = helper.prune(symbolSet)
  info("after prune: " + symbolSet().count() + " symbols.")

  __db = symbolSet
  __longnames = {}
  __db().each(function($) {
    __longnames[$.longname] = $
  })

  var templatePath = env.opts.template
  view = new template.Template(templatePath + "/tmpl")

  function filter(key, value) {
    if (key === "meta") {
      //return;
    }
    if (key === "__ui5" && value) {
      var v = {
        resource: value.resource,
        module: value.module
      }
      if (value.derived) {
        v.derived = value.derived.map(function($) {
          return $.longname
        })
      }
      if (value.base) {
        v.base = value.base.longname
      }
      if (value.implementations) {
        v.base = value.implementations.map(function($) {
          return $.longname
        })
      }
      if (value.parent) {
        v.parent = value.parent.longname
      }
      if (value.children) {
        v.children = value.children.map(function($) {
          return $.longname
        })
      }
      return v
    }
    return value
  }

  // create output dir
  fs.mkPath(env.opts.destination)

  // now resolve relationships
  var aRootNamespaces = createNamespaceTree()
  var hierarchyRoots = createInheritanceTree()
  collectMembers()

  if (symbolSet().count() < 20000) {
    info(
      "writing raw symbols to " +
        path.join(env.opts.destination, "symbols-pruned-ui5.json")
    )
    fs.writeFileSync(
      path.join(env.opts.destination, "symbols-pruned-ui5.json"),
      JSON.stringify(symbolSet().get(), filter, "\t"),
      "utf8"
    )
  }

  // used to allow Link to check the details of things being linked to
  Link.symbolSet = symbolSet

  // get an array version of the symbol set, useful for filtering
  var symbols = symbolSet().get()

  // -----

  var PUBLISHING_VARIANTS = {
    apijson: {
      defaults: {
        apiJsonFile: path.join(env.opts.destination, "api.json")
      },
      processor: function(conf) {
        createAPIJSON(symbols, conf.apiJsonFile)
      }
    }
  }

  var now = new Date()

  info("start publishing")
  for (var i = 0; i < templateConf.variants.length; i++) {
    var vVariant = templateConf.variants[i]
    if (typeof vVariant === "string") {
      vVariant = { variant: vVariant }
    }

    info("")

    if (PUBLISHING_VARIANTS[vVariant.variant]) {
      // Merge different sources of configuration (listed in increasing priority order - last one wins)
      // and expose the result in the global 'conf' variable
      //  - global defaults
      //  - defaults for current variant
      //  - user configuration for sapui5 template
      //  - user configuration for current variant
      //
      // Note: trailing slash expected for dirs
      conf = merge(
        {
          ext: ".html",
          filter: function($) {
            return true
          },
          templatesDir: "/templates/sapui5/",
          symbolsDir: "symbols/",
          modulesDir: "modules/",
          srcDir: "symbols/src/",
          creationDate:
            now.getFullYear() +
            "-" +
            (now.getMonth() + 1) +
            "-" +
            now.getDay() +
            " " +
            now.getHours() +
            ":" +
            now.getMinutes(),
          outdir: env.opts.destination
        },
        PUBLISHING_VARIANTS[vVariant.variant].defaults,
        templateConf,
        vVariant
      )

      info("publishing as variant '" + vVariant.variant + "'")
      info("final configuration:")
      info(conf)

      PUBLISHING_VARIANTS[vVariant.variant].processor(conf)

      info("done with variant " + vVariant.variant)
    } else {
      info(
        "cannot publish unknown variant '" + vVariant.variant + "' (ignored)"
      )
    }
  }

  info("publishing done.")
}

//---- namespace tree --------------------------------------------------------------------------------

/**
 * Completes the tree of namespaces. Namespaces for which content is available
 * but which have not been documented are created as dummy without documentation.
 */
function createNamespaceTree() {
  info("create namespace tree (" + __db().count() + " symbols)")

  var aRootNamespaces = []
  var aTypes = __db(function() {
    return isaClass(this)
  }).get()

  for (var i = 0; i < aTypes.length; i++) {
    // loop with a for-loop as it can handle concurrent modifications

    var symbol = aTypes[i]
    if (symbol.memberof) {
      var parent = lookup(symbol.memberof)
      if (!parent) {
        warning(
          "create missing namespace '" +
            symbol.memberof +
            "' (referenced by " +
            symbol.longname +
            ")"
        )
        parent = makeNamespace(symbol.memberof)
        __longnames[symbol.memberof] = parent
        __db.insert(parent)
        aTypes.push(parent) // concurrent modification: parent will be processed later in this loop
      }
      symbol.__ui5.parent = parent
      parent.__ui5.children = parent.__ui5.children || []
      parent.__ui5.children.push(symbol)

      /*
			if ( parent.kind === 'namespace'  ) {
				if ( !parent.srcFiles )
					parent.srcFiles = [];
				if ( candidate.kind === 'namespace' && !candidate.srcFile ) {
					/*
					for (var j=0; j<symbol.srcFiles.length; j++) {
						if ( parent.srcFiles.indexOf(symbol.srcFiles[j]) < 0 ) {
							parent.srcFiles.push(symbol.srcFiles[j]);
						}
					}
					* /
					var longname = { longname : symbol.longname };
					if ( parent.srcFiles.indexOf(longname) < 0 ) {
						parent.srcFiles.push(longname);
					}
				} else {
					if ( parent.srcFiles.indexOf(symbol.srcFile) < 0 ) {
						parent.srcFiles.push(symbol.srcFile);
					}
				}
			}*/
    } else if (symbol.longname !== ANONYMOUS_LONGNAME) {
      aRootNamespaces.push(symbol)
    }
  }

  return aRootNamespaces
}

function makeNamespace(memberof) {
  info("adding synthetic namespace symbol " + memberof)

  var comment = ["@name " + memberof, "@namespace", "@synthetic", "@public"]

  var symbol = new doclet.Doclet(
    "/**\n * " + comment.join("\n * ") + "\n */",
    {}
  )
  symbol.__ui5 = {}

  return symbol
}

//---- inheritance hierarchy ----------------------------------------------------------------------------

/**
 * Calculates the inheritance hierarchy for all class/interface/namespace symbols.
 * Each node in the tree has the content
 *
 * Node : {
 *      longname  : {string}     // name of the node (usually equals symbol.longname)
 *      symbol    : {Symbol}     // backling to the original symbol
 *      base      : {Node}       // parent node or undefined for root nodes
 *      derived   : {Node[]}     // subclasses/-types
 * }
 *
 */
function createInheritanceTree() {
  function makeDoclet(longname, lines) {
    lines.push("@name " + longname)
    var newDoclet = new doclet.Doclet(
      "/**\n * " + lines.join("\n * ") + "\n */",
      {}
    )
    newDoclet.__ui5 = {}
    __longnames[longname] = newDoclet
    __db.insert(newDoclet)
    return newDoclet
  }

  info("create inheritance tree (" + __db().count() + " symbols)")

  var oTypes = __db(function() {
    return isaClass(this)
  })
  var aRootTypes = []

  var oObject = lookup("Object")
  if (!oObject) {
    oObject = makeDoclet("Object", ["@class", "@synthetic", "@public"])
    aRootTypes.push(oObject)
  }

  // link them according to the inheritance infos
  oTypes.each(function(oClass) {
    if (oClass.longname === "Object") {
      return
    }

    var sBaseClass = "Object"
    if (oClass.augments && oClass.augments.length > 0) {
      if (oClass.augments.length > 1) {
        warning("multiple inheritance detected in " + oClass.longname)
      }
      sBaseClass = oClass.augments[0]
    } else {
      aRootTypes.push(oClass)
    }

    var oBaseClass = lookup(sBaseClass)
    if (!oBaseClass) {
      warning(
        "create missing base class " +
          sBaseClass +
          " (referenced by " +
          oClass.longname +
          ")"
      )
      oBaseClass = makeDoclet(sBaseClass, [
        "@extends Object",
        "@class",
        "@synthetic",
        "@public"
      ])
      oBaseClass.__ui5.base = oObject
      oObject.__ui5.derived = oObject.__ui5.derived || []
      oObject.__ui5.derived.push(oBaseClass)
    }
    oClass.__ui5.base = oBaseClass
    oBaseClass.__ui5.derived = oBaseClass.__ui5.derived || []
    oBaseClass.__ui5.derived.push(oClass)

    if (oClass.implemented) {
      for (var j = 0; j < oClass.implemented.length; j++) {
        var oInterface = lookup(oClass.implemented[j])
        if (!oInterface) {
          warning("create missing interface " + oClass.implemented[j])
          oInterface = makeDoclet(oClass.implemented[j], [
            "@extends Object",
            "@interface",
            "@synthetic",
            "@public"
          ])
          oInterface.__ui5.base = oObject
          oObject.__ui5.derived = oObject.__ui5.derived || []
          oObject.__ui5.derived.push(oInterface)
        }
        oInterface.__ui5.implementations =
          oInterface.__ui5.implementations || []
        oInterface.__ui5.implementations.push(oClass)
      }
    }
  })

  function setStereotype(oSymbol, sStereotype) {
    if (!oSymbol) {
      return
    }
    oSymbol.__ui5.stereotype = sStereotype
    var derived = oSymbol.__ui5.derived
    if (derived) {
      for (var i = 0; i < derived.length; i++) {
        if (!derived[i].__ui5.stereotype) {
          setStereotype(derived[i], sStereotype)
        }
      }
    }
  }

  setStereotype(lookup("sap.ui.core.Component"), "stereotype")
  setStereotype(lookup("sap.ui.core.Control"), "control")
  setStereotype(lookup("sap.ui.core.Element"), "element")
  setStereotype(lookup("sap.ui.base.Object"), "object")

  // check for cyclic inheritance (not supported)
  // Note: the check needs to run bottom up, not top down as a typcial cyclic dependency never will end at the root node
  oTypes.each(function(oStartClass) {
    var visited = {}
    function visit(oClass) {
      if (visited[oClass.longname]) {
        throw new Error(
          "cyclic inheritance detected: " + JSON.stringify(Object.keys(visited))
        )
      }
      if (oClass.__ui5.base) {
        visited[oClass.longname] = true
        visit(oClass.__ui5.base)
        delete visited[oClass.longname]
      }
    }
    visit(oStartClass)
  })

  // collect root nodes (and ignore pure packages)
  return aRootTypes
  /*
	return __db(function() { 
		return R_KINDS.test(this.kind) && this.__ui5 && this.__ui5.base == null;
	}).get();
	*/
}

function collectMembers() {
  __db().each(function($) {
    if ($.memberof) {
      var parent = lookup($.memberof)
      if (parent && isaClass(parent)) {
        parent.__ui5.members = parent.__ui5.members || []
        parent.__ui5.members.push($)
      }
    }
  })
}

// ---- helper functions for the templates ----

var rSince = /^(?:as\s+of|since)(?:\s+version)?\s*([0-9]+(?:\.[0-9]+(?:\.[0-9]+)?)?([-.][0-9A-Z]+)?)(?:\.$|\.\s+|[,:]\s*|\s-\s*|\s|$)/i

function extractSince(value) {
  if (!value) {
    return
  }

  if (value === true) {
    value = ""
  } else {
    value = String(value)
  }

  var m = rSince.exec(value)
  if (m) {
    return {
      since: m[1],
      pos: m[0].length,
      value: value.slice(m[0].length).trim()
    }
  }

  return {
    pos: 0,
    value: value.trim()
  }
}

function sortByAlias(a, b) {
  var partsA = a.longname.split(/[.#]/)
  var partsB = b.longname.split(/[.#]/)
  var i = 0
  while (i < partsA.length && i < partsB.length) {
    if (partsA[i].toLowerCase() < partsB[i].toLowerCase()) {
      return -1
    }
    if (partsA[i].toLowerCase() > partsB[i].toLowerCase()) {
      return 1
    }
    i++
  }
  if (partsA.length < partsB.length) {
    return -1
  }
  if (partsA.length > partsB.length) {
    return 1
  }
  // as a last resort, try to compare the aliases case sensitive in case we have aliases that only
  // differ in case like with "sap.ui.model.type" and "sap.ui.model.Type"
  if (a.longname < b.longname) {
    return -1
  }
  if (a.longname > b.longname) {
    return 1
  }
  return 0
}

/** Just the first sentence (up to a full stop). Should not break on dotted variable names. */
function summarize(desc) {
  if (desc != null) {
    desc = String(desc)
      .replace(/\s+/g, " ")
      .replace(/"'/g, "&quot;")
      .replace(/^(<\/?p>|<br\/?>|\s)+/, "")

    var match = /([\w\W]+?\.)[^a-z0-9_$]/i.exec(desc)
    return match ? match[1] : desc
  }
}

/** Make a symbol sorter by some attribute. */
function makeSortby(/* fields ...*/) {
  var aFields = Array.prototype.slice.apply(arguments),
    aNorms = [],
    aFuncs = []
  for (var i = 0; i < arguments.length; i++) {
    aNorms[i] = 1
    aFuncs[i] = function($, n) {
      return $[n]
    }
    if (aFields[i].indexOf("!") === 0) {
      aNorms[i] = -1
      aFields[i] = aFields[i].slice(1)
    }
    if (aFields[i] === "deprecated") {
      aFuncs[i] = function($, n) {
        return !!$[n]
      }
    } else if (aFields[i] === "static") {
      aFields[i] = "scope"
      aFuncs[i] = function($, n) {
        return $[n] === "static"
      }
    } else if (aFields[i].indexOf("#") === 0) {
      aFields[i] = aFields[i].slice(1)
      aFuncs[i] = function($, n) {
        return $.comment.getTag(n).length > 0
      }
    }
  }
  return function(a, b) {
    // info("compare " + a.longname + " : " + b.longname);
    var r = 0,
      i,
      va,
      vb
    for (i = 0; r === 0 && i < aFields.length; i++) {
      va = aFuncs[i](a, aFields[i])
      vb = aFuncs[i](b, aFields[i])
      if (va && !vb) {
        r = -aNorms[i]
      } else if (!va && vb) {
        r = aNorms[i]
      } else if (va && vb) {
        va = String(va).toLowerCase()
        vb = String(vb).toLowerCase()
        if (va < vb) {
          r = -aNorms[i]
        }
        if (va > vb) {
          r = aNorms[i]
        }
      }
      // debug("  " + aFields[i] + ": " + va + " ? " + vb + " = " + r);
    }
    return r
  }
}

function processTemplate(sTemplateName, data) {
  verbose("processing template '" + sTemplateName + "' for " + data.longname)

  var result = view.render(sTemplateName, {
    asPlainSummary: asPlainSummary,
    bySimpleName: bySimpleName,
    childrenOfKind: childrenOfKind,
    conf: conf,
    data: data,
    getConstructorDescription: getConstructorDescription,
    getNSClass: getNSClass,
    groupByVersion: groupByVersion,
    extractSince: extractSince,
    include: processTemplate,
    Link: Link,
    listTypes: listTypes,
    linkTypes: linkTypes,
    makeExample: makeExample,
    makeLinkList: makeLinkList,
    makeLinkToSymbolFile: makeLinkToSymbolFile,
    makeSignature: makeSignature,
    makeSortby: makeSortby,
    publish: publish,
    resolveLinks: resolveLinks,
    simpleNameOf: simpleNameOf,
    sortByAlias: sortByAlias,
    summarize: summarize,
    Version: Version
  })

  verbose("processing template done.")
  return result
}

function groupByVersion(symbols, extractVersion) {
  var map = {}

  symbols.forEach(function(symbol) {
    var version = extractVersion(symbol),
      key = String(version)

    if (!map[key]) {
      map[key] = { version: version, symbols: [] }
    }
    map[key].symbols.push(symbol)
  })

  var groups = Object.keys(map).map(function(key) {
    return map[key]
  })

  return groups.sort(function(a, b) {
    if (!a.version && b.version) {
      return -1
    } else if (a.version && !b.version) {
      return 1
    } else if (a.version && b.version) {
      return -a.version.compareTo(b.version)
    }
    return 0
  })
}

function makeLinkToSymbolFile(longname) {
  return Link.baseSymbols + __uniqueFilenames[longname] + conf.ext
}

function simpleNameOf(longname) {
  longname = String(longname)
  var p = longname.lastIndexOf(".")
  return p < 0 ? longname : longname.slice(p + 1)
}

function bySimpleName(a, b) {
  if (a === b) {
    return 0
  }
  var simpleA = simpleNameOf(a)
  var simpleB = simpleNameOf(b)
  if (simpleA === simpleB) {
    return a < b ? -1 : 1
  } else {
    return simpleA < simpleB ? -1 : 1
  }
}

/** Build output for displaying function parameters. */
function makeSignature(params) {
  var r = ["("],
    desc
  if (params) {
    for (var i = 0, p; (p = params[i]); i++) {
      // ignore @param tags for 'virtual' params that are used to document members of config-like params
      // (e.g. like "@param param1.key ...")
      if (p.name && p.name.indexOf(".") == -1) {
        if (i > 0) {
          r.push(", ")
        }
        r.push("<span")

        var types = listTypes(p.type)
        if ((desc = asPlainSummary(p.description) || types)) {
          r.push(' title="')
          if (types) {
            r.push("(")
            r.push(types)
            r.push(") ")
          }
          r.push(desc)
          r.push('"')
        }

        r.push(">")
        r.push(p.name)
        r.push("</span>")
        if (p.optional) {
          r.push('<i class="help" title="Optional parameter">?</i>')
        }
      }
    }
  }
  r.push(")")
  return r.join("")
}

/** Find symbol {@link ...} strings in text and turn into html links */
function resolveLinks(str) {
  // str = str.replace(/[\r\n\t]/g, ' ');
  if (!str) {
    return str
  }

  str = String(str).replace(/\{@link\s+([^}\s]+)(?:\s+([^\}]*))?\}/gi, function(
    match,
    symbolName,
    replacement
  ) {
    // normalize links
    var inner = ""
    if (symbolName.match(/#constructor$/)) {
      inner = "constructor"
      symbolName = symbolName.slice(0, -"#constructor".length)
    }
    // info("link to " + symbolName + " -> " + Link.symbolSet.getSymbol(symbolName) );
    // convert to a hyperlink
    var link = new Link().toSymbol(symbolName)
    // propagate inner
    if (inner) {
      link = link.inner(inner)
    }
    // if link tag contained a replacement text, use it
    if (replacement && replacement.trim()) {
      link = link.withText(replacement.trim())
    } else if (symbolName.charAt(0) === "#") {
      // remove hash from local references
      link = link.withText(symbolName.slice(1))
    }
    // template will convert to string
    return link
  })
  str = str.replace(/<pre>/g, '<pre class="prettyprint">')
  return str
}

function childrenOfKind(data, kind) {
  /* old version based on TaffyDB (slow)
	var oChildren = symbolSet({kind: kind, memberof: data.longname === GLOBAL_LONGNAME ? {isUndefined: true} : data.longname}).filter(function() { return conf.filter(this); });
	return {
		own : oChildren.filter({inherited: {isUndefined:true}}).get().sort(makeSortby("!deprecated","static","name")),
		borrowed : groupByContributors(data, oChildren.filter({inherited: true}).get().sort(makeSortby("name")))
	} */
  var oResult = {
    own: [],
    borrowed: []
  }
  //console.log("calculating kind " + kind + " from " + data.longname);
  //console.log(data);
  var fnFilter
  switch (kind) {
    case "property":
      fnFilter = function($) {
        return $.kind === "constant" || ($.kind === "member" && !$.isEnum)
      }
      break
    case "event":
      fnFilter = function($) {
        return $.kind === "event"
      }
      break
    case "method":
      fnFilter = function($) {
        return $.kind === "function"
      }
      break
    default:
      // default: none
      fnFilter = function($) {
        return false
      }
      break
  }

  if (data.__ui5.members) {
    data.__ui5.members.forEach(function($) {
      if (fnFilter($) && conf.filter($)) {
        oResult[$.inherited ? "borrowed" : "own"].push($)
      }
    })
  }
  oResult.own.sort(makeSortby("!deprecated", "static", "name"))
  oResult.borrowed = groupByContributors(data, oResult.borrowed)

  return oResult
}

/**
 * Determines the set of contributors of the given borrowed members.
 * The contributors are sorted according to the inheritance hierarchy:
 * first the base class of symbol, then the base class of the base class etc.
 * Any contributors that can not be found in the hierarchy are appended
 * to the set.
 *
 * @param symbol of which these are the members
 * @param borrowedMembers set of borrowed members to determine the contributors for
 * @return sorted array of contributors
 */
function groupByContributors(symbol, aBorrowedMembers) {
  var MAX_ORDER = 1000, // a sufficiently large number
    mContributors = {},
    aSortedContributors = [],
    i,
    order

  aBorrowedMembers.forEach(function($) {
    $ = lookup($.inherits)
    if ($ && mContributors[$.memberof] == null) {
      mContributors[$.memberof] = { order: MAX_ORDER, items: [$] }
    } else {
      mContributors[$.memberof].items.push($)
    }
  })

  // order contributors according to their distance in the inheritance hierarchy
  order = 0
  ;(function handleAugments(oSymbol) {
    var i, oTarget, aParentsToVisit
    if (oSymbol.augments) {
      aParentsToVisit = []
      // first assign an order
      for (i = 0; i < oSymbol.augments.length; i++) {
        if (
          mContributors[oSymbol.augments[i]] != null &&
          mContributors[oSymbol.augments[i]].order === MAX_ORDER
        ) {
          mContributors[oSymbol.augments[i]].order = ++order
          aParentsToVisit.push(oSymbol.augments[i])
        }
      }
      // only then dive into parents (breadth first search)
      for (i = 0; i < aParentsToVisit.length; i++) {
        oTarget = lookup(aParentsToVisit)
        if (oTarget) {
          handleAugments(oTarget)
        }
      }
    }
  })(symbol)

  // convert to an array and sort by order
  for (i in mContributors) {
    aSortedContributors.push(mContributors[i])
  }
  aSortedContributors.sort(function(a, b) {
    return a.order - b.order
  })

  return aSortedContributors
}

function makeLinkList(aSymbols) {
  return aSymbols
    .sort(makeSortby("name"))
    .map(function($) {
      return new Link().toSymbol($.longname).withText($.name)
    })
    .join(", ")
}

function unarray(typeName) {
  var m = REGEXP_ARRAY_TYPE.exec(typeName)
  return m ? unarray(m[1]) + "[]" : typeName
}

function listTypes(type, separator) {
  var types = typeof type === "string" ? type.split("|") : type && type.names
  if (types) {
    return types.map(unarray).join(separator || "|")
  }
}

function linkTypes(type, short) {
  var types = typeof type === "string" ? type.split("|") : type && type.names
  if (types) {
    return types
      .map(function(typeName) {
        var l = new Link().toSymbol(typeName)
        if (short) {
          l.withText(
            typeName.lastIndexOf(".") > 0
              ? typeName.slice(typeName.lastIndexOf(".") + 1)
              : typeName
          )
        }
        return l
      })
      .join("|")
  }
}

/**
 * Reduces the given text to a summary and removes all tags links etc. and escapes double quotes.
 * The result therefore should be suitable as content for an HTML tag attribute (e.g. title).
 * @param sText
 * @return summarized, plain attribute
 */
function asPlainSummary(sText) {
  return sText
    ? summarize(sText)
        .replace(/<.*?>/g, "")
        .replace(/\{\@link\s*(.*?)\}/g, "$1")
        .replace(/"/g, "&quot;")
    : ""
}

function getNSClass(item) {
  if (item.kind === "interface") {
    return " interface"
  } else if (item.kind === "namespace") {
    return " namespace"
  } else if (item.kind === "typedef") {
    return " typedef"
  } else if (item.kind === "member" && item.isEnum) {
    return " enum"
  } else {
    return ""
  }
}

//---- add on: API JSON -----------------------------------------------------------------

function createAPIJSON(symbols, filename) {
  var api = {
    xmlns: "http://www.sap.com/sap.ui.library.api.xsd",
    _version: "1.0.0"
  }

  if (templateConf.version) {
    api.version = templateConf.version.replace(/-SNAPSHOT$/, "")
  }
  if (templateConf.uilib) {
    api.library = templateConf.uilib
  }

  api.symbols = []
  // sort only a copy(!) of the symbols, otherwise the SymbolSet lookup is broken
  symbols
    .slice(0)
    .sort(sortByAlias)
    .forEach(function(symbol) {
      if (isaClass(symbol) && !symbol.synthetic) {
        // dump a symbol if it as a class symbol and if it is not a synthetic symbol
        api.symbols.push(createAPIJSON4Symbol(symbol, false))
      }
    })

  fs.mkPath(path.dirname(filename))
  fs.writeFileSync(filename, JSON.stringify(api, null, "\t"), "utf8")
  info("  apiJson saved as " + filename)
}

function createAPIJSON4Symbol(symbol, omitDefaults) {
  var obj = []
  var curr = obj
  var attribForKind = "kind"
  var stack = []

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

  function cleanupDoc(s) {
    // convert paragraph separators back to empty lines
    return s ? s.replace(/<\/p><p>(\r\n|\r|\n)/g, "$1") : s
  }

  function tag(name, value, omitEmpty) {
    if (omitEmpty && !value) {
      return
    }
    if (arguments.length === 1) {
      // opening tag
      stack.push(curr)
      stack.push(attribForKind)
      var obj = {}
      if (Array.isArray(curr)) {
        if (attribForKind != null) {
          obj[attribForKind] = name
        }
        curr.push(obj)
      } else {
        curr[name] = obj
      }
      curr = obj
      attribForKind = null
      return
    }
    if (value == null) {
      curr[name] = true
    } else {
      curr[name] = String(value)
    }
  }

  function attrib(name, value, defaultValue, raw) {
    var emptyTag = arguments.length === 1
    if (omitDefaults && arguments.length === 3 && value === defaultValue) {
      return
    }
    curr[name] = emptyTag ? true : raw ? value : String(value)
  }

  function closeTag(name, noIndent) {
    attribForKind = stack.pop()
    curr = stack.pop()
  }

  function collection(name, attribForKind) {
    stack.push(curr)
    stack.push(attribForKind)
    // TODO only supported if this.curr was an object check or fully implement
    curr = curr[name] = []
    attribForKind = attribForKind || null
  }

  function endCollection(name) {
    attribForKind = stack.pop()
    curr = stack.pop()
  }

  function tagWithSince(name, value) {
    if (!value) {
      return
    }

    var info = extractSince(value)

    tag(name)
    if (info.since) {
      attrib("since", info.since)
    }
    if (info.value) {
      curr["text"] = cleanupDoc(info.value)
    }
    closeTag(name, true)
  }

  function examples(symbol) {
    var j, example

    if (symbol.examples && symbol.examples.length) {
      collection("examples")
      for (j = 0; j < symbol.examples.length; j++) {
        example = makeExample(cleanupDoc(symbol.examples[j]))
        tag("example")
        if (example.caption) {
          attrib("caption", example.caption)
        }
        attrib("text", example.example)
        closeTag("example")
      }
      endCollection("examples")
    }
  }

  function visibility($) {
    if (isInternal($)) {
      return INTERNAL_VISIBILITY
    }
    if ($.access === "protected") {
      return "protected"
    } else if ($.access === "private") {
      return "private"
    } else {
      return "public"
    }
  }

  function methodList(tagname, methods) {
    methods =
      methods &&
      Object.keys(methods).map(function(key) {
        return methods[key]
      })
    if (methods != null && methods.length > 0) {
      curr[tagname] = methods
    }
  }

  function hasSettings($, visited) {
    visited = visited || {}

    if ($.augments && $.augments.length > 0) {
      var baseSymbol = $.augments[0]
      if (visited.hasOwnProperty(baseSymbol)) {
        error(
          "detected cyclic inheritance when looking at " +
            $.longname +
            ": " +
            JSON.stringify(visited)
        )
        return false
      }
      visited[baseSymbol] = true
      baseSymbol = lookup(baseSymbol)
      if (hasSettings(baseSymbol, visited)) {
        return true
      }
    }

    var metadata = $.__ui5.metadata
    return (
      metadata &&
      (!isEmpty(metadata.specialSettings) ||
        !isEmpty(metadata.properties) ||
        !isEmpty(metadata.aggregations) ||
        !isEmpty(metadata.associations) ||
        !isEmpty(metadata.events))
    )
  }

  function writeMetadata($) {
    var metadata = $.__ui5.metadata
    if (!metadata) {
      return
    }

    var n

    if (
      metadata.specialSettings &&
      Object.keys(metadata.specialSettings).length > 0
    ) {
      collection("specialSettings")
      for (n in metadata.specialSettings) {
        var special = metadata.specialSettings[n]
        tag("specialSetting")
        attrib("name", special.name)
        attrib("type", special.type)
        attrib("readonly", special.readonly)
        if (special.since) {
          attrib("since", special.since)
        }
        tag("description", cleanupDoc(special.doc), true)
        tagWithSince("experimental", special.experimental)
        tagWithSince("deprecated", special.deprecation)
        methodList("method", special.methods)
        closeTag("specialSetting")
      }
      endCollection("specialSettings")
    }

    if (metadata.properties && Object.keys(metadata.properties).length > 0) {
      collection("properties")
      for (n in metadata.properties) {
        var prop = metadata.properties[n]
        tag("property")
        attrib("name", prop.name)
        attrib("type", prop.type, "string")
        attrib("defaultValue", prop.defaultValue, null, /* raw = */ true)
        attrib("group", prop.group, "Misc")
        attrib("visibility", prop.visibility, "public")
        if (prop.since) {
          attrib("since", prop.since)
        }
        if (prop.bindable) {
          attrib("bindable", prop.bindable)
        }
        tag("description", cleanupDoc(prop.doc), true)
        tagWithSince("experimental", prop.experimental)
        tagWithSince("deprecated", prop.deprecation)
        methodList("methods", prop.methods)
        closeTag("property")
      }
      endCollection("properties")
    }

    if (
      metadata.aggregations &&
      Object.keys(metadata.aggregations).length > 0
    ) {
      collection("aggregations")
      for (n in metadata.aggregations) {
        var aggr = metadata.aggregations[n]
        tag("aggregation")
        attrib("name", aggr.name)
        attrib("singularName", aggr.singularName) // TODO omit default?
        attrib("type", aggr.type, "sap.ui.core.Control")
        attrib("cardinality", aggr.cardinality, "0..n")
        attrib("visibility", aggr.visibility, "public")
        if (aggr.since) {
          attrib("since", aggr.since)
        }
        if (aggr.bindable) {
          attrib("bindable", aggr.bindable)
        }
        tag("description", cleanupDoc(aggr.doc), true)
        tagWithSince("experimental", aggr.experimental)
        tagWithSince("deprecated", aggr.deprecation)
        methodList("methods", aggr.methods)
        closeTag("aggregation")
      }
      endCollection("aggregations")
    }

    if (metadata.defaultAggregation) {
      tag("defaultAggregation", metadata.defaultAggregation)
    }

    if (
      metadata.associations &&
      Object.keys(metadata.associations).length > 0
    ) {
      collection("associations")
      for (n in metadata.associations) {
        var assoc = metadata.associations[n]
        tag("association")
        attrib("name", assoc.name)
        attrib("singularName", assoc.singularName) // TODO omit default?
        attrib("type", assoc.type, "sap.ui.core.Control")
        attrib("cardinality", assoc.cardinality, "0..1")
        attrib("visibility", assoc.visibility, "public")
        if (assoc.since) {
          attrib("since", assoc.since)
        }
        tag("description", cleanupDoc(assoc.doc), true)
        tagWithSince("experimental", assoc.experimental)
        tagWithSince("deprecated", assoc.deprecation)
        methodList("methods", assoc.methods)
        closeTag("association")
      }
      endCollection("associations")
    }

    if (metadata.events && Object.keys(metadata.events).length > 0) {
      collection("events")
      for (n in metadata.events) {
        var event = metadata.events[n]
        tag("event")
        attrib("name", event.name)
        attrib("visibility", event.visibility, "public")
        if (event.since) {
          attrib("since", event.since)
        }
        tag("description", cleanupDoc(event.doc), true)
        tagWithSince("experimental", event.experimental)
        tagWithSince("deprecated", event.deprecation)
        if (event.parameters && Object.keys(event.parameters).length > 0) {
          tag("parameters")
          for (var pn in event.parameters) {
            if (event.parameters.hasOwnProperty(pn)) {
              var param = event.parameters[pn]
              tag(pn)
              attrib("name", pn)
              attrib("type", param.type)
              if (param.since) {
                attrib("since", param.since)
              }
              tag("description", cleanupDoc(param.doc), true)
              tagWithSince("experimental", param.experimental)
              tagWithSince("deprecated", param.deprecation)
              closeTag(pn)
            }
          }
          closeTag("parameters")
        }
        methodList("methods", event.methods, true)
        closeTag("event")
      }
      endCollection("events")
    }
  }

  function writeParameterProperties(paramName, params) {
    var prefix = paramName + ".",
      count = 0,
      i

    for (i = 0; i < params.length; i++) {
      var name = params[i].name
      if (name.lastIndexOf(prefix, 0) !== 0) {
        // startsWith
        continue
      }
      name = name.slice(prefix.length)
      if (name.indexOf(".") >= 0) {
        continue
      }

      if (count === 0) {
        tag("parameterProperties")
      }

      count++

      tag(name)
      attrib("name", name)
      attrib("type", listTypes(params[i].type))
      if (params[i].since) {
        attrib("since", params[i].since)
      }

      writeParameterProperties(params[i].name, params)

      tag("description", cleanupDoc(params[i].description), true)
      tagWithSince("experimental", params[i].experimental)
      tagWithSince("deprecated", params[i].deprecated)

      closeTag(name)
    }

    if (count > 0) {
      closeTag("parameterProperties")
    }
  }

  function tagAttributes(symbol) {
    if (symbol.tags && symbol.tags.length > 0) {
      symbol.tags.forEach(function(tag) {
        if (tag && tag.title === "component" && tag.text) {
          attrib("component", tag.text)
        } else if (tag && tag.title === "service") {
          attrib("isService")
        }
      })
    }
  }

  function isInternal(symbol) {
    if (symbol.tags && symbol.tags.length > 0) {
      for (var i = 0; i < symbol.tags.length; ++i) {
        var tag = symbol.tags[i]
        if (tag && tag.title === INTERNAL_VISIBILITY) {
          return true
        }
      }
    }
    return false
  }

  var kind = symbol.kind === "member" && symbol.isEnum ? "enum" : symbol.kind // handle pseudo-kind 'enum'

  tag(kind)

  attrib("name", symbol.longname)
  attrib("basename", symbol.name)
  tagAttributes(symbol)
  if (symbol.__ui5.resource) {
    attrib("resource", symbol.__ui5.resource)
  }
  if (symbol.__ui5.module) {
    attrib("module", symbol.__ui5.module)
  }
  if (symbol.virtual) {
    attrib("abstract")
  }
  if (symbol.final_) {
    attrib("final")
  }
  if (symbol.scope === "static") {
    attrib("static")
  }
  attrib("visibility", visibility(symbol), "public")
  if (symbol.since) {
    attrib("since", symbol.since)
  }
  if (symbol.augments && symbol.augments.length) {
    tag("extends", symbol.augments.sort().join(",")) // TODO what about multiple inheritance?
  }
  tag(
    "description",
    cleanupDoc(symbol.classdesc || cleanupDoc(symbol.description)),
    true
  )
  tagWithSince("experimental", symbol.experimental)
  tagWithSince("deprecated", symbol.deprecated)

  var i, j, member, param

  if (kind === "class") {
    if (symbol.__ui5.stereotype || hasSettings(symbol)) {
      tag("ui5-metadata")

      if (symbol.__ui5.stereotype) {
        attrib("stereotype", symbol.__ui5.stereotype)
      }

      writeMetadata(symbol)

      closeTag("ui5-metadata")
    }

    tag("constructor")
    attrib("visibility", visibility(symbol), "public")

    if (symbol.params) {
      collection("parameters")
      for (j = 0; j < symbol.params.length; j++) {
        param = symbol.params[j]
        if (param.name.indexOf(".") >= 0) {
          continue
        }
        tag("parameter")
        attrib("name", param.name)
        attrib("type", listTypes(param.type))
        attrib("optional", !!param.optional, false)
        if (param.defaultvalue !== undefined) {
          attrib("defaultValue", param.defaultvalue)
        }
        if (param.since) {
          attrib("since", param.since)
        }

        writeParameterProperties(param.name, symbol.params)
        tag("description", cleanupDoc(param.description), true)
        tagWithSince("experimental", param.experimental)
        tagWithSince("deprecated", param.deprecated)
        closeTag("parameter")
      }
      endCollection("parameters")
    }
    // tagWithSince("experimental", symbol.experimental); // TODO repeat from class?
    // tagWithSince("deprecated", symbol.deprecated); // TODO repeat from class?
    examples(symbol) // TODO here or for class?
    // secTags(symbol); // TODO repeat from class?
    closeTag("constructor")
  }

  var ownProperties = childrenOfKind(symbol, "property").own.sort(sortByAlias)
  if (ownProperties.length > 0) {
    collection("properties")
    for (i = 0; i < ownProperties.length; i++) {
      member = ownProperties[i]
      tag("property")
      attrib("name", member.name)
      if (member.__ui5.module && member.__ui5.module !== symbol.__ui5.module) {
        attrib("module", member.__ui5.module)
      }
      attrib("visibility", visibility(member), "public")
      if (member.scope === "static") {
        attrib("static")
      }
      if (member.since) {
        attrib("since", member.since)
      }
      attrib("type", listTypes(member.type))
      tag("description", cleanupDoc(member.description), true)
      tagWithSince("experimental", member.experimental)
      tagWithSince("deprecated", member.deprecated)
      examples(member)
      if (
        member.__ui5.resource &&
        member.__ui5.resource !== symbol.__ui5.resource
      ) {
        attrib("resource", member.__ui5.resource)
      }
      closeTag("property")
    }
    endCollection("properties")
  }

  var ownEvents = childrenOfKind(symbol, "event").own.sort(sortByAlias)
  if (ownEvents.length > 0) {
    collection("events")
    for (i = 0; i < ownEvents.length; i++) {
      member = ownEvents[i]
      tag("event")
      attrib("name", member.name)
      if (member.__ui5.module && member.__ui5.module !== symbol.__ui5.module) {
        attrib("module", member.__ui5.module)
      }
      attrib("visibility", visibility(member), "public")
      if (member.scope === "static") {
        attrib("static")
      }
      if (member.since) {
        attrib("since", member.since)
      }

      if (member.properties) {
        collection("parameters")
        for (j = 0; j < member.properties.length; j++) {
          param = member.properties[j]
          if (param.name.indexOf(".") >= 0) {
            continue
          }

          tag("parameter")
          attrib("name", param.name)
          attrib("type", listTypes(param.type))
          if (param.since) {
            attrib("since", param.since)
          }
          writeParameterProperties(param.name, member.properties)
          tag("description", cleanupDoc(param.description), true)
          tagWithSince("experimental", param.experimental)
          tagWithSince("deprecated", param.deprecated)
          closeTag("parameter")
        }
        endCollection("parameters")
      }
      tag("description", cleanupDoc(member.description), true)
      tagWithSince("experimental", member.experimental)
      tagWithSince("deprecated", member.deprecated)
      examples(member)
      //secTags(member);
      if (
        member.__ui5.resource &&
        member.__ui5.resource !== symbol.__ui5.resource
      ) {
        attrib("resource", member.__ui5.resource)
      }
      closeTag("event")
    }
    endCollection("events")
  }

  var ownMethods = childrenOfKind(symbol, "method").own.sort(sortByAlias)
  if (ownMethods.length > 0) {
    collection("methods")
    for (i = 0; i < ownMethods.length; i++) {
      member = ownMethods[i]
      tag("method")
      attrib("name", member.name)
      if (member.__ui5.module && member.__ui5.module !== symbol.__ui5.module) {
        attrib("module", member.__ui5.module)
      }
      attrib("visibility", visibility(member), "public")
      if (member.scope === "static") {
        attrib("static")
      }
      var returns = member.returns && member.returns.length && member.returns[0]
      var type = member.type || (returns && returns.type)
      type = listTypes(type)
      //if ( type && type !== 'void' ) {
      //	attrib("type", type, 'void');
      //}
      if ((type && type !== "void") || (returns && returns.description)) {
        tag("returnValue")
        if (type && type !== "void") {
          attrib("type", type)
        }
        if (returns && returns.description) {
          attrib("description", returns.description)
        }
        closeTag("returnValue")
      }
      if (member.since) {
        attrib("since", member.since)
      }

      if (member.params) {
        collection("parameters")
        for (j = 0; j < member.params.length; j++) {
          param = member.params[j]
          if (param.name.indexOf(".") >= 0) {
            continue
          }
          tag("parameter")
          attrib("name", param.name)
          attrib("type", listTypes(param.type))
          attrib("optional", !!param.optional, false)
          if (param.defaultvalue !== undefined) {
            attrib("defaultValue", param.defaultvalue)
          }
          if (param.since) {
            attrib("since", param.since)
          }
          writeParameterProperties(param.name, member.params)
          tag("description", cleanupDoc(param.description), true)
          tagWithSince("experimental", param.experimental)
          tagWithSince("deprecated", param.deprecated)
          closeTag("parameter")
        }
        endCollection("parameters")
      }
      tag("description", cleanupDoc(member.description), true)
      tagWithSince("experimental", member.experimental)
      tagWithSince("deprecated", member.deprecated)
      examples(member)
      //secTags(member);
      if (
        member.__ui5.resource &&
        member.__ui5.resource !== symbol.__ui5.resource
      ) {
        attrib("resource", member.__ui5.resource)
      }
      closeTag("method")
    }
    endCollection("methods")
  }

  //	if ( roots && symbol.__ui5.children && symbol.__ui5.children.length ) {
  //		collection("children", "kind");
  //		symbol.__ui5.children.forEach(writeSymbol);
  //		endCollection("children");
  //	}

  closeTag(kind)

  return obj[0]
}

// Description + Settings

function getConstructorDescription(symbol) {
  var description = symbol.description
  var tags = symbol.tags
  if (tags) {
    for (var i = 0; i < tags.length; i++) {
      if (tags[i].title === "ui5-settings" && tags[i].text) {
        description += "\n</p><p>\n" + tags[i].text
        break
      }
    }
  }
  return description
}

// Example

function makeExample(example) {
  var result = {
      caption: null,
      example: example
    },
    match = /^\s*<caption>([\s\S]+?)<\/caption>(?:[ \t]*[\n\r]*)([\s\S]+)$/i.exec(
      example
    )

  if (match) {
    result.caption = match[1]
    result.example = match[2]
  }

  return result
}

/* ---- exports ---- */

exports.publish = publish
