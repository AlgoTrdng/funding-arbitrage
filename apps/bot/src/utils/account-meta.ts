import { AccountMeta, PublicKey } from '@solana/web3.js'

export function accountMeta(pk: PublicKey, isWritable?: boolean, isSigner?: boolean): AccountMeta {
	return { pubkey: pk, isSigner: Boolean(isSigner), isWritable: Boolean(isWritable) }
}
