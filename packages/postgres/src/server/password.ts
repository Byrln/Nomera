import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";

function deriveKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      keyLength,
      {
        N: cost,
        r: blockSize,
        p: parallelization,
        maxmem: 64 * 1024 * 1024,
      },
      (error, derived) => {
        if (error) reject(error);
        else resolve(derived as Buffer);
      },
    );
  });
}
const keyLength = 64;
const cost = 16_384;
const blockSize = 8;
const parallelization = 1;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const derived = await deriveKey(password, salt);
  return [
    "scrypt",
    cost,
    blockSize,
    parallelization,
    salt,
    derived.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const [algorithm, rawCost, rawBlockSize, rawParallelization, salt, rawHash] =
    encoded.split("$");
  if (
    algorithm !== "scrypt" ||
    rawCost !== String(cost) ||
    rawBlockSize !== String(blockSize) ||
    rawParallelization !== String(parallelization) ||
    !salt ||
    !rawHash
  )
    return false;
  const expected = Buffer.from(rawHash, "base64url");
  if (expected.length !== keyLength) return false;
  const actual = await deriveKey(password, salt);
  return timingSafeEqual(actual, expected);
}
