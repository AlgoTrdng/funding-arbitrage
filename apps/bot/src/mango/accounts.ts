import { PublicKey } from '@solana/web3.js'
import { struct, blob } from '@solana/buffer-layout'
import { publicKey, u64 } from '@solana/buffer-layout-utils'

// type I80F48DtoLayout = { val: BN }

// export type TokenPositionLayout = {
// 	indexedPosition: I80F48DtoLayout
// 	tokenIndex: number
// 	inUseCount: number
// 	padding: number[]
// 	previousIndex: I80F48DtoLayout
// 	cumulativeDepositInterest: number
// 	cumulativeBorrowInterest: number
// 	reserved: number[]
// }

// export type Serum3OrdersLayout = {
// 	openOrders: PublicKey
// 	baseBorrowsWithoutFee: BN
// 	quoteBorrowsWithoutFee: BN
// 	marketIndex: number
// 	baseTokenIndex: number
// 	quoteTokenIndex: number
// 	padding: number[]
// 	reserved: number[]
// }

// export type PerpPositionLayout = {
// 	marketIndex: number
// 	padding: number[]
// 	settlePnlLimitWindow: number
// 	settlePnlLimitSettledInCurrentWindowNative: BN
// 	basePositionLots: BN
// 	quotePositionNative: I80F48DtoLayout
// 	quoteRunningNative: BN
// 	longSettledFunding: I80F48DtoLayout
// 	shortSettledFunding: I80F48DtoLayout
// 	bidsBaseLots: BN
// 	asksBaseLots: BN
// 	takerBaseLots: BN
// 	takerQuoteLots: BN
// 	cumulativeLongFunding: number
// 	cumulativeShortFunding: number
// 	makerVolume: BN
// 	takerVolume: BN
// 	perpSpotTransfers: BN
// 	avgEntryPricePerBaseLot: number
// 	realizedTradePnlNative: I80F48DtoLayout
// 	realizedOtherPnlNative: I80F48DtoLayout
// 	settlePnlLimitRealizedTrade: number
// 	realizedPnlForPositionNative: I80F48DtoLayout
// 	reserved: number[]
// }

// export type PerpOpenOrderLayout = {
// 	sideAndTree: number
// 	padding1: number[]
// 	market: number
// 	padding2: number[]
// 	clientId: BN
// 	id: BN
// 	reserved: number[]
// }

// export type MangoAccountLayout = {
// 	group: PublicKey
// 	owner: PublicKey
// 	name: number[]
// 	delegate: PublicKey
// 	accountNum: number
// 	beingLiquidity: number
// 	inHealthRegion: number
// 	bump: number
// 	padding: number[]
// 	netDeposits: BN
// 	perpSpotTransfers: BN
// 	healthRegionBeginInitHealth: BN
// 	frozenUntil: BN
// 	buybackFeesAccruedCurrent: BN
// 	buybackFeesAccruedPrevious: BN
// 	buybackFeesExpiryTimestamp: BN
// 	reserved: number[]
// 	headerVersion: number
// 	padding3: number[]
// 	padding4: number
// 	tokens: TokenPositionLayout[]
// 	padding5: number
// 	serum3: Serum3OrdersLayout[]
// 	padding6: number
// 	perps: PerpPositionLayout[]
// 	padding7: number
// 	perpOpenOrders: PerpOpenOrderLayout[]
// }

export type OpenbookMarketLayout = {
	padding1: Uint8Array
	accountFlags: bigint
	ownAddress: PublicKey
	vaultSignerNonce: bigint
	baseMint: PublicKey
	quoteMint: PublicKey
	baseVault: PublicKey
	baseDepositsTotal: bigint
	baseFeesAccrued: bigint
	quoteVault: PublicKey
	quoteDepositsTotal: bigint
	quoteFeesAccrued: bigint
	quoteDustThreshold: bigint
	requestQueue: PublicKey
	eventQueue: PublicKey
	bids: PublicKey
	asks: PublicKey
	baseLotSize: bigint
	quoteLotSize: bigint
	feeRateBps: bigint
	referrerRebatesAccrued: bigint
	padding2: Uint8Array
}

export const openbookMarketLayout = struct<OpenbookMarketLayout>([
	blob(5, 'padding1'),
	u64('accountFlags'),
	publicKey('ownAddress'),
	u64('vaultSignerNonce'),
	publicKey('baseMint'),
	publicKey('quoteMint'),
	publicKey('baseVault'),
	u64('baseDepositsTotal'),
	u64('baseFeesAccrued'),
	publicKey('quoteVault'),
	u64('quoteDepositsTotal'),
	u64('quoteFeesAccrued'),
	u64('quoteDustThreshold'),
	publicKey('requestQueue'),
	publicKey('eventQueue'),
	publicKey('bids'),
	publicKey('asks'),
	u64('baseLotSize'),
	u64('quoteLotSize'),
	u64('feeRateBps'),
	u64('referrerRebatesAccrued'),
	blob(7, 'padding2'),
])
