# Git Approvers Hover Extension

## Overview

**Git Approvers Hover** is a Visual Studio Code extension that shows the PR approvers when hovering over lines of code. It works by leveraging `git blame` to identify the commit and then fetches the related pull request and its approvals from GitHub.

## Features

- Hover over a line of code to see the list of users who approved the corresponding GitHub Pull Request.
- Supports projects with Git repositories linked to GitHub.

## Installation

1. Download the `.vsix` file for the extension.
2. Open Visual Studio Code.
3. Go to the **Extensions** view by clicking the Extensions icon in the Activity Bar or pressing `Ctrl+Shift+X`.
4. Click on the three-dot menu (`...`) in the top-right corner of the Extensions view.
5. Select **Install from VSIX...**.
6. Browse to and select the downloaded `.vsix` file.

## Usage

1. Open a workspace that is part of a Git repository.
2. Hover over any line of code in a tracked file.
3. If the line corresponds to a commit with an associated GitHub pull request, the extension will display the list of approvers for that PR.

## Requirements

- The workspace must be a Git repository.
- The repository must be hosted on GitHub.
- A GitHub API token with appropriate permissions should be set as an environment variable (`GITHUB_TOKEN`) or configured in the extension.

## Setup GitHub API Token

The extension requires a GitHub API token to fetch pull request information. You can set the token as an environment variable:

1. Go to [GitHub's Personal Access Token page](https://github.com/settings/tokens) and generate a new token with the necessary permissions (e.g., `repo`).
2. Set the token as an environment variable:

   ```bash
   export GITHUB_TOKEN=your-token-here
   ```
