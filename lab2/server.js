
const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

let db;

// Initialize the database before starting the server
async function initializeDBAndServer() {
  try {
    db = await open({
      filename: path.join(__dirname, "books.db"),
      driver: sqlite3.Database,
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS book (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        price INTEGER NOT NULL,
        pages INTEGER NOT NULL
      );
    `);

    console.log("Database connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Database initialization failed:", error.message);
    process.exit(1);
  }
}

// GET: Retrieve all books
app.get("/books/", async (req, res) => {
  try {
    const books = await db.all("SELECT * FROM book ORDER BY id");
    res.status(200).json(books);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve books" });
  }
});

// GET: Retrieve one book by ID
app.get("/books/:bookId/", async (req, res) => {
  try {
    const { bookId } = req.params;

    if (!/^[1-9]\d*$/.test(bookId)) {
      return res.status(400).json({ error: "Invalid book ID" });
    }

    const book = await db.get(
      "SELECT * FROM book WHERE id = ?",
      [Number(bookId)]
    );

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.status(200).json(book);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve book" });
  }
});

// POST: Add a new book
app.post("/books/", async (req, res) => {
  try {
    const { title, author, price, pages } = req.body;

    if (
      typeof title !== "string" || !title.trim() ||
      typeof author !== "string" || !author.trim() ||
      !Number.isSafeInteger(price) || price < 0 ||
      !Number.isSafeInteger(pages) || pages <= 0
    ) {
      return res.status(400).json({
        error: "Provide a title, author, non-negative integer price, and positive integer pages",
      });
    }

    const result = await db.run(
      `INSERT INTO book (title, author, price, pages)
       VALUES (?, ?, ?, ?)`,
      [title.trim(), author.trim(), price, pages]
    );

    res.status(201).json({
      message: "Book added successfully",
      bookId: result.lastID,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to add book" });
  }
});

// PUT: Update an existing book
app.put("/books/:bookId/", async (req, res) => {
  try {
    const { bookId } = req.params;
    const { title, author, price, pages } = req.body;

    if (!/^[1-9]\d*$/.test(bookId)) {
      return res.status(400).json({ error: "Invalid book ID" });
    }

    if (
      typeof title !== "string" || !title.trim() ||
      typeof author !== "string" || !author.trim() ||
      !Number.isSafeInteger(price) || price < 0 ||
      !Number.isSafeInteger(pages) || pages <= 0
    ) {
      return res.status(400).json({ error: "Invalid book details" });
    }

    const result = await db.run(
      `UPDATE book
       SET title = ?, author = ?, price = ?, pages = ?
       WHERE id = ?`,
      [title.trim(), author.trim(), price, pages, Number(bookId)]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.status(200).json({ message: "Book updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update book" });
  }
});

// DELETE: Remove a book
app.delete("/books/:bookId/", async (req, res) => {
  try {
    const { bookId } = req.params;

    if (!/^[1-9]\d*$/.test(bookId)) {
      return res.status(400).json({ error: "Invalid book ID" });
    }

    const result = await db.run(
      "DELETE FROM book WHERE id = ?",
      [Number(bookId)]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.status(200).json({ message: "Book deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete book" });
  }
});

initializeDBAndServer();
