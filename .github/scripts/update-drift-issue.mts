// Keeps one issue up to date with what the component pages document that the
// frontend no longer has: opens it when there is drift, updates it while
// there is, and closes it when there is none. Reads the report that
// `pnpm check:component-docs` wrote to the runner's temporary directory. Run
// by .github/workflows/component-docs-drift.yml through actions/github-script:
//
//   const { default: updateDriftIssue } = await import(
//     `${process.env.GITHUB_WORKSPACE}/site/.github/scripts/update-drift-issue.mts`
//   );
//   await updateDriftIssue({ github, context });

import { readFileSync } from "node:fs";
import path from "node:path";
import type { GitHubScriptArgs } from "./github-script.d.ts";

// The parts of the JSON report of scripts/check-component-docs.ts this uses.
interface DriftReport {
  frontend: { commit: string };
  missingCount: number;
  goneCount: number;
}

// The marker finds the issue again, whatever its title says.
const MARKER = "<!-- component-docs-drift -->";
const LABEL = "area: design";

// The limit of an issue body.
const MAX_BODY_LENGTH = 65000;

export default async function updateDriftIssue({ github, context }: GitHubScriptArgs) {
  const runnerTemp = process.env.RUNNER_TEMP;
  if (!runnerTemp) {
    throw new Error("RUNNER_TEMP is not set");
  }

  const report: DriftReport = JSON.parse(readFileSync(path.join(runnerTemp, "drift.json"), "utf8"));
  const markdown = readFileSync(path.join(runnerTemp, "drift.md"), "utf8");

  const { owner, repo } = context.repo;
  const commit = report.frontend.commit.slice(0, 10);

  const openIssues = await github.paginate(github.rest.issues.listForRepo, {
    owner,
    repo,
    state: "open",
    labels: LABEL,
    per_page: 100,
  });
  const issue = openIssues.find((item) => !item.pull_request && item.body?.includes(MARKER));

  // Removed source files and components count as drift too.
  const driftCount = report.missingCount + report.goneCount;

  if (driftCount === 0) {
    if (issue) {
      await github.rest.issues.createComment({
        owner,
        repo,
        issue_number: issue.number,
        body: `The component pages match home-assistant/frontend@${commit} again. Closing.`,
      });
      await github.rest.issues.update({
        owner,
        repo,
        issue_number: issue.number,
        state: "closed",
        state_reason: "completed",
      });
      console.log(`Closed #${issue.number}`);
    } else {
      console.log("No drift, and no open issue.");
    }
    return;
  }

  // The full report per page goes in a collapsed section, so the
  // list to act on stays on top.
  const [summary, perPage = ""] = markdown.split(/^## Per page$/m);
  const skill = `https://github.com/${owner}/${repo}/blob/main/.github/skills/design-component-page/SKILL.md`;
  let body = [
    MARKER,
    "The weekly [Component docs drift workflow](" +
      `https://github.com/${owner}/${repo}/actions/runs/${context.runId}) ` +
      "keeps this issue up to date, and closes it when the pages match the frontend again.",
    "",
    "To fix a page, read the component on the `dev` branch of the frontend, and follow the " +
      `[\`design-component-page\` skill](${skill}). ` +
      "Run `pnpm check:component-docs` against a frontend checkout before and after.",
    "",
    summary.replace(/^# Component docs drift\n+/, "").trim(),
    "",
    "<details>",
    "<summary>Every page</summary>",
    "",
    perPage.trim(),
    "",
    "</details>",
  ].join("\n");

  if (body.length > MAX_BODY_LENGTH) {
    body = `${body.slice(0, MAX_BODY_LENGTH)}\n\n</details>\n\nThe report was cut off. Run the check locally for all of it.`;
  }

  const title = `Component pages document API the frontend no longer has (${driftCount})`;

  if (issue) {
    await github.rest.issues.update({
      owner,
      repo,
      issue_number: issue.number,
      title,
      body,
    });
    console.log(`Updated #${issue.number}`);
  } else {
    const { data: created } = await github.rest.issues.create({
      owner,
      repo,
      title,
      body,
      labels: [LABEL],
    });
    console.log(`Opened #${created.number}`);
  }
}
