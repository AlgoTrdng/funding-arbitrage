import { BN } from 'bn.js'
import Big from 'big.js'
import { TextDecoder } from 'util'
import { PublicKey } from '@solana/web3.js'
import { parsePriceData } from '@pythnetwork/client'

import {
	InnerNodeLayout,
	LeafNodeLayout,
	OrderTreeNodesLayout,
	OrderTreeRootLayout,
	PerpMarketLayout,
	innerNodeLayout,
	leafNodeLayout,
} from './layout.js'
import { I80F48 } from './i80f48.js'

const U64_MAX = BigInt('18446744073709551615')
const QUOTE_DECIMALS = 6

function toNative(uiAmount: number, decimals: number): bigint {
	return BigInt((uiAmount * Math.pow(10, decimals)).toFixed(0))
}

function toNativeI80F48(uiAmount: number, decimals: number) {
	return I80F48.fromNumber(uiAmount * Math.pow(10, decimals))
}

function parsePythOracle(data: Buffer, baseDecimals: number) {
	const priceData = parsePriceData(data)
	const uiPrice = priceData.previousPrice
	return {
		uiPrice,
		price: toNativeI80F48(uiPrice, QUOTE_DECIMALS - baseDecimals),
	}
}

export class PerpMarket {
	public name: string
	public minFunding: I80F48
	public maxFunding: I80F48
	public baseLotSize: bigint
	public quoteLotSize: bigint
	public baseDecimals: number
	public price: I80F48
	public uiPrice: number
	public impactQuantity: bigint

	public priceLotsToUiConverter: number
	public baseLotsToUiConverter: number

	constructor(decoded: PerpMarketLayout, oracleData: Buffer) {
		this.name = new TextDecoder('utf-8').decode(new Uint8Array(decoded.name)).split('\x00')[0]
		this.baseDecimals = decoded.baseDecimals
		this.baseLotSize = decoded.baseLotSize
		this.quoteLotSize = decoded.quoteLotSize
		this.minFunding = I80F48.from(decoded.minFunding)
		this.maxFunding = I80F48.from(decoded.maxFunding)
		this.impactQuantity = decoded.impactQuantity

		this.priceLotsToUiConverter = new Big(10)
			.pow(this.baseDecimals - QUOTE_DECIMALS)
			.mul(new Big(this.quoteLotSize.toString()))
			.div(new Big(this.baseLotSize.toString()))
			.toNumber()
		this.baseLotsToUiConverter = new Big(this.baseLotSize.toString())
			.div(new Big(10).pow(this.baseDecimals))
			.toNumber()

		const { uiPrice, price } = parsePythOracle(oracleData, this.baseDecimals)
		this.price = price
		this.uiPrice = uiPrice
	}

	public getInstantaneousFundingRate(bids: BookSide, asks: BookSide): number {
		const MIN_FUNDING = this.minFunding.toNumber()
		const MAX_FUNDING = this.maxFunding.toNumber()

		const bid = bids.getImpactPriceUi(this.impactQuantity)
		const ask = asks.getImpactPriceUi(this.impactQuantity)
		const indexPrice = this.uiPrice

		let funding

		if (bid !== undefined && ask !== undefined) {
			const bookPrice = (bid + ask) / 2

			funding = Math.min(Math.max(bookPrice / indexPrice - 1, MIN_FUNDING), MAX_FUNDING)
		} else if (bid !== undefined) {
			funding = MAX_FUNDING
		} else if (ask !== undefined) {
			funding = MIN_FUNDING
		} else {
			funding = 0
		}

		return funding
	}

	public uiPriceToLots(price: number): bigint {
		return (
			(toNative(price, QUOTE_DECIMALS) * this.baseLotSize) /
			(this.quoteLotSize * BigInt(Math.pow(10, this.baseDecimals)))
		)
	}

	public priceLotsToUi(price: bigint): number {
		return parseFloat(price.toString()) * this.priceLotsToUiConverter
	}

	public baseLotsToUi(quantity: bigint): number {
		return parseFloat(quantity.toString()) * this.baseLotsToUiConverter
	}
}

export type BookSideType = 'bids' | 'asks'

export class BookSide {
	private static INNER_NODE_TAG = 1
	private static LEAF_NODE_TAG = 2

