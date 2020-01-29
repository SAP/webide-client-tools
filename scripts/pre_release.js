const config = require("./release_config")
const git = require("gitty")
const _ = require("lodash")

const myRepo = git("")
const status = myRepo.statusSync()

// Checks and Validations
if (
  !_.isEmpty(status.staged) ||
  !_.isEmpty(status.unstaged) ||
  !_.isEmpty(status.untracked)
) {
  console.log(
    "Error: git working directory must be clean in order to perform a release"
  )
  process.exit(-1)
}

const branchesInfo = myRepo.getBranchesSync()

// if (branchesInfo.current !== "master") {
//   console.log(
//     "Error: can only perform release job from master or temp_master branch"
//   )
//   process.exit(-1)
// }

if (!config.dateTemplateRegExp.test(config.changeLogString)) {
  console.log(
    "CHANGELOG.md must have first line in the format '## X.Y.Z (INSERT_DATE_HERE)'"
  )
  process.exit(-1)
}
