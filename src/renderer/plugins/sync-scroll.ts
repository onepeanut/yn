import type { Plugin } from '@fe/context'

export default {
  name: 'sync-scroll',
  register: (ctx) => {
    type ScrollTop = { editor?: number, view?: number, updatedAt: number }

    const STORAGE_KEY = 'plugin.scroll-position'

    function saveScrollPosition (scrollTop: ScrollTop) {
      const key = ctx.doc.toUri(ctx.store.state.currentFile)
      const data: Record<string, ScrollTop> = ctx.storage.get(STORAGE_KEY, {})
      data[key] = { ...data[key], ...scrollTop }

      ctx.storage.set(STORAGE_KEY, Object.fromEntries(
        ctx.lib.lodash.orderBy(Object.entries(data), x => x[1].updatedAt || 0, 'desc').slice(0, 100)
      ))
    }

    // restore scroll bar location after file switched.
    ctx.registerHook('DOC_SWITCHED', async ({ doc }) => {
      if (doc) {
        await ctx.utils.sleep(0)

        const key = ctx.doc.toUri(ctx.store.state.currentFile)
        const data: Record<string, ScrollTop> = ctx.storage.get(STORAGE_KEY, {})
        const position = data[key] || { editor: 0, view: 0 }

        await ctx.editor.whenEditorReady()

        ctx.view.disableSyncScrollAwhile(async () => {
          ctx.editor.getEditor().setScrollTop(position.editor || 0)
          if (typeof position.view === 'number') {
            await ctx.utils.sleep(0)
            ctx.view.scrollTopTo(position.view)
          }
        })
      }
    })

    ctx.editor.whenEditorReady().then(({ editor }) => {
      const savePosition = ctx.lib.lodash.debounce(saveScrollPosition, 500)
      editor.onDidScrollChange(() => {
        const visibleRange = editor.getVisibleRanges()[0]
        const startLine = Math.max(1, visibleRange.startLineNumber - 1)

        const top = editor.getScrollTop()
        if (ctx.view.getEnableSyncScroll()) {
          ctx.view.revealLine(startLine)
        }
        savePosition({ editor: top, updatedAt: Date.now() })
      })
    })

    const savePosition = ctx.lib.lodash.debounce(saveScrollPosition, 500)
    ctx.registerHook('VIEW_SCROLL', ({ e }) => {
      if (ctx.store.state.currentFile?.status) {
        const { scrollTop } = e.target as HTMLElement
        savePosition({ view: scrollTop, updatedAt: Date.now() })
      }
    })

    function clickScroll (e: MouseEvent) {
      const _target = e.target as HTMLElement
      if (['button', 'div', 'img', 'input', 'canvas', 'details', 'summary'].includes(_target.tagName.toLowerCase())) {
        return
      }

      const target: HTMLElement | null = (e.target as HTMLElement).closest('[data-source-line]')

      if (
        target &&
        ctx.store.state.showEditor &&
        !ctx.store.state.presentation &&
        window.getSelection()!.toString().length < 1
      ) {
        ctx.view.disableSyncScrollAwhile(() => {
          const line = parseInt(target!.dataset.sourceLine || '0')
          const lineEnd = parseInt(target!.dataset.sourceLineEnd || '0')
          ctx.editor.highlightLine(lineEnd ? [line, lineEnd - 1] : line, true, 1000)
        })
      }

      return false
    }

    let clickTimer: number | null = null
    ctx.registerHook('VIEW_ELEMENT_CLICK', async ({ e }) => {
      if ((e.target as HTMLElement).ownerDocument?.defaultView?.getSelection()?.toString()?.length) {
        return
      }

      if (clickTimer) {
        clearTimeout(clickTimer)
        clickTimer = null
      } else {
        clickTimer = setTimeout(() => {
          clickScroll(e)
          clickTimer = null
        }, 200) as any
      }
    })
  }
} as Plugin
