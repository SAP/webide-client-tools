"use strict"

// const expect = require("chai").expect
const childProcess = require("child_process")
const path = require("path")
const semver = require("semver")
const fs = require("fs-extra")

jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000

let describeOrSkip = describe

// > 6.3 this requires support for
// https://nodejs.org/api/cli.html#cli_preserve_symlinks
// > 8 is used due to "ignore" strange errors in the voter when using node.js 6)
if (semver.lt(process.version, "8.0.0")) {
    describeOrSkip = describe.skip
}
/* eslint-disable prefer-arrow-callback */
describeOrSkip("karma integration tests", function() {
    function clean() {
        fs.removeSync(path.resolve(__dirname, "../template/coverage"))
    }

    beforeAll(clean)

    it("can test a sample feature", function() {
        const templateDir = path.resolve(__dirname, "../template")
        childProcess.execSync("npm run test_di", {
            cwd: templateDir,
            stdio: "inherit"
        })

        // todo: check coverage dir contents
    })

    afterAll(clean)
})
