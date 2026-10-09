<h1 align="center">Claude Code Filetree</h1>

<p align="center">
  An IDE-style file tree for Claude Code that shows what Claude is doing and where in files
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Claude_Code-%E2%89%A5_2.1.295-D97757?logo=claude&logoColor=fff" alt="Claude Code 2.1.295 or newer">
  <img src="https://img.shields.io/badge/version-0.3.1-blue" alt="Version">
  <img src="https://img.shields.io/badge/type-mod-6f42c1" alt="Claude Code mod">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
</p>

<p align="center">
  <img src="media/filetree-shimmer.gif" alt="filetree shimmering the file Claude is editing" width="900">
</p>

> [!NOTE]
> filetree is a Claude Code **mod** and needs **Claude Code 2.1.295+**. It shows in the right sidebar, which needs the fullscreen layout (`/tui fullscreen`) and a terminal at least 110 columns wide. Tested on Linux, macOS and Windows; mods don't load in WSL sessions of the Desktop app.

---

## Installation

The repo is its own plugin marketplace. Run this in the terminal:

```bash
claude plugin marketplace add data-goblin/claude-code-filetree
claude plugin install filetree@claude-code-filetree
```

Or inside a Claude Code session:

```text
/plugin marketplace add data-goblin/claude-code-filetree
/plugin install filetree@claude-code-filetree
```

Installed it as `filetree@filetree` before the repository was renamed? Nothing to do: that install keeps loading and keeps receiving updates.

## Features

- Interactive file tree for the working directory where you're using Claude Code; it follows the cwd, or `/filetree <path>` pins another folder
- Search the file tree, including folders you have not opened yet
- Git status per file and folder in color, with exact lines changed (`+N` `-N`) on modified files and `?:N M:N D:N` file counts on folders
- Branch, upstream and ahead/behind in the header
- Visual indicator of Claude reads and searches (purple), writes (orange) and commits (green); collapsed folders open to show the file

  <img src="media/filetree-read.gif" alt="Files shimmer purple while Claude reads and searches them" width="800">

- Git and GitHub operations via `git` and `gh` (commit, push, pull, checkout, merge, PR and more) shown as a status at the bottom of the pane

  <img src="media/filetree-git.gif" alt="A committed file shimmers green and the footer shows the commit" width="800">

- Selection-aware: the selected file is passed to Claude as context through a `prompt.submit` hook, and `@path` mentions in a prompt reveal that file in the tree

  <img src="media/filetree-ask.gif" alt="Selecting config.yaml in the tree and asking Claude what it changed there" width="800">

