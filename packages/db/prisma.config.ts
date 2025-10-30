import { config } from "dotenv";
import { defineConfig } from "@prisma/config";

config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: process.env.DATABASE_URL || '',
  },
});
