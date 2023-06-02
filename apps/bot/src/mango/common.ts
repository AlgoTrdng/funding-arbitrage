import { PublicKey } from '@solana/web3.js'
import { mangoBankLayout } from 'mango-utils'

import { connection, wallet } from '../global.js'
import { getU16Buffer, getU32Buffer, parseAccountWithLayout } from '../utils/layout.js'
import { openbookMarketLayout } from './accounts.js'

// export const MANGO_PERP_MARKET_INDEX = 2
// export const MANGO_UNUSED_INDEX = 65535
export const MANGO_PROGRAM_ID = new PublicKey('4MangoMjqJ2firMokCjjGgoK8d4MXcrgL7XJaL3w6fVg')
export const MANGO_GROUP_ADDRESS = new PublicKey('78b8f4cGCwmZ9ysPFMWLaLTkkaYnUjwMJYStWe5RTSSX')
export const MANGO_PERP_MARKET_ADDRESS = new PublicKey(
	'ESdnpnNLgTkBCZRuTJkZLi5wKEZ2z47SG3PJrhundSQ2',
)
export const MANGO_BIDS_ADDRESS = new PublicKey('4M8szuGnXvsnDuoJ2cN1bsE7Civ8d4DH7CSe8dRJXtnW')
export const MANGO_ASKS_ADDRESS = new PublicKey('GD2WH95D6Ebe6T9qGsn8Q4fPBfCDQqReksksR9KELd73')
export const MANGO_EVENT_QUEUE_ADDRESS = new PublicKey(
	'8ZaWHaDhT2xJp5k6bC3pg9FztiRRSHYoSdMiMqGHBie',
)

export const OPENBOOK_PROGRAM_ID = new PublicKey('srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX')
export const OPENBOOK_MANGO_MARKET_ADDRESS = new PublicKey(
	'8JTrmcsZYABLL2HQcNnFo7q7osCVAsRW7m9ggE9Dj9Dw',
)
export const OPENBOOK_MARKET_ADDRESS = new PublicKey('8BnEgHoWFysVcuFFX7QztDmzuH8r5ZFvyP3sYwn1XTh6')
export const OPENBOOK_BIDS_ADDRESS = new PublicKey('5jWUncPNBMZJ3sTHKmMLszypVkoRK6bfEQMQUHweeQnh')
export const OPENBOOK_ASKS_ADDRESS = new PublicKey('EaXdHx7x3mdGA38j5RSmKYSXMzAFzzUXCLNBEDXDn1d5')
export const OPENBOOK_EVENT_QUEUE = new PublicKey('8CvwxZ9Db6XbLD46NZwwmVDZZRDy7eydFcAGkXKh9axa')
export const OPENBOOK_REQUEST_QUEUE = new PublicKey('CPjXDcggXckEq9e4QeXUieVJBpUNpLEmpihLpg5vWjGF')
export const OPENBOOK_VAULT_SIGNER_ADDRESS = new PublicKey(
	'CTz5UMLQm2SRWHzQnU62Pi4yJqbNGjgRBHqqp6oDHfF7',
)

export const mangoAccountAddress = PublicKey.findProgramAddressSync(
	[
		Buffer.from('MangoAccount', 'utf-8'),
		MANGO_GROUP_ADDRESS.toBuffer(),
		wallet.publicKey.toBuffer(),
		getU32Buffer(0),
	],
	MANGO_PROGRAM_ID,
)[0]
export const openBookOpenOrdersAddress = PublicKey.findProgramAddressSync(
	[
		Buffer.from('Serum3OO'),
		mangoAccountAddress.toBuffer(),
		OPENBOOK_MANGO_MARKET_ADDRESS.toBuffer(),
	],
	MANGO_PROGRAM_ID,
)[0]
export const mangoUsdcBankAddress = PublicKey.findProgramAddressSync(
	[Buffer.from('Bank', 'utf-8'), MANGO_GROUP_ADDRESS.toBuffer(), getU16Buffer(0), getU32Buffer(0)],
	MANGO_PROGRAM_ID,
)[0]
export const mangoSolBankAddress = PublicKey.findProgramAddressSync(
	[Buffer.from('Bank', 'utf-8'), MANGO_GROUP_ADDRESS.toBuffer(), getU16Buffer(4), getU32Buffer(0)],
	MANGO_PROGRAM_ID,
)[0]

async function fetchGlobalAccounts() {
	const [openbookMarketAi, ...mangoBanksAis] = await connection.getMultipleAccountsInfo([
		OPENBOOK_MARKET_ADDRESS,
		mangoUsdcBankAddress,
		mangoSolBankAddress,
	])

	const openbookMarket = parseAccountWithLayout(openbookMarketAi?.data, openbookMarketLayout)

	if (!openbookMarket) {
		throw Error('Could not fetch openbook account')
	}

	const mangoBanks = mangoBanksAis.map((ai) => {
		if (!ai?.data) {
			throw Error('Could not fetch bank account')
		}
		return mangoBankLayout.decode(ai.data)
	})

	return { mangoBanks, openbookMarket }
}

const { mangoBanks, openbookMarket } = await fetchGlobalAccounts()

export const [
	{ oracle: mangoUsdcOracleAddress, vault: mangoUsdcVaultAddress },
	{ oracle: mangoSolOracleAddress, vault: mangoSolVaultAddress },
] = mangoBanks.map((a) => {
	if (!a) {
		throw Error('Could not fetch mango bank')
	}
	return {
		oracle: a.oracle,
		vault: a.vault,
	}
})

export const openbookBaseVaultAddress = openbookMarket.baseVault
export const openbookQuoteVaultAddress = openbookMarket.quoteVault

export const openbookBaseLotSize = openbookMarket.baseLotSize
export const openbookQuoteLotSize = openbookMarket.quoteLotSize

export const BASE_MINT_DECIMALS = 9
export const QUOTE_MINT_DECIMALS = 6

export function openbookPriceToLots(price: number) {
	const x = price * 10 ** QUOTE_MINT_DECIMALS * Number(openbookBaseLotSize)
	const y = Number(openbookQuoteLotSize) * 10 ** BASE_MINT_DECIMALS
	return BigInt(Math.round(x / y))
}

export function openbookSizeUiToLots(sizeUi: number, lotSize: bigint, decimals: number) {
	const sizeNative = BigInt(Math.round(sizeUi * 10 ** decimals))
	return sizeNative / lotSize
}
