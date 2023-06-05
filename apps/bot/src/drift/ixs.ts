import { AccountMeta, PublicKey, TransactionInstruction } from '@solana/web3.js'
import { s32, struct, u16, u8 } from '@solana/buffer-layout'
import { bool, u64 } from '@solana/buffer-layout-utils'
import { s64 } from 'mango-utils'

import { wallet } from '../global.js'
import { enumLayout, getU16Buffer, optionLayout } from '../utils/layout.js'
import { accountMeta } from '../utils/account-meta.js'
import { DRIFT_PROGRAM_ID } from './common.js'
import { loadDriftPerpMarket } from './account.js'

const discriminators = {
	placePerpOrder: Buffer.from('45a15dca787e4cb9', 'hex'),
	placeSpotOrder: Buffer.from('2d4f51a0f85a5bdc', 'hex'),
	settlePnl: Buffer.from('2b3dea2d0f5f9899', 'hex'),
}

const PYTH_USDC_ORACLE_ADDRESS = new PublicKey('Gnt27xtC473ZT2Mw5u8wZ68Z3gULkSTb5DuxJy7eJotD')

const DRIFT_SOL_PERP_MARKET_INDEX = 0
const DRIFT_USDC_SPOT_MARKET_INDEX = 0
const DRIFT_SOL_SPOT_MARKET_INDEX = 1

const driftPerpMarketAddress = PublicKey.findProgramAddressSync(
	[Buffer.from('perp_market', 'utf-8'), getU16Buffer(DRIFT_SOL_PERP_MARKET_INDEX)],
	DRIFT_PROGRAM_ID,
)[0]
const driftUsdcSpotMarketAddress = PublicKey.findProgramAddressSync(
	[Buffer.from('spot_market', 'utf-8'), getU16Buffer(DRIFT_USDC_SPOT_MARKET_INDEX)],
	DRIFT_PROGRAM_ID,
)[0]
const driftUsdcSpotMarketVault = PublicKey.findProgramAddressSync(
	[Buffer.from('spot_market_vault'), getU16Buffer(DRIFT_USDC_SPOT_MARKET_INDEX)],
	DRIFT_PROGRAM_ID,
)[0]
const driftSolSpotMarketAddress = PublicKey.findProgramAddressSync(
	[Buffer.from('spot_market', 'utf-8'), getU16Buffer(DRIFT_SOL_SPOT_MARKET_INDEX)],
	DRIFT_PROGRAM_ID,
)[0]
const driftStateAddress = PublicKey.findProgramAddressSync(
	[Buffer.from('drift_state', 'utf-8')],
	DRIFT_PROGRAM_ID,
)[0]
export const driftUserAccountAddress = PublicKey.findProgramAddressSync(
	[Buffer.from('user', 'utf-8'), wallet.publicKey.toBuffer(), getU16Buffer(0)],
	DRIFT_PROGRAM_ID,
)[0]

const driftAmmOracleAddress = (await loadDriftPerpMarket(driftPerpMarketAddress)).amm.oracle

type OrderType = 'market' | 'limit' | 'triggerMarket' | 'triggerLimit' | 'oracle'
const orderTypeLayout = enumLayout<OrderType>([
	'market',
	'limit',
	'triggerMarket',
	'triggerLimit',
	'oracle',
])

type MarketType = 'spot' | 'perp'
const marketTypeLayout = enumLayout<MarketType>(['spot', 'perp'])

type PositionDirection = 'short' | 'long'
const positionDirectionLayout = enumLayout<PositionDirection>(['long', 'short'])

type PostOnlyParam = 'none' | 'mustPostOnly' | 'tryPostOnly'
const postOnlyParamLayout = enumLayout<PostOnlyParam>(['none', 'mustPostOnly', 'tryPostOnly'])

type OrderTriggerCondition = 'above' | 'below' | 'triggeredAbove' | 'triggeredBelow'
const orderTriggerConditionLayout = enumLayout<OrderTriggerCondition>([
	'above',
	'below',
	'triggeredAbove',
	'triggeredBelow',
])

type PlacePerpOrderParamsLayout = {
	orderType: OrderType
	marketType: MarketType
	direction: PositionDirection
	userOrderId: number
	baseAssetAmount: bigint
	price: bigint
	marketIndex: number
	reduceOnly: boolean
	postOnly: PostOnlyParam
	immediateOrCancel: boolean
	maxTs: bigint | null
	triggerPrice: bigint | null
	triggerCondition: OrderTriggerCondition
	oraclePriceOffset: number | null
	auctionDuration: number | null
	auctionStartPrice: bigint | null
	auctionEndPrice: bigint | null
}

