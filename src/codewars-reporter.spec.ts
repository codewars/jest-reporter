import fs from "fs";
import path from "path";
import { promisify } from "util";

import execa from "execa";
import escapeRegExp from "escape-string-regexp";

const readFile = promisify(fs.readFile);
const access = promisify(fs.access);
const exists = async (path: string) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const structureMatches = (a: string, b: string) =>
  expect(
    a.match(/<(?:DESCRIBE|IT|PASSED|FAILED|ERROR|COMPLETEDIN)::>/g)!.join("")
  ).toStrictEqual(
    b.match(/<(?:DESCRIBE|IT|PASSED|FAILED|ERROR|COMPLETEDIN)::>/g)!.join("")
  );

describe("CodewarsReporter", () => {
  const cwd = path.join(__dirname, "..");
  const fixturesDir = path.join(__dirname, "..", "fixtures");
  const files = fs.readdirSync(fixturesDir).filter((f) => f.endsWith(".js"));
  for (const file of files) {
    it(file.replace(/\.js$/, ""), async () => {
      const { stdout } = await execa(
        "jest",
        [
          path.join(fixturesDir, file),
          "--reporters=./lib/codewars-reporter.js",
          "--testMatch='**/fixtures/*.js'",
        ],
        {
          cwd,
          preferLocal: true,
          stripFinalNewline: false,
          reject: false,
        }
      );
      const expectedFile = path.join(
        fixturesDir,
        file.replace(/\.js$/, ".expected.txt")
      );

      if (await exists(expectedFile)) {
        const expected = await readFile(expectedFile, {
          encoding: "utf-8",
        });
        // Allow duration to change.
        const expectedPattern = new RegExp(
          escapeRegExp(expected).replace(/(?<=<COMPLETEDIN::>)\d+/g, "\\d+")
        );
        expect(stdout).toMatch(expectedPattern);
      } else {
        const samplePath = path.join(
          fixturesDir,
          file.replace(/\.js$/, ".sample.txt")
        );
        const sample = await readFile(samplePath, {
          encoding: "utf-8",
        });
        structureMatches(stdout, sample);
      }
    });
  }
});
