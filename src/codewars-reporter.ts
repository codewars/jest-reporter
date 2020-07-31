import Anser from "anser";

// Get types from @jest packages.
// These can be `devDependencies` because no JS is emitted and we're currently
// not emitting declarations.
import { ConsoleBuffer } from "@jest/console";
import {
  Test,
  Reporter,
  Config,
  Context,
  ReporterOnStartOptions,
} from "@jest/reporters";
import {
  AssertionResult,
  TestResult,
  AggregatedResult,
} from "@jest/test-result";

export type CodewarsReporterOptions = {};

export default class CodewarsReporter implements Reporter {
  _globalConfig: Config.GlobalConfig;
  _options: CodewarsReporterOptions;
  _shouldFail: boolean | undefined;
  rootDir: string;
  constructor(
    globalConfig: Config.GlobalConfig,
    options: CodewarsReporterOptions
  ) {
    this._globalConfig = globalConfig;
    this._options = options;
    this.rootDir = globalConfig.rootDir;
  }

  onRunStart(results: AggregatedResult, options: ReporterOnStartOptions): void {
    //
  }

  onTestStart(test: Test): void {
    //
  }

  onTestResult(
    test: Test,
    testResult: TestResult,
    aggregatedResult: AggregatedResult
  ): void {
    const results = testResult.testResults;
    _logSuite(groupTestsBySuites(results));
    _showConsoleOutput(testResult.console, this.rootDir);
    // Show failure message showing more details like source.
    // Maybe this needs to be configurable.
    if (!testResult.failureMessage) return;

    const failureMsg = testResult.failureMessage.trim();
    if (!failureMsg) return;

    const msg = escapeLF(ansi2html(failureMsg));
    console.log(
      `\n<LOG:HTML:Failures><pre class="ansi"><code>${msg}</code></pre>`
    );
  }

  onRunComplete(contexts: Set<Context>, results: AggregatedResult): void {
    //
  }

  getLastError() {
    if (this._shouldFail) {
      // Force exit code non zero
      return new Error("Test Failed");
    }
  }
}

// https://github.com/sindresorhus/extract-stack
function extractStack(stack: string) {
  if (!stack) return "";
  const match = stack.match(/(?:\n {4}at .*)+/);
  if (!match) return "";
  return match[0].slice(1);
}

const escapeLF = (s: string) => s.replace(/\n/g, "<:LF:>");
const escapeHtml = (s: string) =>
  s.replace(/[&<>]/g, (c) => (c == "&" ? "&amp;" : c == "<" ? "&lt;" : "&gt;"));
const ansi2html = (s: string) =>
  Anser.ansiToHtml(escapeHtml(s), { use_classes: true });

type TestSuiteGroup = {
  suites: TestSuiteGroup[];
  tests: AssertionResult[];
  title: string;
};

// https://github.com/facebook/jest/blob/179b3e8cd9838789254e2a2d63b32a699ca236d3/packages/jest-cli/src/reporters/verbose_reporter.js#L35
// Note that if suites with same names exist, they're merged.
function groupTestsBySuites(testResults: AssertionResult[]) {
  const root: TestSuiteGroup = { suites: [], tests: [], title: "" };
  for (const testResult of testResults) {
    let targetSuite = root;
    // Find the target suite for this test, creating nested suites as necessary.
    for (const title of testResult.ancestorTitles) {
      let matchingSuite = targetSuite.suites.find((s) => s.title === title);
      if (!matchingSuite) {
        matchingSuite = { suites: [], tests: [], title };
        targetSuite.suites.push(matchingSuite);
      }
      targetSuite = matchingSuite;
    }
    targetSuite.tests.push(testResult);
  }
  return root;
}

function _logSuite(suite: TestSuiteGroup) {
  const hasTitle = suite.title !== "";
  if (hasTitle) console.log(`\n<DESCRIBE::>${suite.title}`);
  for (const t of suite.tests) _logTest(t);
  for (const s of suite.suites) _logSuite(s);
  if (hasTitle) console.log(`\n<COMPLETEDIN::>`);
}

function _logTest(test: AssertionResult) {
  console.log(`\n<IT::>${test.title}`);
  switch (test.status) {
    case "passed":
      console.log(`\n<PASSED::>Test Passed`);
      break;
    case "failed": {
      console.log(`\n<FAILED::>Test Failed`);
      // We need to separate this because `<FAILED::>` doesn't support HTML mode at the moment.
      const msg = escapeLF(
        ansi2html(_collectFailureMessages(test.failureMessages).trim())
      );
      console.log(
        `\n<LOG:HTML:Failure><pre class="ansi"><code>${msg}</code></pre>`
      );
      break;
    }
    case "pending":
      console.log(`\n<LOG::>Test Pending`);
      break;
    case "todo":
      console.log(`\n<LOG::>Test TODO`);
      break;
  }
  const time = test.duration ? test.duration.toFixed(0) : "0";
  console.log(`\n<COMPLETEDIN::>${time}`);
}

function _collectFailureMessages(messages: string[]) {
  const lines: string[] = [];
  for (const m of messages) {
    lines.push(m.replace(extractStack(m), ""));
  }
  return lines.join("\n\n");
}

function _showConsoleOutput(cs: ConsoleBuffer | undefined, rootDir: string) {
  if (!cs) return;
  for (const c of cs) {
    const message = c.message;
    if (c.type === "error") {
      console.error(message);
      continue;
    }

    // Don't prepend location information when output command is used
    if (/^<(?:LOG|TAB|PROP|OUT|SWAP|TAG):(?:[A-Z]*):(?:[^>]*)>/.test(message)) {
      console.log(message);
    } else {
      // LogEntry.origin is a stack trace in Jest 26, use the first line.
      const from = c.origin.split("\n")[0].trim().replace(rootDir, "");
      console.log(`\n<LOG::console.${c.type} ${from}>${escapeLF(message)}`);
    }
  }
}
