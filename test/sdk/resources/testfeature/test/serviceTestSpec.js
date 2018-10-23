define(["STF"], function(STF) {
  "use strict"
  describe("Testing a service configure", function() {
    //  every suite must have a uniqueName. using a none unique name will cause an error.
    var suiteName = "example_service_test"
    var getService = STF.getServicePartial(suiteName)

    before(function() {
      // The default behavior is to load the webide with it's default plugins
      // And the tested feature package.json.
      // but without the che backend related plugins, so it runs in "in memory" mode.
      // See the docs for "startWebIde" for customization options
      // http://sap.github.io/webide-client-tools/web/html_docs/module-STF.html
      return STF.startWebIde(suiteName)
    })

    it("Will successfully invoke 'getNotificationCount'", function() {
      // EXAMPLE_START:sample:configurationProperty:notificationObject
      var sampleService = getService("sample")

      return sampleService.configure({ notificationCount: 3 })
      // EXAMPLE_END
    })

    after(function() {
      STF.shutdownWebIde(suiteName)
    })
  })

  describe("Testing a service method", function() {
    //  every suite must have a uniqueName. using a none unique name will cause an error.
    var suiteName = "example_service_test"
    var getService = STF.getServicePartial(suiteName)

    before(function() {
      // The default behavior is to load the webide with it's default plugins
      // And the tested feature package.json.
      // but without the che backend related plugins, so it runs in "in memory" mode.
      // See the docs for "startWebIde" for customization options
      // http://sap.github.io/webide-client-tools/web/html_docs/module-STF.html
      return STF.startWebIde(suiteName)
    })

    it("Will successfully invoke 'getNotificationCount'", function() {
      // EXAMPLE_START:sample:method:getNotificationCount
      var sampleService = getService("sample")

      return sampleService.getNotificationCount().then(function(notiCount) {
        expect(notiCount).to.equal(0)
      })
      // EXAMPLE_END
    })

    it("Will successfully invoke 'sayHello'", function() {
      // EXAMPLE_START:sample:method:sayHello
      var sampleService = getService("sample")

      return sampleService.sayHello("Elad").then(function(notiCount) {
        expect(notiCount.notificationCount).to.equal(1)
      })
      // EXAMPLE_END
    })

    it("Will successfully modify 'modifyMe'", function() {
      // EXAMPLE_START:sample:method:modifyVar
      var sampleService = getService("sample")

      expect(sampleService.modifyVar("Elad").to.equal("EladModifiedSample"))
      // EXAMPLE_END
    })

    after(function() {
      STF.shutdownWebIde(suiteName)
    })
  })

  describe("Testing a service method #2 - optionally using bundled artifacts", function() {
    //  every suite must have a uniqueName. using a none unique name will cause an error.
    var suiteName = "example_service_test2_dist"
    var getService = STF.getServicePartial(suiteName)

    before(function() {
      // empty config will re-use defaults
      var config = {}

      // this is injected via the karma.conf.js config property
      if (__karma__.config.DIST) {
        console.log("running " + suiteName + " on bundled artifacts from dist")

        config.featureConfig = STF.startWebIde.DEFAULT_OPTIONS().featureConfig

        // we must use the precise name of the feature because the webide's core team do not wish to
        // allow optionally disabling this validation.
        config.featureConfig.bundledFeatures["client-tools-example"] =
          "file:../../../../../dist/package.json"
      }

      return STF.startWebIde(suiteName, config)
    })

    it("Will successfully invoke a service method", function() {
      var sampleService = getService("sample")

      return sampleService.getNotificationCount().then(function(notiCount) {
        expect(notiCount).to.equal(0)
      })
    })

    after(function() {
      STF.shutdownWebIde(suiteName)
    })
  })

  describe("Testing a service method", function() {
    //  every suite must have a uniqueName. using a none unique name will cause an error.
    var suiteName = "example_service_test"
    var getService = STF.getServicePartial(suiteName)

    before(function() {
      // The default behavior is to load the webide with it's default plugins
      // And the tested feature package.json.
      // but without the che backend related plugins, so it runs in "in memory" mode.
      // See the docs for "startWebIde" for customization options
      // http://sap.github.io/webide-client-tools/web/html_docs/module-STF.html
      return STF.startWebIde(suiteName)
    })

    it("example for subscription to created event of document interface", function() {
      // EXAMPLE_START:sample:event:notificationDisplayed
      var sampleService = getService("sample")
      var mSample = {
        // EXAMPLE_END
        requires: {
          services: ["command"]
        },
        // EXAMPLE_START:sample:event:notificationDisplayed
        subscribes: {
          "sample:notificationDisplayed":
            "sampleService:myNotificationDisplayedHandler"
        }
      }
      sampleService.prototype.myNotificationDisplayedHandler = function(
        notificationCount
      ) {
        var notificationNumberSoFar = notificationCount
      }
      // EXAMPLE_END

      after(function() {
        STF.shutdownWebIde(suiteName)
      })
    })
  })
})
