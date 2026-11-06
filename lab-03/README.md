# Build Lab 3 - Backend Development Fundamentals (REST API)

## Student Information

- **Student Name:** [Your Name]
- **Registration Number:** [Your Registration Number]
- **Section:** [Your Section]
- **Deployment URL:** [Add your deployment URL after deploying]

## Objective

Build a standalone Book Management REST API with Node.js, Express, and SQLite.
The API supports creating, reading, updating, deleting, searching, sorting,
paginating, and filtering book records. This lab has its own dependencies and
database; it does not depend on Lab 1 or Lab 2.

## Technologies

- Node.js and JavaScript (CommonJS: `require` / `module.exports`)
- Express.js
- SQLite (`sqlite` with the `sqlite3` driver)
- `node:test` and Supertest for automated HTTP/database tests
- Postman for manual API testing

## Project Structure

```text
lab-03/
├── .gitignore
├── db.js
├── package-lock.json
├── package.json
├── README.md
├── postman_collection.json
├── server.js
├── routes/
│   └── books.js
├── screenshots/
│   └── .gitkeep
└── test/
    ├── books.test.js
    └── db.test.js
```

### What each file does

- `server.js` configures Express, parses JSON request bodies, connects the
  books router, initializes the database before the server listens, and
  returns JSON for invalid JSON and unexpected errors.
- `db.js` opens the local SQLite file and automatically creates the `books`
  table if it does not exist.
- `routes/books.js` validates input and implements all five book endpoints.
  SQL values use placeholders (`?`) so user input is not inserted into SQL
  text. The sort column and direction are checked against allowlists.
- `package.json` lists the app dependencies and `start`, `dev`, and `test`
  commands. `package-lock.json` records exact installed dependency versions.
- `.gitignore` prevents local dependencies, environment secrets, and SQLite
  database files from being committed.
- `postman_collection.json` is an importable Postman collection with 14
  ordered requests and response checks.
- `test/` contains automated HTTP integration tests using a temporary SQLite
  database. The test data is removed when the tests finish.
- `screenshots/` is where you can save your own Postman screenshots.

## Database

When the server starts, it creates `books.sqlite` in this folder if needed.
The table definition is:

```sql
CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  price REAL NOT NULL
);
```

Do not upload this local database to GitHub. The `.gitignore` excludes
`*.db` and `*.sqlite`.

## Install and Run in VS Code on Windows

1. Install Node.js (LTS) and open this repository folder in VS Code.
2. Open **Terminal → New Terminal**. The terminal below starts at the
   repository root:

   ```powershell
   cd .\lab-03
   npm install
   ```

3. Start the development server:

   ```powershell
   npm run dev
   ```

   The first start creates the database and prints:
   `Server running at http://localhost:3000`

4. Keep that terminal running. Open a second VS Code terminal for Postman or
   command-line requests.
5. To run the automated tests, use the second terminal:

   ```powershell
   cd .\lab-03
   npm test
   ```

   The tests use a temporary database; they do not add sample books to your
   `books.sqlite` file.

To run without the development auto-reloader, use `npm start` instead of
`npm run dev`.

## API Endpoints

The base URL for local requests is `http://localhost:3000`.

| Method | Endpoint | Purpose | Success |
|---|---|---|---|
| GET | `/books` | Get a filtered list of books | 200 |
| GET | `/books/:id` | Get one book by its ID | 200 |
| POST | `/books` | Add a book | 201 |
| PUT | `/books/:id` | Replace a book's title, author, and price | 200 |
| DELETE | `/books/:id` | Delete a book | 200 |

POST and PUT use this JSON shape. The price must be a JSON number, not a quoted
string:

```json
{
  "title": "Python Basics",
  "author": "A. Writer",
  "price": 399.5
}
```

POST example success response (the ID is assigned by SQLite):

```json
{
  "message": "Book created successfully",
  "book": {
    "id": 1,
    "title": "Python Basics",
    "author": "A. Writer",
    "price": 399.5
  }
}
```

