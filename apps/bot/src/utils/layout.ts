import { Idl, Program } from '@coral-xyz/anchor'
import { Layout, Union, struct, u8, union } from '@solana/buffer-layout'

// class _I80F48Layout extends Layout<I80F48> {
// 	private _layout: Structure<I80F48Layout>

// 	constructor(prop?: string) {
// 		super(i80f48Layout.span, prop)
// 		this._layout = i80f48Layout
// 	}

// 	decode(b: Uint8Array, offset?: number | undefined): I80F48 {
// 		const decoded = this._layout.decode(b, offset)
// 		return I80F48.from(decoded)
// 	}

// 	encode(src: I80F48, b: Uint8Array, offset?: number | undefined) {
// 		return this._layout.encode(
// 			{
// 				val: src.data,
// 			},
// 			b,
// 			offset,
// 		)
// 	}
// }

// type VectorStruct<V> = {
// 	length: number
// 	values: V[]
// }

// class VectorLayout<V> extends Layout<unknown> {
// 	private _layout: Structure<VectorStruct<V>>

// 	constructor(elLayout: Layout<V>, property?: string) {
// 		const l = u32('length')
// 		const length = offset(l, -l.span)
// 		const values = seq(elLayout, length, 'values')
// 		const layout = struct<VectorStruct<V>>([l, values])

// 		super(layout.span, property)
// 		this._layout = layout
// 	}

// 	decode(b: Uint8Array, offset?: number | undefined): V[] {
// 		return this._layout.decode(b, offset).values
// 	}

// 	encode(src: V[], b: Uint8Array, offset?: number | undefined) {
// 		return this._layout.encode(
// 			{
// 				length: src.length,
// 				values: src,
// 			},
// 			b,
// 			offset,
// 		)
// 	}
// }

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
