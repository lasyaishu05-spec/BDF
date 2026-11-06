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
