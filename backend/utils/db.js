import { existsSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const envSearchPaths = [
	path.resolve(process.cwd(), ".env"),
	path.resolve(process.cwd(), "../.env")
];

for (const envPath of envSearchPaths) {
	if (existsSync(envPath)) {
		dotenv.config({ path: envPath, override: false });
	}
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
	throw new Error(
		`DATABASE_URL is not set. Add it to one of: ${envSearchPaths.join(", ")}`
	);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export default prisma;