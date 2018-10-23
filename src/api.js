"use strict"

const path = require("path")
const fs = require("fs")
const _ = require("lodash")

const bundling = require("./bundling")
const karma = require("./karma")
const devServer = require("./dev_server")
const sdk = require("./sdk")

const API = {}
const sdkClone = _.cloneDeep(sdk)
delete sdkClone.test

API.configurations = {}

API.bundling = bundling
API.karma = karma
API.devServer = devServer
API.sdk = sdkClone

API.VERSION = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../package.json"), "UTF-8")
).version
module.exports = API
