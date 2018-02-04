const di = require("webide-client-tools").diBackend
const fs = require("fs")
const path = require("path")
const xml2js = require("xml2js")

// assumes peer dependency (webide) is present
const pomRelativePath = "../node_modules/webide/pom.xml"
const pomXML = fs.readFileSync(
    path.resolve(__dirname, pomRelativePath),
    "UTF-8"
)
let diVersion = ""

xml2js.parseString(pomXML, (err, rez) => {
    diVersion = rez.project.properties[0]["di.version"][0]
})

const releaseType = "snapshots"

if (process.env.DI_URL === undefined) {
    throw Error("Missing DI Base Url")
}

const url = `${process.env
    .DI_URL}${releaseType}&g=com.sap.di&a=local-package&v=${diVersion}&e=jar`

di.download({
    url,
    requestGetOptions: { rejectUnauthorized: false }
})
