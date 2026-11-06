# Lab 3 Book Management API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone, tested Book Management REST API in the separate `lab-03` folder, with SQLite persistence, documented Postman requests, and beginner-oriented instructions.

**Architecture:** `lab-03/server.js` initializes the database before starting Express and mounts a router created by `lab-03/routes/books.js`. `lab-03/db.js` owns the async SQLite connection and table initialization. The router uses bound SQL values and allowlists for dynamic sorting; Supertest exercises an app instance backed by a temporary database.

**Tech Stack:** Node.js, CommonJS, Express, `sqlite` + `sqlite3`, `node:test`, Supertest, Postman.

---

## File map

- Create `lab-03/package.json` and `lab-03/.gitignore`: scripts, dependencies, and ignored local data.
- Create `lab-03/db.js`: async connection creation and `books` schema initialization.
- Create `lab-03/routes/books.js`: validation and five REST endpoints.
- Create `lab-03/server.js`: Express setup, startup, error handling, and testable app factory.
- Create `lab-03/test/books.test.js` and `lab-03/test/db.test.js`: automated HTTP/SQLite integration tests with isolated temporary databases and table-schema assertions.
- Create `lab-03/postman_collection.json`: importable requests for the manual Postman test matrix.
- Create `lab-03/README.md` and `lab-03/screenshots/.gitkeep`: beginner guide and a Git-preserved screenshot directory.

## Task 1: Create an isolated project and test harness

**Files:**
- Create: `lab-03/package.json`
- Create: `lab-03/.gitignore`
- Create: `lab-03/test/books.test.js`
- Create: `lab-03/test/db.test.js`
- Create: `lab-03/server.js`
- Create: `lab-03/db.js`
- Create: `lab-03/routes/books.js`
- Create: `lab-03/screenshots/.gitkeep`

- [x] **Step 1: Create the `lab-03` directory tree**

Run in PowerShell from the repository root:

```powershell
New-Item -ItemType Directory -Force .\lab-03\routes, .\lab-03\test, .\lab-03\screenshots | Out-Null
New-Item -ItemType File -Force .\lab-03\screenshots\.gitkeep | Out-Null
```

Expected: `lab-03` exists with `routes`, `test`, and `screenshots`; add an empty `screenshots/.gitkeep` so Git preserves that folder. No existing lab files change.

- [x] **Step 2: Create the package manifest and ignore rules**

`lab-03/package.json`:

```json
{
  "name": "lab-03-book-management-api",
  "version": "1.0.0",
  "description": "Standalone Book Management REST API using Express and SQLite",
  "main": "server.js",
  "type": "commonjs",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "node --test"
  },
  "dependencies": {
    "express": "^5.3.0",
    "sqlite": "^5.1.1",
    "sqlite3": "^6.0.1"
  },
  "devDependencies": {
    "nodemon": "^3.1.14",
    "supertest": "^7.1.4"
  }
}
```

`lab-03/.gitignore`:

```gitignore
node_modules/
.env
*.db
*.sqlite
```

- [x] **Step 3: Add a failing integration test for startup and list**

`lab-03/test/books.test.js`:

```js
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
```

- [x] **Step 4: Install dependencies and verify the test fails for the expected reason**

Run:

```powershell
npm --prefix .\lab-03 install
npm --prefix .\lab-03 test
```

Expected: dependencies install; test fails because `../server` does not yet export `createApp`.

- [x] **Step 5: Commit the isolated scaffolding**

