#!/bin/bash
# Shell profile additions for local development
# Append these lines to ~/.zshrc (macOS) or ~/.bashrc (Linux)

# --- fnm (Fast Node Manager) ---
# Auto-switch Node.js version when entering a directory with .node-version or .nvmrc
eval "$(fnm env --use-on-cd)"

# --- fnm completions (zsh) ---
eval "$(fnm completions --shell zsh)"

# --- Global npm packages PATH ---
export PATH="$HOME/.local/bin:$PATH"

# --- pnpm ---
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

# --- pnpm completions (zsh) ---
[[ -f ~/.config/tabtab/zsh/__tabtab.zsh ]] && . ~/.config/tabtab/zsh/__tabtab.zsh

# --- pyenv (if using pyenv for Python version management) ---
export PYENV_ROOT="$HOME/.pyenv"
[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init -)"