const placeOrderParamsLayout = struct<PlacePerpOrderParamsLayout>([
	orderTypeLayout.replicate('orderType'),
	marketTypeLayout.replicate('marketType'),
	positionDirectionLayout.replicate('direction'),
	u8('userOrderId'),
	u64('baseAssetAmount'),
	u64('price'),
	u16('marketIndex'),
	bool('reduceOnly'),
	postOnlyParamLayout.replicate('postOnly'),
	bool('immediateOrCancel'),
	optionLayout(s64(), 'maxTs'),
	optionLayout(u64(), 'triggerPrice'),
	orderTriggerConditionLayout.replicate('triggerCondition'),
	optionLayout(s32(), 'oraclePriceOffset'),
	optionLayout(u8(), 'auctionDuration'),
	optionLayout(s64(), 'auctionStartPrice'),
	optionLayout(s64(), 'auctionEndPrice'),
])

type PlaceOrderParams = {
	direction: PositionDirection
	userOrderId: number
	baseAssetAmount: bigint
	price: bigint
	reduceOnly: boolean
}

export function buildDriftPlacePerpOrder({
	direction,
	userOrderId,
	baseAssetAmount,
	price,
	reduceOnly,
}: PlaceOrderParams) {
	const data = Buffer.alloc(112)
	data.set(discriminators.placePerpOrder)
	placeOrderParamsLayout.encode(
		{
			direction,
			userOrderId,
			baseAssetAmount,
			price,
			reduceOnly,
			orderType: 'limit',
			marketType: 'perp',
			marketIndex: DRIFT_USDC_SPOT_MARKET_INDEX,
			postOnly: 'none',
			immediateOrCancel: false,
			maxTs: null,
			triggerPrice: null,
			triggerCondition: 'above',
			oraclePriceOffset: null,
			auctionDuration: null,
			auctionStartPrice: null,
			auctionEndPrice: null,
		},
		data,
		8,
	)

	const accounts: AccountMeta[] = [
		accountMeta(driftStateAddress),
		accountMeta(driftUserAccountAddress, true),
		accountMeta(wallet.publicKey, false, true),
		accountMeta(PYTH_USDC_ORACLE_ADDRESS),
		accountMeta(driftAmmOracleAddress),
		accountMeta(driftUsdcSpotMarketAddress),
		accountMeta(driftPerpMarketAddress),
	]

	return new TransactionInstruction({
		programId: DRIFT_PROGRAM_ID,
		keys: accounts,
		data,
	})
}

export function buildDriftPlaceSpotOrder({
	direction,
	userOrderId,
	baseAssetAmount,
	price,
	reduceOnly,
}: PlaceOrderParams) {
	const data = Buffer.alloc(112)
	data.set(discriminators.placeSpotOrder)
	placeOrderParamsLayout.encode(
		{
			direction,
			userOrderId,
			baseAssetAmount,
			price,
			reduceOnly,
			orderType: 'limit',
			marketType: 'spot',
			marketIndex: DRIFT_SOL_SPOT_MARKET_INDEX,
			postOnly: 'none',
			immediateOrCancel: false,
			maxTs: null,
			triggerPrice: null,
			triggerCondition: 'above',
			oraclePriceOffset: null,
			auctionDuration: null,
			auctionStartPrice: null,
			auctionEndPrice: null,
		},
		data,
		8,
	)

	const accounts: AccountMeta[] = [
		accountMeta(driftStateAddress),
		accountMeta(driftUserAccountAddress, true),
		accountMeta(wallet.publicKey, false, true),
		accountMeta(PYTH_USDC_ORACLE_ADDRESS),
		accountMeta(driftAmmOracleAddress),
		accountMeta(driftUsdcSpotMarketAddress),
		accountMeta(driftSolSpotMarketAddress),
	]

	return new TransactionInstruction({
		programId: DRIFT_PROGRAM_ID,
		keys: accounts,
		data,
	})
}

export function buildDriftSettlePnlIx() {
	const data = Buffer.alloc(10)
	data.set(discriminators.settlePnl)
	data.set(getU16Buffer(DRIFT_SOL_PERP_MARKET_INDEX))

	const accounts: AccountMeta[] = [
		accountMeta(driftStateAddress),
		accountMeta(driftUserAccountAddress, true),
		accountMeta(wallet.publicKey, false, true),
		accountMeta(driftUsdcSpotMarketVault),
		accountMeta(PYTH_USDC_ORACLE_ADDRESS),
		accountMeta(driftAmmOracleAddress),
		accountMeta(driftUsdcSpotMarketAddress),
		accountMeta(driftPerpMarketAddress),
	]

	return new TransactionInstruction({
		programId: DRIFT_PROGRAM_ID,
		keys: accounts,
		data,
	})
}
