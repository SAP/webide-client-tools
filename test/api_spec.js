jest.mock("vm")

const api = require("../src/api")
const expect = require("chai").expect
const _ = require("lodash")

describe("The Exported tools APIs", () => {
  it("All API functions are exposed with the same name they have been defined with", () => {
    const ignoredObjects = ["middlewares"]

    function validateAPIObject(apiObj) {
      _.forOwn(apiObj, (currApiPart, currApiName) => {
        if (_.isFunction(currApiPart)) {
          expect(currApiPart.name).to.equal(currApiName)
        } else if (
          _.isObject(currApiPart) &&
          !_.includes(ignoredObjects, currApiName)
        ) {
          validateAPIObject(currApiPart)
        }

        expect(currApiPart).to.not.equal(undefined)
      })
    }

    validateAPIObject(api)
  })
})
