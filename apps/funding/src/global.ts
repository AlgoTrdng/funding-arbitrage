import { Connection, Keypair } from '@solana/web3.js'
import { AnchorProvider, Wallet } from '@coral-xyz/anchor'

import { config } from './config.js'
import { initDB } from 'db'

export const connection = new Connection(config.RPC_URL)
export const wallet = new Keypair()
export const anchorProvider = new AnchorProvider(connection, new Wallet(wallet), {
	commitment: 'confirmed',
})

export const db = initDB(config.DB_URL)
