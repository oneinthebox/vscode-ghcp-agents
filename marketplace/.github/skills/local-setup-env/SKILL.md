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

Sets up the developer's local shell and language runtimes to match project requirements. Uses version manager tools (nvm for Node.js, sdkman for Java, pyenv for Python) to install and activate the correct versions. Configures environment variables and IDE settings as needed. All actions are platform-aware — commands adapt to macOS, Linux, or Windows (WSL/Git Bash).

## Inputs

- **--runtime {node|java|python|all}** — which runtime(s) to set up (default: `all` detected from project files)
- Optional: `--shell {bash|zsh|fish|powershell}` — target shell (auto-detected if omitted)
- Optional: `--ide {vscode|intellij|none}` — configure IDE settings (default: `vscode` if `.vscode/` exists)
- Optional: `--env-file {path}` — path to `.env.example` or `.env.template` to use as source

## Steps

1. **Detect OS and shell**
   a. Run `uname -s` to identify the platform (Darwin/Linux/MINGW).
   b. Check `$SHELL` or `echo $0` for the active shell.
   c. Identify the shell profile file (`~/.bashrc`, `~/.zshrc`, `~/.config/fish/config.fish`, `$PROFILE` for PowerShell).

2. **Detect required runtimes from project files**
   a. **Node.js**: Check for `.nvmrc`, `.node-version`, `.tool-versions`, or `engines.node` in `package.json`.
   b. **Java**: Check for `.java-version`, `.sdkmanrc`, `.tool-versions`, or `java.sourceCompatibility` in `build.gradle`/`pom.xml`.
   c. **Python**: Check for `.python-version`, `.tool-versions`, or `requires-python` in `pyproject.toml`.
   d. If no version file found for a runtime, skip it (do not install unnecessary runtimes).

3. **Install and configure Node.js (if required)**
   a. Check if `nvm` is installed (`command -v nvm` or check `~/.nvm/nvm.sh`). If not, install it.
   b. Run `nvm install` (reads `.nvmrc`) or `nvm install <version>` for the required version.
   c. Run `nvm use` to activate the version.
   d. Verify: `node --version` matches the required version.
   e. Ensure `nvm` auto-use is configured in the shell profile if not already present.

4. **Install and configure Java (if required)**
   a. Check if `sdk` (SDKMAN) is installed (`command -v sdk`). If not, install it via `curl -s "https://get.sdkman.io" | bash`.
   b. Run `sdk install java <version>` for the required version (parse from `.sdkmanrc` or `.java-version`).
   c. Run `sdk use java <version>` to activate.
   d. Verify: `java --version` matches the required version.
   e. Set `JAVA_HOME` in the shell profile if not already configured.

5. **Install and configure Python (if required)**
   a. Check if `pyenv` is installed (`command -v pyenv`). If not, install it (`brew install pyenv` on macOS, or `curl https://pyenv.run | bash` on Linux).
   b. Run `pyenv install <version>` for the required version (parse from `.python-version`).
   c. Run `pyenv local <version>` or `pyenv global <version>` to activate.
   d. Verify: `python --version` matches the required version.
   e. Ensure `pyenv` init is in the shell profile.

6. **Configure environment variables**
   a. If `.env.example` or `.env.template` exists, check if `.env` exists.
   b. If `.env` is missing, copy the template to `.env` and warn the developer to fill in secret values.
   c. If `.env` exists, compare keys against the template — warn about missing keys.
   d. Never overwrite existing `.env` values.

7. **Configure IDE settings (if applicable)**
   a. If `.vscode/` exists and `--ide` is `vscode`:
      - Check for `settings.json`, `extensions.json`, `launch.json`.
      - If `extensions.json` has recommended extensions, list them and suggest installing via `code --install-extension`.
   b. If IntelliJ project files exist and `--ide` is `intellij`:
      - Verify SDK paths align with installed runtimes.

## Output

```markdown
## Environment Setup Report

### Platform
| Field | Value |
|-------|-------|
| OS | {macOS/Linux/Windows} |
| Shell | {bash/zsh/fish/powershell} |
| Profile | {path to shell profile} |

### Runtimes
| Runtime | Required | Installed | Status |
|---------|----------|-----------|--------|
| Node.js | {version} | {version} | OK/INSTALLED/FAILED |
| Java | {version} | {version} | OK/INSTALLED/FAILED/SKIPPED |
| Python | {version} | {version} | OK/INSTALLED/FAILED/SKIPPED |

### Environment Variables
| Status | Details |
|--------|---------|
| .env | {created from template / exists / N/A} |
| Missing keys | {list or "none"} |

### IDE
| IDE | Configured | Notes |
|-----|-----------|-------|
| {vscode/intellij} | {yes/no/skipped} | {details} |

### Actions Taken
- [list of actions performed]

### Manual Steps Required
- [list of things the developer must do manually, if any]
```

## Validation

- Each installed runtime version matches the version specified in project configuration files
- Version managers (nvm, sdkman, pyenv) are installed and initialized in the shell profile
- Shell profile changes are syntactically valid (source the profile and check for errors)
- `.env` file exists if a template was found, with all required keys present
- IDE settings are consistent with installed runtime paths
- No application source files were modified
