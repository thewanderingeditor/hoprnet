import { WebRTCConnection } from './webRTCConnection'
import { RelayConnection } from './relayConnection'
import PeerId from 'peer-id'
import type { MultiaddrConnection } from './types'
import Peer from 'simple-peer'

// @ts-ignore
import wrtc = require('wrtc')

interface PairType<T> {
  sink(source: AsyncGenerator<T, T | void>): Promise<void>
  source: AsyncGenerator<T, T | void>
}

// @ts-ignore
const Pair: <T>() => PairType<T> = require('it-pair')

async function main() {
  const AliceBob = Pair<Uint8Array>()
  const BobAlice = Pair<Uint8Array>()

  const Alice = await PeerId.create({ keyType: 'secp256k1' })
  const Bob = await PeerId.create({ keyType: 'secp256k1' })

  const PeerAlice = new Peer({ wrtc, initiator: true, trickle: true })
  const PeerBob = new Peer({ wrtc, trickle: true })

  // await new Promise(resolve => {
  // })

  const a = new WebRTCConnection(
    new RelayConnection({
      stream: {
        sink: AliceBob.sink,
        source: BobAlice.source,
      } as MultiaddrConnection,
      counterparty: Bob,
      self: Alice,
      webRTC: PeerAlice,
    }),
    PeerAlice,
    Alice,
    Bob
  )

  const b = new WebRTCConnection(
    new RelayConnection({
      stream: {
        sink: BobAlice.sink,
        source: AliceBob.source,
      } as MultiaddrConnection,
      self: Bob,
      counterparty: Alice,
      webRTC: PeerBob,
    }),
    PeerBob,
    Bob,
    Alice
  )

  a.sink(
    (async function* () {
      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        yield new TextEncoder().encode(`fancy WebRTC message`)
      }
    })()
  )

  // b.sink(
  //   (async function* () {
  //     while (true) {
  //       await new Promise((resolve) => setTimeout(resolve, 1000))
  //       yield new TextEncoder().encode(`fancy WebRTC message`)
  //     }
  //   })()
  // )

  function foo({ done, value }: { done?: boolean | void; value?: Uint8Array | void }) {
    if (value) {
      console.log(new TextDecoder().decode(value))
    }

    if (!done) {
      b.source.next().then(foo)
    }
  }

  function bar({ done, value }: { done?: boolean | void; value?: Uint8Array | void }) {
    if (value) {
      console.log(new TextDecoder().decode(value))
    }

    if (!done) {
      b.source.next().then(foo)
    }
  }

  b.source.next().then(foo)
  //a.source.next().then(bar)

  //PeerBob.on('signal', (msg: any) => setTimeout(() => PeerAlice.signal(msg), 150))

  //PeerAlice.on('signal', (msg: any) => setTimeout(() => PeerBob.signal(msg), 150))
}

main()