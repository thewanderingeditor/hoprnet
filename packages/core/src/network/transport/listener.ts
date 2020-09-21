import net, { AddressInfo, Server } from 'net'
import EventEmitter from 'events'
import debug from 'debug'

const log = debug('hopr-core:transport:listener')
const error = debug('hopr-core:transport:listener:error')
const verbose = debug('hopr-core:verbose:listener:error')

import { socketToConn } from './socket-to-conn'
import { CODE_P2P, STUN_SERVERS } from './constants'
import { getMultiaddrs, multiaddrToNetConfig } from './utils'
import { MultiaddrConnection, Connection, Upgrader } from './types'
import Multiaddr from 'multiaddr'

import type { Interface } from '../stun'
import Stun from '../stun'

export interface Libp2pServer extends Server {
  __connections: MultiaddrConnection[]
}

export interface Listener extends EventEmitter {
  close(): void
  listen(ma: Multiaddr): Promise<void>
  getAddrs(): Multiaddr[]
}

/**
 * Attempts to close the given maConn. If a failure occurs, it will be logged.
 * @private
 * @param maConn
 */
async function attemptClose(maConn: MultiaddrConnection) {
  try {
    await maConn?.close()
  } catch (err) {
    error('an error occurred closing the connection', err)
  }
}

export function createListener(
  { handler, upgrader }: { handler: (_conn: Connection) => void; upgrader: Upgrader },
  options: any
): Listener {
  const listener = new EventEmitter() as Listener

  const server = net.createServer(async (socket) => {
    // Avoid uncaught errors caused by unstable connections
    socket.on('error', (err) => error('socket error', err))

    let maConn: MultiaddrConnection
    let conn: Connection
    try {
      maConn = socketToConn(socket, { listeningAddr })
      log('new inbound connection %s', maConn.remoteAddr)
      conn = await upgrader.upgradeInbound(maConn)
    } catch (err) {
      error('inbound connection failed', err)
      verbose('Connection failure with:', maConn.remoteAddr)
      return attemptClose(maConn)
    }

    log('inbound connection %s upgraded', maConn.remoteAddr)

    trackConn(server, maConn)

    handler?.(conn)

    listener.emit('connection', conn)
  }) as Libp2pServer

  server
    .on('listening', () => listener.emit('listening'))
    .on('error', (err) => listener.emit('error', err))
    .on('close', () => listener.emit('close'))

  // Keep track of open connections to destroy in case of timeout
  server.__connections = []

  listener.close = () => {
    if (!server.listening) return

    return new Promise((resolve, reject) => {
      server.__connections.forEach((maConn: MultiaddrConnection) => attemptClose(maConn))
      server.close((err) => (err ? reject(err) : resolve()))
    })
  }

  let peerId: string, listeningAddr: Multiaddr | undefined
  let externalIp: Interface

  listener.listen = async (ma: Multiaddr): Promise<void> => {
    listeningAddr = ma
    peerId = ma.getPeerId()

    if (peerId) {
      listeningAddr = ma.decapsulateCode(CODE_P2P)
    }

    return new Promise(async (resolve, reject) => {
      try {
        // @TODO replace this with our own STUN servers
        externalIp = await Stun.getExternalIP(STUN_SERVERS, ma.toOptions().port)
      } catch (err) {
        error(err)
      }

      const options = multiaddrToNetConfig(listeningAddr)
      server.listen(options, (err?: Error) => {
        if (err) return reject(err)
        log('Listening on %s', server.address())
        resolve()
      })
    })
  }

  listener.getAddrs = () => {
    let addrs: Multiaddr[] = []
    const address = server.address() as AddressInfo

    if (!address) {
      throw new Error('Listener is not ready yet')
    }

    // Because TCP will only return the IPv6 version
    // we need to capture from the passed multiaddr
    if (listeningAddr?.toString().startsWith('/ip4')) {
      if (externalIp != null) {
        if (externalIp.port == null) {
          verbose('Bidirectional NAT: ', listeningAddr?.toString(), peerId?.toString())
          console.log(`Attention: Bidirectional NAT detected. Publishing no public ip address to the DHT`)
          if (peerId != null) {
            addrs.push(Multiaddr(''))
          }
        } else {
          verbose('Adding address', externalIp.address, externalIp.port)
          addrs.push(Multiaddr(`/ip4/${externalIp.address}/tcp/${externalIp.port}`))
        }
      }

      addrs.push(...getMultiaddrs('ip4', address.address, address.port))
    } else if (address.family === 'IPv6') {
      addrs = addrs.concat(getMultiaddrs('ip6', address.address, address.port))
    }

    return addrs.map((ma) => (peerId ? ma.encapsulate(`/p2p/${peerId}`) : ma))
  }

  return listener
}

function trackConn(server: Libp2pServer, maConn: MultiaddrConnection) {
  server.__connections.push(maConn)
  verbose(`currently tracking ${server.__connections.length} connections ++`)

  const untrackConn = () => {
    server.__connections = server.__connections.filter((c) => c !== maConn)
    verbose(`currently tracking ${server.__connections.length} connections --`)
  }

  maConn.conn.once('close', untrackConn)
}