const childProcess = require("child_process")
const path = require("path")

const templateDir = path.resolve(__dirname, "../template")
const rootDir = path.resolve(__dirname, "../../")

// setup
childProcess.execSync("npm install", { cwd: templateDir, stdio: "inherit" })
childProcess.execSync("npm link", { cwd: rootDir, stdio: "inherit" })
childProcess.execSync("npm link webide-client-tools", {
    cwd: templateDir,
    stdio: "inherit"
})

// running tests.
childProcess.execSync("npm run test_examples", {
    cwd: rootDir,
    stdio: "inherit"
})
