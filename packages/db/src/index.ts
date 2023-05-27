import { PlanetScaleDatabase, drizzle } from 'drizzle-orm/planetscale-serverless'
import { connect } from '@planetscale/database'
import dotenv from 'dotenv'

import { Dex, FundingRecord, fundingRecord, dex } from './schema.js'

dotenv.config()

export { fundingRecord, dex, Dex, FundingRecord }

export function initDB(dbURL: string) {
	const dbConnection = connect({
		url: dbURL,
	})
	return drizzle(dbConnection)
}

export type DB = PlanetScaleDatabase<Record<string, never>>

export type SaveFundingRecordData = {
	valuePct: number
	dex: Dex
}

export async function saveFundingRecord(db: DB, { valuePct, dex }: SaveFundingRecordData) {
	console.log(`Saving record for ${dex}; valuePct: ${valuePct}`)
	return db.insert(fundingRecord).values({
		ts: new Date(),
		value: valuePct,
		dex,
	})
}
