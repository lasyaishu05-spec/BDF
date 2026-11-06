const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { initializeDatabase } = require("../db");

test("initializes the books table with required columns", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "lab-03-db-"));
  const filename = path.join(directory, "test.sqlite");
  let db;

  try {
    db = await initializeDatabase(filename);
    const columns = await db.all("PRAGMA table_info(books)");
    assert.deepEqual(columns.map((column) => column.name), [
      "id",
      "title",
      "author",
      "price",
    ]);
  } finally {
    if (db) await db.close();
    await fs.rm(directory, { recursive: true, force: true });
  }
});