GET `/books/1` returns the book object directly:

```json
{
  "id": 1,
  "title": "Python Basics",
  "author": "A. Writer",
  "price": 399.5
}
```

## GET `/books` Query Parameters

All parameters are optional.

| Parameter | Meaning | Default / Rules |
|---|---|---|
| `search_q` | Find a partial match in the title | Optional string |
| `order_by` | Sort by `id`, `title`, `author`, or `price` | `id` |
| `order` | Sort direction | `ASC`; accepts `ASC` or `DESC` |
| `limit` | Maximum records in this page | `100`; positive integer |
| `offset` | Number of records skipped | `0`; non-negative integer |
| `min_price` | Include prices at or above this amount | Optional finite non-negative number |
| `max_price` | Include prices at or below this amount | Optional finite non-negative number |

Price bounds are inclusive. If both are given, `min_price` must not exceed
`max_price`. Sorting is restricted to the listed columns; filter values are
passed as SQL parameters. `search_q` treats `%` and `_` as literal characters,
so the value searches for title text rather than SQL wildcard patterns.

Examples (add sample books first to see matching rows):

```text
GET http://localhost:3000/books
GET http://localhost:3000/books?search_q=Python
GET http://localhost:3000/books?order_by=price&order=ASC
GET http://localhost:3000/books?limit=2&offset=0
GET http://localhost:3000/books?min_price=300&max_price=500
GET http://localhost:3000/books?search_q=Python&order_by=price&order=DESC
```

## Validation and Status Codes

All error responses are JSON with a `message` property, for example:

```json
{
  "message": "Title is required"
}
```

- A missing, non-string, or blank title returns **400 Bad Request** with
  `"Title is required"`.
- A missing, non-string, or blank author returns **400 Bad Request** with
  `"Author is required"`.
- Price must be a finite, non-negative JSON number. Missing, string, negative,
  or non-finite prices return **400 Bad Request** with
  `"Price must be a non-negative number"`.
- IDs must be positive safe integers. Invalid IDs return **400 Bad Request**
  with `"Invalid book ID"`.
- A valid ID that does not identify a row returns **404 Not Found** with
  `"Book not found"`.
- Unknown sort columns, invalid sort directions, malformed numeric query
  values, invalid pagination, and reversed price ranges return **400 Bad
  Request** with a descriptive message.
- Malformed JSON bodies return **400 Bad Request** with
  `"Invalid JSON body"`.
- Successful GET, PUT, and DELETE requests return **200 OK**. Successful POST
  requests return **201 Created**.
- Unexpected server or database errors return **500 Internal Server Error**
  with `{"message":"Internal server error"}`. The internal exception is
  logged to the server terminal rather than returned to the caller.

PUT is a full replacement: provide all three fields (`title`, `author`, and
`price`).

## Postman Testing

### Import and run the collection

1. Start the server with `npm run dev` and keep it running.
2. In Postman, select **Import → Files**, then choose
   `lab-03/postman_collection.json`.
3. Open **Lab 3 - Book Management API**. The `baseUrl` collection variable is
   `http://localhost:3000`.
