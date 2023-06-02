import { struct, blob, seq } from '@solana/buffer-layout'
import { u64, publicKey, u128 } from '@solana/buffer-layout-utils'
import { PublicKey } from '@solana/web3.js'

export type OpenOrdersLayout = {
	blob: Uint8Array
	accountFlags: bigint
	market: PublicKey
	owner: PublicKey
	baseTokenFree: bigint
	baseTokenTotal: bigint
	quoteTokenFree: bigint
	quoteTokenTotal: bigint
	freeSlotBits: bigint
	isBidBits: bigint
	orders: bigint[]
	clientIds: bigint[]
	referrerRebatesAccrued: bigint
}

export const openOrdersLayout = struct<OpenOrdersLayout>([
	blob(5, 'blob'),
	u64('accountFlags'),
	publicKey('market'),
	publicKey('owner'),
	u64('baseTokenFree'),
	u64('baseTokenTotal'),
	u64('quoteTokenFree'),
	u64('quoteTokenTotal'),
	u128('freeSlotBits'),
	u128('isBidBits'),
	seq(u128(), 128, 'orders'),
	seq(u64(), 128, 'clientIds'),
	u64('referrerRebatesAccrued'),
])
