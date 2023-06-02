// import { BorshAccountsCoder } from '@coral-xyz/anchor'
// import { AccountInfo, PublicKey } from '@solana/web3.js'
// import {
// 	I80F48,
// 	MangoBankLayout,
// 	OraclePriceData,
// 	PerpMarket,
// 	PerpMarketLayout,
// 	_I80F48Layout,
// 	mangoBankLayout,
// 	parseOracle,
// 	perpMarketLayout,
// 	s128,
// 	s64,
// } from 'mango-utils'
// import bs58 from 'bs58'

// import { connection, wallet } from '../global.js'
// import { parseAccountWithAnchor } from '../utils/layout.js'
// import { MangoAccountLayout, PerpPositionLayout } from './accounts.js'
// import {
// 	MANGO_PROGRAM_ID,
// 	MANGO_GROUP_ADDRESS,
// 	mangoProgram,
// 	MANGO_PERP_MARKET_INDEX,
// 	MANGO_UNUSED_INDEX,
// } from './common.js'
// import { MangoIDL } from './idl.js'
// import { openOrdersLayout } from '../layout/openbook.js'

// const MANGO_USDC_TOKEN_INDEX = 0
// const MANGO_SOL_TOKEN_INDEX = 4

// const bankDiscriminator = BorshAccountsCoder.accountDiscriminator('bank')
// const mangoAccountDiscriminator = BorshAccountsCoder.accountDiscriminator('mangoAccount')

// const bankDiscriminatorBS58 = bs58.encode(new Uint8Array(bankDiscriminator))
// const mangoAccountDiscriminatorBS58 = bs58.encode(new Uint8Array(mangoAccountDiscriminator))

// const groupBanksAis = await connection.getProgramAccounts(MANGO_PROGRAM_ID, {
// 	filters: [
// 		{
// 			memcmp: {
// 				bytes: bankDiscriminatorBS58,
// 				offset: 0,
// 			},
// 		},
// 		{
// 			memcmp: {
// 				bytes: MANGO_GROUP_ADDRESS.toString(),
// 				offset: 8,
// 			},
// 		},
// 	],
// })

// /** Group banks by token index */
// const groupBanks: Record<number, { data: MangoBankLayout; oracleIdx: number; address: PublicKey }> =
// 	{}
// const banksOraclesAddresses: PublicKey[] = []
// groupBanksAis.forEach(({ pubkey, account }) => {
// 	if (!account?.data) {
// 		throw Error(`Could not fetch bank account: ${pubkey.toString()}`)
// 	}
// 	const d = mangoBankLayout.decode(account.data, 8)
// 	if (d.bankNum === 0) {
// 		groupBanks[d.tokenIndex] = {
// 			data: d,
// 			oracleIdx: banksOraclesAddresses.length,
// 			address: pubkey,
// 		}
// 		banksOraclesAddresses.push(d.oracle)
// 	}
// })

// const banksOraclesAis = await connection.getMultipleAccountsInfo(banksOraclesAddresses)
// /** Oracles by oracle address */
// const oraclesByAddress: Record<string, OraclePriceData> = {}

// for (const { oracleIdx, data: bankData } of Object.values(groupBanks)) {
// 	const ai = banksOraclesAis[oracleIdx]
// 	if (!ai?.data) {
// 		// TODO: ????
// 		throw Error()
// 	}
// 	const p = parseOracle(ai, ai.data, bankData.mintDecimals)
// 	oraclesByAddress[bankData.oracle.toString()] = p
// }

// const perpMarketsAi = await connection.getMultipleAccountsInfo([
// 	new PublicKey('ESdnpnNLgTkBCZRuTJkZLi5wKEZ2z47SG3PJrhundSQ2'),
// 	new PublicKey('Fgh9JSZ2qfSjCw9RPJ85W2xbihsp2muLvfRztzoVR7f1'),
// 	new PublicKey('HwhVGkfsSQ9JSQeQYu2CbkRCLvsh3qRZxG6m4oMVwZpN'),
// ])

// const perpMarketsByIndex: Record<number, PerpMarket> = {}
// for (const ai of perpMarketsAi) {
// 	if (!ai?.data) {
// 		continue
// 	}
// 	const perpMarketData = perpMarketLayout.decode(ai.data)
// 	const oracleData = oraclesByAddress[perpMarketData.oracle.toString()]
// 	perpMarketsByIndex[perpMarketData.perpMarketIndex.val] = new PerpMarket(
// 		perpMarketData,
// 		oracleData.price,
// 		oracleData.uiPrice,
// 	)
// }

