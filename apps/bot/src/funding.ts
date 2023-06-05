import { FundingRecord, fundingRecord } from 'db'
import { desc, gt } from 'drizzle-orm'

import { db } from './global.js'

type ParsedFundingRecord = Omit<FundingRecord, 'dex' | 'id'>

export type ParsedFundingRates = {
	mango: ParsedFundingRecord[]
	drift: ParsedFundingRecord[]
}

export async function getFundingRates() {
	const recentTs = new Date().getTime() - 1000 * 30 * 30
	const fundingRates = await db
		.select()
		.from(fundingRecord)
		.where(gt(fundingRecord.ts, new Date(recentTs)))
		.orderBy(desc(fundingRecord.ts))
		.execute()

	const parsed: ParsedFundingRates = {
		mango: [],
		drift: [],
	}

	for (const fr of fundingRates) {
		const p: ParsedFundingRecord = {
			value: fr.value,
			ts: fr.ts,
		}

		if (fr.dex === 'mango') {
			parsed.mango.push(p)
		} else {
			parsed.drift.push(p)
		}
	}

	return parsed
}
