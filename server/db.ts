import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any = null;
let _pool: mysql.Pool | null = null;

/**
 * Connection Pool محسّن لدعم 500 مستخدم متزامن
 * - connectionLimit=20: أقصى 20 اتصال متزامن بـ DB
 * - waitForConnections=true: الطلبات تنتظر بدلاً من الفشل
 * - queueLimit=0: طابور انتظار غير محدود
 * - enableKeepAlive: يمنع انقطاع الاتصالات الخاملة
 */
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        connectionLimit: 20,
        waitForConnections: true,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10_000,
        connectTimeout: 10_000,
        idleTimeout: 60_000,
      });
      _db = drizzle(_pool);
      console.log("[Database] Connection pool initialized (limit=20)");
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    // mousa.ai integration fields
    if (user.mousaUserId !== undefined && user.mousaUserId !== null) {
      values.mousaUserId = user.mousaUserId;
      updateSet.mousaUserId = user.mousaUserId;
    }
    if (user.mousaBalance !== undefined && user.mousaBalance !== null) {
      values.mousaBalance = user.mousaBalance;
      updateSet.mousaBalance = user.mousaBalance;
    }
    if (user.mousaLastSync !== undefined && user.mousaLastSync !== null) {
      values.mousaLastSync = user.mousaLastSync;
      updateSet.mousaLastSync = user.mousaLastSync;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.
