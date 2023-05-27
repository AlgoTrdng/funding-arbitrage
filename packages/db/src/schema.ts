import { InferModel } from 'drizzle-orm'
import { mysqlEnum, mysqlTable, timestamp, float, int } from 'drizzle-orm/mysql-core'

const dexes = ['mango', 'drift'] as const

export const dex = mysqlEnum('dex', dexes)

export const fundingRecord = mysqlTable('funding_record', {
	id: int('id').autoincrement().primaryKey(),
	ts: timestamp('ts').notNull(),
	value: float('value').notNull(),
	dex: dex.notNull(),
})

export type Dex = (typeof dexes)[number]
export type FundingRecord = InferModel<typeof fundingRecord>
