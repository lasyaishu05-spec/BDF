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

function escapeLikeWildcards(value) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function createBooksRouter(db) {
  const router = express.Router();

  router.get("/", async (req, res, next) => {
    const {
      search_q: searchQ,
      order_by: orderBy = "id",
      order = "ASC",
    } = req.query;
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
    const minPrice = req.query.min_price === undefined
      ? undefined
      : parseNumber(req.query.min_price);
    const maxPrice = req.query.max_price === undefined
      ? undefined
      : parseNumber(req.query.max_price);

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
      return res.status(400).json({
        message: "min_price must be a non-negative number",
      });
    }
    if (maxPrice !== undefined && (!Number.isFinite(maxPrice) || maxPrice < 0)) {
      return res.status(400).json({
        message: "max_price must be a non-negative number",
      });
    }
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      return res.status(400).json({
        message: "min_price cannot exceed max_price",
      });
    }
    if (searchQ !== undefined && typeof searchQ !== "string") {
      return res.status(400).json({ message: "search_q must be a string" });
    }

    const conditions = [];
    const values = [];
    if (searchQ !== undefined) {
      conditions.push("title LIKE ? ESCAPE char(92)");
      values.push(`%${escapeLikeWildcards(searchQ)}%`);
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
