import express from "express";
import path from "path";
import mysql from "mysql2";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import methodOverride from "method-override";
import dotenv from "dotenv";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const app = express();
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));
app.use(express.static(path.join(__dirname, "..", "public")));

let connection;

// Check if we have the new single URL variable (on Railway) or the old separate variables (for backwards compatibility)
if (process.env.DATABASE_URL) {
  // Create connection from the single URL string
  connection = mysql.createConnection(process.env.DATABASE_URL);
  console.log("Using DATABASE_URL for connection");
} else {
  // Fall back to the old separate variables (for local development if needed)
  connection = mysql.createConnection({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT || 3306,
  });
  console.log("Using separate variables for connection");
}

// Debug logs
console.log("DATABASE_URL available:", !!process.env.DATABASE_URL);
console.log("MYSQLHOST:", process.env.MYSQLHOST);
console.log("MYSQLUSER:", process.env.MYSQLUSER);
console.log("MYSQLDATABASE:", process.env.MYSQLDATABASE);

app.get("/blogs", (req, res) => {
  let q = "SELECT * FROM blogs ORDER BY date DESC";
  try {
    connection.query(q, (err, result) => {
      if (err) {
        throw err;
      }
      let blogs = result;
      res.render("index", { blogs });
    });
  } catch (err) {
    console.log(err);
    res.send("Error in db");
  }
});

app.get("/blogs/new", (req, res) => {
  res.render("new");
});

app.post("/blogs", (req, res) => {
  const { title, content, author, password } = req.body;
  const id = uuidv4();
  const date = new Date().toISOString().slice(0, 19).replace("T", " ");

  let q = `INSERT INTO blogs (id, title, content, author, password, date) VALUES (?, ?, ?, ?, ?, ?)`;

  connection.query(
    q,
    [id, title, content, author, password, date],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.send("Error in inserting blog");
      }
      res.redirect("/blogs");
    }
  );
});

app.get("/blogs/:id", (req, res) => {
  const { id } = req.params;
  let q = `SELECT * FROM blogs where id=?`;
  try {
    connection.query(q, [id], (err, result) => {
      if (err) {
        throw err;
      }
      let blog = result[0];
      res.render("show", { blog });
    });
  } catch (err) {
    console.log(err);
    res.send("Error in db");
  }
});

app.patch("/blogs/:id", (req, res) => {
  let { id } = req.params;
  let { password: formPassword, content: newContent } = req.body;
  let q = `SELECT * FROM blogs where id=?`;

  try {
    connection.query(q, [id], (err, result) => {
      if (err) {
        throw err;
      }

      let blog = result[0];
      if (formPassword !== blog.password) {
        return res.send("Inccorect password");
      } else {
        q = `UPDATE blogs SET content=? WHERE id=?`;
        try {
          connection.query(q, [newContent, id], (err, result) => {
            if (err) {
              throw err;
            }
            res.redirect("/blogs");
          });
        } catch (err) {
          console.log(err);
          res.send("Error in db");
        }
      }
    });
  } catch (err) {
    console.log(err);
    res.send("Error in db");
  }
});

app.get("/blogs/:id/edit", (req, res) => {
  let { id } = req.params;
  let q = "SELECT * FROM blogs where id=?";
  try {
    connection.query(q, [id], (err, result) => {
      if (err) {
        throw err;
      }
      let blog = result[0];
      res.render("edit.ejs", { blog });
    });
  } catch (err) {
    console.log(err);
    res.send("Error in db");
  }
});

app.get("/blogs/:id/delete", (req, res) => {
  const { id } = req.params;
  let q = `SELECT * FROM blogs where id=?`;
  try {
    connection.query(q, [id], (err, result) => {
      if (err) {
        throw err;
      }
      let blog = result[0];
      res.render("delete", { blog });
    });
  } catch (err) {
    console.log(err);
    res.send("Error in db");
  }
});

app.delete("/blogs/:id", (req, res) => {
  let { id } = req.params;
  let { password: formPassword } = req.body;
  let q = `SELECT * FROM blogs where id=?`;

  try {
    connection.query(q, [id], (err, result) => {
      if (err) {
        throw err;
      }

      let blog = result[0];
      if (formPassword !== blog.password) {
        return res.send("Inccorect password");
      } else {
        q = `DELETE FROM  blogs WHERE id=?`;
        try {
          connection.query(q, [id], (err, result) => {
            if (err) {
              throw err;
            }
            res.redirect("/blogs");
          });
        } catch (err) {
          console.log(err);
          res.send("Error in db");
        }
      }
    });
  } catch (err) {
    console.log(err);
    res.send("Error in db");
  }
});

app.get("/", (req, res) => {
  res.redirect("/blogs");
});

app.listen(port, () => {
  console.log(`app is listening at http://localhost:${port}/blogs `);
});

// export default app;
