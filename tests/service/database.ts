import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type { Database, Statement } from "../../lib/service/runtime-types.js";

export function testDatabase() {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync("drizzle/0000_mighty_norrin_radd.sql", "utf8"));
  class Query implements Statement {
    private values: SQLInputValue[] = [];
    constructor(private sql: string) {}
    bind(...values: unknown[]) {
      this.values = values as SQLInputValue[];
      return this;
    }
    async first<T>() {
      return (db.prepare(this.sql).get(...this.values) as T | undefined) ?? null;
    }
    async all<T>() {
      return { results: db.prepare(this.sql).all(...this.values) as T[] };
    }
    async run() {
      const value = db.prepare(this.sql).run(...this.values);
      return { meta: { changes: Number(value.changes) } };
    }
  }
  const binding: Database = {
    prepare: (sql) => new Query(sql),
    batch: async (statements) => {
      db.exec("BEGIN");
      try {
        const result = [];
        for (const statement of statements) result.push(await statement.run());
        db.exec("COMMIT");
        return result;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
  return { binding, close: () => db.close() };
}
