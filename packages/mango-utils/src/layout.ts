import { f32, f64, seq, struct, u16, u32, u8, Layout, blob, Blob } from '@solana/buffer-layout'
import { u64, publicKey, u128, bigInt } from '@solana/buffer-layout-utils'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

import { I80F48 } from './i80f48.js'

export class _I80F48Layout extends Layout<I80F48> {
	blob: Blob

	constructor(property?: string) {
		const span = 16
		super(span, property)

		this.blob = blob(span)
	}

	decode(b: Buffer, offset = 0) {
		const num = new BN(this.blob.decode(b, offset), 10, 'le')
		const snum = num.fromTwos(128).clone()
		return I80F48.from({ val: snum })
	}

	encode(src: I80F48, b: Buffer, offset = 0) {
		const bn = src.data.toTwos(128)
		return this.blob.encode(bn.toArrayLike(Buffer, 'le', this.span), b, offset)
	}
}

export const s64 = bigInt(8)
export const s128 = bigInt(16)

type TokenIndexLayout = {
	val: number
}

const tokenIndexLayout = struct<TokenIndexLayout>([u16('val')])

export const i80f48Layout = (prop?: string) => new _I80F48Layout(prop)

export type OracleConfigLayout = {
	confFilter: I80F48
	maxStalenessSlots: bigint
	reserved: number[]
}

export const oracleConfigLayout = struct<OracleConfigLayout>([
	i80f48Layout('confFilter'),
	s64('maxStalenessSlots'),
	seq(u8(), 72, 'reserved'),
])

export type StablePriceModelLayout = {
	stablePrice: number
	lastUpdateTimestamp: bigint
	delayPrices: number[]
	delayAccumulatorPrice: number
	delayAccumulatorTime: number
	delayIntervalSeconds: number
	delayGrowthLimit: number
	stableGrowthLimit: number
	lastDelayIntervalIndex: number
	padding: number[]
	reserved: number[]
}

export const stablePriceModelLayout = struct<StablePriceModelLayout>([
	f64('stablePrice'),
	u64('lastUpdateTimestamp'),
	seq(f64(), 24, 'delayPrices'),
	f64('delayAccumulatorPrice'),
	u32('delayAccumulatorTime'),
	u32('delayIntervalSeconds'),
	f32('delayGrowthLimit'),
	f32('stableGrowthLimit'),
	u8('lastDelayIntervalIndex'),
	seq(u8(), 7, 'padding'),
	seq(u8(), 48, 'padding'),
])

export type PerpMarketLayout = {
	discriminator: number[]
	group: PublicKey
	settleTokenIndex: TokenIndexLayout
	perpMarketIndex: TokenIndexLayout
	blocked1: number
	groupInsuranceFund: number
	bump: number
	baseDecimals: number
	name: number[]
	bids: PublicKey
	asks: PublicKey
	eventQueue: PublicKey
	oracle: PublicKey
	oracleConfig: OracleConfigLayout
	stablePriceModel: StablePriceModelLayout
	quoteLotSize: bigint
	baseLotSize: bigint
	maintBaseAssetWeight: I80F48
	initBaseAssetWeight: I80F48
	maintBaseLiabWeight: I80F48
	initBaseLiabWeight: I80F48
	openInterest: bigint
	seqNum: bigint
	registrationTime: bigint
	minFunding: I80F48
	maxFunding: I80F48
	impactQuantity: bigint
	longFunding: I80F48
	shortFunding: I80F48
	fundingLastUpdated: bigint
	baseLiquidationFee: I80F48
	makerFee: I80F48
	takerFee: I80F48
	feesAccrued: I80F48
	feesSettled: I80F48
	feePenalty: number
	settleFeeFlat: number
	settleFeeAmountThreshold: number
	settleFeeFractionLowHealth: number
	settlePnlLimitFactor: number
	padding3: number[]
	settlePnlLimitWindowSizeTs: bigint
	reduceOnly: number
	forceClose: number
	padding4: number[]
	maintOverallAssetWeight: I80F48
	initOverallAssetWeight: I80F48
	positivePnlLiquidationFee: I80F48
	reserved: number[]
}

