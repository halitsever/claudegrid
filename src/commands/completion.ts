import { BACKENDS } from "../config.js";
import { CliError } from "../ui.js";

export const SUBCOMMANDS = ["ui", "desktop", "init", "doctor", "presets", "worktrees", "completion", "help"];
export const LAUNCH_FLAGS = ["--layout", "--panes", "--backend", "--worktrees", "--no-worktrees", "--model", "--prompt", "--config", "--cwd", "--name", "--command", "--no-keep-shell", "--no-new-tab", "--new-tab", "--dry-run", "--json", "--detach", "--help", "--version"];
const LAYOUTS = ["1x2", "2x1", "2x2", "3x1", "3x2", "3x3", "4x2"];

function bash(): string {
  return `# claudegrid bash completion
_claudegrid() {
  local cur prev
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  case "$prev" in
    -b|--backend) COMPREPLY=($(compgen -W "${BACKENDS.join(" ")}" -- "$cur")); return ;;
    -l|--layout) COMPREPLY=($(compgen -W "${LAYOUTS.join(" ")}" -- "$cur")); return ;;
    -c|--config) COMPREPLY=($(compgen -f -- "$cur")); return ;;
    -C|--cwd) COMPREPLY=($(compgen -d -- "$cur")); return ;;
    completion) COMPREPLY=($(compgen -W "bash zsh fish" -- "$cur")); return ;;
    worktrees) COMPREPLY=($(compgen -W "list clean" -- "$cur")); return ;;
    desktop) COMPREPLY=($(compgen -W "install uninstall" -- "$cur")); return ;;
  esac
  if [[ "$cur" == -* ]]; then
    COMPREPLY=($(compgen -W "${LAUNCH_FLAGS.join(" ")}" -- "$cur"))
  elif [[ $COMP_CWORD -eq 1 ]]; then
    COMPREPLY=($(compgen -W "${SUBCOMMANDS.join(" ")} $(claudegrid presets --names 2>/dev/null)" -- "$cur"))
  fi
}
complete -F _claudegrid claudegrid
`;
}

function zsh(): string {
  return `#compdef claudegrid
# claudegrid zsh completion
_claudegrid() {
  local -a commands presets
  commands=(
    'ui:open the claudegrid app in a window'
    'desktop:add claudegrid to your app menu'
    'init:create a .claudegrid.json in this project'
    'doctor:check claude, terminals and config'
    'presets:list presets from your configs'
    'worktrees:list or clean claudegrid git worktrees'
    'completion:print a shell completion script'
    'help:show help'
  )
  presets=(\${(f)"$(claudegrid presets --names 2>/dev/null)"})
  _arguments -s \\
    '(-l --layout)'{-l,--layout}'[grid as COLSxROWS or a pane count]:layout:(${LAYOUTS.join(" ")})' \\
    '(-n --panes)'{-n,--panes}'[number of panes]:count:' \\
    '(-b --backend)'{-b,--backend}'[terminal to use]:backend:(${BACKENDS.join(" ")})' \\
    '(-w --worktrees)'{-w,--worktrees}'[give every pane its own git worktree]' \\
    '--no-worktrees[turn worktrees off]' \\
    '(-m --model)'{-m,--model}'[model for every pane]:model:(opus sonnet haiku)' \\
    '*'{-p,--prompt}'[prompt for the next pane]:prompt:' \\
    '(-c --config)'{-c,--config}'[config file]:file:_files' \\
    '(-C --cwd)'{-C,--cwd}'[run from this directory]:dir:_directories' \\
    '(-t --name)'{-t,--name}'[window and session name]:name:' \\
    '--command[program to run instead of claude]:command:_command_names' \\
    '--no-keep-shell[close the pane when claude exits]' \\
    '--no-new-tab[open a new window instead of a tab]' \\
    '--dry-run[print the plan without opening anything]' \\
    '--json[print the plan as JSON]' \\
    '(-d --detach)'{-d,--detach}'[do not attach to the new tmux session]' \\
    '(-h --help)'{-h,--help}'[show help]' \\
    '(-v --version)'{-v,--version}'[show version]' \\
    '1: :->first' \\
    '*:: :->rest'
  case $state in
    first) _describe 'command' commands; _describe 'preset' presets ;;
    rest)
      case $words[1] in
        completion) _values 'shell' bash zsh fish ;;
        worktrees) _values 'action' list clean ;;
        desktop) _values 'action' install uninstall ;;
      esac ;;
  esac
}
_claudegrid "$@"
`;
}

function fish(): string {
  const lines = [
    "# claudegrid fish completion",
    "complete -c claudegrid -f",
    `complete -c claudegrid -n __fish_use_subcommand -a "${SUBCOMMANDS.join(" ")}"`,
    'complete -c claudegrid -n __fish_use_subcommand -a "(claudegrid presets --names 2>/dev/null)" -d preset',
    `complete -c claudegrid -s l -l layout -x -a "${LAYOUTS.join(" ")}" -d "grid as COLSxROWS or a pane count"`,
    'complete -c claudegrid -s n -l panes -x -d "number of panes"',
    `complete -c claudegrid -s b -l backend -x -a "${BACKENDS.join(" ")}" -d "terminal to use"`,
    'complete -c claudegrid -s w -l worktrees -d "give every pane its own git worktree"',
    'complete -c claudegrid -l no-worktrees -d "turn worktrees off"',
    'complete -c claudegrid -s m -l model -x -a "opus sonnet haiku" -d "model for every pane"',
    'complete -c claudegrid -s p -l prompt -x -d "prompt for the next pane"',
    'complete -c claudegrid -s c -l config -r -F -d "config file"',
    'complete -c claudegrid -s C -l cwd -x -a "(__fish_complete_directories)" -d "run from this directory"',
    'complete -c claudegrid -s t -l name -x -d "window and session name"',
    'complete -c claudegrid -l command -x -a "(__fish_complete_command)" -d "program to run instead of claude"',
    'complete -c claudegrid -l no-keep-shell -d "close the pane when claude exits"',
    'complete -c claudegrid -l no-new-tab -d "open a new window instead of a tab"',
    'complete -c claudegrid -l dry-run -d "print the plan without opening anything"',
    'complete -c claudegrid -l json -d "print the plan as JSON"',
    'complete -c claudegrid -s d -l detach -d "do not attach to the new tmux session"',
    'complete -c claudegrid -n "__fish_seen_subcommand_from completion" -a "bash zsh fish"',
    'complete -c claudegrid -n "__fish_seen_subcommand_from worktrees" -a "list clean"',
    'complete -c claudegrid -n "__fish_seen_subcommand_from desktop" -a "install uninstall"',
  ];
  return lines.join("\n") + "\n";
}

export function completion(shell: string | undefined): string {
  if (shell === "bash") return bash();
  if (shell === "zsh") return zsh();
  if (shell === "fish") return fish();
  throw new CliError(shell ? `no completion for "${shell}"` : "which shell?", "use `claudegrid completion bash`, `zsh` or `fish`");
}
