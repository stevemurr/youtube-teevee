import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import fs from 'fs/promises';
import path from 'path';

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export async function initDatabase() {
  if (db) return db;

  const dbPath = process.env.DATABASE_PATH || './database/app.db';
  const dbDir = path.dirname(dbPath);

  // Ensure database directory exists
  await fs.mkdir(dbDir, { recursive: true });

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable WAL mode for better concurrent performance
  await db.exec('PRAGMA journal_mode = WAL');
  await db.exec('PRAGMA foreign_keys = ON');

  // Run schema
  const schemaPath = path.join(__dirname, '../../database/schema.sql');
  const schema = await fs.readFile(schemaPath, 'utf8');
  await db.exec(schema);

  return db;
}

export async function getDb() {
  if (!db) {
    return await initDatabase();
  }
  return db;
}

export async function closeDatabase() {
  if (db) {
    await db.close();
    db = null;
  }
}