import MarkdownItGithubAlerts from 'markdown-it-github-alerts'
import baseCss from 'markdown-it-github-alerts/styles/github-base.css?inline'
import lightCss from 'markdown-it-github-alerts/styles/github-colors-light.css?inline'
import darkCss from 'markdown-it-github-alerts/styles/github-colors-dark-class.css?inline'

import type { Plugin } from '@fe/context'

export default {
  name: 'markdown-github-alerts',
  register: ctx => {
    ctx.markdown.markdown.use(md => {
      MarkdownItGithubAlerts(md, { matchCaseSensitive: false })
      md.renderer.rules.alert_open = function (tokens, idx) {
        const { title, type, icon } = tokens[idx].meta
        return ctx.lib.vue.h('div', { class: `markdown-alert markdown-alert-${type}` }, [
          ctx.lib.vue.h('p', { class: 'markdown-alert-title' }, [
            ctx.lib.vue.h('span', { class: 'markdown-alert-icon', innerHTML: icon }),
            title
          ])
        ]) as any
      }
    })

    const darkVars = (darkCss as unknown as string).replace('.dark', '')
    ctx.view.addStyles(`
      ${baseCss}
      ${lightCss}
      @media screen { html[app-theme=dark] ${darkVars} }
      @media (prefers-color-scheme: dark) { html[app-theme=system] ${darkVars} }

      .markdown-alert {
        avoid-break-inside: avoid;
      }
    `)

    ctx.editor.tapSimpleCompletionItems(items => {
      /* eslint-disable no-template-curly-in-string */
      items.push(
        { label: '/ > Github Alerts', insertText: '> [!${1|NOTE,TIP,IMPORTANT,WARNING,CAUTION|}]${2}\n> ${3:Content}\n', block: true },
      )
    })
  }
} as Plugin
