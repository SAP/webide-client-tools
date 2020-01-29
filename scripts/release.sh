#!/usr/bin/env bash

node scripts/pre_release.js
node scripts/update_changelog.js "$1"
npm-run-all ci_full_flow
node scripts/release "$1"