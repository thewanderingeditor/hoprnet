import { COVERBOT_VERIFICATION_CYCLE_IN_MS } from '../../utils/env'

export const RELAY_VERIFICATION_CYCLE_IN_MS = COVERBOT_VERIFICATION_CYCLE_IN_MS * 10
export const RELAY_HOPR_REWARD = 1000000000000000 // 0.001 HOPR

export enum ScoreRewards {
  verified = 100,
  relayed = 10,
}