// type TokenInfo = {
// 	price: I80F48
// 	assetWeight: I80F48
// 	liabWeight: I80F48
// 	balanceNative: I80F48
// 	maxReserved: I80F48
// }

// function computeHealthEffectFromSerumOrder(tokenInfo: TokenInfo, marketReserved: I80F48) {
// 	const maxBalance = tokenInfo.balanceNative.add(tokenInfo.maxReserved)
// 	let assetPart: I80F48
// 	let liabPart: I80F48
// 	if (maxBalance.gte(marketReserved)) {
// 		assetPart = marketReserved
// 		liabPart = I80F48.fromNumber(0)
// 	} else if (maxBalance.isNeg()) {
// 		assetPart = I80F48.fromNumber(0)
// 		liabPart = marketReserved
// 	} else {
// 		assetPart = maxBalance
// 		liabPart = marketReserved.sub(maxBalance)
// 	}
// 	return tokenInfo.assetWeight
// 		.mul(assetPart)
// 		.mul(tokenInfo.price)
// 		.add(tokenInfo.liabWeight.mul(liabPart).mul(tokenInfo.price))
// }

// function getNativeBalance(indexedPosition: I80F48, depositIndex: I80F48, borrowIndex: I80F48) {
// 	if (indexedPosition.isPos()) {
// 		return depositIndex.mul(indexedPosition)
// 	} else {
// 		return borrowIndex.mul(indexedPosition)
// 	}
// }

// function orderExecutionCase(perpMarket: PerpMarket, ordersBaseLots: I80F48, baseLots: I80F48) {
// 	const pd = perpMarket.data
// 	const baseLotSize = I80F48.fromString(pd.baseLotSize.toString())
// 	const netBaseNative = I80F48.fromString(baseLots.add(ordersBaseLots).mul(baseLotSize).toString())

// 	const weight = netBaseNative.isNeg()
// 		? perpMarket.data.maintBaseLiabWeight
// 		: perpMarket.data.maintBaseAssetWeight
// 	const price = perpMarket.price

// 	const baseHealth = netBaseNative.mul(weight).mul(price)
// 	const ordersBaseNative = I80F48.fromString(ordersBaseLots.mul(baseLotSize).toString())
// 	const orderQuote = ordersBaseNative.neg().mul(price)

// 	return baseHealth.add(orderQuote)
// }

// function minBigint(numbers: [bigint, bigint]) {
// 	return numbers[0] > numbers[1] ? numbers[1] : numbers[0]
// }

// function maxBigint(numbers: [bigint, bigint]) {
// 	return numbers[0] > numbers[1] ? numbers[0] : numbers[1]
// }

// function getAvailableSettleLimit(
// 	perpMarket: PerpMarket,
// 	perpPosition: PerpPositionLayout,
// ): [bigint, bigint] {
// 	const baseLotSize = I80F48.fromString(perpMarket.baseLotSize.toString())
// 	const basePositionLots = I80F48.fromI64(perpPosition.basePositionLots)
// 	const baseNative = basePositionLots.mul(baseLotSize).abs()
// 	const positionValue = I80F48.fromNumber(perpMarket.data.stablePriceModel.stablePrice)
// 		.mul(baseNative)
// 		.toNumber()
// 	const unrealized = BigInt(Math.floor(perpMarket.data.settlePnlLimitFactor * positionValue))
// 	const used = BigInt(perpPosition.settlePnlLimitSettledInCurrentWindowNative.toString())

// 	let minPnl = unrealized * -1n - used
// 	let maxPnl = unrealized - used

// 	const realizedTrade = BigInt(perpPosition.settlePnlLimitRealizedTrade)
// 	if (realizedTrade >= 0n) {
// 		maxPnl += realizedTrade
// 	} else {
// 		minPnl += realizedTrade
// 	}

// 	const realizedOther = BigInt(perpPosition.realizedOtherPnlNative.val.toString())
// 	if (realizedOther >= 0n) {
// 		maxPnl += realizedOther
// 	} else {
// 		minPnl += realizedOther
// 	}

// 	return [minBigint([0n, minPnl]), maxBigint([maxPnl, 0n])]
// }

// async function getMangoSettlePnlCandidates() {
// 	const accountsInfos = await connection.getProgramAccounts(MANGO_PROGRAM_ID, {
// 		filters: [
// 			{
// 				memcmp: {
// 					bytes: mangoAccountDiscriminatorBS58,
// 					offset: 0,
// 				},
// 			},
// 			{
// 				memcmp: {
// 					bytes: MANGO_GROUP_ADDRESS.toBase58(),
// 					offset: 8,
// 				},
// 			},
// 		],
// 	})

