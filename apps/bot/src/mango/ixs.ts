import { AccountMeta, PublicKey, TransactionInstruction } from '@solana/web3.js'
import { struct, u16, u8 } from '@solana/buffer-layout'
import { bool, u64 } from '@solana/buffer-layout-utils'
import { s64 } from 'mango-utils'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'

import { enumLayout } from '../utils/layout.js'
import { wallet } from '../global.js'
import {
	BASE_MINT_DECIMALS,
	MANGO_ASKS_ADDRESS,
	MANGO_BIDS_ADDRESS,
	MANGO_EVENT_QUEUE_ADDRESS,
	MANGO_GROUP_ADDRESS,
	MANGO_PERP_MARKET_ADDRESS,
	MANGO_PROGRAM_ID,
	OPENBOOK_ASKS_ADDRESS,
	OPENBOOK_BIDS_ADDRESS,
	OPENBOOK_EVENT_QUEUE,
	OPENBOOK_MANGO_MARKET_ADDRESS,
	OPENBOOK_MARKET_ADDRESS,
	OPENBOOK_PROGRAM_ID,
	OPENBOOK_REQUEST_QUEUE,
	OPENBOOK_VAULT_SIGNER_ADDRESS,
	mangoAccountAddress,
	mangoSolBankAddress,
	mangoSolOracleAddress,
	mangoSolVaultAddress,
	mangoUsdcBankAddress,
	mangoUsdcOracleAddress,
	mangoUsdcVaultAddress,
	openBookOpenOrdersAddress,
	openbookBaseLotSize,
	openbookBaseVaultAddress,
	openbookPriceToLots,
	openbookQuoteLotSize,
	openbookQuoteVaultAddress,
	openbookSizeUiToLots,
} from './common.js'
import { accountMeta } from '../utils/account-meta.js'

const I64_MAX = BigInt('9223372036854775807')
const U64_MAX = BigInt('18446744073709551615')

const discriminators = {
	perpPlaceOrder: Buffer.from('bdc4e1c972ac19a6', 'hex'),
	spotPlaceOrder: Buffer.from('611d7bc7e414b8fc', 'hex'),
	settleSpotFunds: Buffer.from('05dd6b17f7d32fdd', 'hex'),
	settlePerpFees: Buffer.from('dfede34898b9ea73', 'hex'),
}

type MangoOrderSide = 'bid' | 'ask'
const mangoOrderSides: MangoOrderSide[] = ['bid', 'ask']
const mangoOrderSideLayout = enumLayout<MangoOrderSide>(mangoOrderSides)

const mangoOrderTypes = [
	'limit',
	'immediateOrCancel',
	'postOnly',
	'market',
	'postOnlySlide',
] as const
type MangoOrderType = (typeof mangoOrderTypes)[number]
const mangoOrderTypeLayout = enumLayout<MangoOrderType>([
	'limit',
	'immediateOrCancel',
	'postOnly',
	'market',
	'postOnlySlide',
])

type PlacePerpOrderDataLayout = {
	side: MangoOrderSide
	priceLots: bigint
	maxBaseLots: bigint
	maxQuoteLots: bigint
	clientOrderId: bigint
	orderType: MangoOrderType
	reduceOnly: boolean
	expiryTimestamp: bigint
	limit: number
}

const placePerpOrderParamsLayout = struct<PlacePerpOrderDataLayout>([
	mangoOrderSideLayout.replicate('side'),
	s64('priceLots'),
	s64('maxBaseLots'),
	s64('maxQuoteLots'),
	u64('clientOrderId'),
	mangoOrderTypeLayout.replicate('orderType'),
	bool('reduceOnly'),
	u64('expiryTimestamp'),
	u8('limit'),
])

export type MangoPlacePerpOrderParams = Omit<PlacePerpOrderDataLayout, 'maxQuoteLots' | 'limit'>

export type MangoPlacePerpOrderAccounts = {
	account: PublicKey
}

