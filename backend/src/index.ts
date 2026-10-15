import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import * as XLSX from 'xlsx';
import crypto from 'crypto';

const app = express();
const port = process.env.PORT || 8000;

app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '25mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

export interface Participant {
  name: string;
  reg_no: string;
}

export interface DrawHistoryRecord {
  id: string;
  winner_name: string;
  winner_reg_no: string;
  pool_size: number;
  timestamp: string;
}

// In-memory store
let currentPool: Participant[] = [];
let poolSource: string = "demo";
let poolHash: string = "";
const drawHistory: DrawHistoryRecord[] = [];

const NAME_KEYWORDS = ["name", "student name", "participant name", "full name", "candidate", "student"];
const REG_KEYWORDS = ["reg", "reg no", "registration", "roll no", "roll number", "id", "student id", "ticket"];

function computeHash(participants: Participant[]): string {
  const hash = crypto.createHash('sha256');
  for (const p of participants) {
    hash.update(`${p.reg_no}:${p.name}\n`);
  }
  return hash.digest('hex');
}

export function parseSpreadsheetBuffer(buffer: Buffer, fileName: string): { participants: Participant[]; duplicates: number; invalid: number } {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { participants: [], duplicates: 0, invalid: 0 };

  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (rawRows.length === 0) return { participants: [], duplicates: 0, invalid: 0 };

  // Detect header row
  const firstRow = rawRows[0].map(c => String(c).toLowerCase().trim());
  let nameCol = -1;
  let regCol = -1;

  for (let i = 0; i < firstRow.length; i++) {
    const val = firstRow[i];
    if (nameCol === -1 && NAME_KEYWORDS.some(k => val.includes(k))) nameCol = i;
    if (regCol === -1 && REG_KEYWORDS.some(k => val.includes(k))) regCol = i;
  }

  const hasHeader = nameCol !== -1 || regCol !== -1;
  const dataRows = hasHeader ? rawRows.slice(1) : rawRows;

  if (!hasHeader) {
    nameCol = 0;
    regCol = rawRows[0].length > 1 ? 1 : -1;
  } else {
    if (nameCol === -1) nameCol = 0;
    if (regCol === -1) regCol = rawRows[0].length > 1 ? 1 : -1;
  }

  const validMap = new Map<string, Participant[]>();
  let invalidCount = 0;

  dataRows.forEach((row, idx) => {
    const rawName = String(row[nameCol] || '').trim();
    let rawReg = regCol !== -1 ? String(row[regCol] || '').trim() : '';

    if (!rawName) {
      invalidCount++;
      return;
    }

    if (!rawReg) {
      rawReg = `P-${String(idx + 1).padStart(4, '0')}`;
    }

    const normReg = rawReg.toUpperCase();
    if (!validMap.has(normReg)) {
      validMap.set(normReg, []);
    }
    validMap.get(normReg)!.push({ name: rawName, reg_no: normReg });
  });

  const finalParticipants: Participant[] = [];
  let duplicateCount = 0;

  for (const [_, records] of validMap) {
    if (records.length === 1) {
      finalParticipants.push(records[0]);
    } else {
      duplicateCount += records.length;
    }
  }

  return { participants: finalParticipants, duplicates: duplicateCount, invalid: invalidCount };
}

// Generate 50 realistic demo participants
function generateDemoParticipants(): Participant[] {
  const firstNames = ["Aarav", "Diya", "Kabir", "Priya", "Rohan", "Ananya", "Vivaan", "Isha", "Aditya", "Tara", "Arjun", "Neha", "Reyansh", "Meera", "Aryan", "Tanvi", "Siddharth", "Simran", "Dhruv", "Riya"];
  const lastNames = ["Sharma", "Patel", "Singh", "Verma", "Mehta", "Reddy", "Gupta", "Malhotra", "Joshi", "Bhatia", "Iyer", "Nair", "Kapoor", "Chopra", "Choudhury"];
  const list: Participant[] = [];

  for (let i = 1; i <= 600; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i * 3) % lastNames.length];
    list.push({
      name: `${fn} ${ln}`,
      reg_no: `2026-CS-${String(i).padStart(3, '0')}`
    });
  }
  return list;
}

