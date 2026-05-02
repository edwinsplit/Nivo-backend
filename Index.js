import express from "express";
import cors from "cors";
import fs from "fs-extra";

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = "/var/data/database.json";

// Database laden of aanmaken
async function loadDB() {
  if (!(await fs.pathExists(DB_FILE))) {
    await fs.writeJson(DB_FILE, { tags: [], scans: {} }, { spaces: 2 });
  }
  return fs.readJson(DB_FILE);
}

async function saveDB(db) {
  await fs.writeJson(DB_FILE, db, { spaces: 2 });
}

// ---------------------------
// 1. REGISTRATIE ENDPOINT
// ---------------------------
app.post("/api/register", async (req, res) => {
  const { tag_id, duif, eigenaar, hok, verified } = req.body;

  if (!tag_id || !duif || !eigenaar || !hok) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const db = await loadDB();

  const exists = db.tags.find(t => t.tag_id === tag_id);
  if (exists) {
    return res.json({ status: "already_registered", tag: exists });
  }

  const newTag = {
    tag_id,
    duif,
    eigenaar,
    hok,
    verified: verified || false,
    added: Date.now()
  };

  db.tags.push(newTag);
  await saveDB(db);

  res.json({ status: "registered", tag: newTag });
});

// ---------------------------
// 2. SCAN ENDPOINT
// ---------------------------
app.post("/api/scan", async (req, res) => {
  const { tag_id, scanner_id, rssi, timestamp } = req.body;

  if (!tag_id || !scanner_id) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const db = await loadDB();

  db.scans[tag_id] = {
    tag_id,
    scanner_id,
    rssi: rssi || null,
    timestamp: timestamp || Date.now()
  };

  await saveDB(db);

  res.json({ status: "scan_saved" });
});

// ---------------------------
// 3. LIVE ENDPOINT
// ---------------------------
app.get("/api/live", async (req, res) => {
  const db = await loadDB();

  const result = [];

  for (const tag of db.tags) {
    const scan = db.scans[tag.tag_id];
    if (!scan) continue;

    result.push({
      duif: tag.duif,
      eigenaar: tag.eigenaar,
      tag_id: tag.tag_id,
      scanner_id: scan.scanner_id,
      timestamp: scan.timestamp,
      rssi: scan.rssi,
      lat: null,
      lng: null
    });
  }

  res.json(result);
});

// ---------------------------
// SERVER STARTEN
// ---------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Nivo backend running on port", PORT));
