import { randomInt } from 'crypto';
import * as bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

// No l/I/1/0/O — these accounts get handed over by voice or messenger, so the
// alphabet is optimised for "read it out loud without ambiguity".
const TEMP_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
const TEMP_GROUPS = 3;
const TEMP_GROUP_LENGTH = 4;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** e.g. "kfr7-9mqx-2vbd" — ~60 bits of entropy from a CSPRNG. */
export function generateTempPassword(): string {
  const groups: string[] = [];
  for (let g = 0; g < TEMP_GROUPS; g++) {
    let group = '';
    for (let i = 0; i < TEMP_GROUP_LENGTH; i++) {
      group += TEMP_ALPHABET[randomInt(TEMP_ALPHABET.length)];
    }
    groups.push(group);
  }
  return groups.join('-');
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
