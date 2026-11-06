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
  if (
    typeof body.price !== "number" ||
    !Number.isFinite(body.price) ||
    body.price < 0
  ) {
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
      const book = await db.get(
        "SELECT * FROM books WHERE id = ?",
        [Number(req.params.id)]
      );
      if (!book) return res.status(404).json({ message: "Book not found" });
      res.status(200).json(book);
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    const validationMessage = validateBook(req.body);
    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }
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
    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }
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
      if (result.changes === 0) {
        return res.status(404).json({ message: "Book not found" });
      }
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
      const result = await db.run(
        "DELETE FROM books WHERE id = ?",
        [Number(req.params.id)]
      );
      if (result.changes === 0) {
        return res.status(404).json({ message: "Book not found" });
      }
      res.status(200).json({ message: "Book deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = createBooksRouter;
