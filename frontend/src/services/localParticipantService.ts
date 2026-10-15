import * as XLSX from 'xlsx';
import { Participant, DrawRecord, ValidationSummary } from '../types';

const STORAGE_PARTICIPANTS_KEY = 'mystery_participants_pool';
const STORAGE_SUMMARY_KEY = 'mystery_participants_summary';
const STORAGE_HISTORY_KEY = 'mystery_draws_history';

const NAME_KEYWORDS = ["name", "student name", "participant name", "full name", "candidate", "student", "person"];
const REG_KEYWORDS = ["reg", "reg no", "registration", "roll no", "roll number", "id", "student id", "ticket", "sno", "sr no"];

// Clean cell value
function cleanCell(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

// Compute deterministic SHA-256 hash using browser Web Crypto
async function computePoolHash(participants: Participant[]): Promise<string> {
  const text = participants.map(p => `${p.reg_no}:${p.name}\n`).join('');
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate realistic default demo participants
export function generateDemoParticipants(): Participant[] {
  const firstNames = [
    "Aarav", "Diya", "Kabir", "Priya", "Rohan", "Ananya", "Vivaan", "Isha",
    "Aditya", "Tara", "Arjun", "Neha", "Reyansh", "Meera", "Aryan", "Tanvi",
    "Siddharth", "Simran", "Dhruv", "Riya", "Kavya", "Manish", "Pooja", "Vikram"
  ];
  const lastNames = [
    "Sharma", "Patel", "Singh", "Verma", "Mehta", "Reddy", "Gupta", "Malhotra",
    "Joshi", "Bhatia", "Iyer", "Nair", "Kapoor", "Chopra", "Choudhury", "Saxena"
  ];

  const list: Participant[] = [];
  for (let i = 1; i <= 650; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i * 3) % lastNames.length];
    list.push({
      name: `${fn} ${ln}`,
      reg_no: `2026-CS-${String(i).padStart(3, '0')}`
    });
  }
  return list;
}

