import { Idl, Program } from '@coral-xyz/anchor'
import { Layout, Union, struct, u8, union } from '@solana/buffer-layout'

class OptionLayout<T> extends Layout<T | null> {
	private disc = u8()

	constructor(private layout: Layout<T>, property?: string) {
		super(-1, property)
	}

	encode(src: T | null, b: Uint8Array, offset = 0): number {
		if (src === null || src === undefined) {
			return this.disc.encode(0, b, offset)
		}
		this.disc.encode(1, b, offset)
		return this.layout.encode(src, b, offset + 1) + 1
	}

	decode(b: Uint8Array, offset = 0): T | null {
		const disc = this.decode(b, offset)
		if (disc === 0) {
			return null
		} else if (disc === 1) {
			return this.layout.decode(b, offset + 1)
		}
		throw Error('Invalid option: ' + this.property)
	}

	getSpan(b: Uint8Array, offset = 0): number {
		const disc = this.disc.decode(b, offset)
		if (disc === 0) {
			return 1
		} else if (disc === 1) {
			return this.layout.getSpan(b, offset + 1) + 1
		}
		throw Error('Invalid option: ' + this.property)
	}
}

export const optionLayout = <T>(layout: Layout<T>, prop?: string) => new OptionLayout(layout, prop)

class EnumLayout<T extends string> extends Layout<unknown> {
	private _layout: Union

	constructor(variantsTags: T[]) {
		const _layout = union(u8(), struct([]))
		variantsTags.forEach((t, i) => {
			_layout.addVariant(i, struct([]), t)
		})

		super(_layout.span)
		this._layout = _layout
	}

	encode(side: T, src: Uint8Array, offset?: number) {
		return this._layout.encode({ [side]: {} }, src, offset)
	}

	decode(src: Uint8Array, offset?: number) {
		const lo = this._layout.decode(src, offset) as Record<T, Record<string, never>>
		return Object.keys(lo)[0] as T
	}
}

export const enumLayout = <T extends string>(variantsTags: T[]) => new EnumLayout(variantsTags)

export function getU16Buffer(n: number) {
	const d = Buffer.alloc(2)
	d.writeUint16LE(n)
	return d
}

export function getU32Buffer(n: number) {
	const d = Buffer.alloc(4)
	d.writeUint32LE(n)
	return d
}

export function parseAccountWithAnchor<D, T extends Idl = Idl>(
	data: Buffer | null | undefined,
	program: Program<T>,
	accountName: string,
): D | null {
	if (!data) {
		return null
	}
	try {
		return program.coder.accounts.decode(accountName, data) as D
	} catch (e) {
		console.log(e)
		console.log(`Could not decode account: ${accountName}`)
		return null
	}
}

export function parseAccountWithLayout<L extends Layout<unknown>>(
	data: Buffer | null | undefined,
	layout: L,
) {
	if (!data) {
		return null
	}
	try {
		return layout.decode(data) as ReturnType<L['decode']>
	} catch {
		console.log('Could not parse account')
		return null
	}
}
