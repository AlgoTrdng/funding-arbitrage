import { struct, u32, seq, u8 } from '@solana/buffer-layout'
import { bool, u64, publicKey } from '@solana/buffer-layout-utils'
import { AccountInfo, PublicKey } from '@solana/web3.js'
import { Magic, parsePriceData } from '@pythnetwork/client'

import { _I80F48Layout, s128, s64 } from './layout.js'
import { I80F48 } from './i80f48.js'

type SwitchboardDecimalLayout = {
	mantissa: bigint
	scale: number
}

const switchboardDecimalLayout = struct<SwitchboardDecimalLayout>([s128('mantissa'), u32('scale')])

type AggregatorRoundLayout = {
	numSuccess: number
	numError: number
	isClosed: boolean
	roundOpenSlot: bigint
	roundOpenTimestamp: bigint
	result: SwitchboardDecimalLayout
}

const aggregatorRoundLayout = struct<AggregatorRoundLayout>([
	u32('numSuccess'),
	u32('numError'),
	bool('isClosed'),
	u64('roundOpenSlot'),
	s64('roundOpenTimestamp'),
	switchboardDecimalLayout.replicate('result'),
])

type AggregatorLayout = {
	name: number[]
	metadata: number[]
	reserved1: number[]
	queuePubkey: PublicKey
	oracleRequestBatchSize: number
	minOracleResults: number
	minJobResults: number
	minUpdateDelaySeconds: number
	startAfter: bigint
	varianceThreshold: SwitchboardDecimalLayout
	forceReportPeriod: bigint
	expiration: bigint
	consecutiveFailureCount: bigint
	nextAllowedUpdateTime: bigint
	isLocked: boolean
	crankPubkey: string
	latestConfirmedRound: AggregatorRoundLayout
}

export const aggregatorLayout = struct<AggregatorLayout>([
	seq(u8(), 32, 'name'),
	seq(u8(), 128, 'metadata'),
	seq(u8(), 32, 'reserved1'),
	publicKey('queuePubkey'),
	u32('oracleRequestBatchSize'),
	u32('minOracleResults'),
	u32('minJobResults'),
	u32('minUpdateDelaySeconds'),
	s64('startAfter'),
	switchboardDecimalLayout.replicate('varianceThreshold'),
	s64('forceReportPeriod'),
	s64('expiration'),
	u64('consecutiveFailureCount'),
	s64('nextAllowedUpdateTime'),
	bool('isLocked'),
	publicKey('crankPubkey'),
	aggregatorRoundLayout.replicate('latestConfirmedRound'),
])

export function decodeSwitchboardPrice(data: Buffer) {
	const r = aggregatorLayout.decode(data, 8)
	const { mantissa, scale } = r.latestConfirmedRound.result
	const m = I80F48.fromString(mantissa.toString())
	const s = I80F48.fromNumber(10 ** scale)
	return m.div(s)
}

const SWITCHBOARD_V2_PROGRAM_ID = new PublicKey('SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f')
const stubOracleDiscriminator = Buffer.from('e0fbfe63b1ae8904', 'hex')
const i80f48 = new _I80F48Layout()

export type OraclePriceData = {
	price: I80F48
	uiPrice: number
}

export function parseOracle(
	ai: AccountInfo<Buffer>,
	data: Buffer,
	decimals: number,
): OraclePriceData {
	const disc = data.slice(0, 8)

	if (disc.compare(stubOracleDiscriminator) === 0) {
		const p = i80f48.decode(data, 8 + 32 + 32)
		const uiPrice = p.toNumber() / 10 ** decimals
		return { price: p, uiPrice }
	} else if (data.readUint32LE(0) === Magic) {
		const p = parsePriceData(data)
		return {
			uiPrice: p.previousPrice,
			price: I80F48.fromNumber(p.previousPrice * 10 ** decimals),
		}
	} else if (ai.owner.equals(SWITCHBOARD_V2_PROGRAM_ID)) {
		const p = decodeSwitchboardPrice(data)
		return {
			price: p.mul(I80F48.fromNumber(10 ** decimals)),
			uiPrice: p.toNumber(),
		}
	}

	throw Error('Invalid oracle type')
}