// Initial setup
currentPool = generateDemoParticipants();
poolHash = computeHash(currentPool);

// Routes
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', server: 'Node.js TypeScript', uptime: process.uptime() });
});

app.get('/api/students/status', (_req: Request, res: Response) => {
  res.json({
    is_ready: currentPool.length > 0,
    total_eligible: currentPool.length,
    pool_hash: poolHash,
    source: poolSource,
    is_confirmed: true,
    file_name: poolSource.startsWith('excel:') ? poolSource.replace('excel:', '') : null,
    source_label: poolSource.startsWith('excel:') ? `Excel (${poolSource.replace('excel:', '')})` : 'Demo Pool'
  });
});

app.get('/api/students/sample-pool', (_req: Request, res: Response) => {
  const sample = currentPool.slice(0, 60);
  res.json(sample);
});

app.post('/api/students/upload', upload.single('file'), (req: Request, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ detail: 'No file uploaded' });
    return;
  }

  try {
    const result = parseSpreadsheetBuffer(req.file.buffer, req.file.originalname);
    if (result.participants.length === 0) {
      res.status(400).json({ detail: 'No eligible names found in the uploaded file' });
      return;
    }

    currentPool = result.participants;
    poolSource = `excel:${req.file.originalname}`;
    poolHash = computeHash(currentPool);

    res.json({
      total_fetched: result.participants.length + result.duplicates + result.invalid,
      eligible_count: result.participants.length,
      invalid_count: result.invalid,
      duplicate_count: result.duplicates,
      pool_hash: poolHash,
      source: poolSource,
      is_confirmed: true,
      sample_eligible: currentPool.slice(0, 20)
    });
  } catch (err: any) {
    res.status(500).json({ detail: `Error parsing file: ${err.message}` });
  }
});

app.post('/api/draws', (req: Request, res: Response): void => {
  if (currentPool.length === 0) {
    res.status(400).json({ detail: 'Participant pool is empty' });
    return;
  }

  // Cryptographically secure random selection
  const randomIndex = crypto.randomInt(0, currentPool.length);
  const winner = currentPool[randomIndex];

  const record: DrawHistoryRecord = {
    id: crypto.randomUUID(),
    winner_name: winner.name,
    winner_reg_no: winner.reg_no,
    pool_size: currentPool.length,
    timestamp: new Date().toISOString()
  };

  drawHistory.unshift(record);

  res.status(201).json({
    id: record.id,
    winner_name: record.winner_name,
    winner_reg_no: record.winner_reg_no,
    participant_count: record.pool_size,
    pool_hash: poolHash,
    drawn_at: record.timestamp
  });
});

app.get('/api/draws/history', (_req: Request, res: Response) => {
  res.json({
    total: drawHistory.length,
    items: drawHistory
  });
});

app.get('/api/students/template', (_req: Request, res: Response) => {
  const wb = XLSX.utils.book_new();
  const sampleData = [
    ["Participant Name", "Registration Number"],
    ["Aarav Sharma", "REG-2026-001"],
    ["Diya Patel", "REG-2026-002"],
    ["Kabir Singh", "REG-2026-003"],
    ["Priya Verma", "REG-2026-004"],
    ["Rohan Mehta", "REG-2026-005"]
  ];
  const ws = XLSX.utils.aoa_to_sheet(sampleData);
  XLSX.utils.book_append_sheet(wb, ws, "Participants");
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=participants_template.xlsx');
  res.send(buffer);
});

app.listen(port, () => {
  console.log(`🚀 Mystery Draw Node.js TypeScript server running on http://localhost:${port}`);
});
