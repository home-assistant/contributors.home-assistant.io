// The arguments actions/github-script passes to the scripts in this
// directory, limited to the parts they use.
import type { Octokit } from "@octokit/rest";

export interface IssuePayload {
  issue: {
    user: { login: string };
  };
  repository: {
    default_branch: string;
  };
}

export interface Context<Payload> {
  runId: number;
  repo: { owner: string; repo: string };
  issue: { number: number };
  payload: Payload;
}

export interface GitHubScriptArgs<Payload = unknown> {
  github: Octokit;
  context: Context<Payload>;
}
