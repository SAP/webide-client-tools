"use strict"

const config = require("./release_config")
const git = require("gitty")
const _ = require("lodash")
const semver = require("semver")
const jf = require("jsonfile")
const fs = require("fs")

const myRepo = git("")

// bump package.json
const newVersion = semver.inc(config.currVersion, config.mode)
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
