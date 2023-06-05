import { PerpMarketAccount, PublicKey, UserAccount } from '@drift-labs/sdk'

import { connection } from '../global.js'
import { parseAccountWithAnchor } from '../utils/layout.js'
import { program } from './common.js'
import { DriftIDL } from './idl.js'

export async function loadDriftPerpMarket(perpMarketAddress: PublicKey) {
	const ai = await connection.getAccountInfo(perpMarketAddress)
	const data = parseAccountWithAnchor<PerpMarketAccount, DriftIDL>(ai?.data, program, 'PerpMarket')
	if (!data) {
		throw Error('Could not fetch perp market')
	}
	return data
}

// export function parseDriftUserAccount(data: Buffer) {
// 	const parsed = parseAccountWithAnchor<UserAccount, DriftIDL>(data, program, 'User')
// 	if (!parsed) {
// 		throw Error('Provided account is not drift user account')
// 	}
// }