	now: bigint
	public rootFixed: OrderTreeRootLayout
	public rootOraclePegged: OrderTreeRootLayout
	public orderTreeNodes: OrderTreeNodesLayout

	constructor(
		public perpMarket: PerpMarket,
		public type: BookSideType,
		roots: OrderTreeRootLayout[],
		nodes: OrderTreeNodesLayout,
	) {
		this.rootFixed = roots[0]
		this.rootOraclePegged = roots[1]
		this.orderTreeNodes = nodes

		let maxTimestamp = BigInt(Math.floor(new Date().getTime() / 1000 - 3600))
		for (const node of this.orderTreeNodes.nodes) {
			if (node.tag !== BookSide.LEAF_NODE_TAG) {
				continue
			}

			const leafNode = BookSide.toLeafNode(node.data)
			if (leafNode.timestamp > maxTimestamp) {
				maxTimestamp = leafNode.timestamp
			}
		}
		this.now = maxTimestamp
	}

	public getL2Ui(depth: number): [number, number][] {
		const levels: [number, number][] = []
		for (const { uiPrice: price, uiSize: size } of this.items()) {
			if (levels.length > 0 && levels[levels.length - 1][0] === price) {
				levels[levels.length - 1][1] += size
			} else if (levels.length === depth) {
				break
			} else {
				levels.push([price, size])
			}
		}
		return levels
	}

	getImpactPriceUi(baseLots: bigint): number | undefined {
		const s = new BN(0)
		for (const order of this.items()) {
			s.iadd(new BN(order.sizeLots.toString()))
			if (s.gte(new BN(baseLots.toString()))) {
				return order.uiPrice
			}
		}
		return undefined
	}

	public *items(): Generator<PerpOrder> {
		function isBetter(type: BookSideType, a: PerpOrder, b: PerpOrder): boolean {
			return a.priceLots === b.priceLots
				? a.seqNum < b.seqNum
				: type === 'bids'
				? a.priceLots > b.priceLots
				: b.priceLots > a.priceLots
		}

		const fGen = this.fixedOrders()
		const oPegGen = this.oraclePeggedOrders()

		let fOrderRes = fGen.next()
		let oPegOrderRes = oPegGen.next()

		while (true) {
			if (fOrderRes.value && oPegOrderRes.value) {
				if (isBetter(this.type, fOrderRes.value, oPegOrderRes.value)) {
					yield fOrderRes.value
					fOrderRes = fGen.next()
				} else {
					yield oPegOrderRes.value
					oPegOrderRes = oPegGen.next()
				}
			} else if (fOrderRes.value && !oPegOrderRes.value) {
				yield fOrderRes.value
				fOrderRes = fGen.next()
			} else if (!fOrderRes.value && oPegOrderRes.value) {
				yield oPegOrderRes.value
				oPegOrderRes = oPegGen.next()
			} else if (!fOrderRes.value && !oPegOrderRes.value) {
				break
			}
		}
	}

	public *fixedOrders() {
		if (this.rootFixed.leafCount === 0) {
			return
		}
		const now = this.now
		const stack = [this.rootFixed.maybeNode]
		const [left, right] = this.type === 'bids' ? [1, 0] : [0, 1]
		while (stack.length > 0) {
			const index = stack.pop()!
			const node = this.orderTreeNodes.nodes[index]
			if (node.tag === BookSide.INNER_NODE_TAG) {
				const innerNode = BookSide.toInnerNode(node.data)
				stack.push(innerNode.children[right], innerNode.children[left])
			} else if (node.tag === BookSide.LEAF_NODE_TAG) {
				const leafNode = BookSide.toLeafNode(node.data)
				const expiryTimestamp = leafNode.timeInForce
					? leafNode.timestamp + BigInt(leafNode.timeInForce)
					: U64_MAX

				const perpOrder = new PerpOrder(this.perpMarket, leafNode, this.type, now > expiryTimestamp)
				yield perpOrder
			}
		}
	}

