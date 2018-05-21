const childProcess = require("child_process")
const path = require("path")

const exampleDir = path.resolve(__dirname, "../example")
const rootDir = path.resolve(__dirname, "../")

// setup
childProcess.execSync("yarn", { cwd: exampleDir, stdio: "inherit" })
childProcess.execSync("yarn link", { cwd: rootDir, stdio: "inherit" })
childProcess.execSync("yarn link @sap-webide/webide-client-tools", {
    cwd: exampleDir,
    stdio: "inherit"
})
