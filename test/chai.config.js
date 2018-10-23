const chai = require("chai")
const chaiAsPromised = require("chai-as-promised")
const sinonChai = require("sinon-chai")

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(require("chai-string"))
chai.config.showDiff = true
chai.config.truncateThreshold = 0

module.exports = {
  expect: chai.expect
}
