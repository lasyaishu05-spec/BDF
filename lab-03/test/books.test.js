const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs/promises");
const request = require("supertest");
const { createApp } = require("../server");
const { initializeDatabase } = require("../db");

let directory;
let db;
let app;

before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), "lab-03-books-"));
  db = await initializeDatabase(path.join(directory, "test.sqlite"));
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

test("POST creates a book and GET /books/:id returns it", async () => {
  const created = await request(app)
    .post("/books")
    .send({ title: "Python Basics", author: "A. Writer", price: 399.5 });
  assert.equal(created.status, 201);
  assert.deepEqual(created.body, {
    message: "Book created successfully",
    book: { id: 1, title: "Python Basics", author: "A. Writer", price: 399.5 },
  });

  const fetched = await request(app).get("/books/1");
  assert.equal(fetched.status, 200);
  assert.deepEqual(fetched.body, created.body.book);
});

test("POST requires a title", async () => {
  const response = await request(app)
    .post("/books")
    .send({ author: "A. Writer", price: 10 });
  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { message: "Title is required" });
});

test("POST requires an author", async () => {
  const response = await request(app)
    .post("/books")
    .send({ title: "Valid", price: 10 });
  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { message: "Author is required" });
});

test("POST rejects non-numeric and negative prices", async () => {
  for (const price of ["free", -1]) {
    const response = await request(app)
      .post("/books")
      .send({ title: "Valid", author: "A. Writer", price });
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      message: "Price must be a non-negative number",
    });
  }
});

test("PUT updates a book and DELETE removes it", async () => {
  const updated = await request(app)
    .put("/books/1")
    .send({ title: "Updated", author: "B. Writer", price: 450 });
  assert.equal(updated.status, 200);
  assert.deepEqual(updated.body, {
    message: "Book updated successfully",
    book: { id: 1, title: "Updated", author: "B. Writer", price: 450 },
  });

  const deleted = await request(app).delete("/books/1");
  assert.equal(deleted.status, 200);
  assert.deepEqual(deleted.body, { message: "Book deleted successfully" });
});

test("invalid IDs return 400 and absent books return 404", async () => {
  const invalid = await request(app).get("/books/0");
  assert.equal(invalid.status, 400);
  assert.deepEqual(invalid.body, { message: "Invalid book ID" });

  const absent = await request(app).get("/books/999");
  assert.equal(absent.status, 404);
  assert.deepEqual(absent.body, { message: "Book not found" });
});

test("malformed JSON returns a consistent 400 error", async () => {
  const response = await request(app)
    .post("/books")
    .set("Content-Type", "application/json")
    .send('{"title":');
  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { message: "Invalid JSON body" });
});
