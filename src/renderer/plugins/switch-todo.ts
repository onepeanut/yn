import type { BuildInActionName } from '@fe/types'
import type { Plugin } from '@fe/context'

export default {
  name: 'switch-todo',
  register: (ctx) => {
    const actionName: BuildInActionName = 'plugin.switch-todo.switch'

    function switchTodo (line: number, checked?: boolean) {
      const lineText = ctx.editor.getLineContent(line)

      if (typeof checked !== 'boolean') {
        checked = !lineText.match(/^\s*[-+*]\s+\[x\]/)
      }

      const doneStr = ctx.setting.getSetting('editor.todo-with-time', true)
        ? `[x] ~~${ctx.lib.dayjs().format('YYYY-MM-DD HH:mm')}~~`
        : '[x]'

      const value = checked
        ? lineText.replace('[ ]', doneStr)
        : lineText.replace(/(\[x\] ~~[\d-: ]+~~|\[x\])/, '[ ]')

      if (value !== lineText) {
        ctx.editor.replaceLine(line, value)
      }

      return checked
    }

    ctx.action.registerAction({
      name: actionName,
      description: ctx.i18n.t('command-desc.plugin_switch-todo_switch'),
      keys: [ctx.keybinding.Alt, 'o'],
      forUser: true,
      handler: (line?: number, checked?: boolean) => {
        if (line) {
          switchTodo(line, checked)
        } else {
          const selection = ctx.editor.getEditor().getSelection()

          if (selection) {
            const startLineNumber = selection.startLineNumber
            let endLineNumber = selection.endLineNumber

            // multi-line selection exclude last empty line
            if (startLineNumber < endLineNumber && selection.endColumn === 1) {
              endLineNumber--
            }

            for (let i = startLineNumber; i <= endLineNumber; i++) {
              checked = switchTodo(i, checked)
            }
          }
        }
      }
    })

    ctx.registerHook('VIEW_ELEMENT_CLICK', async ({ e }) => {
      const target = e.target as HTMLElement

      const preventEvent = () => {
        e.preventDefault()
        e.stopPropagation()
        return true
      }

      if (target.tagName === 'INPUT' && target.classList.contains(ctx.args.DOM_CLASS_NAME.TASK_LIST_ITEM_CHECKBOX) && target.parentElement!.dataset.sourceLine) {
        const line = parseInt(target.parentElement!.dataset.sourceLine || '0')
        const checked = (target as HTMLInputElement).checked
        ctx.action.getActionHandler(actionName)(line, checked)
        return preventEvent()
      }

      return false
    })

    ctx.setting.changeSchema(schema => {
      schema.properties['editor.todo-with-time'] = {
        defaultValue: true,
        title: 'T_setting-panel.schema.editor.todo-with-time',
        type: 'boolean',
        format: 'checkbox',
        group: 'editor',
        required: true,
      }
    })
  }
} as Plugin
