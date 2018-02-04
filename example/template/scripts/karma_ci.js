"use strict"

const { Server, config } = require("karma")
const path = require("path")

// TODO: detect travis too?
if (process.env.XMAKE_TOOL_INSTALLATION_ROOT) {
    console.log(
        "Running in xMake mode. Karma tests will not be executed as no browsers are available..."
    )
} else {
    const karmaConfig = config.parseConfig(
        path.resolve(__dirname, "../karma.conf.js")
    )

    // CI only configurations
    karmaConfig.singleRun = true
    // Unable to get latest Chrome working on SAP's Travis
    // Will retry when SAP's Travis upgrades infrastructure.
    karmaConfig.browsers = ["Firefox"]

    const server = new Server(karmaConfig, exitCode => {
        console.error(`Karma has exited with ${exitCode}`)
        process.exit(exitCode)
    })
    server.start()
}
