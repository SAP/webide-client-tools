// Needs to run in browser, but the eslint config here is for node.js (ES6).
/* eslint-disable */
;(function(root, factory) {
  if (typeof define === "function" && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory)
  } else if (typeof module === "object" && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory()
  } else {
    // Browser globals (root is window)
    root.fakePlugins = factory()
  }
})(this, function() {
  return {
    defaultFakePlugins: function(isKarma, webappPath) {
      if (webappPath === undefined) {
        webappPath = "node_modules/webide/src/main/webapp/"
      }

      var prefixDir = isKarma ? "/base" : ""
      var prefixPath =
        prefixDir + "/" + webappPath + "test-resources/sap/watt/util/"

      return [
        {
          pluginName: "qunit.common.util.fakeFileBackend",
          sURI: prefixPath + "fakeFileBackend",
          required: true
        },
        {
          pluginName: "fakeValidationDAO",
          sURI: prefixPath + "fakeCodeValidationDAO",
          required: true
        },
        {
          pluginName: "qunit.common.util.fakeDestination",
          sURI: prefixPath + "fakeDestination",
          required: true
        },
        {
          pluginName: "qunit.common.util.fakeMTA",
          sURI: prefixPath + "fakeMTA",
          required: true
        },
        {
          pluginName: "qunit.common.util.fakeProjectSpaceSettings",
          sURI: prefixPath + "fakeSpaceSettings",
          required: true
        }
      ]
    }
  }
})
