define(["STF"], function(STF) {
    "use strict"

    // only execute this test when the CLI contains the WITH_DI argument
    if (__karma__.config.WITH_DI) {
        console.log("running test with DI backend")

        describe("Testing a service method with DI", function() {
            //  every suite must have a uniqueName. using a none unique name will cause an error.
            var suiteName = "example_service_test_with_di"
            var getService = STF.getServicePartial(suiteName)

            before(function() {
                // This will start the webide with the di (chebackend) services enabled
                // requires a running DI backend...
                // See the docs for "startWebIdeWithDI" for customization options
                // http://sap.github.io/webide-client-tools/web/html_docs/module-STF.html
                return STF.startWebIdeWithDI(suiteName)
            })

            it("Will successfully invoke a service method", function() {
                var sampleService = getService("sample")

                return sampleService
                    .getNotificationCount()
                    .then(function(notiCount) {
                        expect(notiCount).to.equal(0)
                    })
            })

            after(function() {
                STF.shutdownWebIde(suiteName)
            })
        })
    }
})
