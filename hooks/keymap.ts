// Keybindings for the tree: which commands exist, the keys that run each one, and the
// reader that turns key presses into commands. No engine calls, so a person's overrides
// (the `keys` option) are parsed and tested here on their own.
//
// A key is written as typed (`j`, `G`, `/`), by name (`down`, `return`, `space`), with
// modifiers (`ctrl+u`, `shift+tab`), or as a sequence of keys separated by spaces (`g g`).
// Overrides are `command=key,key` pairs separated by `;`, e.g. `top=g g,home; hide=q,x`;
// an empty list (`refresh=`) unbinds the command.

export const COMMANDS = [
  'down',
  'up',
  'halfPageDown',
  'halfPageUp',
  'pageDown',
  'pageUp',
  'top',
  'bottom',
  'expand',
  'collapse',
  'open',
  'toggle',
  'parent',
  'search',
  'copyPath',
  'copyAbsolutePath',
  'refresh',
  'toggleHidden',
  'toggleSize',
  'collapseAll',
  'hide',
] as const

export type Command = (typeof COMMANDS)[number]
export type Keymap = Record<Command, string[]>
export type KeyPress = { key: string; ctrl?: boolean; shift?: boolean; meta?: boolean }

export const DEFAULT_KEYMAP: Keymap = {
  down: ['j', 'down'],
  up: ['k', 'up'],
  halfPageDown: ['d'],
  halfPageUp: ['u'],
  pageDown: ['f', 'pagedown'],
  pageUp: ['b', 'pageup'],
  top: ['g g', 'home'],
  bottom: ['G', 'g e', 'end'],
  expand: ['l', 'right'],
  collapse: ['h', 'left'],
  open: ['o', 'return'],
  toggle: ['space'],
  parent: ['p'],
  search: ['/', 's'],
  copyPath: ['y'],
  copyAbsolutePath: ['Y'],
  refresh: ['r'],
  toggleHidden: ['.'],
  toggleSize: ['='],
  collapseAll: ['W'],
  hide: ['q'],
}

const MODIFIERS: Record<string, 'ctrl' | 'shift' | 'meta'> = {
  ctrl: 'ctrl',
  control: 'ctrl',
  shift: 'shift',
  meta: 'meta',
  alt: 'meta',
  opt: 'meta',
  option: 'meta',
}
const NAMED = new Set(['up', 'down', 'left', 'right', 'return', 'space', 'tab', 'backspace', 'delete', 'pageup', 'pagedown', 'home', 'end'])
const ALIASES: Record<string, string> = { enter: 'return', ' ': 'space', comma: ',', semicolon: ';', equals: '=', plus: '+' }

// One canonical spelling per key press: `ctrl+`, `meta+`, `shift+` in that order, then the
// key; a shifted letter is its capital (`G`, `ctrl+D`), a shifted symbol the symbol typed.
function canonical(key: string, mods: { ctrl?: boolean; shift?: boolean; meta?: boolean }): string {
  let shift = Boolean(mods.shift)
  let k = key
  if (k.length === 1) {
    if (/[a-z]/i.test(k)) k = shift ? k.toUpperCase() : k
    shift = false
  }
  return [mods.ctrl && 'ctrl', mods.meta && 'meta', shift && 'shift', k].filter(Boolean).join('+')
}

export function pressOf(e: KeyPress): string {
  const raw = e.key.length === 1 ? e.key : e.key.toLowerCase()
  return canonical(ALIASES[raw] ?? raw, e)
}

export function parseKey(spec: string): string | null {
  const parts = spec === '+' ? ['+'] : spec.endsWith('++') ? [...spec.slice(0, -2).split('+'), '+'] : spec.split('+')
  const raw = parts.pop() ?? ''
  const mods: { ctrl?: boolean; shift?: boolean; meta?: boolean } = {}
  for (const m of parts) {
    const mod = MODIFIERS[m.toLowerCase()]
    if (!mod) return null
    mods[mod] = true
  }
  const lower = raw.toLowerCase()
  const key = ALIASES[lower] ?? (raw.length === 1 ? raw : NAMED.has(lower) ? lower : null)
  if (key === null) return null
  if (key.length === 1 && /[A-Z]/.test(key)) mods.shift = true
  return canonical(key, mods)
}

export function parseBinding(spec: string): string[] | null {
  const keys = spec.trim().split(/\s+/).filter(Boolean).map(parseKey)
  return keys.length && keys.every(k => k !== null) ? (keys as string[]) : null
}

export function parseKeymap(overrides: string): { keymap: Keymap; errors: string[] } {
  const keymap: Keymap = { ...DEFAULT_KEYMAP }
  const errors: string[] = []
  for (const entry of overrides.split(';')) {
    if (!entry.trim()) continue
    const eq = entry.indexOf('=')
    const name = (eq < 0 ? entry : entry.slice(0, eq)).trim()
    if (eq < 0 || !(COMMANDS as readonly string[]).includes(name)) {
      errors.push(`unknown command "${name}"`)
      continue
    }
    const specs = entry.slice(eq + 1).split(',').map(s => s.trim()).filter(Boolean)
    const bad = specs.filter(s => !parseBinding(s))
    if (bad.length) errors.push(`${name}: cannot read ${bad.map(b => `"${b}"`).join(', ')}`)
    keymap[name as Command] = specs.filter(s => parseBinding(s))
  }
  return { keymap, errors }
}

type Binding = { keys: string[]; command: Command }

function bindingsOf(keymap: Keymap): Binding[] {
  const out: Binding[] = []
  for (const command of COMMANDS) for (const spec of keymap[command]) {
    const keys = parseBinding(spec)
    if (keys) out.push({ keys, command })
  }
  return out
}

// The keys a focused pane can take as Button hotkeys: one lowercase letter or digit each,
// since the engine lowercases them and passes no modifiers (`G` arrives as `g`).
export function hotkeysOf(keymap: Keymap): string[] {
  const keys = new Set<string>()
  for (const b of bindingsOf(keymap)) for (const k of b.keys) if (/^[a-z0-9]$/.test(k)) keys.add(k)
  return [...keys].sort()
}

// Feeds key presses in and answers the command they complete. A key that starts a longer
// binding waits for the next one (`g`, then `g` or `e`); a pause past `timeoutMs` drops it.
export function createReader(keymap: Keymap, timeoutMs = 1000) {
  const bindings = bindingsOf(keymap)
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((k, i) => k === b[i])
  const startsWith = (a: string[], b: string[]) => a.length > b.length && b.every((k, i) => k === a[i])
  let pending: string[] = []
  let at = 0
  return {
    feed(press: string, now: number): Command | null {
      const tries = pending.length && now - at <= timeoutMs ? [[...pending, press], [press]] : [[press]]
      at = now
      pending = []
      for (const keys of tries) {
        if (bindings.some(b => startsWith(b.keys, keys))) {
          pending = keys
          return null
        }
        const hit = bindings.find(b => same(b.keys, keys))
        if (hit) return hit.command
      }
      return null
    },
    pending: () => [...pending],
  }
}

export type Reader = ReturnType<typeof createReader>

// An engine keybinding action name (`diff:back`) as the `toggleAction` and `focusAction`
// options name it; anything else, or an empty value, turns that hotkey off.
export function actionOption(value: unknown, fallback: string): string {
  const v = typeof value === 'string' ? value.trim() : fallback
  return /^[a-zA-Z]+:[a-zA-Z0-9]+$/.test(v) ? v : ''
}
