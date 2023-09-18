### Prisma vs Drizzle ORM
1. prisma is not vercel edge compatible
2. prisma is known to be slower.

drizzle-orm - interacting with the db.
drizzle-kit - this provides us with utility function to create migrations and to make sure that all database is synced up with the schema (in schema.ts). (push updated schema to db.) (command: npx drizzle-kit push:pg)

all files inside src will have access to env vars. but any file outside the src will not have access to env vars to make that possible install dotenv.

// run studio
 npx drizzle-kit studio

