import * as fs from 'fs-extra'
import * as os from 'os'
import * as path from 'path'
import * as cp from 'child_process'
import glob from 'glob'
import config from '../config'
import { mergeStreams } from '../helper'

const isWin = os.platform() === 'win32'

function execFile (file: string, args: string[], options?: cp.ExecFileOptions) {
  return new Promise<string | NodeJS.ReadableStream>((resolve) => {
    const process = cp.execFile(file, args, { timeout: 300 * 1000, ...options })

    process.on('error', error => {
      resolve(error.message)
    })

    process.on('spawn', () => {
      const output = mergeStreams([process.stdout, process.stderr].filter(Boolean) as NodeJS.ReadableStream[])

      output.on('close', () => {
        console.log('execFile process closed')
        process.kill()
      })

      resolve(output)
    })
  })
}

function execCmd (cmd: string, options?: cp.ExecOptions, onComplete?: () => void) {
  return new Promise<string | NodeJS.ReadableStream>((resolve) => {
    const process = cp.exec(cmd, { timeout: 300 * 1000, ...options })

    process.on('error', error => {
      resolve(error.message)
    })

    process.on('spawn', () => {
      const output = mergeStreams([process.stdout, process.stderr].filter(Boolean) as NodeJS.ReadableStream[])

      output.on('close', () => {
        console.log('execCmd process closed')
        onComplete && onComplete()
        process.kill()
      })

      resolve(output)
    })
  })
}

const runCode = async (cmd: { cmd: string, args: string[] } | string, code: string): Promise<string | NodeJS.ReadableStream> => {
  try {
    const env = { ...process.env }
    const useWsl = isWin && config.get('runCodeUseWsl', false)

    if (typeof cmd === 'string') {
      const useTplFile = cmd.includes('$tmpFile')
      if (useTplFile) {
        const extMatch = cmd.match(/\$tmpFile(\.[a-zA-Z0-9]+)/)
        const ext = extMatch ? extMatch[1] : ''
        const tmpFileWithoutExt = path.join(os.tmpdir(), `yn-run-${Math.random().toString(36).substring(2)}`)
        const tmpFile = tmpFileWithoutExt + ext
        await fs.writeFile(tmpFile, code)

        const removeTmpFiles = () => {
          glob(tmpFileWithoutExt + '*', {}, (err, files) => {
            if (!err) {
              files.forEach(file => {
                fs.remove(file)
              })
            }
          })
        }

        try {
          return execCmd(cmd.replaceAll('$tmpFile', tmpFileWithoutExt), { env }, removeTmpFiles)
        } catch (error) {
          removeTmpFiles()
          throw error
        }
      } else {
        return execCmd(cmd, { env })
      }
    } else {
      if (useWsl) {
        const args = []
        if (typeof useWsl === 'string') {
          args.push('--distribution', useWsl)
        }

        return execFile('wsl.exe', [...args, '--', cmd.cmd].concat(cmd.args).concat([code]))
      }

      if (isWin) {
        if (!env.PYTHONIOENCODING) {
          // use utf-8 encoding for python on windows
          env.PYTHONIOENCODING = 'utf-8'
        }
      } else {
        const extPath = '/usr/local/bin'
        if (env.PATH && env.PATH.indexOf(extPath) < 0) {
          env.PATH = `${extPath}:${env.PATH}`
        }

        if (!env.LANG && !env.LC_ALL) {
          env.LANG = 'en_US.UTF-8'
          env.LC_ALL = 'en_US.UTF-8'
        }
      }

      return execFile(
        cmd.cmd,
        cmd.args.concat([code]),
        { env }
      )
    }
  } catch (e: any) {
    return e.message
  }
}

export default {
  runCode
}