```powershell
git add -- lab-03/package.json lab-03/.gitignore lab-03/test/books.test.js lab-03/screenshots/.gitkeep
git commit -m "chore: scaffold standalone Lab 3 project" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 2: Implement the database and app lifecycle

**Files:**
- Create: `lab-03/db.js`
- Create: `lab-03/server.js`
- Test: `lab-03/test/books.test.js`
- Test: `lab-03/test/db.test.js`

- [x] **Step 1: Implement the database initializer**

`lab-03/db.js`:

```js
const path = require("node:path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

async function initializeDatabase(filename = path.join(__dirname, "books.sqlite")) {
  const db = await open({ filename, driver: sqlite3.Database });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      price REAL NOT NULL
    )
  `);
  return db;
}

module.exports = { initializeDatabase };
```

- [x] **Step 2: Implement the Express app factory and startup**

`lab-03/server.js`:

```js
const express = require("express");
const { initializeDatabase } = require("./db");
const createBooksRouter = require("./routes/books");

function createApp(db) {
  const app = express();
  app.use(express.json());
  app.use("/books", createBooksRouter(db));
  app.use((error, req, res, next) => {
    console.error(error);
    if (error.type === "entity.parse.failed") {
      return res.status(400).json({ message: "Invalid JSON body" });
    }
    res.status(500).json({ message: "Internal server error" });
  });
  return app;
}

async function startServer() {
  try {
    const db = await initializeDatabase();
    const app = createApp(db);
    const port = Number(process.env.PORT) || 3000;
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Unable to start the server:", error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { createApp, startServer };
```

- [x] **Step 3: Add a temporary router stub to make the harness executable**

Create `lab-03/routes/books.js`:

```js
const express = require("express");

function createBooksRouter(db) {
  const router = express.Router();
  router.get("/", async (req, res, next) => {
    try {
      const books = await db.all("SELECT * FROM books ORDER BY id ASC");
      res.status(200).json(books);
    } catch (error) {
      next(error);
    }
  });
  return router;
}

module.exports = createBooksRouter;
```

- [x] **Step 4: Run the focused test**

Run from the repository root:

```powershell
npm --prefix .\lab-03 test
```

Expected: the empty-list test passes with HTTP 200 and `[]`.

- [x] **Step 5: Commit**

```powershell
git add -- lab-03/db.js lab-03/server.js lab-03/routes/books.js lab-03/test/books.test.js
git commit -m "feat: initialize SQLite and Express app" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 3: Implement CRUD and input validation

**Files:**
- Modify: `lab-03/routes/books.js`
- Modify: `lab-03/test/books.test.js`

- [x] **Step 1: Add failing CRUD and validation tests**

Append these tests before the `after` hook in `lab-03/test/books.test.js`:

```js
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

test("POST rejects missing title and invalid price", async () => {
  const missingTitle = await request(app)
    .post("/books")
    .send({ author: "A. Writer", price: 10 });
  assert.equal(missingTitle.status, 400);
  assert.deepEqual(missingTitle.body, { message: "Title is required" });

  const missingAuthor = await request(app)
    .post("/books")
    .send({ title: "Valid", price: 10 });
  assert.equal(missingAuthor.status, 400);
  assert.deepEqual(missingAuthor.body, { message: "Author is required" });

  const invalidPrice = await request(app)
    .post("/books")
    .send({ title: "Valid", author: "A. Writer", price: "free" });
  assert.equal(invalidPrice.status, 400);
  assert.deepEqual(invalidPrice.body, { message: "Price must be a non-negative number" });
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
```

Note: tests share one database. The test runner executes tests in declaration order within this file, so the first created ID is 1.

- [x] **Step 2: Run the tests and verify CRUD cases fail**

Run from the repository root: `npm --prefix .\lab-03 test`

Expected: the initial empty-list test passes; POST, item routes, validation, update, and delete fail because they are not implemented.

- [x] **Step 3: Implement CRUD, field checks, ID checks, and JSON errors**

Replace `lab-03/routes/books.js` with:

```js
const express = require("express");

function isValidId(value) {
  return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value));
}

function validateBook(body) {
  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return "Title is required";
  }
  if (typeof body.author !== "string" || !body.author.trim()) {
    return "Author is required";
  }
  if (typeof body.price !== "number" || !Number.isFinite(body.price) || body.price < 0) {
    return "Price must be a non-negative number";
  }
  return null;
}

