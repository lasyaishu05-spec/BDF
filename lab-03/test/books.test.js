const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs/promises");
const request = require("supertest");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const { createApp } = require("../server");

let directory;
let db;
let app;

before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), "lab-03-books-"));
  db = await open({
    filename: path.join(directory, "test.sqlite"),
    driver: sqlite3.Database,
  });
  await db.exec(`
    CREATE TABLE books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      price REAL NOT NULL
    )
  `);
  app = createApp(db);
});

after(async () => {
  await db.close();
  await fs.rm(directory, { recursive: true, force: true });
});

test("GET /books returns an empty JSON array", async () => {
  const response = await request(app).get("/books");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, []);
});
