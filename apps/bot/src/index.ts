import { setTimeout } from 'node:timers/promises'
import { Dex } from 'db'

import { getFundingRates } from './funding.js'

const MINIMUM_FUNDING_RATE_REQUIRED = 30

async function loop(timeout: number, cb: () => Promise<void> | void) {
	while (true) {
		await cb()
		await setTimeout(timeout)
	}
}

function calcAvg(all: { value: number }[]) {
	return all.reduce((t, n) => t + n.value, 0) / all.length
}

type DexFundingData = {
	value: number
	dex: Dex
}

function sortAvgs(
	mangoAvg: number,
	driftAvg: number,
): [lower: DexFundingData, higher: DexFundingData, diff: number] {
	const m: DexFundingData = {
		value: mangoAvg,
		dex: 'mango',
	}
	const d: DexFundingData = {
		value: driftAvg,
		dex: 'drift',
	}

	if (mangoAvg > driftAvg) {
		return [d, m, mangoAvg - driftAvg]
	}
	return [m, d, driftAvg - mangoAvg]
}

loop(1000 * 60 * 5, async () => {
	const fundingRates = await getFundingRates()

	const mangoAvg = calcAvg(fundingRates.mango)
	const driftAvg = calcAvg(fundingRates.drift)

	const [lower, higher, diff] = sortAvgs(mangoAvg, driftAvg)

	console.log(lower, higher, diff)

	/*
    prefer arb with spot position and short position
        -> funding on any higher than MIN
        -> diff is less than MIN + 10%
            - +10% to avoid opening long position when lower funding is close to 0%
    */

	if (diff < MINIMUM_FUNDING_RATE_REQUIRED + 10 && higher.value > MINIMUM_FUNDING_RATE_REQUIRED) {
		// open short on dex with higher
		// long spot -> either with jupiter or clob which has better quote
		return
	}

	if (diff > MINIMUM_FUNDING_RATE_REQUIRED) {
		// open short on dex with higher funding
		// open long on dex with lower funding
	}
})