function createBooksRouter(db) {
  const router = express.Router();

  router.get("/", async (req, res, next) => {
    try {
      const books = await db.all("SELECT * FROM books ORDER BY id ASC");
      res.status(200).json(books);
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid book ID" });
    }
    try {
      const book = await db.get("SELECT * FROM books WHERE id = ?", [Number(req.params.id)]);
      if (!book) return res.status(404).json({ message: "Book not found" });
      res.status(200).json(book);
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    const validationMessage = validateBook(req.body);
    if (validationMessage) return res.status(400).json({ message: validationMessage });
    try {
      const book = {
        title: req.body.title.trim(),
        author: req.body.author.trim(),
        price: req.body.price,
      };
      const result = await db.run(
        "INSERT INTO books (title, author, price) VALUES (?, ?, ?)",
        [book.title, book.author, book.price]
      );
      res.status(201).json({
        message: "Book created successfully",
        book: { id: result.lastID, ...book },
      });
    } catch (error) {
      next(error);
    }
  });

  router.put("/:id", async (req, res, next) => {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid book ID" });
    }
    const validationMessage = validateBook(req.body);
    if (validationMessage) return res.status(400).json({ message: validationMessage });
    try {
      const book = {
        id: Number(req.params.id),
        title: req.body.title.trim(),
        author: req.body.author.trim(),
        price: req.body.price,
      };
      const result = await db.run(
        "UPDATE books SET title = ?, author = ?, price = ? WHERE id = ?",
        [book.title, book.author, book.price, book.id]
      );
      if (result.changes === 0) return res.status(404).json({ message: "Book not found" });
      res.status(200).json({ message: "Book updated successfully", book });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid book ID" });
    }
    try {
      const result = await db.run("DELETE FROM books WHERE id = ?", [Number(req.params.id)]);
      if (result.changes === 0) return res.status(404).json({ message: "Book not found" });
      res.status(200).json({ message: "Book deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = createBooksRouter;
```

- [x] **Step 4: Run the tests**

Run from the repository root: `npm --prefix .\lab-03 test`

Expected: all tests pass, including missing title/author, invalid price, invalid ID, and absent book responses.

- [x] **Step 5: Commit**

```powershell
git add -- lab-03/routes/books.js lab-03/test/books.test.js
git commit -m "feat: add validated book CRUD routes" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 4: Implement safe list filters, ordering, and pagination

**Files:**
- Modify: `lab-03/routes/books.js`
- Modify: `lab-03/test/books.test.js`

- [x] **Step 1: Add filtering and sorting tests**

Add these tests after CRUD tests. Insert fixtures through the API so tests cover the public behavior:

```js
test("GET /books filters, sorts, and paginates", async () => {
  for (const book of [
    { title: "Python Basics", author: "A", price: 300 },
    { title: "Python Advanced", author: "B", price: 500 },
    { title: "Node Guide", author: "C", price: 400 },
  ]) {
    const response = await request(app).post("/books").send(book);
    assert.equal(response.status, 201);
  }

  const search = await request(app).get("/books?search_q=Python");
  assert.equal(search.status, 200);
  assert.equal(search.body.length, 2);

  const ascending = await request(app).get("/books?order_by=price&order=ASC");
  assert.deepEqual(ascending.body.map((book) => book.price), [300, 400, 500]);
  const descending = await request(app).get("/books?order_by=price&order=DESC");
  assert.deepEqual(descending.body.map((book) => book.price), [500, 400, 300]);

  const page = await request(app).get("/books?limit=1&offset=1&order_by=price");
  assert.equal(page.body.length, 1);
  assert.equal(page.body[0].price, 400);

  const range = await request(app).get("/books?min_price=350&max_price=450");
  assert.deepEqual(range.body.map((book) => book.title), ["Node Guide"]);
});

test("GET /books rejects invalid query values", async () => {
  for (const query of [
    "?order_by=title;DROP",
    "?order=SIDEWAYS",
    "?limit=0",
    "?offset=-1",
    "?min_price=free",
    "?min_price=",
    "?limit=",
    "?min_price=500&max_price=300",
  ]) {
    const response = await request(app).get(`/books${query}`);
    assert.equal(response.status, 400, query);
    assert.equal(typeof response.body.message, "string", query);
  }
});
```

- [x] **Step 2: Run tests and verify the new list requirements fail**

Run from the repository root: `npm --prefix .\lab-03 test`

Expected: CRUD tests pass; filters/order/pagination tests fail before implementation.

- [x] **Step 3: Replace only the `GET /` handler with validated parameterized query construction**

Use the following handler body in `lab-03/routes/books.js`:

```js
  router.get("/", async (req, res, next) => {
    const { search_q: searchQ, order_by: orderBy = "id", order = "ASC" } = req.query;
    const allowedColumns = new Set(["id", "title", "author", "price"]);
    const parseNumber = (value) => (
      typeof value === "string" &&
      /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim())
        ? Number(value)
        : Number.NaN
    );
    const normalizedOrder = typeof order === "string" ? order.toUpperCase() : "";
    const limit = req.query.limit === undefined ? 100 : parseNumber(req.query.limit);
    const offset = req.query.offset === undefined ? 0 : parseNumber(req.query.offset);
    const minPrice = req.query.min_price === undefined ? undefined : parseNumber(req.query.min_price);
    const maxPrice = req.query.max_price === undefined ? undefined : parseNumber(req.query.max_price);

    if (typeof orderBy !== "string" || !allowedColumns.has(orderBy)) {
      return res.status(400).json({ message: "Invalid order_by value" });
    }
    if (!["ASC", "DESC"].includes(normalizedOrder)) {
      return res.status(400).json({ message: "Order must be ASC or DESC" });
    }
    if (!Number.isSafeInteger(limit) || limit < 1) {
      return res.status(400).json({ message: "Limit must be a positive integer" });
    }
    if (!Number.isSafeInteger(offset) || offset < 0) {
      return res.status(400).json({ message: "Offset must be a non-negative integer" });
    }
    if (minPrice !== undefined && (!Number.isFinite(minPrice) || minPrice < 0)) {
      return res.status(400).json({ message: "min_price must be a non-negative number" });
    }
    if (maxPrice !== undefined && (!Number.isFinite(maxPrice) || maxPrice < 0)) {
      return res.status(400).json({ message: "max_price must be a non-negative number" });
    }
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      return res.status(400).json({ message: "min_price cannot exceed max_price" });
    }
    if (searchQ !== undefined && typeof searchQ !== "string") {
      return res.status(400).json({ message: "search_q must be a string" });
    }

    const conditions = [];
    const values = [];
    if (searchQ !== undefined) {
      conditions.push("title LIKE ?");
      values.push(`%${searchQ}%`);
    }
    if (minPrice !== undefined) {
      conditions.push("price >= ?");
      values.push(minPrice);
    }
    if (maxPrice !== undefined) {
      conditions.push("price <= ?");
      values.push(maxPrice);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    values.push(limit, offset);

    try {
      const books = await db.all(
        `SELECT * FROM books ${where} ORDER BY ${orderBy} ${normalizedOrder} LIMIT ? OFFSET ?`,
        values
      );
      res.status(200).json(books);
    } catch (error) {
      next(error);
    }
  });
```

The interpolated identifiers are safe because they are checked against fixed allowlists; user data remains bound through `?` placeholders.

- [x] **Step 4: Run the tests**

Run from the repository root: `npm --prefix .\lab-03 test`

Expected: all CRUD, filtering, sorting, pagination, and invalid-query tests pass.

- [x] **Step 5: Commit**

```powershell
git add -- lab-03/routes/books.js lab-03/test/books.test.js
git commit -m "feat: add validated book list query options" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 5: Add an importable Postman test collection

**Files:**
- Create: `lab-03/postman_collection.json`

- [x] **Step 1: Create a Postman v2.1 collection**

Create requests using collection variable `baseUrl = http://localhost:3000`:

1. `GET {{baseUrl}}/books`
2. `POST {{baseUrl}}/books` body `{"title":"Python Basics","author":"A. Writer","price":399.5}`
3. `POST {{baseUrl}}/books` body `{"title":"Node Guide","author":"B. Writer","price":450}`
4. `GET {{baseUrl}}/books?search_q=Python`
5. `GET {{baseUrl}}/books?order_by=price&order=ASC`
6. `GET {{baseUrl}}/books?order_by=price&order=DESC`
7. `GET {{baseUrl}}/books?limit=1&offset=0`
8. `GET {{baseUrl}}/books?min_price=300&max_price=500`
9. `GET {{baseUrl}}/books/1`
10. `PUT {{baseUrl}}/books/1` body `{"title":"Updated Python","author":"A. Writer","price":425}`
11. `DELETE {{baseUrl}}/books/2`
12. `POST {{baseUrl}}/books` body `{"author":"Missing title","price":20}`
13. `GET {{baseUrl}}/books?order_by=unknown`
14. `GET {{baseUrl}}/books/999999`

For each request, include a Postman test asserting its expected status. Add body assertions for the canonical examples: created book is 201, missing title is 400 with `{"message":"Title is required"}`, and nonexistent ID is 404 with `{"message":"Book not found"}`. Use Postman's “Save response”/“Send” workflow; test IDs assume the clean database created for a fresh lab run.

- [x] **Step 2: Validate JSON syntax**

Run from repository root:

```powershell
Get-Content .\lab-03\postman_collection.json -Raw | ConvertFrom-Json | Out-Null
```

Expected: command exits without an error.

- [x] **Step 3: Commit**

```powershell
git add -- lab-03/postman_collection.json
git commit -m "test: add Lab 3 Postman collection" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 6: Write the complete beginner README

**Files:**
- Create: `lab-03/README.md`

- [x] **Step 1: Document project identity and structure**

Include title and objective; editable `Student Name: [Your Name]`, `Registration Number: [Your Registration Number]`, and `Section: [Your Section]`; technologies; this tree:

```text
lab-03/
├── db.js
├── package.json
├── server.js
├── postman_collection.json
├── routes/
│   └── books.js
├── screenshots/
└── test/
    └── books.test.js
```

Explain each file, startup-created `books` table, and why earlier labs are not dependencies.

- [x] **Step 2: Document commands, endpoints, validation, and query options**

Include:

```powershell
cd lab-03
npm install
npm run dev
npm test
```

Document `http://localhost:3000`; methods and JSON body examples for all five endpoints; query defaults (`order_by=id`, `order=ASC`, `limit=100`, `offset=0`); allowed sort columns and operators; all validation rules and 200/201/400/404/500 status meanings. Explain that title and author must be non-empty strings, price must be a finite non-negative JSON number, and PUT requires all fields.

- [x] **Step 3: Document request flow and Postman test steps**

Describe how `server.js` awaits database initialization, mounts `createBooksRouter(db)` at `/books`, and how `db.js` opens SQLite; explain `req.params`, `req.query`, `req.body`, parameterized SQL, and awaiting async database calls. Give import steps for `postman_collection.json` and exact request examples with expected response shapes for create, list, filter, sort, pagination, range, get one, update, delete, bad input, and missing records.

- [x] **Step 4: Document debugging, screenshots, and GitHub publishing**

Explain cause, identification, and fix for:

1. `EADDRINUSE`: find the process with `Get-NetTCPConnection -LocalPort 3000` and `Get-Process -Id <OwningProcess>`; stop only the identified process or choose another `PORT`.
2. `Cannot find module`: confirm the `require` path relative to the importing file, capitalization, and that `npm install` ran in `lab-03`.
3. `no such table`: compare SQL table spelling with `books`, confirm `initializeDatabase()` runs before `listen`, and confirm the expected database file is used.
4. Early response before SQL completes: use `async` route handlers, `await db.get/all/run`, and forward failures to Express error middleware.

Add screenshot references for each required endpoint/test and clear placeholders indicating which screenshots the student should capture into `screenshots/`. Include `[Deployment URL: add after deploying]` and commands/instructions to push the repository to GitHub without database files or `node_modules`.

- [x] **Step 5: Review README against every user requirement**

Run:

```powershell
Get-Content .\lab-03\README.md
```

Expected: all required identity, install/run, endpoint/query, validation/status, Postman, debugging, screenshot, and deployment topics are present; no claims of a deployment or screenshots that do not exist.

- [x] **Step 6: Commit**

```powershell
git add -- lab-03/README.md
git commit -m "docs: explain Lab 3 API and testing" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 7: Verify the running app and all requirements

**Files:**
- Verify: `lab-03/server.js`
- Verify: `lab-03/db.js`
- Verify: `lab-03/routes/books.js`
- Verify: `lab-03/test/books.test.js`
- Verify: `lab-03/postman_collection.json`
- Verify: `lab-03/README.md`

- [x] **Step 1: Run automated tests and JSON validation**

Run:

```powershell
Set-Location .\lab-03
npm test
Get-Content .\postman_collection.json -Raw | ConvertFrom-Json | Out-Null
```

Expected: all tests pass and collection JSON parses.

- [x] **Step 2: Start the server and verify it responds**

Run `npm run dev` in a VS Code terminal. In another terminal, run:

```powershell
Invoke-RestMethod http://localhost:3000/books
```

Expected: server prints `Server running at http://localhost:3000`; a new database is created and GET returns an empty array (PowerShell may display no rows for an empty JSON array).

- [x] **Step 3: Exercise each actual HTTP behavior**

Run the complete collection in Postman against a clean database. Verify POST 201; list/single/update/delete 200; invalid POST/query/ID 400; absent ID 404; and each search/sort/page/price filter returns the expected records. Also run these PowerShell smoke checks:

```powershell
$created = Invoke-RestMethod -Method Post -Uri http://localhost:3000/books -ContentType 'application/json' -Body '{"title":"Smoke Test","author":"Tester","price":325}'
Invoke-RestMethod 'http://localhost:3000/books?search_q=Smoke&order_by=price&order=DESC&limit=2&offset=0&min_price=300&max_price=400'
Invoke-RestMethod -Method Put -Uri "http://localhost:3000/books/$($created.book.id)" -ContentType 'application/json' -Body '{"title":"Smoke Updated","author":"Tester","price":350}'
Invoke-RestMethod -Method Delete -Uri "http://localhost:3000/books/$($created.book.id)"
```

Expected: created and updated JSON includes the corresponding `book`; filtered GET returns that record before deletion; delete returns `Book deleted successfully`. Use `try/catch` to inspect error response bodies for expected 400/404 cases.

- [x] **Step 4: Inspect scope and Git status**

Run from repository root:

```powershell
git status --short
Get-ChildItem .\lab-03 -Recurse -File | Select-Object -ExpandProperty FullName
```

Expected: all app files are under `lab-03`; no `.sqlite`, `.db`, or `node_modules` appears as a tracked file; unrelated workspace edits remain unchanged.

- [x] **Step 5: Commit any final corrections**

If verification uncovers a defect, fix it, rerun the failing test and the complete `npm test`, then commit only `lab-03` changes with the standard co-author trailer.

## Spec coverage review

- Separate, standalone `lab-03` project and requested files: Tasks 1, 5, and 6.
- SQLite schema created at startup, CommonJS, awaited DB, and parameterized SQL: Tasks 2 and 3.
- Five endpoints, status codes, JSON errors, input/ID validation: Task 3.
- Search, safe order whitelist, order direction, limit/offset, price range, defaults, and invalid query rejection: Task 4.
- Postman requests for all endpoint and test categories: Task 5.
- README content, debugging exercises, screenshots, deployment placeholder, and GitHub instructions: Task 6.
- Tests, runtime check, ignored local DB/dependencies, and scope protection: Tasks 1 and 7.
