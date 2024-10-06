import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as ini from "ini";
import axios from "axios";
import { execSync } from "child_process";

// GitHub API token from environment or hardcoded

const token = vscode.workspace
  .getConfiguration("gitApproversHover")
  .get<string>("githubToken");
// If no token is found, fallback to environment variable or handle the missing token
const GITHUB_TOKEN = token || process.env.GITHUB_TOKEN || "";
const GITHUB_API_URL = "https://api.github.com";

// Function to extract repository owner and name from .git/config file
function getRepoOwnerAndNameFromGitConfig(): {
  owner: string;
  name: string;
} | null {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return null;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;
    const gitConfigPath = path.join(workspacePath, ".git", "config");

    // Read the .git/config file
    if (fs.existsSync(gitConfigPath)) {
      const gitConfig = ini.parse(fs.readFileSync(gitConfigPath, "utf-8"));

      // Extract the remote.origin.url
      const originUrl = gitConfig['remote "origin"']?.url;
      if (originUrl) {
        // Match SSH or HTTPS URL
        const sshMatch = originUrl.match(/git@github\.com:(.*)\/(.*)\.git/);
        const httpsMatch = originUrl.match(
          /https:\/\/github\.com\/(.*)\/(.*)\.git/
        );

        let owner: string | null = null;
        let name: string | null = null;

        if (sshMatch) {
          owner = sshMatch[1];
          name = sshMatch[2];
        } else if (httpsMatch) {
          owner = httpsMatch[1];
          name = httpsMatch[2];
        }

        if (owner && name) {
          return { owner, name };
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error reading .git/config:", error);
    return null;
  }
}

// Main hover provider logic
export function activate(context: vscode.ExtensionContext) {
  if (!GITHUB_TOKEN) {
    vscode.window.showErrorMessage(
      "GitHub token is not set. Please enter it in the settings."
    );
    return null;
  }

  console.log(" ACTIVATED --- No commit found for this line.");
  vscode.window.showInformationMessage(
    "Git Approvers Hover Extension Activated!"
  );

  vscode.languages.registerHoverProvider("javascript", {
    async provideHover(document, position, token) {
      return new vscode.Hover("I am a hover!");
    },
  });

  const disposable = vscode.languages.registerHoverProvider("*", {
    async provideHover(document, position, token) {
      // Get file path and line number
      const filePath = document.uri.fsPath;
      const lineNumber = position.line + 1; // Line numbers are zero-based in VS Code, but one-based in git blame

      try {
        // Get the repo owner and name from .git/config
        const repoInfo = getRepoOwnerAndNameFromGitConfig();

        if (!repoInfo) {
          return new vscode.Hover(
            " ✅ Could not determine repository owner or name.",
            new vscode.Range(position, position)
          );
        }

        const { owner, name } = repoInfo;

        const commitHash = await gitBlame(filePath, lineNumber);

        if (!commitHash) {
          console.log("✅No commit found for this line.");
          return new vscode.Hover(
            "✅No commit found for this line.",
            new vscode.Range(position, position)
          );
        }

        const prNumber = await getPRForCommit(owner, name, commitHash);

        if (!prNumber) {
          console.log("✅No PR found for commit", commitHash);
          return new vscode.Hover(
            `✅ No PR found for commit ${commitHash}.`,
            new vscode.Range(position, position)
          );
        }

        const approvers = await getPRApprovers(owner, name, prNumber);

        if (approvers.length === 0) {
          console.log("✅No approvals found for PR #", prNumber);
          return new vscode.Hover(
            `✅ No approvals found for PR #${prNumber}.`,
            new vscode.Range(position, position)
          );
        }

        const approverList = approvers
          .map((approver) => approver.user.login)
          .join(", ");
        console.log("✅Approved by:", approverList);
        return new vscode.Hover(
          `✅ Approved by: ${approverList}`,
          new vscode.Range(position, position)
        );
      } catch (error) {
        console.error("Error while fetching PR approval info:", error);
        return new vscode.Hover(
          "✅ Error fetching PR approval info.",
          new vscode.Range(position, position)
        );
      }
    },
  });

  context.subscriptions.push(disposable);
}

async function gitBlame(
  filePath: string,
  lineNumber: number
): Promise<string | null> {
  try {
    const result = execSync(
      `git blame -L ${lineNumber},${lineNumber} ${filePath}`,
      { cwd: vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath || "" }
    ).toString();
    const commitHash = result.split(" ")[0];
    return commitHash;
  } catch (error) {
    console.error("Error running git blame:", error);
    return null;
  }
}

async function getPRForCommit(
  owner: string,
  name: string,
  commitHash: string
): Promise<number | null> {
  try {
    const url = `${GITHUB_API_URL}/repos/${owner}/${name}/commits/${commitHash}/pulls`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.groot-preview+json",
      },
    });

    if (response.data.length > 0) {
      return response.data[0].number; // Assume the first PR is the relevant one
    }
    return null;
  } catch (error) {
    console.error("Error fetching PR for commit:", error);
    return null;
  }
}

async function getPRApprovers(
  owner: string,
  name: string,
  prNumber: number
): Promise<any[]> {
  try {
    const url = `${GITHUB_API_URL}/repos/${owner}/${name}/pulls/${prNumber}/reviews`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
      },
    });

    return response.data.filter((review: any) => review.state === "APPROVED");
  } catch (error) {
    console.error("Error fetching PR reviews:", error);
    return [];
  }
}

export function deactivate() {}
