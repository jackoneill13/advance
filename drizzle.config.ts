// Used only when generating a new migration after a schema change:
//   npx drizzle-kit@latest generate --name <what-changed>
// drizzle-kit is not a project dependency, so this file is type-checked loosely on purpose.
const config = {
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./data/advance.db",
  },
} as const;

export default config;
