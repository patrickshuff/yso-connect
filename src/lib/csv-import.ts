/**
 * CSV roster import parsing and validation.
 *
 * Handles quoted fields, commas within values, and flexible
 * case-insensitive header mapping.
 */

const RELATIONSHIP_TYPES = ["mother", "father", "guardian", "grandparent", "other"] as const;
type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export interface ParsedGuardian {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  relationship: RelationshipType;
}

export interface ParsedRow {
  playerFirstName: string;
  playerLastName: string;
  playerDob: string | null;
  guardians: ParsedGuardian[];
}

export interface RowError {
  row: number;
  message: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  errors: RowError[];
}

/**
 * Parse a single CSV line respecting quoted fields.
 * Handles: commas inside quotes, escaped quotes (""), and trailing newlines.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ""
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        current += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
        i++;
      } else {
        current += ch;
        i++;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Split CSV text into lines, handling \r\n and \n.
 */
function splitLines(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);
}

/** Normalize a header string to a canonical key. */
function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[\s-]+/g, "_").trim();
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(v: string): boolean {
  if (!DATE_RE.test(v)) return false;
  const d = new Date(v + "T00:00:00Z");
  return !isNaN(d.getTime());
}

function parseRelationship(raw: string): RelationshipType | null {
  const lower = raw.toLowerCase().trim();
  if (RELATIONSHIP_TYPES.includes(lower as RelationshipType)) {
    return lower as RelationshipType;
  }
  return null;
}

/**
 * Parse CSV text into validated roster rows.
 */
export function parseCsvRoster(csvText: string): ParseResult {
  const lines = splitLines(csvText);
  if (lines.length === 0) {
    return { rows: [], errors: [{ row: 0, message: "CSV is empty" }] };
  }

  const headerFields = parseCsvLine(lines[0]);
  const headerMap = new Map<string, number>();
  headerFields.forEach((h, idx) => {
    headerMap.set(normalizeHeader(h), idx);
  });

  const get = (fields: string[], key: string): string => {
    const idx = headerMap.get(key);
    if (idx === undefined || idx >= fields.length) return "";
    return fields[idx].trim();
  };

  const rows: ParsedRow[] = [];
  const errors: RowError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1; // 1-indexed, header is row 1
    const fields = parseCsvLine(lines[i]);
    const rowErrors: string[] = [];

    const playerFirstName = get(fields, "player_first_name");
    const playerLastName = get(fields, "player_last_name");
    const playerDobRaw = get(fields, "player_dob");

    if (!playerFirstName) {
      rowErrors.push("Missing player first name");
    }
    if (!playerLastName) {
      rowErrors.push("Missing player last name");
    }

    let playerDob: string | null = null;
    if (playerDobRaw) {
      if (isValidDate(playerDobRaw)) {
        playerDob = playerDobRaw;
      } else {
        rowErrors.push(`Invalid date of birth: ${playerDobRaw}`);
      }
    }

    const guardians: ParsedGuardian[] = [];

    // Guardian 1
    const g1First = get(fields, "guardian1_first_name");
    const g1Last = get(fields, "guardian1_last_name");
    const g1Email = get(fields, "guardian1_email") || null;
    const g1Phone = get(fields, "guardian1_phone") || null;
    const g1RelRaw = get(fields, "guardian1_relationship");

    if (g1First && g1Last) {
      const rel = parseRelationship(g1RelRaw || "guardian");
      if (!rel) {
        rowErrors.push(`Invalid guardian1 relationship: ${g1RelRaw}`);
      } else {
        guardians.push({
          firstName: g1First,
          lastName: g1Last,
          email: g1Email,
          phone: g1Phone,
          relationship: rel,
        });
      }
    }

    // Guardian 2 (optional)
    const g2First = get(fields, "guardian2_first_name");
    const g2Last = get(fields, "guardian2_last_name");
    const g2Email = get(fields, "guardian2_email") || null;
    const g2Phone = get(fields, "guardian2_phone") || null;
    const g2RelRaw = get(fields, "guardian2_relationship");

    if (g2First && g2Last) {
      const rel = parseRelationship(g2RelRaw || "guardian");
      if (!rel) {
        rowErrors.push(`Invalid guardian2 relationship: ${g2RelRaw}`);
      } else {
        guardians.push({
          firstName: g2First,
          lastName: g2Last,
          email: g2Email,
          phone: g2Phone,
          relationship: rel,
        });
      }
    }

    if (guardians.length === 0 && rowErrors.length === 0) {
      rowErrors.push("At least one guardian with first and last name is required");
    }

    if (rowErrors.length > 0) {
      errors.push({ row: rowNum, message: rowErrors.join("; ") });
    } else {
      rows.push({
        playerFirstName,
        playerLastName,
        playerDob,
        guardians,
      });
    }
  }

  return { rows, errors };
}
