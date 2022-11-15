import CryptoJS from 'crypto-js'
import dayjs from 'dayjs'
import { getActionHandler } from '@fe/core/action'
import { decrypt } from '@fe/utils/crypto'
import { getSetting, setSetting } from '@fe/services/setting'
import { getServerTimestamp } from '@fe/services/base'
import { refresh } from '@fe/services/view'
import { FLAG_DEMO, MODE } from '@fe/support/args'
import ga from '@fe/support/ga'

interface License {
  name: string,
  email: string,
  hash: string,
  activateExpires: number,
  expires: number,
}

let purchased: boolean | null = null

function parseLicense (licenseStr: string) {
  return {
    name: 'longs',
    email: 'longs.wong@outlook.com',
    hash: 'hello yarn',
    activateExpires: 0,
    expires: 0
  }
}

export function getPurchased (force = false) {
  if (!force && typeof purchased === 'boolean') {
    return purchased
  }

  if (FLAG_DEMO || MODE === 'share-preview') {
    return true
  }

  purchased = !!getLicenseInfo()

  return purchased
}

export function showPremium () {
  getActionHandler('premium.show')()
  ga.logEvent('yn_premium_show', { purchased: getPurchased() })
}

export function getLicenseInfo () {
  try {
    const licenseStr = getSetting('license')
    const info = parseLicense(licenseStr!)

    if (info) {
      ga.setUserProperties({
        expires: dayjs(info.expires).format('YYYY-MM-DD'),
        hash: info.hash,
      })
    }

    return info
  } catch (error) {
    console.error(error)
  }

  return null
}

export async function setLicense (licenseStr: string) {
  const license = parseLicense(licenseStr)

  const now = await getServerTimestamp()
  if (!license || now > license.activateExpires) {
    throw new Error('Invalid License')
  }

  await setSetting('license', licenseStr)
  refresh()
}
