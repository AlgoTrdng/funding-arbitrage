import { setTimeout } from 'node:timers/promises'
import { PublicKey } from '@solana/web3.js'
import { DRIFT_PROGRAM_ID, PerpMarketAccount } from '@drift-labs/sdk'
import { Program } from '@coral-xyz/anchor'
import BN from 'bn.js'
import {
	BookSide,
	BookSideLayout,
	PerpMarket,
	bookSideLayout,
	mangoOracleLayout,
	perpMarketLayout,
} from 'mango-utils'
import { Dex, saveFundingRecord } from 'db'

import { AccountFetcher, layoutAccountParser } from './utils/account-fetcher.js'
import { DriftIDL, driftIDL } from './drift/idl.js'
import { anchorProvider, db } from './global.js'

const GET_FUNDING_PERIODICITY = 5000
const SNAPSHOTS_IN_ONE_MINUTE = 12
const SNAPSHOTS_IN_FIVE_MINUTES = 5

const MANGO_PERP_MARKET_ADDRESS = new PublicKey('ESdnpnNLgTkBCZRuTJkZLi5wKEZ2z47SG3PJrhundSQ2')
const MANGO_BIDS_ADDRESS = new PublicKey('4M8szuGnXvsnDuoJ2cN1bsE7Civ8d4DH7CSe8dRJXtnW')
const MANGO_ASKS_ADDRESS = new PublicKey('GD2WH95D6Ebe6T9qGsn8Q4fPBfCDQqReksksR9KELd73')
const MANGO_ORACLE_ADDRESS = new PublicKey('H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG')

const DRIFT_PROGRAM_ADDRESS = new PublicKey(DRIFT_PROGRAM_ID)
const DRIFT_PERP_MARKET_ADDRESS = PublicKey.findProgramAddressSync(
	[Buffer.from('perp_market', 'utf-8'), new BN(0).toArrayLike(Buffer, 'le', 2)],
	DRIFT_PROGRAM_ADDRESS,
)[0]

const driftProgram = new Program<DriftIDL>(driftIDL, DRIFT_PROGRAM_ADDRESS, anchorProvider)

function parsePerpMarketAccount(data: Buffer | null | undefined): PerpMarketAccount {
	if (!data) {
		throw Error('Invalid account info')
	}
	try {
		return driftProgram.coder.accounts.decode('PerpMarket', data)
	} catch (error) {
		console.log(error)
		console.error('Could not parse PerpMarket account')
		throw Error('Invalid account info')
	}
}

const accounts = await AccountFetcher.new({
	mangoPerpMarket: {
		address: MANGO_PERP_MARKET_ADDRESS,
		parser: layoutAccountParser(perpMarketLayout),
	},
	mangoBids: {
		address: MANGO_BIDS_ADDRESS,
		parser: layoutAccountParser(bookSideLayout),
	},
	mangoAsks: {
		address: MANGO_ASKS_ADDRESS,
		parser: layoutAccountParser(bookSideLayout),
	},
	mangoOracle: {
		address: MANGO_ORACLE_ADDRESS,
		parser: layoutAccountParser(mangoOracleLayout),
	},
	driftPerpMarket: {
		address: DRIFT_PERP_MARKET_ADDRESS,
		parser: parsePerpMarketAccount,
	},
})

function getMangoFundingRateAPR(
	perpMarket: PerpMarket,
	bidsData: BookSideLayout,
	asksData: BookSideLayout,
) {
	const bids = new BookSide(perpMarket, 'bids', bidsData.roots, bidsData.nodes)
	const asks = new BookSide(perpMarket, 'asks', asksData.roots, asksData.nodes)
	return perpMarket.getInstantaneousFundingRate(bids, asks) * 360 * 100
}

function getDriftFundingRateAPR(perpMarketData: PerpMarketAccount) {
	const mpTwap = perpMarketData.amm.lastMarkPriceTwap.toNumber() / 1e6
	const oracleTwap = perpMarketData.amm.historicalOracleData.lastOraclePriceTwap.toNumber() / 1e6
	const fundingRate = (mpTwap - oracleTwap) / oracleTwap
	return fundingRate * 360 * 100
}

function getAvg(all: number[]) {
	return all.reduce((total, c) => total + c) / all.length
}

async function trackFundingRate(fundingAPRGetter: () => number, dex: Dex) {
	let oneMinuteSnapshots: number[] = []
	let oneMinuteSnapshotsUnsaved = 0

	let fiveMinuteSnapshots: number[] = []
	let fiveMinuteSnapshotsUnsaved = 0

	while (true) {
		try {
			const fundingAPR = fundingAPRGetter()

			oneMinuteSnapshots.push(fundingAPR)
			oneMinuteSnapshotsUnsaved += 1

			if (oneMinuteSnapshotsUnsaved === SNAPSHOTS_IN_ONE_MINUTE) {
				const avg = getAvg(oneMinuteSnapshots)
				await saveFundingRecord(db, {
					periodicity: '1',
					valuePct: avg,
					dex,
				})

				fiveMinuteSnapshots.push(avg)
				fiveMinuteSnapshotsUnsaved += 1

				oneMinuteSnapshots = oneMinuteSnapshots.slice(1)
				oneMinuteSnapshotsUnsaved = 0
			}

			if (fiveMinuteSnapshotsUnsaved === SNAPSHOTS_IN_FIVE_MINUTES) {
				const avg = getAvg(fiveMinuteSnapshots)
				await saveFundingRecord(db, {
					periodicity: '5',
					valuePct: avg,
					dex,
				})

				fiveMinuteSnapshots = fiveMinuteSnapshots.slice(1)
				fiveMinuteSnapshotsUnsaved = 0
			}
		} catch (error) {
			console.error(error)
			console.log('Could not save funding rate for', dex)
		}

		await setTimeout(GET_FUNDING_PERIODICITY)
	}
}

await Promise.all([
	trackFundingRate(() => {
		const mangoPerpMarket = new PerpMarket(
			accounts.data.mangoPerpMarket,
			accounts.accountsInfos.mangoOracle,
		)
		const mangoFundingAPR = getMangoFundingRateAPR(
			mangoPerpMarket,
			accounts.data.mangoBids,
			accounts.data.mangoAsks,
		)
		return mangoFundingAPR
	}, 'mango'),
	trackFundingRate(() => {
		return getDriftFundingRateAPR(accounts.data.driftPerpMarket)
	}, 'drift'),
])