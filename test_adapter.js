import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config({ path: "backend/.env" });

const connectionString = process.env.DATABASE_URL;
try {
  const adapter = new PrismaPg({ connectionString });
  console.log("PrismaPg instantiated successfully with {connectionString}. It might be valid.");
} catch(e) {
  console.error("Failed to instantiate PrismaPg:", e);
}