// 	const possibleAccounts: [PublicKey, MangoAccountLayout][] = []
// 	const openOrdersAccounts: PublicKey[][] = [[]]
// 	const serumOpenOrdersAccountsIndices = new Map<string, { outer: number; inner: number }>()

// 	for (const { pubkey: pk, account: ai } of accountsInfos) {
// 		const decoded = parseAccountWithAnchor<MangoAccountLayout, MangoIDL>(
// 			ai.data,
// 			mangoProgram,
// 			'mangoAccount',
// 		)
// 		if (!decoded?.perps || pk.equals(wallet.publicKey)) {
// 			continue
// 		}

// 		const p = decoded.perps.find((p) => p.marketIndex !== MANGO_PERP_MARKET_INDEX)
// 		if (!p) {
// 			continue
// 		}

// 		decoded.serum3.forEach((s) => {
// 			if (s.marketIndex !== MANGO_UNUSED_INDEX) {
// 				let outerIdx = openOrdersAccounts.length - 1
// 				const cArr = openOrdersAccounts[outerIdx]
// 				if (cArr.length < 100) {
// 					openOrdersAccounts[outerIdx].push(s.openOrders)
// 				} else {
// 					openOrdersAccounts.push([s.openOrders])
// 					outerIdx += 1
// 				}
// 				serumOpenOrdersAccountsIndices.set(s.openOrders.toString(), {
// 					outer: outerIdx,
// 					inner: openOrdersAccounts[outerIdx].length,
// 				})
// 			}
// 		})
// 		possibleAccounts.push([pk, decoded])
// 	}

// 	const openOrdersAis = await Promise.all(
// 		openOrdersAccounts.map((pks) => connection.getMultipleAccountsInfo(pks)),
// 	)

// 	for (const [pk, mangoAccount] of possibleAccounts) {
// 		const health = I80F48.fromNumber(0)
// 		const tokenInfos: Record<number, TokenInfo> = {}

// 		mangoAccount.tokens.forEach((t) => {
// 			const b = groupBanks[t.tokenIndex]
// 			if (!b) return

// 			const { data: bank } = b

// 			const nativeBalance = getNativeBalance(
// 				I80F48.from(t.indexedPosition),
// 				bank.depositIndex,
// 				bank.borrowIndex,
// 			)
// 			const oraclePrice = oraclesByAddress[bank.oracle.toString()]

// 			let weight: I80F48

// 			if (nativeBalance.isNeg()) {
// 				weight = bank.maintLiabWeight
// 			} else {
// 				weight = bank.maintAssetWeight
// 			}

// 			console.log(nativeBalance.toString(), weight.toString())
// 			health.iadd(nativeBalance.mul(weight).mul(oraclePrice.price))
// 			tokenInfos[t.tokenIndex] = {
// 				balanceNative: nativeBalance,
// 				maxReserved: I80F48.fromNumber(0),
// 				price: oraclePrice.price,
// 				assetWeight: bank.maintAssetWeight,
// 				liabWeight: bank.maintLiabWeight,
// 			}
// 		})

// 		mangoAccount.serum3.forEach((s) => {
// 			const baseBank = groupBanks[s.baseTokenIndex]
// 			const quoteBank = groupBanks[s.quoteTokenIndex]
// 			if (!baseBank || !quoteBank) {
// 				return
// 			}

// 			const { outer, inner } = serumOpenOrdersAccountsIndices.get(s.openOrders.toString())!
// 			const ooAi = openOrdersAis[outer][inner]
// 			if (!ooAi?.data) {
// 				return
// 			}
// 			const oo = openOrdersLayout.decode(ooAi.data)

// 			const baseFree = I80F48.fromString(oo.baseTokenFree.toString())
// 			const quoteFree = I80F48.fromString(oo.quoteTokenFree.toString())

// 			tokenInfos[s.baseTokenIndex].balanceNative.iadd(baseFree)
// 			tokenInfos[s.quoteTokenIndex].balanceNative.iadd(
// 				quoteFree.add(I80F48.fromString(oo.referrerRebatesAccrued.toString())),
// 			)

// 			const reservedBase = I80F48.fromString(oo.baseTokenTotal.toString()).sub(baseFree)
// 			const reservedQuote = I80F48.fromString(oo.quoteTokenTotal.toString()).sub(quoteFree)

// 			const basePrice = oraclesByAddress[baseBank.data.oracle.toString()]
// 			const quotePrice = oraclesByAddress[quoteBank.data.oracle.toString()]

