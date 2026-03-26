---
name: local-setup-env
description: "Configure shell environment, language runtimes (Node, Java, Python), environment variables, and IDE settings. Detects OS and shell, installs or switches to required runtime versions using version managers, and verifies the environment is ready for development."
allowed-tools:
  - codebase
  - terminal
  - edit
references: []
---

## Context

Sets up the developer's local environment with the correct tools, language runtimes, and shell configuration. Uses fnm (Fast Node Manager) as the recommended Node.js version manager. Provides platform-specific install commands for macOS (Homebrew), Windows (winget), and Linux.

---

## Node.js Version Management

### fnm (Recommended)

fnm is a fast, cross-platform Node.js version manager written in Rust.

**Installation:**

| Platform | Command |
|----------|---------|
| macOS | `brew install fnm` |
| Windows | `winget install Schniz.fnm` |
| Linux | `curl -fsSL https://fnm.vercel.app/install \| bash` |

**Usage:**

```bash
fnm install 20.11.0       # Install a specific version
fnm use 20.11.0           # Switch to that version
fnm default 20.11.0       # Set as default version
```

**Project version files:**

- `.node-version` — contains the exact version (e.g., `20.11.0`)
- `.nvmrc` — contains major or exact version (e.g., `20` or `20.11.0`)

**Auto-switching:**

Add to your shell profile (`~/.zshrc`, `~/.bashrc`, or PowerShell `$PROFILE`):

```bash
eval "$(fnm env --use-on-cd)"
```

This automatically switches Node versions when you `cd` into a directory with `.node-version` or `.nvmrc`.

### Fallback: nvm

If fnm is not available, nvm can be used as a fallback:

```bash
brew install nvm    # macOS
```

Then add to shell profile:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

---

## Package Managers

| Manager | Install Command | Notes |
|---------|----------------|-------|
| npm | Bundled with Node.js | Default, no extra install needed |
| pnpm | `npm install -g pnpm` or `brew install pnpm` | Fast, disk-efficient |
| yarn | `corepack enable && corepack prepare yarn@stable --activate` | Via Node.js corepack |

---

## System Tools by Platform

| Tool | macOS (brew) | Windows (winget) | Why Needed |
|------|-------------|-----------------|------------|
| git | `brew install git` | `winget install Git.Git` | Version control |
| jq | `brew install jq` | `winget install jqlang.jq` | JSON processing in scripts |
| python3 | `brew install python3` | `winget install Python.Python.3.12` | Build scripts, tooling |
| bash | Pre-installed | Git Bash (bundled with Git) | Shell scripts |
| fnm | `brew install fnm` | `winget install Schniz.fnm` | Node.js version management |
| colima | `brew install colima` | WSL2 (see local-setup-docker) | Docker runtime |

---

## Shell Profile Setup

### Detect Shell

| OS | Default Shell | Profile File |
|----|--------------|--------------|
| macOS | zsh | `~/.zshrc` |
| Linux | bash | `~/.bashrc` |
| Windows | PowerShell | `$PROFILE` (typically `~/.config/powershell/Microsoft.PowerShell_profile.ps1`) |

### Recommended Profile Additions

**fnm auto-switch (bash/zsh):**

```bash
eval "$(fnm env --use-on-cd)"
```

**PATH for global npm packages:**

```bash
export PATH="$HOME/.local/bin:$PATH"
```

**Completions:**

```bash
# fnm completions (zsh)
eval "$(fnm completions --shell zsh)"

# pnpm completions (zsh)
eval "$(pnpm completion zsh)"
```

---

## Python Version Management

- Check for `.python-version` file in project root
- If present, use `pyenv` or `uv` to install the specified version
- **pyenv:** `brew install pyenv` (macOS), `curl https://pyenv.run | bash` (Linux)
- **uv:** `brew install uv` (macOS), `pip install uv` (cross-platform)

---

## Workflow

1. **Detect OS and shell** — determine platform, shell type, profile file path
2. **Check required tools** — verify each tool is installed (node, git, jq, python3, docker)
3. **Install missing tools** — output the correct install command for the detected platform
4. **Check project version files** — read `.node-version` / `.nvmrc` and install the correct Node version via fnm
5. **Check Python version** — read `.python-version` and suggest pyenv/uv install if needed
6. **Update shell profile** — add fnm auto-switch, PATH entries, completions
7. **Verify** — run version commands for all tools to confirm everything works

## Output

```json
{
  "os": "darwin",
  "shell": "zsh",
  "profileFile": "~/.zshrc",
  "tools": [
    { "name": "node", "installed": true, "version": "20.11.0", "installCmd": null },
    { "name": "git", "installed": true, "version": "2.43.0", "installCmd": null },
    { "name": "jq", "installed": false, "version": null, "installCmd": "brew install jq" },
    { "name": "python3", "installed": true, "version": "3.12.1", "installCmd": null },
    { "name": "docker", "installed": true, "version": "24.0.7", "installCmd": null }
  ],
  "nodeVersion": "20.11.0",
  "pythonVersion": "3.12.1"
}
```

## Validation

- Each installed tool responds to its version command without error
- Node.js version matches the version specified in `.node-version` or `.nvmrc`
- fnm is installed and the auto-switch hook is present in the shell profile
- Shell profile changes are syntactically valid
- Python version matches `.python-version` if present
- All PATH entries are valid and do not contain duplicates
- No application source files were modified
