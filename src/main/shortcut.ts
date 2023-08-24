import * as os from 'os'
import { dialog, globalShortcut } from 'electron'
import { FLAG_DISABLE_SERVER } from './constant'
import { getAction, registerAction } from './action'
import config from './config'
import { getDefaultApplicationAccelerators } from '../share/misc'

const platform = os.platform()

const accelerators = getDefaultApplicationAccelerators(platform)
type AcceleratorCommand = (typeof accelerators)[0]['command']

let currentCommands: {[key in AcceleratorCommand]?: () => void}

export const getAccelerator = (command: AcceleratorCommand): string | undefined => {
  const customKeybinding = config.get('keybindings', [])
    .find((item: any) => item.type === 'application' && item.command === command)

  if (customKeybinding) {
    const keys = customKeybinding.keys

    if (keys) {
      return keys.replace(/(Arrow|Key|Digit)/ig, '')
        .replace(/NumpadAdd/ig, 'numadd')
        .replace(/NumpadSubtract/ig, 'numsub')
        .replace(/NumpadMultiply/ig, 'nummult')
        .replace(/NumpadDivide/ig, 'numdiv')
        .replace(/NumpadDecimal/ig, 'numdec')
        .replace(/Numpad/ig, 'num')
    } else {
      return undefined
    }
  }

  return accelerators.find(a => a.command === command)?.accelerator || undefined
}

export const registerShortcut = (commands: typeof currentCommands, showAlert = false) => {
  currentCommands = { ...commands }

  if (FLAG_DISABLE_SERVER) {
    delete commands['open-in-browser']
  }

  globalShortcut.unregisterAll()

  ;(Object.keys(commands) as AcceleratorCommand[]).forEach(key => {
    const accelerator = getAccelerator(key)
    if (!accelerator || !commands[key]) {
      return
    }

    try {
      console.log('register shortcut', accelerator, key)
      globalShortcut.register(accelerator, commands[key]!)
      if (!globalShortcut.isRegistered(accelerator)) {
        throw new Error('Failed to register shortcut')
      }
    } catch (error) {
      console.error(error)
      if (showAlert) {
        dialog.showErrorBox('Error', `Failed to register shortcut: ${accelerator}`)
      }
    }
  })

  getAction('refresh-menus')()
}

function reload (changedKeys: string[]) {
  if (changedKeys.includes('keybindings')) {
    console.log('reload keybindings')
    registerShortcut(currentCommands, true)
  }
}

registerAction('shortcuts.reload', reload)
