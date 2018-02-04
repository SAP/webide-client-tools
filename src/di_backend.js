"use strict"

// THIS file is IGNORED from coverage perspective  (-x command istanbul command line)
// because it can't be effectively tested using unit tests.

const path = require("path")
const childProcess = require("child_process")
const fs = require("fs-extra")
const os = require("os")
const _ = require("lodash")
const ps = require("ps-node")
const request = require("request")
const ProgressBar = require("progress")

let isWindows
let isUnix
if (/^win/.test(os.platform())) {
    isWindows = true
    isUnix = false
} else {
    isWindows = false
    isUnix = true
}

const lookup = {
    command: "java"
}
if (isUnix) {
    lookup.psargs = "ux"
}

const CMD_IDENTIFIER_ARG = "-STARTED_BY_CLIENT_TOOLS"
function startDiProcess(jarFile, port, isSync) {
    const pathInfo = path.parse(jarFile)
    const baseCommand = `java -DSERVER_PORT=${port} -jar ${pathInfo.base} ${CMD_IDENTIFIER_ARG}`

    let command
    let cmdArguments
    let options = {
        cwd: pathInfo.dir,
        shell: true
    }

    if (isSync) {
        options = _.assign(options, {
            stdio: "inherit"
        })
    } else {
        const out = fs.openSync(`${pathInfo.dir}out.log`, "w")
        const err = fs.openSync(`${pathInfo.dir}err.log`, "w")

        options = _.assign(options, {
            detached: true,
            stdio: ["ignore", out, err]
        })
    }

    let child
    if (isWindows) {
        command = "cmd.exe"
        cmdArguments = ["/C", baseCommand]
        child = childProcess[`spawn${isSync ? "Sync" : ""}`](
            command,
            cmdArguments,
            options
        )
    } else if (isUnix) {
        command = baseCommand
        console.log(command)
        child = childProcess[`spawn${isSync ? "Sync" : ""}`](
            command,
            [],
            options
        )
    }

    if (!isSync) {
        child.unref()
    }
}

const DOWNLOAD_DEFAULT_OPTIONS = {
    targetFile: "di.jar",
    targetDir: "./dev/di",
    successCallback: _.noop,
    requestGetOptions: {}
}

const START_DEFAULT_OPTIONS = {
    /**
     * Relative to CWD by default
     * Note that this is the default location the di.jar will be downloaded to.
     */
    targetFile: "./dev/di/di.jar",
    port: 8888,
    sync: false
}

const CLEAN_DEFAULT_OPTIONS = {
    /**
     * Relative to CWD by default
     * Note that this is the default directory the di.jar will be downloaded to.
     */
    targetDir: "./dev/di"
}

/** @type {webideClientTools.DiBackendAPI} */
const diBackend = {
    download: function download(options) {
        const actualOptions = _.defaults(options, DOWNLOAD_DEFAULT_OPTIONS)

        if (_.isUndefined(actualOptions.url)) {
            throw Error("It now mandatory to provide a URL to download DI from")
        }

        fs.ensureDirSync(actualOptions.targetDir)
        const url = actualOptions.url

        console.log(`downloading DI jar from: ${url}`)
        const stream = request
            .get(url, actualOptions.requestGetOptions)
            .on("response", res => {
                const len = parseInt(res.headers["content-length"], 10)
                console.log()
                const bar = new ProgressBar(
                    "  downloading [:bar] :rate/bps :percent :etas",
                    {
                        complete: "=",
                        incomplete: " ",
                        width: 20,
                        total: len
                    }
                )

                res.on("data", chunk => {
                    bar.tick(chunk.length)
                })

                res.on("end", () => {
                    console.log("\n")
                })
            })
            .pipe(
                fs.createWriteStream(
                    `${actualOptions.targetDir}/${actualOptions.targetFile}`
                )
            )

        stream.on("finish", () => {
            actualOptions.successCallback()
        })
    },

    start: function start(options) {
        const actualOptions = _.defaults(options, START_DEFAULT_OPTIONS)

        if (!fs.existsSync(actualOptions.targetFile)) {
            const message = `di_server jar not found in ${actualOptions.targetFile}`
            throw Error(message)
        }
        const pathInfo = path.parse(actualOptions.targetFile)

        ps.lookup(lookup, (err, resultList) => {
            let isRunning = false
            let isSamePort = false
            if (resultList) {
                const allArgs = _.flatMap(
                    resultList,
                    process => process.arguments
                )
                isRunning = _.find(
                    allArgs,
                    currArg => currArg === pathInfo.base
                )
                isSamePort = _.find(
                    allArgs,
                    currArg => currArg === actualOptions.port
                )
            }
            if (isRunning || isSamePort) {
                const errMsg = `Found already running DI process: ${pathInfo.base}, with same port: ${actualOptions.port}`
                throw Error(errMsg)
            } else {
                startDiProcess(
                    actualOptions.targetFile,
                    actualOptions.port,
                    actualOptions.sync
                )
            }
        })
    },

    stop: function stop() {
        ps.lookup(lookup, (err, resultList) => {
            const diProcess = _.find(resultList, currProcess =>
                _.includes(currProcess.arguments, CMD_IDENTIFIER_ARG)
            )
            if (diProcess) {
                console.log(`DI process found, PID: ${diProcess.pid}:`)
                console.log(`\t${JSON.stringify(diProcess)}`)
                ps.kill(diProcess.pid, "SIGKILL", killErr => {
                    if (killErr) {
                        console.error(
                            `failed to kill di process error: ${killErr}`
                        )
                    } else {
                        console.log(
                            `DI Process ${diProcess.pid} has been killed!`
                        )
                    }
                })
            } else {
                console.warn("No DI process to kill")
            }
        })
    },

    clean: function clean(options) {
        const actualOptions = _.defaults(options, CLEAN_DEFAULT_OPTIONS)
        try {
            fs.removeSync(actualOptions.targetDir)
        } catch (err) {
            console.error(`deleting di folder failed: ${err}`)
            throw err
        }
    }
}

module.exports = diBackend