- File and folder sizes: the `Σ` header button swaps the date column for sizes; folders show their disk usage (`du`, or a summed listing on Windows), worked out in the background for the rows on screen and refreshed after Claude writes
- Double-click a file to open it in its default app
- Click to select, arrow keys or [vim keys](#moving-through-the-tree) to move through the tree, and [hotkeys](#show-hide-and-focus-the-tree-from-anywhere) to show, hide and focus it
- Light on large repos: outside a repo it only checks once whether one exists, and every git call is scoped to the cwd
- Nerd Font icons with a plain Unicode fallback
- On Omarchy, the pane takes its colors and background from the current theme and follows theme switches; elsewhere, pick a [theme](#settings) and rounded corners

### Resizing the pane

You can resize the pane with the mouse, or by setting custom `pane:grow` or `pane:shrink` keybindings in `keybindings.json`

<p align="center">
  <img src="media/filetree-resize.gif" alt="Dragging the filetree pane edge to resize it" width="900">
</p>

## Keyboard

### Show, hide and focus the tree from anywhere

A mod can't claim a key of its own, so filetree listens for two of Claude Code's keybinding actions that Claude Code itself only handles inside the `/diff` dialog: `diff:back` (show/hide) and `diff:nextSource` (focus). Bind your keys to them in `~/.claude/keybindings.json`:

```json
{
  "$schema": "https://www.schemastore.org/claude-code-keybindings.json",
  "$docs": "https://code.claude.com/docs/en/keybindings",
  "bindings": [
    {
      "context": "Global",
      "bindings": {
        "ctrl+o": "diff:back",
        "ctrl+e": "diff:nextSource",
        "ctrl+x ctrl+o": "app:toggleTranscript"
      }
    }
  ]
}
```

- **ctrl+o** shows or hides the tree, from the prompt or from inside the tree. A hidden tree stays hidden through `/clear` and folder changes until you show it again or run `/filetree`.
- **ctrl+e** opens the tree if it's hidden and gives it the keyboard; **Esc** gives the keyboard back to the prompt. Claude Code only hands over the keyboard while the prompt is empty.
- ctrl+o normally toggles the transcript, so the example moves that to `ctrl+x ctrl+o`. Binding ctrl+e in Global also replaces end-of-line in the prompt (End still works).

Any other action works too: set **Show/hide action** and **Focus action** in `/config`. Pick one Claude Code isn't handling at the time you press the key; leave one empty to turn it off.

### Moving through the tree

Once the tree has the keyboard (ctrl+e, or Tab from the search field), vim keys move through it:

| Keys | Command | Does |
| --- | --- | --- |
| `j` `k` / ↓ ↑ | `down` `up` | next / previous row |
| `d` `u` | `halfPageDown` `halfPageUp` | half a page |
| `f` `b` / PgDn PgUp | `pageDown` `pageUp` | a page |
| `g g` / Home | `top` | first row |
| `g e` `G` / End | `bottom` | last row |
| `l` / → | `expand` | open the folder |
| `h` / ← | `collapse` | close the folder, or go to its parent |
| `p` | `parent` | go to the parent folder |
| `o` / Enter | `open` | open the file in its default app, or open/close a folder |
| Space | `toggle` | open/close a folder, select a file |
| `s` `/` | `search` | jump to the search field; Enter jumps to the first hit and returns to the tree |
| `y` `Y` | `copyPath` `copyAbsolutePath` | copy the relative / absolute path |
| `r` | `refresh` | reload the tree and git status |
| `.` | `toggleHidden` | show/hide dotfiles |
| `=` | `toggleSize` | dates ↔ sizes |
| `W` | `collapseAll` | close every folder |
| `q` | `hide` | hide the tree |

The keyboard reaches the tree in two ways, and they don't see the same keys:

- **After ctrl+e (no mouse):** only lowercase letters and digits arrive, and Claude Code lowercases them, so `G` reads as `g`. That's why `g e` exists alongside `G`, and why half pages are `d`/`u` rather than ctrl+d/ctrl+u (ctrl+d is also Claude Code's exit key). Enter opens the row under the cursor.
- **After clicking a row:** every key arrives, including capitals, symbols (`/`, `.`, `=`) and modifiers (`ctrl+…`).

Change the keys with **Tree keys** in `/config`: `command=key,key` pairs separated by `;`. A key is written as typed (`j`, `G`, `/`), by name (`down`, `return`, `space`, `pageup`), with modifiers (`ctrl+u`, `shift+tab`), or as a sequence separated by spaces (`g g`); an empty list unbinds the command. For example, `top=g g,home; hide=q,x; refresh=`. A key that starts a longer sequence waits for the next key, for up to a second.

## Settings

All settings are in `/config` under filetree.

- **Claude activity:** what shimmers: `reads and writes` (default), `writes`, `reads` or `none`. Git status, line counts and the git status at the bottom always show.
- **Follow Claude:** `on` (default) scrolls the tree to what Claude reads, writes or commits; `off` keeps the view where you put it, and highlights still show.
- **Right column:** `date` (default) or `size`; what the right column shows when a session starts. The `Σ` button in the header toggles it.
- **Glyphs:** `auto` (default) uses Nerd Font icons when a Nerd Font is installed and your terminal started after it was installed, plain Unicode in the desktop app, and Nerd Font over SSH. `nerd` or `plain` forces one.
- **Theme:** `auto` (default) follows Omarchy's current theme when there is one, else the built-in colors; `catppuccin-mocha`, `tokyo-night`, `dracula`, `nord` or `gruvbox` colors the tree, git status, line counts and activity shimmer in that palette. The pane keeps your terminal's background either way.
- **Corners:** `square` (default) or `round`: the cursor row becomes a pill with rounded ends (half blocks with plain glyphs) and the search field sits in a rounded box.
- **Tree keys:** overrides for the keys inside the tree; see [Moving through the tree](#moving-through-the-tree).
- **Show/hide action** and **Focus action:** the keybinding actions behind the global hotkeys, `diff:back` and `diff:nextSource` by default; see [Keyboard](#keyboard).

## herdr

Clicking rows needs herdr 0.9.1 or later. herdr 0.9.0 and older accept pixel mouse reporting but still send cell positions, which would put every click in the session in the wrong place, so on those versions the rows ignore the mouse and the rest of the pane and session keep working. Run `herdr update` to get row clicks.

## Contributing

Turn on the pre-commit hook once per clone; it runs `claude plugin validate` and the plugin tests before each commit that touches the plugin:

```bash
git config core.hooksPath .githooks
```

The same checks run on macOS, Windows and Linux in CI on every push that touches the plugin.

## License

[MIT](LICENSE)

*This project is inspired by my Omarchy app [FileBlade](https://github.com/data-goblin/fileblade)*
