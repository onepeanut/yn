import { App, ComponentPublicInstance, createApp } from 'vue'
import type { Components } from '@fe/types'
import Modal from '@fe/components/ModalUi.vue'
import directives from '@fe/directives'

export interface Instance extends ComponentPublicInstance {
  alert: (params: Components.Modal.AlertModalParams) => Promise<boolean>;
  confirm: (params: Components.Modal.ConfirmModalParams) => Promise<boolean>;
  input: (params: Components.Modal.InputModalParams) => Promise<string | null>;
  cancel: () => void;
  ok: () => void;
}

let instance: Instance

/**
 * Get Modal instance.
 * @returns instance
 */
export function useModal (): Instance {
  return instance
}

export default function install (app: App) {
  const modal = createApp(Modal)
  modal.use(directives)

  const el = document.createElement('div')
  document.body.appendChild(el)

  instance = modal.mount(el) as Instance
  app.config.globalProperties.$modal = instance
}
