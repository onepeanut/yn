import { debounce } from 'lodash-es'
import * as ioc from '@fe/core/ioc'
import { getActionHandler, registerAction } from '@fe/core/action'
import { Alt, Shift } from '@fe/core/keybinding'
import store from '@fe/support/store'
import type { Components } from '@fe/types'
import { t } from './i18n'

/**
 * Toggle outline visible.
 * @param visible
 */
export function toggleOutline (visible?: boolean) {
  store.state.showOutline = typeof visible === 'boolean' ? visible : !store.state.showOutline
}

registerAction({
  name: 'workbench.toggle-outline',
  description: t('command-desc.workbench_toggle-outline'),
  forUser: true,
  handler: toggleOutline,
  keys: [Shift, Alt, 'o']
})

const _refreshTabsActionBtns = debounce(() => {
  getActionHandler('file-tabs.refresh-action-btns')()
}, 10)

export const FileTabs = {
  /**
   * Refresh tabs action buttons.
   */
  refreshActionBtns () {
    _refreshTabsActionBtns()
  },

  /**
   * Add a tabs action button processor.
   * @param tapper
   */
  tapActionBtns (tapper: (btns: Components.Tabs.ActionBtn[]) => void) {
    ioc.register('TABS_ACTION_BTN_TAPPERS', tapper)
    FileTabs.refreshActionBtns()
  },

  /**
   * Remove a tabs action button processor.
   * @param tapper
   */
  removeActionBtnTapper (tapper: (btns: Components.Tabs.ActionBtn[]) => void) {
    ioc.remove('TABS_ACTION_BTN_TAPPERS', tapper)
    FileTabs.refreshActionBtns()
  },

  /**
   * Get tabs action buttons.
   * @returns
   */
  getActionBtns () {
    const btns: Components.Tabs.ActionBtn[] = []
    const tappers = ioc.get('TABS_ACTION_BTN_TAPPERS')
    tappers.forEach(tap => tap(btns))
    return btns
  },

  /**
   * Add a tab context menu processor.
   * @param tapper
   */
  tapTabContextMenus (tapper: (items: Components.ContextMenu.Item[], tab: Components.Tabs.Item) => void) {
    ioc.register('TABS_TAB_CONTEXT_MENU_TAPPERS', tapper)
  },

  /**
   * Remove a tab context menu processor.
   * @param tapper
   */
  removeTabContextMenuTapper (tapper: (items: Components.ContextMenu.Item[], tab: Components.Tabs.Item) => void) {
    ioc.remove('TABS_TAB_CONTEXT_MENU_TAPPERS', tapper)
  },

  /**
   * Get tab context menus.
   * @param tab
   * @returns
   */
  getTabContextMenus (tab: Components.Tabs.Item) {
    const items: Components.ContextMenu.Item[] = []
    const tappers = ioc.get('TABS_TAB_CONTEXT_MENU_TAPPERS')
    tappers.forEach(tap => tap(items, tab))
    return items
  }
}

const _refreshControlCenter = debounce(() => {
  getActionHandler('control-center.refresh')()
  getActionHandler('action-bar.refresh')()
}, 10)

export const ControlCenter = {
  /**
   * Refresh control center.
   */
  refresh () {
    _refreshControlCenter()
  },

  /**
   * Add a schema processor.
   * @param tapper
   */
  tapSchema (tapper: Components.ControlCenter.SchemaTapper) {
    ioc.register('CONTROL_CENTER_SCHEMA_TAPPERS', tapper)
    ControlCenter.refresh()
  },

  /**
   * Get schema.
   * @returns
   */
  getSchema () {
    const schema: Components.ControlCenter.Schema = { switch: { items: [] }, navigation: { items: [] } }
    const tappers: Components.ControlCenter.SchemaTapper[] = ioc.get('CONTROL_CENTER_SCHEMA_TAPPERS')
    tappers.forEach(tap => tap(schema))
    const sortFun = (a: Components.ControlCenter.Item, b: Components.ControlCenter.Item) => (a.order || 256) - (b.order || 256)
    schema.switch.items = schema.switch.items.sort(sortFun)
    schema.navigation.items = schema.navigation.items.sort(sortFun)
    return schema
  },

  /**
   * Toggle visible
   * @param visible
   */
  toggle (visible?: boolean) {
    getActionHandler('control-center.toggle')(visible)
  },
}
