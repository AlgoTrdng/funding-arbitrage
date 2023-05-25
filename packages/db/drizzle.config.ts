import type { Config } from 'drizzle-kit'
import dotenv from 'dotenv'

dotenv.config()

if (!process.env.DB_URL || !process.env.DB_URL.length) {
	throw Error('Missing DB_URL')
}

export default {
	schema: './src/schema.ts',
	connectionString: process.env.DB_URL,
} satisfies Config
