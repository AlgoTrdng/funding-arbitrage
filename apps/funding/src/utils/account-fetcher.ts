import { PublicKey } from '@solana/web3.js'
import { Structure } from '@solana/buffer-layout'

import { connection } from '../global.js'

const REFRESH_TIMEOUT = 1000 * 60 * 15

type AccountData = NonNullable<Record<string, unknown>>
type AccountDataParser<D> = (data: Buffer | null | undefined) => D
type ParsedAccountData<P> = Record<string, { address: PublicKey; parser: P }>

// TODO: Add last updated ts
export class AccountFetcher<
	D extends AccountData,
	P extends AccountDataParser<D>,
	M extends ParsedAccountData<P>,
> {
	public addresses: PublicKey[] = []
	private parsers: Array<M[keyof M]['parser']> = []
	private keys: Array<keyof M> = []
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	public data: { [K in keyof M]: ReturnType<M[K]['parser']> } = {}
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	public accountsInfos: { [K in keyof M]: Buffer } = {}

	private lastPollTs = 0

	constructor(accounts: M, private pollingTimeout = 0) {
		Object.entries(accounts).forEach(([key, { address, parser }]) => {
			this.addresses.push(address)
			this.parsers.push(parser)
			this.keys.push(key)
		})
	}

	async fetch() {
		try {
			this.lastPollTs = new Date().getTime()
			const ais = await connection.getMultipleAccountsInfo(this.addresses)

			ais.forEach((ai, i) => {
				if (!ai || !ai.data) {
					throw Error(`Could not fetch account: ${this.addresses[i]}`)
				}

				const key = this.keys[i]
				const parser = this.parsers[i]

				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				this.data[key] = parser(ai?.data)
				this.accountsInfos[key] = ai.data
			})
		} catch (e) {
			console.error(e)
			throw Error('Could not parse account or invalid account parser')
		}
	}

	listenWithWebsockets() {
		const subIds: number[] = []

		const refreshListeners = () => {
			this.addresses.forEach((addr, i) => {
				let subId = subIds[i]

				if (subId) {
					connection.removeAccountChangeListener(subId)
				}

				const key = this.keys[i]
				const parser = this.parsers[i]

				subId = connection.onAccountChange(addr, (ai) => {
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-ignore
					this.data[key] = parser(ai.data)
					this.accountsInfos[key] = ai.data
				})
				subIds[i] = subId
			})
		}

		refreshListeners()

		setInterval(() => {
			refreshListeners()
		}, REFRESH_TIMEOUT)
	}

	async poll() {
		const ts = new Date().getTime()

		if (this.lastPollTs + this.pollingTimeout > ts) {
			return
		}

		await this.fetch()
	}

	static async newWithWebsockets<
		D extends AccountData,
		P extends AccountDataParser<D>,
		M extends ParsedAccountData<P>,
	>(accounts: M) {
		const fetcher = new AccountFetcher(accounts)
		await fetcher.fetch()
		fetcher.listenWithWebsockets()
		return fetcher
	}

	static async newWithPolling<
		D extends AccountData,
		P extends AccountDataParser<D>,
		M extends ParsedAccountData<P>,
	>(accounts: M, pollingTimeout: number) {
		const fetcher = new AccountFetcher(accounts, pollingTimeout)
		await fetcher.fetch()
		return fetcher
	}
}

export function layoutAccountParser<S>(layout: Structure<S>) {
	return (data: Buffer | null | undefined) => {
		if (!data) {
			throw Error('Invalid account data')
		}
		return layout.decode(data)
	}
}
