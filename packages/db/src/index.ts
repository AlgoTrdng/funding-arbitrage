import { PlanetScaleDatabase, drizzle } from 'drizzle-orm/planetscale-serverless'
import { connect } from '@planetscale/database'
import dotenv from 'dotenv'

import { Dex, Periodicity, FundingRecord, fundingRecord, dex, periodicity } from './schema.js'

dotenv.config()

export { fundingRecord, dex, periodicity, Dex, Periodicity, FundingRecord }

export function initDB(dbURL: string) {
	const dbConnection = connect({
		url: dbURL,
	})
	return drizzle(dbConnection)
}

export type DB = PlanetScaleDatabase<Record<string, never>>

export type SaveFundingRecordData = {
	periodicity: Periodicity
	valuePct: number
	dex: Dex
}

export async function saveFundingRecord(
	db: DB,
	{ periodicity, valuePct, dex }: SaveFundingRecordData,
) {
	console.log(`Saving record for ${dex}; valuePct: ${valuePct}; periodicity: ${periodicity}`)
	return db.insert(fundingRecord).values({
		ts: new Date(),
		value: valuePct,
		periodicity,
		dex,
	})
}