// 			const allReservedAsBase = reservedBase.add(
// 				reservedQuote.mul(quotePrice.price).div(basePrice.price),
// 			)
// 			const allReservedAsQuote = reservedQuote.add(
// 				reservedBase.mul(basePrice.price).div(quotePrice.price),
// 			)

// 			tokenInfos[s.baseTokenIndex].maxReserved.iadd(allReservedAsBase)
// 			tokenInfos[s.quoteTokenIndex].maxReserved.iadd(allReservedAsQuote)

// 			if (allReservedAsBase.isZero() || allReservedAsQuote.isZero()) {
// 				return
// 			}

// 			const baseHealth = computeHealthEffectFromSerumOrder(
// 				tokenInfos[s.baseTokenIndex],
// 				allReservedAsBase,
// 			)
// 			const quoteHealth = computeHealthEffectFromSerumOrder(
// 				tokenInfos[s.quoteTokenIndex],
// 				allReservedAsQuote,
// 			)
// 			health.iadd(baseHealth.min(quoteHealth))
// 		})

// 		mangoAccount.perps.forEach((p) => {
// 			if (p.marketIndex === MANGO_UNUSED_INDEX) {
// 				return
// 			}

// 			const currentPerpMarket = perpMarketsByIndex[p.marketIndex]

// 			const basePositionLots = I80F48.from({ val: p.basePositionLots })
// 			const baseLots = basePositionLots.add(I80F48.from({ val: p.takerBaseLots }))

// 			const bidsCase = orderExecutionCase(
// 				currentPerpMarket,
// 				I80F48.from({ val: p.bidsBaseLots }),
// 				baseLots,
// 			)
// 			const asksCase = orderExecutionCase(
// 				currentPerpMarket,
// 				I80F48.from({ val: p.asksBaseLots }),
// 				baseLots,
// 			)

// 			const worstCase = bidsCase.min(asksCase)

// 			let unsettledFunding: I80F48
// 			if (basePositionLots.isPos()) {
// 				unsettledFunding = currentPerpMarket.data.longFunding
// 					.sub(I80F48.from(p.longSettledFunding))
// 					.mul(basePositionLots)
// 			} else if (basePositionLots.isNeg()) {
// 				unsettledFunding = currentPerpMarket.data.shortFunding
// 					.sub(I80F48.from(p.shortSettledFunding))
// 					.mul(basePositionLots)
// 			} else {
// 				unsettledFunding = I80F48.fromNumber(0)
// 			}
// 			const takerQuote = I80F48.fromString(currentPerpMarket.quoteLotSize.toString()).mul(
// 				I80F48.from({ val: p.takerQuoteLots }),
// 			)
// 			const quoteCurrent = I80F48.from(p.quotePositionNative).sub(unsettledFunding).add(takerQuote)
// 			const contrib = quoteCurrent.add(worstCase)

// 			if (contrib.isPos()) {
// 				health.iadd(contrib.mul(currentPerpMarket.data.maintOverallAssetWeight))
// 			}
// 		})

// 		const perpPosition = mangoAccount.perps.find(
// 			({ marketIndex }) => marketIndex === MANGO_PERP_MARKET_INDEX,
// 		)
// 		if (!perpPosition) {
// 			continue
// 		}
// 		const perpMarket = perpMarketsByIndex[perpPosition!.marketIndex]
// 		if (!perpMarket) {
// 			continue
// 		}

// 		const basePositionLots = BigInt(perpPosition.basePositionLots.toString())
// 		const baseLotSize = perpMarket.baseLotSize
// 		const basePositionNative = I80F48.fromString((basePositionLots * baseLotSize).toString())
// 		const unsettledPnl = I80F48.from(perpPosition.quotePositionNative).add(
// 			basePositionNative.mul(perpMarket.price),
// 		)

// 		let pnl = unsettledPnl

// 		if (perpMarket.data.settlePnlLimitFactor >= 0) {
// 			const [minPnl, maxPnl] = getAvailableSettleLimit(perpMarket, perpPosition)
// 			if (pnl.isNeg()) {
// 				pnl = pnl.max(I80F48.fromString(minPnl.toString()))
// 			} else {
// 				pnl = pnl.min(I80F48.fromString(maxPnl.toString()))
// 			}
// 		}

// 		if (pnl.neg()) {
// 			pnl.max(health.max(I80F48.fromNumber(0))).neg()
// 		} else {
// 			pnl
// 		}

// 		console.log(pnl.toString(), pk.toString())
// 	}
// }
