"use strict"

const config = require("./release_config")
const fs = require("fs")

// update CHANGELOG.md date
const nowDate = new Date()
const nowDateString = nowDate.toLocaleDateString().replace(/\//g, "-")
const changeLogDate = config.changeLogString.replace(
  config.dateTemplateRegExp,
  `## ${newVersion} (${nowDateString})`
)
fs.writeFileSync(config.changeLogPath, changeLogDate)
