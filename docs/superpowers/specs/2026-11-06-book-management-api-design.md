# Lab 3 Book Management API Design

## Goal

Create a standalone beginner-friendly REST API in `lab-03` using Node.js,
Express, CommonJS, and SQLite. The app must not depend on either earlier lab.

## Project structure

The project contains `server.js`, `db.js`, `package.json`, `.gitignore`,
`README.md`, `routes/books.js`, and `screenshots/`. It also includes an
importable `postman_collection.json` so the requested API checks can be run
from Postman. SQLite files and installed dependencies stay out of Git.

## Architecture and data flow

- `server.js` configures Express JSON parsing, mounts the books router at
  `/books`, initializes the database before listening, and returns consistent
  JSON for unexpected errors.
- `db.js` opens the SQLite database using `sqlite` over `sqlite3` and creates
  the `books` table on startup. Its asynchronous database methods are awaited.
- `routes/books.js` handles collection filters and CRUD routes. SQL values use
  placeholders; dynamic sort columns and directions come only from allowlists.
- Request validation happens before database writes. Errors use
  `{ "message": "..." }`; missing records return 404.

## API behavior

The API supports `GET /books`, `GET /books/:id`, `POST /books`, `PUT /books/:id`,
and `DELETE /books/:id`. List defaults are `order_by=id`, `order=ASC`,
`limit=100`, and `offset=0`. Supported filters are title substring
(`search_q`), `min_price`, and `max_price`. Invalid IDs, filters, and book
fields return 400; absent records return 404; POST returns 201 and successful
reads, updates, and deletes return 200. Price must be a finite non-negative
number; PUT replaces all three book fields. Numeric filters must be finite,
`limit` must be a positive integer, `offset` a non-negative integer, and a
minimum price greater than the maximum is rejected with 400.

## Learning and verification

The README explains installation, startup, each project file, request parsing,
validation, Postman test cases and expected outcomes, GitHub publishing, and
the four specified debugging exercises. The Postman collection covers success
and validation/not-found cases. Verification will install dependencies,
exercise every route and listed query case against a running server, and check
for startup/runtime errors.

## Scope

All application deliverables are inside `lab-03`; existing workspace files and
changes outside that directory are left untouched. Student identity and
deployment URL remain explicit fill-in placeholders.
