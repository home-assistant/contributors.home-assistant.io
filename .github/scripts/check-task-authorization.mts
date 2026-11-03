// Closes a Task issue opened by someone who isn't allowed to, with a friendly
// pointer to the right place. Members of the organization and the people in
// CODEOWNERS are allowed. Run by .github/workflows/restrict-task-creation.yml
// through actions/github-script:
//
//   const { default: checkTaskAuthorization } = await import(
//     `${process.env.GITHUB_WORKSPACE}/.github/scripts/check-task-authorization.mts`
//   );
//   await checkTaskAuthorization({ github, context });

import type { GitHubScriptArgs, IssuePayload } from "./github-script.d.ts";

const isNotFound = (error: unknown) =>
  error instanceof Error && "status" in error && error.status === 404;

export default async function checkTaskAuthorization({
  github,
  context,
}: GitHubScriptArgs<IssuePayload>) {
  const issueAuthor = context.payload.issue.user.login;

  // Members of the organization are always allowed. Only a 404 means
  // "not a member": any other error leaves the answer unknown, and
  // fails the job before the issue is touched.
  try {
    await github.rest.orgs.checkMembershipForUser({
      org: "home-assistant",
      username: issueAuthor,
    });
    console.log(`${issueAuthor} is an organization member`);
    return;
  } catch (error) {
    if (!isNotFound(error)) {
      throw error;
    }

    console.log(`${issueAuthor} is not an organization member, checking CODEOWNERS`);
  }

  // So are the people listed in CODEOWNERS. Teams are skipped:
  // their members are organization members, covered above.
  for (const path of [".github/CODEOWNERS", "CODEOWNERS"]) {
    try {
      const { data: codeownersFile } = await github.rest.repos.getContent({
        owner: context.repo.owner,
        repo: context.repo.repo,
        path,
        ref: context.payload.repository.default_branch,
      });
      if (Array.isArray(codeownersFile) || codeownersFile.type !== "file") {
        throw new Error(`${path} is not a file`);
      }
      const codeownersContent = Buffer.from(codeownersFile.content, "base64").toString("utf-8");

      const owners = new Set<string>();
      for (const line of codeownersContent.split("\n")) {
        for (const entry of line.split("#")[0].split(/\s+/)) {
          if (entry.startsWith("@") && !entry.includes("/")) {
            owners.add(entry.slice(1).toLowerCase());
          }
        }
      }

      if (owners.has(issueAuthor.toLowerCase())) {
        console.log(`${issueAuthor} is a code owner`);
        return;
      }
      break;
    } catch (error) {
      // Not there: try the next place. Anything else fails the job,
      // so a code owner is never turned away by a broken lookup.
      if (!isNotFound(error)) {
        throw error;
      }
    }
  }

  console.log(`${issueAuthor} is not authorized to create Task issues`);

  await github.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number,
    body:
      `Hi @${issueAuthor}, thank you for your contribution!\n\n` +
      `Task issues are restricted to Open Home Foundation staff and authorized contributors.\n\n` +
      `If you would like to:\n` +
      `- Give feedback on a page of this site: use the [page feedback form](https://github.com/home-assistant/contributors.home-assistant.io/issues/new?template=feedback.yml)\n` +
      `- Report a bug in Home Assistant: [Report a bug](https://contributors.home-assistant.io/start/report-a-bug/) explains which repository it goes in\n` +
      `- Request a feature: use [feature requests](https://github.com/home-assistant/feature-requests/discussions)\n\n` +
      `If you believe you should be able to create Task issues, please contact the maintainers.`,
  });

  await github.rest.issues.update({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number,
    state: "closed",
    state_reason: "not_planned",
  });

  await github.rest.issues.addLabels({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number,
    labels: ["auto-closed"],
  });
}
