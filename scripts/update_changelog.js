"use strict"

const config = require("./release_config")
const fs = require("fs")
const semver = require("semver")
const _ = require("lodash")

// update CHANGELOG.md date
let mode
if (_.includes(process.argv, "patch")) {
  mode = "patch"
} else if (_.includes(process.argv, "minor")) {
  mode = "minor"
} else if (_.includes(process.argv, "major")) {
  mode = "major"
} else {
  console.log("release mode (patch|minor|major) not provided")
  process.exit(-1)
}
const newVersion = semver.inc(config.currVersion, mode)
const nowDate = new Date()
const nowDateString = nowDate.toLocaleDateString().replace(/\//g, "-")
const changeLogDate = config.changeLogString.replace(
  config.dateTemplateRegExp,
  `## ${newVersion} (${nowDateString})`
)
fs.writeFileSync(config.changeLogPath, changeLogDate)
