#!/bin/bash
# ./gen-fixture.sh fixtures/example.js
# ./gen-fixture.sh fixtures/example.js expected
# ./gen-fixture.sh fixtures/example.js sample
# for f in $(ls fixtures/*.js); do ./gen-fixture.sh "$f"; done

./node_modules/.bin/jest $1 --reporters=./lib/codewars-reporter.js --testMatch='**/fixtures/*.js' > "${1%.js}.${2:-expected}.txt"
