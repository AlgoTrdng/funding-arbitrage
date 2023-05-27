import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const configSchema = z.object({
	DB_URL: z.string().min(1).url(),
	RPC_URL: z.string().min(1).url(),
})

const configRes = configSchema.safeParse(process.env)

if (!configRes.success) {
	const e = configRes.error.format()
	const errors = Object.entries(e)
		.map(([name, v]) => {
			if (name === '_errors') {
				return null
			}
			if (v && '_errors' in v) {
				return `${name}: ${v._errors.join(', ')}\n`
			}
			return null
		})
		.filter(Boolean)
	console.error('[ENV]: Invalid env variables:\n', ...errors)
	throw Error('Invalid env variables')
}

export const config = configRes.data
