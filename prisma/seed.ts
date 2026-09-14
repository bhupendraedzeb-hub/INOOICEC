import "dotenv/config";
import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_OWNER_EMAIL ?? "owner@example.com";
  const password = process.env.SEED_OWNER_PASSWORD ?? "changeme123";

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Seed: OWNER user ${email} already exists, skipping.`);
    return;
  }

  const passwordHash = await argon2.hash(password);
  const user = await db.user.create({
    data: { email, name: "Owner", passwordHash, role: "OWNER" },
  });

  const existingSettings = await db.companySettings.findFirst();
  if (!existingSettings) {
    await db.companySettings.create({
      data: { name: "Your Company" },
    });
  }

  console.log(`Seed: created OWNER user ${user.email} (id=${user.id}).`);
  if (!process.env.SEED_OWNER_PASSWORD) {
    console.log(`Seed: using default password "${password}" — change it after first login.`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
