import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const configSchema = z.object({
	DB_URL: z.string().min(1),
	RPC_URL: z.string().min(1),
})

const configRes = configSchema.safeParse(process.env)

if (!configRes.success) {
	const errors = Object.entries(configRes.error)
		.map(([name, value]) => {
			if (value && '_errors' in value) return `${name}: ${value._errors.join(', ')}\n`
		})
		.filter(Boolean)
	console.error('[ENV]: Invalid env variables:\n', ...errors)
	throw Error('Invalid env variables')
}

export const config = configRes.data
