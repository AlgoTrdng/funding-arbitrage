import { f32, f64, seq, struct, u16, u32, u8, Layout, blob, Blob } from '@solana/buffer-layout'
import { u64, publicKey, u128, bigInt } from '@solana/buffer-layout-utils'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

export class BNLayout extends Layout<BN> {
	blob: Blob
	signed: boolean

	constructor(span: number, signed: boolean, property?: string) {
		super(span, property)
		this.blob = blob(span)
		this.signed = signed
	}

	decode(b: Buffer, offset = 0) {
		const num = new BN(this.blob.decode(b, offset), 10, 'le')
		if (this.signed) {
			return num.fromTwos(this.span * 8).clone()
		}
		return num
	}

	encode(src: BN, b: Buffer, offset = 0) {
		if (this.signed) {
			src = src.toTwos(this.span * 8)
		}
		return this.blob.encode(src.toArrayLike(Buffer, 'le', this.span), b, offset)
	}
}

const s64 = bigInt(8)

type TokenIndexLayout = {
	val: number
}

const tokenIndexLayout = struct<TokenIndexLayout>([u16('val')])

export type I80F48Layout = {
	val: BN
}

export const i80f48Layout = struct<I80F48Layout>([new BNLayout(16, true, 'val')])

export type OracleConfigLayout = {
	confFilter: I80F48Layout
	maxStalenessSlots: bigint
	reserved: number[]
}

export const oracleConfigLayout = struct<OracleConfigLayout>([
	i80f48Layout.replicate('confFilter'),
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
	maintBaseAssetWeight: I80F48Layout
	initBaseAssetWeight: I80F48Layout
	maintBaseLiabWeight: I80F48Layout
	initBaseLiabWeight: I80F48Layout
	openInterest: bigint
	seqNum: bigint
	registrationTime: bigint
	minFunding: I80F48Layout
	maxFunding: I80F48Layout
	impactQuantity: bigint
	longFunding: I80F48Layout
	shortFunding: I80F48Layout
	fundingLastUpdated: bigint
	baseLiquidationFee: I80F48Layout
	makerFee: I80F48Layout
	takerFee: I80F48Layout
	feesAccrued: I80F48Layout
	feesSettled: I80F48Layout
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
	maintOverallAssetWeight: I80F48Layout
	initOverallAssetWeight: I80F48Layout
	positivePnlLiquidationFee: I80F48Layout
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
	i80f48Layout.replicate('maintBaseAssetWeight'),
	i80f48Layout.replicate('initBaseAssetWeight'),
	i80f48Layout.replicate('maintBaseLiabWeight'),
	i80f48Layout.replicate('initBaseLiabWeight'),
	s64('openInterest'),
	u64('seqNum'),
	u64('registrationTime'),
	i80f48Layout.replicate('minFunding'),
	i80f48Layout.replicate('maxFunding'),
	s64('impactQuantity'),
	i80f48Layout.replicate('longFunding'),
	i80f48Layout.replicate('shortFunding'),
	u64('fundingLastUpdated'),
	i80f48Layout.replicate('baseLiquidationFee'),
	i80f48Layout.replicate('makerFee'),
	i80f48Layout.replicate('takerFee'),
	i80f48Layout.replicate('feesAccrued'),
	i80f48Layout.replicate('feesSettled'),
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
	i80f48Layout.replicate('maintOverallAssetWeight'),
	i80f48Layout.replicate('initOverallAssetWeight'),
	i80f48Layout.replicate('positivePnlLiquidationFee'),
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
	price: I80F48Layout
	lastUpdated: bigint
}

export const mangoOracleLayout = struct<MangoOracleLayout>([
	publicKey('group'),
	publicKey('mint'),
	i80f48Layout.replicate('price'),
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
	depositIndex: I80F48Layout
	borrowIndex: I80F48Layout
	indexedDeposits: I80F48Layout
	indexedBorrows: I80F48Layout
	indexLastUpdated: bigint
	bankRateLastUpdated: bigint
	avgUtilization: I80F48Layout
	adjustmentFactor: I80F48Layout
	util0: I80F48Layout
	rate0: I80F48Layout
	util1: I80F48Layout
	rate1: I80F48Layout
	maxRate: I80F48Layout
	collectedFeesNative: I80F48Layout
	loanOriginationFeeRate: I80F48Layout
	loanFeeRate: I80F48Layout
	maintAssetWeight: I80F48Layout
	initAssetWeight: I80F48Layout
	maintLiabWeight: I80F48Layout
	initLiabWeight: I80F48Layout
	liquidationFee: I80F48Layout
	dust: I80F48Layout
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
	publicKey('group'),
	seq(u8(), 16, 'name'),
	publicKey('mint'),
	publicKey('vault'),
	publicKey('oracle'),
	oracleConfigLayout.replicate('oracleConfig'),
	i80f48Layout.replicate('depositIndex'),
	stablePriceModelLayout.replicate('stablePriceModel'),
	i80f48Layout.replicate('borrowIndex'),
	i80f48Layout.replicate('indexedDeposits'),
	i80f48Layout.replicate('indexedBorrows'),
	u64('indexLastUpdated'),
	i80f48Layout.replicate('avgUtilization'),
	u64('bankRateLastUpdated'),
	i80f48Layout.replicate('adjustmentFactor'),
	i80f48Layout.replicate('util0'),
	i80f48Layout.replicate('rate0'),
	i80f48Layout.replicate('util1'),
	i80f48Layout.replicate('rate1'),
	i80f48Layout.replicate('maxRate'),
	i80f48Layout.replicate('collectedFeesNative'),
	i80f48Layout.replicate('loanOriginationFeeRate'),
	i80f48Layout.replicate('loanFeeRate'),
	i80f48Layout.replicate('maintAssetWeight'),
	i80f48Layout.replicate('initAssetWeight'),
	i80f48Layout.replicate('maintLiabWeight'),
	i80f48Layout.replicate('initLiabWeight'),
	i80f48Layout.replicate('liquidationFee'),
	i80f48Layout.replicate('dust'),
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