export const perpMarketLayout = struct<PerpMarketLayout>([
	seq(u8(), 8, 'discriminator'),
	publicKey('group'),
	tokenIndexLayout.replicate('settleTokenIndex'),
	tokenIndexLayout.replicate('perpMarketIndex'),
	u8('blocked1'),
	u8('groupInsuranceFund'),
	u8('bump'),
	u8('baseDecimals'),
	seq(u8(), 16, 'name'),
	publicKey('bids'),
	publicKey('asks'),
	publicKey('event_queue'),
	publicKey('oracle'),
	oracleConfigLayout.replicate('oracleConfig'),
	stablePriceModelLayout.replicate('stablePriceModel'),
	s64('quoteLotSize'),
	s64('baseLotSize'),
	i80f48Layout('maintBaseAssetWeight'),
	i80f48Layout('initBaseAssetWeight'),
	i80f48Layout('maintBaseLiabWeight'),
	i80f48Layout('initBaseLiabWeight'),
	s64('openInterest'),
	u64('seqNum'),
	u64('registrationTime'),
	i80f48Layout('minFunding'),
	i80f48Layout('maxFunding'),
	s64('impactQuantity'),
	i80f48Layout('longFunding'),
	i80f48Layout('shortFunding'),
	u64('fundingLastUpdated'),
	i80f48Layout('baseLiquidationFee'),
	i80f48Layout('makerFee'),
	i80f48Layout('takerFee'),
	i80f48Layout('feesAccrued'),
	i80f48Layout('feesSettled'),
	f32('feePenalty'),
	f32('settleFeeFlat'),
	f32('settleFeeAmountThreshold'),
	f32('settleFeeFractionLowHealth'),
	f32('settlePnlLimitFactor'),
	seq(u8(), 4, 'padding3'),
	u64('settlePnlLimitWindowSizeTs'),
	u8('reduceOnly'),
	u8('forceClose'),
	seq(u8(), 6, 'padding4'),
	i80f48Layout('maintOverallAssetWeight'),
	i80f48Layout('initOverallAssetWeight'),
	i80f48Layout('positivePnlLiquidationFee'),
	seq(u8(), 1888, 'reserved'),
])

export type OrderTreeRootLayout = {
	maybeNode: number
	leafCount: number
}

export const orderTreeRootLayout = struct<OrderTreeRootLayout>([u32('maybeNode'), u32('leafCount')])

type AnyNodeLayout = {
	tag: number
	data: number[]
}

export const anyNodeLayout = struct<AnyNodeLayout>([u8('tag'), seq(u8(), 119, 'data')])

export type OrderTreeNodesLayout = {
	orderTreeType: number
	padding: number[]
	bumpIndex: number
	freeListLen: number
	freeListHead: number
	reserved: number[]
	nodes: AnyNodeLayout[]
}

export const orderTreeNodesLayout = struct<OrderTreeNodesLayout>([
	u8('orderTreeType'),
	seq(u8(), 3, 'padding'),
	u32('bumpIndex'),
	u32('freeListLen'),
	u32('freeListHead'),
	seq(u8(), 512, 'reserved'),
	seq(anyNodeLayout, 1024, 'nodes'),
])

export type BookSideLayout = {
	discriminator: number[]
	roots: OrderTreeRootLayout[]
	reservedRoots: OrderTreeRootLayout[]
	reserved: number[]
	nodes: OrderTreeNodesLayout
}

export const bookSideLayout = struct<BookSideLayout>([
	seq(u8(), 8, 'discriminator'),
	seq(orderTreeRootLayout, 2, 'roots'),
	seq(orderTreeRootLayout, 4, 'reservedRoots'),
	seq(u8(), 256, 'reserved'),
	orderTreeNodesLayout.replicate('nodes'),
])

export type InnerNodeLayout = {
	tag: number
	padding: number[]
	prefixLen: number
	key: bigint
	children: number[]
	childEarliestExpiry: bigint[]
	reserved: number[]
}

export const innerNodeLayout = struct<InnerNodeLayout>([
	u8('tag'),
	seq(u8(), 3, 'padding'),
	u32('prefixLen'),
	u128('key'),
	seq(u32(), 2, 'children'),
	seq(u64(), 2, 'childEarliestExpiry'),
	seq(u8(), 72, 'reserved'),
])

export type LeafNodeLayout = {
	tag: number
	ownerSlot: number
	orderType: number
	padding: number[]
	timeInForce: number
	padding2: number[]
	key: bigint
	owner: PublicKey
	quantity: bigint
	timestamp: bigint
	pegLimit: bigint
	clientOrderId: bigint
	reserved: number[]
}

