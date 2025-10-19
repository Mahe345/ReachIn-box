const express = require("express");
const imaps = require("imap-simple");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
const PORT = 5000;

const config = {
  imap: {
    user: process.env.IMAP_USER,
    password: process.env.IMAP_PASS,
    host: "imap.gmail.com",
    port: 993,
    tls: true,
    authTimeout: 10000,
    connTimeout: 10000,
    tlsOptions: { rejectUnauthorized: false }
  }
};

app.get("/emails", async (req, res) => {
  try {
    const connection = await imaps.connect(config);

    // List folders to fetch
    const boxes = ["INBOX", "[Gmail]/Sent Mail"];
    const fetchOptions = {
      bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)"],
      struct: true,
      markSeen: false
    };

    const emailsByFolder = {};

    for (const box of boxes) {
      await connection.openBox(box);
      const messages = await connection.search(["ALL"], fetchOptions);

      emailsByFolder[box] = messages.map((msg) => {
        const header = msg.parts[0].body;
        return {
          from: header.from ? header.from[0] : "Unknown",
          to: header.to ? header.to[0] : "Unknown",
          subject: header.subject ? header.subject[0] : "(No subject)",
          date: header.date ? header.date[0] : "Unknown",
          flags: msg.attributes.flags,
          size: msg.attributes.size,
          hasAttachments: msg.attributes.struct.some(part => part.disposition)
        };
      });
    }

    res.json(emailsByFolder);
    connection.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching emails");
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
