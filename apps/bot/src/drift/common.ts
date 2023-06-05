import { PublicKey } from '@solana/web3.js'
import { Program } from '@coral-xyz/anchor'

import { driftIDL } from './idl.js'
import { anchorProvider } from '../global.js'

export const DRIFT_PROGRAM_ID = new PublicKey('dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH')
export const program = new Program(driftIDL, DRIFT_PROGRAM_ID, anchorProvider)
