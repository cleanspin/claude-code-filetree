import { expect, test } from 'claude-code/testing'

import { actionOption, createReader, DEFAULT_KEYMAP, hotkeysOf, parseKey, parseKeymap, pressOf } from '../hooks/keymap'

test('keys: one spelling per press, whether typed in the keymap or reported by the terminal', () => {
  expect(parseKey('G')).toBe('G')
  expect(parseKey('shift+g')).toBe('G')
  expect(pressOf({ key: 'g', shift: true })).toBe('G')
  expect(pressOf({ key: 'G' })).toBe('G')
  expect(parseKey('ctrl+shift+d')).toBe(pressOf({ key: 'd', ctrl: true, shift: true }))
  expect(parseKey('Control+u')).toBe('ctrl+u')
  expect(parseKey('alt+j')).toBe('meta+j')
  expect(parseKey('space')).toBe(pressOf({ key: ' ' }))
  expect(parseKey('enter')).toBe('return')
  expect(pressOf({ key: '?', shift: true })).toBe('?')
  expect(parseKey('ctrl++')).toBe('ctrl++')
  expect(parseKey('esc')).toBeNull()
  expect(parseKey('hyper+j')).toBeNull()
  expect(parseKey('')).toBeNull()
})

test('keys: overrides replace or unbind a command and report what they cannot read', () => {
  const { keymap, errors } = parseKeymap(' top=g g, home ; hide=q,x; refresh= ; nope=z; down=j,ctrl+,down')
  expect(keymap.top).toEqual(['g g', 'home'])
  expect(keymap.hide).toEqual(['q', 'x'])
  expect(keymap.refresh).toEqual([])
  expect(keymap.down).toEqual(['j', 'down'])
  expect(keymap.up).toEqual(DEFAULT_KEYMAP.up)
  expect(errors).toEqual(['unknown command "nope"', 'down: cannot read "ctrl+"'])
  expect(parseKeymap('').errors).toEqual([])
})

test('keys: sequences wait for their next key, fall through to a single key, and expire', () => {
  const r = createReader(DEFAULT_KEYMAP, 1000)
  expect(r.feed('g', 0)).toBeNull()
  expect(r.pending()).toEqual(['g'])
  expect(r.feed('g', 100)).toBe('top')
  expect(r.feed('g', 200)).toBeNull()
  expect(r.feed('e', 300)).toBe('bottom')
  expect(r.feed('g', 400)).toBeNull()
  expect(r.feed('j', 500)).toBe('down')
  expect(r.feed('g', 600)).toBeNull()
  expect(r.feed('g', 5000)).toBeNull()
  expect(r.feed('G', 5100)).toBe('bottom')
  expect(r.feed('ctrl+z', 5200)).toBeNull()
  expect(r.pending()).toEqual([])
})

test('keys: only lowercase letters and digits become pane hotkeys', () => {
  const keys = hotkeysOf(DEFAULT_KEYMAP)
  for (const k of ['j', 'k', 'h', 'l', 'g', 'e', 'o', 'q', 's', 'y']) expect(keys).toContain(k)
  for (const k of ['G', 'Y', 'W', '/', '.', '=', 'space', 'return']) expect(keys).not.toContain(k)
  expect(hotkeysOf(parseKeymap('down=1; up=ctrl+k').keymap)).toContain('1')
})

test('keys: the show/hide and focus options take an action name or turn off', () => {
  expect(actionOption(undefined, 'diff:back')).toBe('diff:back')
  expect(actionOption(' pane:next ', 'diff:back')).toBe('pane:next')
  expect(actionOption('', 'diff:back')).toBe('')
  expect(actionOption('ctrl+o', 'diff:back')).toBe('')
})