export function buildMangoPlacePerpOrderIx(
	{
		side,
		priceLots,
		maxBaseLots,
		clientOrderId,
		orderType,
		reduceOnly,
		expiryTimestamp = 0n,
	}: MangoPlacePerpOrderParams,
	{ account }: MangoPlacePerpOrderAccounts,
) {
	const data = Buffer.alloc(8 + placePerpOrderParamsLayout.span)
	data.set(discriminators.perpPlaceOrder)
	placePerpOrderParamsLayout.encode(
		{
			side,
			priceLots,
			orderType,
			reduceOnly,
			expiryTimestamp,
			maxBaseLots,
			maxQuoteLots: I64_MAX,
			clientOrderId: BigInt(clientOrderId),
			limit: 10,
		},
		data,
		8,
	)
	const accounts = [
		accountMeta(MANGO_GROUP_ADDRESS),
		accountMeta(account, true),
		accountMeta(wallet.publicKey, true, true),
		accountMeta(MANGO_PERP_MARKET_ADDRESS, true),
		accountMeta(MANGO_BIDS_ADDRESS, true),
		accountMeta(MANGO_ASKS_ADDRESS, true),
		accountMeta(MANGO_EVENT_QUEUE_ADDRESS, true),
		accountMeta(mangoSolOracleAddress),
		accountMeta(mangoSolBankAddress),
		accountMeta(mangoUsdcBankAddress),
		accountMeta(mangoSolOracleAddress),
		accountMeta(mangoUsdcOracleAddress),
		accountMeta(MANGO_PERP_MARKET_ADDRESS, true),
		accountMeta(mangoSolOracleAddress),
		accountMeta(openBookOpenOrdersAddress),
	]

	return new TransactionInstruction({
		programId: MANGO_PROGRAM_ID,
		keys: accounts,
		data,
	})
}

type SpotTradeBehavior = 'decrementTake' | 'cancelProvide' | 'abortTransaction'
const spotTradeBehaviors: SpotTradeBehavior[] = [
	'decrementTake',
	'cancelProvide',
	'abortTransaction',
]
const spotTradeBehaviorLayout = enumLayout<SpotTradeBehavior>(spotTradeBehaviors)

type SpotOrderType = 'limit' | 'immediateOrCancel' | 'postOnly'
const spotOrderTypes: SpotOrderType[] = ['limit', 'immediateOrCancel', 'postOnly']
const spotOrderTypeLayout = enumLayout<SpotOrderType>(spotOrderTypes)

type PlaceSpotOrderDataLayout = {
	side: MangoOrderSide
	limitPrice: bigint
	maxBaseQty: bigint
	maxNativeQuoteQtyIncludingFees: bigint
	selfTradeBehavior: SpotTradeBehavior
	orderType: SpotOrderType
	clientOrderId: bigint
	limit: number
}

const placeSpotOrderParamsLayout = struct<PlaceSpotOrderDataLayout>([
	mangoOrderSideLayout.replicate('side'),
	u64('limitPrice'),
	u64('maxBaseQty'),
	u64('maxNativeQuoteQtyIncludingFees'),
	spotTradeBehaviorLayout.replicate('selfTradeBehavior'),
	spotOrderTypeLayout.replicate('orderType'),
	u64('clientOrderId'),
	u16('limit'),
])

export type MangoPlaceSpotOrderParams = {
	side: MangoOrderSide
	price: number
	size: number
	clientOrderId: number
}

