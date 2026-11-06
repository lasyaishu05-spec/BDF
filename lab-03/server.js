const express = require("express");
const { initializeDatabase } = require("./db");
const createBooksRouter = require("./routes/books");

function createApp(db) {
  const app = express();
  app.use(express.json());
  app.use("/books", createBooksRouter(db));
  app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
  });
  app.use((error, req, res, next) => {
    if (error.type === "entity.parse.failed") {
      return res.status(400).json({ message: "Invalid JSON body" });
    }
    console.error(error);
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