	public *oraclePeggedOrders(): Generator<PerpOrder> {
		if (this.rootOraclePegged.leafCount === 0) {
			return
		}
		const now = this.now
		const stack = [this.rootOraclePegged.maybeNode]
		const [left, right] = this.type === 'bids' ? [1, 0] : [0, 1]

		while (stack.length > 0) {
			const index = stack.pop()!
			const node = this.orderTreeNodes.nodes[index]
			if (node.tag === BookSide.INNER_NODE_TAG) {
				const innerNode = BookSide.toInnerNode(node.data)
				stack.push(innerNode.children[right], innerNode.children[left])
			} else if (node.tag === BookSide.LEAF_NODE_TAG) {
				const leafNode = BookSide.toLeafNode(node.data)
				const expiryTimestamp = leafNode.timeInForce
					? leafNode.timestamp + BigInt(leafNode.timeInForce)
					: U64_MAX

				const perpOrder = new PerpOrder(
					this.perpMarket,
					leafNode,
					this.type,
					now > expiryTimestamp,
					true,
				)
				yield perpOrder
			}
		}
	}

	static toInnerNode(data: number[]): InnerNodeLayout {
		return innerNodeLayout.decode(Buffer.from([BookSide.INNER_NODE_TAG].concat(data)))
	}

	static toLeafNode(data: number[]): LeafNodeLayout {
		return leafNodeLayout.decode(Buffer.from([BookSide.LEAF_NODE_TAG].concat(data)))
	}
}

export type PerpOrderType = 'limit' | 'immediateOrCancel' | 'postOnly' | 'market' | 'postOnlySlide'

export type PerpOrderSide = 'bid' | 'ask'

type OraclePeggedProperties = {
	isInvalid: boolean
	priceOffset: bigint
	uiPriceOffset: number
	pegLimit: bigint
	uiPegLimit: number
}

export class PerpOrder {
	public owner: PublicKey
	public seqNum: bigint
	public orderId: bigint
	public uiPrice: number
	public uiSize: number
	public priceLots: bigint
	public sizeLots: bigint
	public side: PerpOrderSide
	public expiryTimestamp: bigint
	public orderType: PerpOrderType
	public oraclePeggedProperties?: OraclePeggedProperties

	constructor(
		perpMarket: PerpMarket,
		leafNode: LeafNodeLayout,
		type: BookSideType,
		public isExpired = false,
		public isOraclePegged = false,
	) {
		const leafNodeKeyMask = new BN(leafNode.key.toString()).maskn(64)
		const u64MaxBN = new BN(U64_MAX.toString()).sub(leafNodeKeyMask)

		this.owner = leafNode.owner
		this.orderId = leafNode.key
		this.seqNum =
			type === 'bids'
				? BigInt(u64MaxBN.sub(leafNodeKeyMask).toString())
				: BigInt(leafNodeKeyMask.toString())
		this.side = type == 'bids' ? 'bid' : 'ask'
		this.orderType = this.parseOrderType(leafNode.orderType)
		this.expiryTimestamp = leafNode.timeInForce
			? leafNode.timestamp + BigInt(leafNode.timeInForce)
			: U64_MAX
		this.sizeLots = leafNode.quantity

		if (isOraclePegged) {
			const priceData = leafNode.key >> 64n
			const priceOffset = priceData - (1n << 63n)
			this.priceLots = perpMarket.uiPriceToLots(perpMarket.uiPrice) + priceOffset

			const isInvalid =
				type === 'bids'
					? this.priceLots > leafNode.pegLimit && leafNode.pegLimit != -1n
					: leafNode.pegLimit > this.priceLots

			this.oraclePeggedProperties = {
				isInvalid,
				priceOffset,
				uiPriceOffset: perpMarket.priceLotsToUi(priceOffset),
				pegLimit: leafNode.pegLimit,
				uiPegLimit: perpMarket.priceLotsToUi(leafNode.pegLimit),
			}
		} else {
			this.priceLots = leafNode.key >> 64n
		}

		this.uiPrice = perpMarket.priceLotsToUi(this.priceLots)
		this.uiSize = perpMarket.baseLotsToUi(leafNode.quantity)
	}

	private parseOrderType(type: number): PerpOrderType {
		const types: PerpOrderType[] = [
			'limit',
			'immediateOrCancel',
			'postOnly',
			'market',
			'postOnlySlide',
		]
		return types[type]
	}
}
