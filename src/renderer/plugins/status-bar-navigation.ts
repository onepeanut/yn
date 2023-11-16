import type { Plugin } from '@fe/context'

export default {
  name: 'status-bar-navigation',
  register: ctx => {
    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-navigation'] = {
        id: 'status-bar-navigation',
        position: 'left',
        title: ctx.i18n.t('status-bar.nav.nav'),
        list: [
          {
            id: 'show-quick-open',
            type: 'normal',
            title: ctx.i18n.t('status-bar.nav.goto'),
            subTitle: ctx.keybinding.getKeysLabel('workbench.show-quick-open'),
            ellipsis: true,
            onClick: () => ctx.action.getActionHandler('workbench.show-quick-open')()
          },
          { type: 'separator' },
        ]
      }
    })
  }
} as Plugin
