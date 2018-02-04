const expect = require("chai").expect
const metadataReader = require("../../src/utils/meta_data_reader")
const _ = require("lodash")
const path = require("path")

/* eslint-disable no-unused-expressions */
describe("The metaDataReader", () => {
    describe("WebIDE metadata example", () => {
        const pkgPath = path.resolve(
            __dirname,
            "./resources/webide_metadata/uitools/hcp-orion/client"
        )
        const metadata = metadataReader(pkgPath, "package.json")
        const pluginsMeta = metadata.pluginsMeta
        const interfacesMeta = metadata.interfacesMeta
        const servicesMeta = metadata.servicesMeta
        const actualConfigsMeta = metadata.configsMeta
        const configsToInterfaceMeta = metadata.configsToInterfaceMeta

        it("should find a great many plugins/services/interfaces in the WebIde MetaData", () => {
            expect(_.keys(pluginsMeta).length).to.be.greaterThan(100)
            expect(_.keys(interfacesMeta).length).to.be.greaterThan(100)
            expect(_.keys(servicesMeta).length).to.be.greaterThan(100)
        })

        it("should find some basic plugins/services/interfaces in the WebIde MetaData", () => {
            expect(_.keys(pluginsMeta)).to.contain("sap.watt.platform.log")
            expect(_.keys(interfacesMeta)).to.contain(
                "sap.watt.common.service.ide.Command"
            )
            expect(_.keys(servicesMeta)).to.contain("document")
        })

        it("should find at least 2 entries in the WebIde configsMeta", () => {
            expect(_.keys(actualConfigsMeta)).to.not.be.empty

            const expected = [
                "/toolsets/package.json",
                "/platform/package.json",
                "/common/package.json",
                "/platform/hcp/package.json",
                "/ideplatform/package.json",
                "/ideplatform/orion/package.json",
                "/saptoolsets/fiori/package-hcp-orion.json",
                "/uitools/hcp-orion/client/package.json"
            ]

            const modifiedExpected = _.map(expected, currExpected =>
                currExpected.replace(/\\/g, "/")
            )

            const modifiedActual = _.map(actualConfigsMeta, meta =>
                meta.baseURI
                    .replace(/\\/g, "/")
                    .replace(/^.*webide_metadata/g, "")
            )
            expect(_.values(modifiedActual)).to.contain.members(
                _.values(modifiedExpected)
            )
        })

        it("should find at least some entries in the productive WebIde configsToInterfaceMeta", () => {
            expect(_.keys(configsToInterfaceMeta)).to.not.be.empty

            const expectedConfigPaths = [
                "/toolsets/package.json",
                "/platform/package.json",
                "/common/package.json",
                "/ideplatform/package.json"
            ]

            const modifiedExpected = _.map(expectedConfigPaths, currExpected =>
                currExpected.replace(/\\/g, "/")
            )

            const actualConfigPaths = _.keys(configsToInterfaceMeta)
            const actualConfigsToInterfaceMeta = _.map(
                actualConfigPaths,
                currConfigsToInterfaceMeta =>
                    currConfigsToInterfaceMeta
                        .replace(/\\/g, "/")
                        .replace(/^.*webide_metadata/g, "")
            )

            expect(actualConfigsToInterfaceMeta).to.contain.members(
                modifiedExpected
            )
        })
    })

    it("should fail given an invalid path", () => {
        expect(() => {
            metadataReader("../hello_invalid_world", "bamba.json")
        }).to.throw("missing file")
    })

    it("should fail given an plugin that provides an interface in an incorrect manner", () => {
        const pkgPath = path.resolve(
            __dirname,
            "./resources/invalidInterfaceDecl"
        )
        expect(() => {
            metadataReader(pkgPath, "package.json")
        }).throw(
            "interface declaration path must start with a valid plugin name"
        )
    })

    it("should fail when plugin path does not contain file prefix", () => {
        const pkgPath = path.resolve(__dirname, "./resources/invalidPluginPath")
        expect(() => {
            metadataReader(pkgPath, "package.json")
        }).to.throw('Path common does not contain the "file:" prefix')
    })

    it("should fail when feature path does not contain file prefix", () => {
        const pkgPath = path.resolve(
            __dirname,
            "./resources/invalidFeaturePath"
        )
        expect(() => {
            metadataReader(pkgPath, "package.json")
        }).to.throw('Path inner does not contain the "file:" prefix')
    })

    it("should not add plugins from deprecated config includes", () => {
        const pkgPath = path.resolve(__dirname, "./resources/deprecatedInclude")
        const plugins = metadataReader(pkgPath, "package.json").pluginsMeta
        expect(_.keys(plugins)).to.have.members(["common"])
        expect(_.keys(plugins)).to.not.have.members(["core"])
    })
})
