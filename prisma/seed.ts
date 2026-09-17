import "dotenv/config";
import { db } from "../src/lib/db";
import { signupOrganization, EmailAlreadyRegisteredError } from "../src/lib/services/organizations";

async function main() {
  const email = process.env.SEED_OWNER_EMAIL ?? "owner@example.com";
  const password = process.env.SEED_OWNER_PASSWORD ?? "changeme123";
  const organizationName = process.env.SEED_ORGANIZATION_NAME ?? "Default Organization";

  try {
    const { user } = await signupOrganization({
      organizationName,
      name: "Owner",
      email,
      password,
      confirmPassword: password,
    });
    console.log(`Seed: created OWNER user ${user.email} (id=${user.id}) in organization "${organizationName}".`);
    if (!process.env.SEED_OWNER_PASSWORD) {
      console.log(`Seed: using default password "${password}" — change it after first login.`);
    }
  } catch (err) {
    if (err instanceof EmailAlreadyRegisteredError) {
      console.log(`Seed: OWNER user ${email} already exists, skipping.`);
      return;
    }
    throw err;
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