4. For repeatable IDs, use a fresh database. Stop the server, remove
   `lab-03/books.sqlite` if it exists, then restart the server. (Only remove
   this lab's database file; it will be recreated automatically.)
5. Run the requests in collection order using **Run collection**. The POST
   tests save the created IDs to collection variables. Each request includes a
   status assertion; create, update, and error cases also check response data.

### Request checklist and expected results

| Test | Method and URL | Body | Expected result |
|---|---|---|---|
| Get all books | `GET http://localhost:3000/books` | None | 200, JSON array (empty before adding books) |
| Add first book | `POST http://localhost:3000/books` | `{"title":"Python Basics","author":"A. Writer","price":399.5}` | 201, created message and book with ID |
| Add second book | `POST http://localhost:3000/books` | `{"title":"Node Guide","author":"B. Writer","price":450}` | 201, created message and book with ID |
| Search by title | `GET http://localhost:3000/books?search_q=Python` | None | 200, one matching Python Basics record |
| Sort ascending | `GET http://localhost:3000/books?order_by=price&order=ASC` | None | 200, prices `[399.5, 450]` |
| Sort descending | `GET http://localhost:3000/books?order_by=price&order=DESC` | None | 200, prices `[450, 399.5]` |
| Paginate | `GET http://localhost:3000/books?limit=1&offset=0&order_by=id` | None | 200, one first-page record |
| Filter price range | `GET http://localhost:3000/books?min_price=300&max_price=500` | None | 200, both sample records |
| Get one book | `GET http://localhost:3000/books/1` | None | 200, Python Basics object |
| Update a book | `PUT http://localhost:3000/books/1` | `{"title":"Updated Python","author":"A. Writer","price":425}` | 200, updated message and book |
| Delete a book | `DELETE http://localhost:3000/books/2` | None | 200, `{"message":"Book deleted successfully"}` |
| Missing title | `POST http://localhost:3000/books` | `{"author":"Missing title","price":20}` | 400, `{"message":"Title is required"}` |
| Invalid query | `GET http://localhost:3000/books?order_by=unknown` | None | 400, `{"message":"Invalid order_by value"}` |
| Missing record | `GET http://localhost:3000/books/999999` | None | 404, `{"message":"Book not found"}` |

### Expected response bodies for the collection examples

The first request returns an empty list when using a freshly created database:

```json
[]
```

After adding both sample books, `GET /books` returns:

```json
[
  {
    "id": 1,
    "title": "Python Basics",
    "author": "A. Writer",
    "price": 399.5
  },
  {
    "id": 2,
    "title": "Node Guide",
    "author": "B. Writer",
    "price": 450
  }
]
```

Before the update and deletion requests, the search response for
`?search_q=Python` is:

```json
[
  {
    "id": 1,
    "title": "Python Basics",
    "author": "A. Writer",
    "price": 399.5
  }
]
```

The ascending request returns `[Python Basics, Node Guide]`; descending
returns `[Node Guide, Python Basics]`. The price values are respectively
`[399.5, 450]` and `[450, 399.5]`. The page request with `limit=1&offset=0`
returns:

```json
[
  {
    "id": 1,
    "title": "Python Basics",
    "author": "A. Writer",
    "price": 399.5
  }
]
```

The `min_price=300&max_price=500` response contains both book objects shown
above. `GET /books/1` returns the Python Basics object without an array wrapper.
`PUT /books/1` returns status 200 and:

```json
{
  "message": "Book updated successfully",
  "book": {
    "id": 1,
    "title": "Updated Python",
    "author": "A. Writer",
    "price": 425
  }
}
```

`DELETE /books/2` returns status 200 and:

```json
{
  "message": "Book deleted successfully"
}
```

The invalid-title POST returns status 400 and:

```json
{
  "message": "Title is required"
}
```

The invalid-sort request returns status 400 and:

```json
{
  "message": "Invalid order_by value"
}
```

The nonexistent-book request returns status 404 and:

```json
{
  "message": "Book not found"
}
```

Other useful manual checks:

- Missing author: POST `{"title":"No author","price":20}` → 400,
  `{"message":"Author is required"}`.
- Invalid price: POST `{"title":"Bad price","author":"A. Writer","price":"free"}`
  → 400, `{"message":"Price must be a non-negative number"}`.
- Invalid ID: GET `http://localhost:3000/books/0` → 400,
  `{"message":"Invalid book ID"}`.
- Invalid query values: try `?limit=abc`, `?offset=-1`,
  `?min_price=600&max_price=100`, or `?order=SIDEWAYS` → 400 with a
  descriptive JSON message.

### Exact endpoint examples

**POST** `http://localhost:3000/books`

```json
{
  "title": "Python Basics",
  "author": "A. Writer",
  "price": 399.5
}
```

Expected: **201**

```json
{
  "message": "Book created successfully",
  "book": {
    "id": 1,
    "title": "Python Basics",
    "author": "A. Writer",
    "price": 399.5
  }
}
```

**PUT** `http://localhost:3000/books/1`

```json
{
  "title": "Updated Python",
  "author": "A. Writer",
  "price": 425
}
```

Expected: **200**

```json
{
  "message": "Book updated successfully",
  "book": {
    "id": 1,
    "title": "Updated Python",
    "author": "A. Writer",
    "price": 425
  }
}
```

**DELETE** `http://localhost:3000/books/2`

Expected: **200** with `{"message":"Book deleted successfully"}`.

## Debugging Exercises

### 1. `EADDRINUSE` - port already in use

- **Cause:** Another process is listening on port 3000, possibly another copy
  of this server.
- **Identify it in PowerShell:**

  ```powershell
  Get-NetTCPConnection -LocalPort 3000 -State Listen |
    Select-Object -ExpandProperty OwningProcess -Unique
  Get-Process -Id <PID>
  ```

- **Fix:** If it is your old server, stop it with Ctrl+C in its terminal. Only
  stop a process after confirming it belongs to you. Or use a different port:

  ```powershell
  $env:PORT = "3001"
  npm run dev
  ```

  The server then uses `http://localhost:3001`. In a new terminal, Postman
  `baseUrl` must also be changed to that port.

### 2. `Cannot find module` - wrong import path

- **Cause:** A relative `require()` path is resolved from the file doing the
  import, not from the terminal's current folder.
- **Identify it:** Read the first lines of the stack trace to see which file
  attempted the import; check spelling, capitalization, and the relative path.
- **Fix:** `server.js` is in the project root and imports `./db` and
  `./routes/books`; `routes/books.js` is one folder down, so a root database
  module would be imported with `../db`. Run `npm install` from `lab-03`.

### 3. SQLite `no such table` - table name typo

- **Cause:** SQL names a table that has not been created, often because the
  query says `book` while the actual table is named `books`.
- **Identify it:** Compare the name in the SQLite error/query with the table
  creation SQL in `db.js`.
- **Fix:** Use the exact name `books` consistently and make sure
  `initializeDatabase()` completes before `app.listen()` starts accepting
  requests. Confirm the app is using the expected `books.sqlite` file.

### 4. Returning before an asynchronous database operation finishes

- **Cause:** SQLite operations complete asynchronously. Sending a response
  before their callback/promise completes can return missing or stale data.
- **Identify it:** Look for a response sent immediately after starting a
  database operation without waiting for a result.
- **Fix:** These routes use `async` handlers and `await db.all()`, `await
  db.get()`, and `await db.run()` before responding. `try/catch` forwards
  failures to Express error middleware with `next(error)`.

## Screenshots

Capture your own successful Postman responses and save them in `screenshots/`.
The image links below are submission placeholders until you add those files.

![Get all books](screenshots/get-all-books.png)
![Get one book](screenshots/get-one-book.png)
![Add a book](screenshots/add-book.png)
![Update a book](screenshots/update-book.png)
![Delete a book](screenshots/delete-book.png)
![Search, sorting, pagination, and price filtering](screenshots/list-query-tests.png)
![Validation and not-found responses](screenshots/error-responses.png)

## Push to GitHub

1. Create a GitHub repository for the coursework (or use your existing
   coursework repository).
2. From the repository root in VS Code, check that only your intended lab
   files are staged. `.gitignore` keeps `node_modules`, `.env`, `*.db`, and
   `*.sqlite` out of Git.
3. Add and commit Lab 3:

   ```powershell
   git add .\lab-03
   git commit -m "Add Lab 3 book management API"
   ```

4. If the remote is not configured yet, add the URL from your GitHub
   repository page:

   ```powershell
   git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPOSITORY>.git
   ```

5. Push your current branch. For the `main` branch, use:

   ```powershell
   git push -u origin main
   ```

   If you are working on another branch, replace `main` with that branch's
   name. Never commit database files, `node_modules`, or secrets.
