import { z } from 'zod';

const envSchema = z.object({
  MYSQL_HOST: z.string().min(1).default('127.0.0.1'),
  MYSQL_PORT: z.coerce.number().default(3306),
  MYSQL_USER: z.string().min(1).default('root'),
  MYSQL_PASSWORD: z.string().default(''),
  MYSQL_DB: z.string().min(1).default('taro_rental_penpal'),
  WECHAT_APP_ID: z.string().default(''),
  WECHAT_APP_SECRET: z.string().default('')
});

export const env = envSchema.parse({
  MYSQL_HOST: process.env.MYSQL_HOST,
  MYSQL_PORT: process.env.MYSQL_PORT,
  MYSQL_USER: process.env.MYSQL_USER,
  MYSQL_PASSWORD: process.env.MYSQL_PASSWORD,
  MYSQL_DB: process.env.MYSQL_DB,
  WECHAT_APP_ID: process.env.WECHAT_APP_ID,
  WECHAT_APP_SECRET: process.env.WECHAT_APP_SECRET
});
