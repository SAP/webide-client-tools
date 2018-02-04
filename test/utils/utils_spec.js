const expect = require("chai").expect
const utils = require("../../src/utils/utils")

/* eslint-disable no-unused-expressions */
describe("utils", () => {
    describe("backslashesToSlashes", () => {
        it("should return undefined when receiving undefined", () => {
            expect(utils.backslashesToSlashes(undefined)).to.be.undefined
        })

        it("should convert backslashes to forward slashes", () => {
            expect(utils.backslashesToSlashes("C:\\a\\b.c")).to.equal(
                "C:/a/b.c"
            )
        })

        it("should return the same path when it does not contain backslashes", () => {
            expect(utils.backslashesToSlashes("C:/a/b.c")).to.equal("C:/a/b.c")
        })
    })
})
