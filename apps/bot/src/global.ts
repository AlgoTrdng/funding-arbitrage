import { Connection, Keypair } from '@solana/web3.js'
import { initDB } from 'db'

import { config } from './config.js'
import { AnchorProvider, Wallet } from '@coral-xyz/anchor'

export const db = initDB(config.DB_URL)

export const wallet = Keypair.fromSecretKey(config.PRIVATE_KEY)
export const connection = new Connection(config.RPC_URL)
export const anchorProvider = new AnchorProvider(connection, new Wallet(wallet), {
	commitment: 'confirmed',
})
