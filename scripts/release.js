"use strict"

const config = require("./release_config")
const git = require("gitty")
const _ = require("lodash")
const semver = require("semver")
const jf = require("jsonfile")
const fs = require("fs")

const myRepo = git("")

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

// bump package.json
const newVersion = semver.inc(config.currVersion, mode)
const bumpedPkgJson = _.clone(config.pkgJson)
bumpedPkgJson.version = newVersion
jf.writeFileSync(config.packagePath, bumpedPkgJson, { spaces: 2, EOL: "\r\n" })

// update CHANGELOG.md date
const nowDate = new Date()
const nowDateString = nowDate.toLocaleDateString().replace(/\//g, "-")
const changeLogDate = config.changeLogString.replace(
  config.dateTemplateRegExp,
  `## ${newVersion} (${nowDateString})`
)
fs.writeFileSync(config.changeLogPath, changeLogDate)

// Create commit and push to master
const newTagName = config.tagPrefix + newVersion

myRepo.addSync([
  config.packagePath,
  config.changeLogPath,
  config.htmlDocsPath,
  config.websitePath
])

myRepo.commitSync(`release ${newVersion}`)
myRepo.createTagSync(newTagName)
myRepo.push("origin", "master", () => {
  console.log("finished push to branch")
})
myRepo.push("origin", newTagName, () => {
  console.log("finished push tag")
})