export const localParticipantService = {
  // Load saved participants from localStorage or default to demo
  getParticipants: (): Participant[] => {
    try {
      const stored = localStorage.getItem(STORAGE_PARTICIPANTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to read from localStorage:", e);
    }
    const demo = generateDemoParticipants();
    localParticipantService.saveParticipants(demo, {
      totalFetched: demo.length,
      eligibleCount: demo.length,
      duplicateCount: 0,
      invalidCount: 0,
      poolHash: 'demo_pool_initialized',
      source: 'Demo Dataset (650+ students)'
    });
    return demo;
  },

  getSummary: (): ValidationSummary | null => {
    try {
      const stored = localStorage.getItem(STORAGE_SUMMARY_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn("Failed to read summary:", e);
    }
    return null;
  },

  saveParticipants: (participants: Participant[], summary: ValidationSummary) => {
    try {
      localStorage.setItem(STORAGE_PARTICIPANTS_KEY, JSON.stringify(participants));
      localStorage.setItem(STORAGE_SUMMARY_KEY, JSON.stringify(summary));
    } catch (e) {
      console.error("Failed to save to localStorage:", e);
    }
  },

  // Parse uploaded Excel or CSV file directly in browser
  parseFile: async (file: File): Promise<{ participants: Participant[]; summary: ValidationSummary; duplicates: any[]; invalid: any[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(buffer, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          if (!worksheet) {
            throw new Error("The Excel sheet is empty.");
          }

          const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          if (rawRows.length === 0) {
            throw new Error("No rows found in the uploaded file.");
          }

          // Filter out completely empty rows
          const rows = rawRows.filter(r => r.some((c: any) => cleanCell(c) !== ''));
          if (rows.length === 0) {
            throw new Error("The file only contains blank rows.");
          }

          // Header detection
          const header = rows[0].map(c => cleanCell(c).toLowerCase());
          let nameIdx = -1;
          let regIdx = -1;

          for (let i = 0; i < header.length; i++) {
            const h = header[i];
            if (nameIdx === -1 && NAME_KEYWORDS.some(k => h.includes(k))) nameIdx = i;
            if (regIdx === -1 && REG_KEYWORDS.some(k => h.includes(k))) regIdx = i;
          }

          const hasHeader = (nameIdx !== -1 || regIdx !== -1);
          const dataRows = hasHeader ? rows.slice(1) : rows;

          if (dataRows.length === 0) {
            throw new Error("The file only has a header row with no data.");
          }

          // Column fallback
          if (!hasHeader) {
            nameIdx = 0;
            regIdx = rows[0].length > 1 ? 1 : -1;
          } else {
            if (nameIdx === -1) nameIdx = 0;
            if (regIdx === -1) regIdx = rows[0].length > 1 ? (nameIdx === 0 ? 1 : 0) : -1;
          }

          const buckets = new Map<string, Participant[]>();
          const invalidList: any[] = [];

          dataRows.forEach((row, idx) => {
            const nameVal = cleanCell(row[nameIdx]);
            let regVal = regIdx !== -1 ? cleanCell(row[regIdx]) : '';

            if (!nameVal) {
              invalidList.push({ row: idx + 1, reason: "Missing student name" });
              return;
            }

            // Auto generate ID if missing
            if (!regVal) {
              regVal = `P-${String(idx + 1).padStart(4, '0')}`;
            }

            const normReg = regVal.toUpperCase();
            if (!buckets.has(normReg)) {
              buckets.set(normReg, []);
            }
            buckets.get(normReg)!.push({ name: nameVal, reg_no: normReg });
          });

          const eligible: Participant[] = [];
          const duplicateList: any[] = [];
          let duplicateCount = 0;

          for (const [reg, records] of buckets.entries()) {
            if (records.length === 1) {
              eligible.push(records[0]);
            } else {
              duplicateCount += records.length;
              duplicateList.push({
                reg_no: reg,
                count: records.length,
                names: records.map(r => r.name)
              });
            }
          }

          if (eligible.length === 0) {
            throw new Error(`No eligible names found. Found ${invalidList.length} invalid rows and ${duplicateCount} duplicate entries.`);
          }

          // Deterministic sort
          eligible.sort((a, b) => a.reg_no.localeCompare(b.reg_no) || a.name.localeCompare(b.name));
          const poolHash = await computePoolHash(eligible);

          const summary: ValidationSummary = {
            fileName: file.name,
            totalFetched: dataRows.length,
            eligibleCount: eligible.length,
            duplicateCount,
            invalidCount: invalidList.length,
            poolHash,
            source: `Excel: ${file.name}`
          };

          localParticipantService.saveParticipants(eligible, summary);
          resolve({ participants: eligible, summary, duplicates: duplicateList, invalid: invalidList });
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error("Failed to read file from disk."));
      reader.readAsArrayBuffer(file);
    });
  },

  // Reset to demo dataset
  resetToDemo: async (): Promise<Participant[]> => {
    const demo = generateDemoParticipants();
    const hash = await computePoolHash(demo);
    const summary: ValidationSummary = {
      totalFetched: demo.length,
      eligibleCount: demo.length,
      duplicateCount: 0,
      invalidCount: 0,
      poolHash: hash,
      source: 'Demo Dataset (650+ students)'
    };
    localParticipantService.saveParticipants(demo, summary);
    return demo;
  },

  // Download sample .xlsx template
  downloadTemplate: () => {
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
    ws['!cols'] = [{ wch: 25 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws, "Participants");
    XLSX.writeFile(wb, "participants_template.xlsx");
  },

  // Cryptographically select a winner
  selectWinner: (pool: Participant[]): Participant => {
    if (pool.length === 0) {
      throw new Error("Cannot select winner from an empty pool.");
    }
    const randomArray = new Uint32Array(1);
    window.crypto.getRandomValues(randomArray);
    const index = randomArray[0] % pool.length;
    return pool[index];
  },

  // Draw History
  getHistory: (): DrawRecord[] => {
    try {
      const stored = localStorage.getItem(STORAGE_HISTORY_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn("Failed to read history:", e);
    }
    return [];
  },

  addHistory: (record: DrawRecord) => {
    const history = localParticipantService.getHistory();
    history.unshift(record);
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history));
  },

  clearHistory: () => {
    localStorage.removeItem(STORAGE_HISTORY_KEY);
  }
};