export function buildMangoPlaceSpotOrderIx({
	side,
	price,
	size,
	clientOrderId,
}: MangoPlaceSpotOrderParams) {
	const limitPrice = openbookPriceToLots(price)
	const baseQty = openbookSizeUiToLots(size, openbookBaseLotSize, BASE_MINT_DECIMALS)

	const quoteLotFee = Math.ceil(Number(openbookQuoteLotSize) * (1 + 0.0004))
	const maxQuoteQty = quoteLotFee * Number(baseQty) * Number(openbookPriceToLots(price))

	const data = Buffer.alloc(8 + placeSpotOrderParamsLayout.span)
	data.set(discriminators.spotPlaceOrder)
	placeSpotOrderParamsLayout.encode(
		{
			side,
			limitPrice,
			orderType: 'limit',
			maxBaseQty: baseQty,
			maxNativeQuoteQtyIncludingFees: BigInt(maxQuoteQty),
			selfTradeBehavior: 'decrementTake',
			clientOrderId: BigInt(clientOrderId),
			limit: 10,
		},
		data,
		8,
	)

	const openbookInputAddresses =
		side === 'bid'
			? [
					accountMeta(mangoUsdcBankAddress, true),
					accountMeta(mangoUsdcVaultAddress, true),
					accountMeta(mangoUsdcOracleAddress),
			  ]
			: [
					accountMeta(mangoSolBankAddress, true),
					accountMeta(mangoSolVaultAddress, true),
					accountMeta(mangoSolOracleAddress),
			  ]

	const accounts: AccountMeta[] = [
		accountMeta(MANGO_GROUP_ADDRESS),
		accountMeta(mangoAccountAddress, true),
		accountMeta(wallet.publicKey, true, true),
		accountMeta(openBookOpenOrdersAddress, true),
		accountMeta(OPENBOOK_MANGO_MARKET_ADDRESS, true),
		accountMeta(OPENBOOK_PROGRAM_ID),
		accountMeta(OPENBOOK_MARKET_ADDRESS, true),
		accountMeta(OPENBOOK_BIDS_ADDRESS, true),
		accountMeta(OPENBOOK_ASKS_ADDRESS, true),
		accountMeta(OPENBOOK_EVENT_QUEUE, true),
		accountMeta(OPENBOOK_REQUEST_QUEUE, true),
		accountMeta(openbookBaseVaultAddress, true),
		accountMeta(openbookQuoteVaultAddress, true),
		accountMeta(OPENBOOK_VAULT_SIGNER_ADDRESS),
		...openbookInputAddresses,
		accountMeta(TOKEN_PROGRAM_ID),
		accountMeta(mangoSolBankAddress, true),
		accountMeta(mangoUsdcBankAddress, true),
		accountMeta(mangoSolOracleAddress),
		accountMeta(mangoUsdcOracleAddress),
		accountMeta(MANGO_PERP_MARKET_ADDRESS),
		accountMeta(mangoSolOracleAddress),
		accountMeta(openBookOpenOrdersAddress, true),
	]

	return new TransactionInstruction({
		programId: MANGO_PROGRAM_ID,
		keys: accounts,
		data,
	})
}

export function buildMangoSettlePerpFeesIx() {
	const data = Buffer.alloc(16)
	data.set(discriminators.settlePerpFees)
	data.writeBigUInt64LE(U64_MAX, 8)

	const accounts: AccountMeta[] = [
		accountMeta(MANGO_GROUP_ADDRESS),
		accountMeta(MANGO_PERP_MARKET_ADDRESS, true),
		accountMeta(mangoAccountAddress, true),
		accountMeta(mangoSolOracleAddress),
		accountMeta(mangoUsdcBankAddress, true),
		accountMeta(mangoUsdcOracleAddress),
		accountMeta(mangoSolBankAddress),
		accountMeta(mangoUsdcBankAddress, true),
		accountMeta(mangoSolOracleAddress),
		accountMeta(mangoUsdcOracleAddress),
		accountMeta(MANGO_PERP_MARKET_ADDRESS, true),
		accountMeta(mangoSolOracleAddress),
		accountMeta(openBookOpenOrdersAddress),
	]

	return new TransactionInstruction({
		programId: MANGO_PROGRAM_ID,
		keys: accounts,
		data,
	})
}

export function buildMangoSettleSpotFundsIx() {
	const data = Buffer.alloc(9)
	data.set(discriminators.settleSpotFunds)
	data.writeUint8(1, 8)

	const accounts: AccountMeta[] = [
		accountMeta(MANGO_GROUP_ADDRESS),
		accountMeta(mangoAccountAddress, true),
		accountMeta(wallet.publicKey, true, true),
		accountMeta(openBookOpenOrdersAddress, true),
		accountMeta(OPENBOOK_MANGO_MARKET_ADDRESS),
		accountMeta(OPENBOOK_PROGRAM_ID),
		accountMeta(OPENBOOK_MARKET_ADDRESS, true),
		accountMeta(openbookBaseVaultAddress, true),
		accountMeta(openbookQuoteVaultAddress, true),
		accountMeta(OPENBOOK_VAULT_SIGNER_ADDRESS),
		accountMeta(mangoUsdcBankAddress, true),
		accountMeta(mangoUsdcVaultAddress, true),
		accountMeta(mangoSolBankAddress, true),
		accountMeta(mangoSolVaultAddress, true),
		accountMeta(TOKEN_PROGRAM_ID),
		accountMeta(mangoUsdcOracleAddress),
		accountMeta(mangoSolOracleAddress),
	]

	return new TransactionInstruction({
		programId: MANGO_PROGRAM_ID,
		keys: accounts,
		data,
	})
}