export const leafNodeLayout = struct<LeafNodeLayout>([
	u8('tag'),
	u8('ownerSlot'),
	u8('orderType'),
	seq(u8(), 1, 'padding'),
	u16('timeInForce'),
	seq(u8(), 2, 'padding2'),
	u128('key'),
	publicKey('owner'),
	s64('quantity'),
	u64('timestamp'),
	s64('pegLimit'),
	u64('clientOrderId'),
	seq(u8(), 32, 'reserved'),
])

export type MangoOracleLayout = {
	group: PublicKey
	mint: PublicKey
	price: I80F48
	lastUpdated: bigint
}

export const mangoOracleLayout = struct<MangoOracleLayout>([
	publicKey('group'),
	publicKey('mint'),
	i80f48Layout('price'),
	s64('lastUpdated'),
])

export type MangoBankLayout = {
	group: PublicKey
	name: number[]
	mint: PublicKey
	vault: PublicKey
	oracle: PublicKey
	oracleConfig: OracleConfigLayout
	stablePriceModel: StablePriceModelLayout
	depositIndex: I80F48
	borrowIndex: I80F48
	indexedDeposits: I80F48
	indexedBorrows: I80F48
	indexLastUpdated: bigint
	bankRateLastUpdated: bigint
	avgUtilization: I80F48
	adjustmentFactor: I80F48
	util0: I80F48
	rate0: I80F48
	util1: I80F48
	rate1: I80F48
	maxRate: I80F48
	collectedFeesNative: I80F48
	loanOriginationFeeRate: I80F48
	loanFeeRate: I80F48
	maintAssetWeight: I80F48
	initAssetWeight: I80F48
	maintLiabWeight: I80F48
	initLiabWeight: I80F48
	liquidationFee: I80F48
	dust: I80F48
	flashLoanTokenAccountInitial: bigint
	flashLoanApprovedAmount: bigint
	tokenIndex: number
	bump: number
	mintDecimals: number
	bankNum: number
	minVaultToDepositsRatio: number
	netBorrowLimitWindowSizeTs: bigint
	lastNetBorrowsWindowStartTs: bigint
	netBorrowLimitPerWindowQuote: bigint
	netBorrowsInWindow: bigint
	borrowWeightScaleStartQuote: number
	depositWeightScaleStartQuote: number
	reduceOnly: number
	forceClose: number
	reserved: number[]
}

export const mangoBankLayout = struct<MangoBankLayout>([
	publicKey('group'), // 32
	seq(u8(), 16, 'name'), // 16
	publicKey('mint'), // 32
	publicKey('vault'), // 32
	publicKey('oracle'), // 32
	oracleConfigLayout.replicate('oracleConfig'),
	i80f48Layout('depositIndex'),
	stablePriceModelLayout.replicate('stablePriceModel'),
	i80f48Layout('borrowIndex'),
	i80f48Layout('indexedDeposits'),
	i80f48Layout('indexedBorrows'),
	u64('indexLastUpdated'),
	i80f48Layout('avgUtilization'),
	u64('bankRateLastUpdated'),
	i80f48Layout('adjustmentFactor'),
	i80f48Layout('util0'),
	i80f48Layout('rate0'),
	i80f48Layout('util1'),
	i80f48Layout('rate1'),
	i80f48Layout('maxRate'),
	i80f48Layout('collectedFeesNative'),
	i80f48Layout('loanOriginationFeeRate'),
	i80f48Layout('loanFeeRate'),
	i80f48Layout('maintAssetWeight'),
	i80f48Layout('initAssetWeight'),
	i80f48Layout('maintLiabWeight'),
	i80f48Layout('initLiabWeight'),
	i80f48Layout('liquidationFee'),
	i80f48Layout('dust'),
	u64('flashLoanTokenAccountInitial'),
	u64('flashLoanApprovedAmount'),
	u16('tokenIndex'),
	u8('bump'),
	u8('mintDecimals'),
	u32('bankNum'),
	f64('minVaultToDepositsRatio'),
	u64('netBorrowLimitWindowSizeTs'),
	u64('lastNetBorrowsWindowStartTs'),
	s64('netBorrowLimitPerWindowQuote'),
	s64('netBorrowsInWindow'),
	f64('borrowWeightScaleStartQuote'),
	f64('depositWeightScaleStartQuote'),
	u8('reduceOnly'),
	u8('forceClose'),
	seq(u8(), 2118, 'reserved'),
])
