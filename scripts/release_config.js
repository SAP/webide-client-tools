"use strict"

const fs = require("fs")
const jf = require("jsonfile")
const path = require("path")
const _ = require("lodash")

const packagePath = path.join(__dirname, "../package.json")
const changeLogPath = path.join(__dirname, "../docs/changes/CHANGELOG.md")

const pkgJson = jf.readFileSync(packagePath)
const changeLogString = fs.readFileSync(changeLogPath, "utf8").toString()

const dateTemplateRegExp = /^(## X\.Y\.Z )\(INSERT_DATE_HERE\)/

module.exports = {
  packagePath,
  changeLogPath,
  htmlDocsPath: "docs/web/html_docs",
  websitePath: "docs/web/site",
  pkgJson,
  changeLogString,
  currVersion: pkgJson.version,
  tagPrefix: "v",
  dateTemplateRegExp
}
