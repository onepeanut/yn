/* eslint-disable @typescript-eslint/no-var-requires */
import { session } from 'electron'
import { Dispatcher, ProxyAgent, Agent, buildConnector } from 'undici'

// https://github.com/Kaciras/fetch-socks/blob/master/index.ts
import { SocksClient, SocksProxy } from 'socks'
import Connector = buildConnector.connector;
import TLSOptions = buildConnector.BuildOptions;

export type SocksProxies = SocksProxy | SocksProxy[];

/**
 * Since socks does not guess HTTP ports, we need to do that.
 *
 * @param protocol Upper layer protocol, "http:" or "https:"
 * @param port A string containing the port number of the URL, maybe empty.
 */
function resolvePort (protocol: string, port: string) {
  return port ? Number.parseInt(port) : protocol === 'http:' ? 80 : 443
}

/**
 * Create an Undici connector which establish the connection through socks proxies.
 *
 * If the proxies is an empty array, it will connect directly.
 *
 * @param proxies The proxy server to use or the list of proxy servers to chain.
 * @param tlsOpts TLS upgrade options.
 */
export function socksConnector (proxies: SocksProxies, tlsOpts: TLSOptions = {}): Connector {
  const chain = Array.isArray(proxies) ? proxies : [proxies]
  const { timeout = 1e4 } = tlsOpts
  const undiciConnect = buildConnector(tlsOpts)

  return async (options, callback) => {
    let { protocol, hostname, port, httpSocket } = options

    for (let i = 0; i < chain.length; i++) {
      const next = chain[i + 1]

      const destination = i === chain.length - 1 ? {
        host: hostname,
        port: resolvePort(protocol, port),
      } : {
        port: next.port,
        host: next.host ?? next.ipaddress!,
      }

      const socksOpts = {
        command: 'connect' as const,
        proxy: chain[i],
        timeout,
        destination,
        existing_socket: httpSocket,
      }

      try {
        const r = await SocksClient.createConnection(socksOpts)
        httpSocket = r.socket
      } catch (error: any) {
        return callback(error, null)
      }
    }

    // httpSocket may not exist when the chain is empty.
    if (httpSocket && protocol !== 'https:') {
      return callback(null, httpSocket.setNoDelay())
    }

    /*
      * There are 2 cases here:
      * If httpSocket doesn't exist, let Undici make a connection.
      * If httpSocket exists & protocol is HTTPS, do TLS upgrade.
      */
    return undiciConnect({ ...options, httpSocket }, callback)
  }
}

export interface SocksDispatcherOptions extends Agent.Options {

  /**
   * TLS upgrade options, see:
   * https://undici.nodejs.org/#/docs/api/Client?id=parameter-connectoptions
   *
   * The connect function is not supported.
   * If you want to create a custom connector, you can use `socksConnector`.
   */
  connect?: TLSOptions;
}

/**
 * Create a Undici Agent with socks connector.
 *
 * If the proxies is an empty array, it will connect directly.
 *
 * @param proxies The proxy server to use or the list of proxy servers to chain.
 * @param options Additional options passed to the Agent constructor.
 */
export function socksDispatcher (proxies: SocksProxies, options: SocksDispatcherOptions = {}) {
  const { connect, ...rest } = options
  return new Agent({ ...rest, connect: socksConnector(proxies, connect) })
}

export function newProxyDispatcher (proxyUrl: string): Dispatcher {
  if (proxyUrl.toLowerCase().startsWith('socks://') || proxyUrl.toLowerCase().startsWith('socks5://')) {
    const url = new URL(proxyUrl)
    return socksDispatcher({
      type: 5,
      host: url.hostname,
      port: +url.port
    })
  }

  return new ProxyAgent(proxyUrl)
}

export async function getProxyDispatcher (url: string): Promise<Dispatcher | undefined> {
  const proxy = await session.defaultSession.resolveProxy(url)
  if (!proxy) {
    return undefined
  }

  const proxies = String(proxy).trim().split(/\s*;\s*/g).filter(Boolean)
  const first = proxies[0]
  const parts = first.split(/\s+/)
  const type = parts[0]

  let proxyUrl = ''
  if (type === 'SOCKS' || type === 'SOCKS5') {
    // use a SOCKS proxy
    proxyUrl = 'socks://' + parts[1]
  } else if (type === 'PROXY' || type === 'HTTPS') {
    proxyUrl = (type === 'HTTPS' ? 'https' : 'http') + '://' + parts[1]
  } else {
    return undefined
  }

  return newProxyDispatcher(proxyUrl)
}
