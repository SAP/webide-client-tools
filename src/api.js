"use strict"

const path = require("path")
const fs = require("fs")

const bundling = require("./bundling")
const karma = require("./karma")
const devServer = require("./dev_server")
const diBackend = require("./di_backend")

const API = {}

API.configurations = {}

API.bundling = bundling
API.karma = karma
API.devServer = devServer
API.diBackend = diBackend

API.VERSION = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../package.json"), "UTF-8")
).version
module.exports = API
