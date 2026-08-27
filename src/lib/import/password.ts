/**
 * Universal Import Engine — password / encrypted-file layer.
 *
 * Detects password-protected PDF and Excel workbooks and surfaces a typed
 * error so the UI can ask for the password and retry the SAME parse path.
 * Nothing here parses data — the format parsers stay untouched.
 *
 * Security constraints:
 *  - The password is only ever held in React state for the duration of one
 *    parse and cleared immediately afterwards.
 *  - It is never written to localStorage/sessionStorage, never sent to the
 *    server, and never logged (no console output in this module).
 */

/** Thrown when a file cannot be opened without a password. */
export class ImportPasswordRequiredError extends Error {
  /** true when a password was supplied but rejected. */
  readonly wrongPassword: boolean;
  constructor(wrongPassword = false) {
    super(
      wrongPassword
        ? "That password didn't work. Please try again."
        : "This file is password protected. Enter its password to continue.",
    );
    this.name = "ImportPasswordRequiredError";
    this.wrongPassword = wrongPassword;
  }
}

/** Thrown when the file is encrypted in a way we cannot open in the browser. */
export class ImportEncryptionUnsupportedError extends Error {
  constructor(hint = "") {
    super(
      `This file uses an encryption method we can't open in the browser${hint ? ` (${hint})` : ""}. Please remove the password in the source app and re-export, or export it as CSV.`,
    );
    this.name = "ImportEncryptionUnsupportedError";
  }
}

const CFB_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

/**
 * Cheap up-front check for an encrypted OOXML workbook: a real .xlsx/.xlsm is
 * a ZIP ("PK.."), while an encrypted one is wrapped in an OLE/CFB container.
 * Legacy .xls is legitimately CFB, so it is excluded here and handled by the
 * parser's own error.
 */
export async function looksEncryptedWorkbook(file: File, ext: string): Promise<boolean> {
  if (ext !== "xlsx" && ext !== "xlsm") return false;
  try {
    const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    return CFB_SIGNATURE.every((b, i) => head[i] === b);
  } catch {
    return false;
  }
}

/** Cheap up-front check for an encrypted PDF (`/Encrypt` in the trailer). */
export async function looksEncryptedPdf(file: File): Promise<boolean> {
  try {
    const tailStart = Math.max(0, file.size - 4096);
    const [head, tail] = await Promise.all([
      file.slice(0, 2048).arrayBuffer(),
      file.slice(tailStart).arrayBuffer(),
    ]);
    const dec = new TextDecoder("latin1");
    const text = dec.decode(head) + dec.decode(tail);
    return /\/Encrypt\b/.test(text);
  } catch {
    return false;
  }
}

const PASSWORD_HINTS = [
  "password",
  "passwordexception",
  "encrypted",
  "decrypt",
  "wrong password",
  "incorrect password",
];

/**
 * Translate a parser error into a password error when it is one.
 * Returns the original error otherwise.
 */
export function normalizeParseError(err: unknown, hadPassword: boolean): unknown {
  const e = err as { name?: string; message?: string; code?: number } | null;
  const name = String(e?.name ?? "");
  const msg = String(e?.message ?? "").toLowerCase();

  const isPdfPasswordException = name === "PasswordException";
  const mentionsPassword = PASSWORD_HINTS.some((h) => msg.includes(h));

  if (isPdfPasswordException) {
    // pdf.js code 1 = NEED_PASSWORD, 2 = INCORRECT_PASSWORD
    const wrong = e?.code === 2 || (hadPassword && msg.includes("incorrect"));
    return new ImportPasswordRequiredError(wrong || hadPassword);
  }

  if (mentionsPassword) {
    if (msg.includes("unsupported") || msg.includes("not supported")) {
      return new ImportEncryptionUnsupportedError();
    }
    return new ImportPasswordRequiredError(hadPassword);
  }

  return err;
}

export function isPasswordError(err: unknown): err is ImportPasswordRequiredError {
  return err instanceof ImportPasswordRequiredError;
}
