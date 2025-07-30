import { type D1Database } from "@cloudflare/workers-types";
import { GitHub } from "arctic";
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from "$env/static/private";

//
// Public constants
//

export const github = new GitHub(GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, null);
export const SESSION_COOKIE_NAME = "session_token";
export const SESSION_EXPIRES_SECONDS = 60 * 60 * 24;

//
// Public types
//

export interface User {
	id: string;
	githubId: number;
	username: string;
	shortName: string | null;
}

export interface UserRow {
	id: string;
	github_id: number;
	username: string;
	short_name: string | null;
}

export interface Session {
	id: string;
	secretHash: Uint8Array;
	createdAt: Date;
	userId: string;
}

//
// Public functions
//

export async function createSession(D1: D1Database, userId: string): Promise<SessionWithToken> {
	const now = new Date();

	const id = generateSecureRandomString();
	const secret = generateSecureRandomString();
	const secretHash = await hashSecret(secret);

	const token = id + "." + secret;

	const session: SessionWithToken = {
		id,
		secretHash,
		createdAt: now,
		userId,
		token,
	};

	const stmt = D1.prepare(
		"INSERT INTO session_new (id, secret_hash, created_at, user_id) VALUES (?, ?, ?, ?)",
	).bind(session.id, session.secretHash, Math.floor(session.createdAt.getTime() / 1000), userId);
	await stmt.run();

	return session;
}

export async function validateSessionToken(D1: D1Database, token: string): Promise<Session | null> {
	const tokenParts = token.split(".");
	if (tokenParts.length !== 2) return null;

	const sessionId = tokenParts[0];
	const sessionSecret = tokenParts[1];

	const session = await getSession(D1, sessionId);
	if (!session) return null;

	const tokenSecretHash = await hashSecret(sessionSecret);
	const validSecret = constantTimeEqual(tokenSecretHash, session.secretHash);
	if (!validSecret) return null;

	return session;
}

export async function getUserById(D1: D1Database, userId: string): Promise<User | null> {
	const stmt = D1.prepare("SELECT id, github_id, username, short_name FROM user WHERE id = ?").bind(
		userId,
	);

	const d1Result = await stmt.run<UserRow>();
	if (d1Result.success !== true) return null;
	if (d1Result.results.length !== 1) return null;

	const row = d1Result.results[0];
	return {
		id: row.id,
		githubId: row.github_id,
		username: row.username,
		shortName: row.short_name,
	};
}

export async function deleteSession(D1: D1Database, sessionId: string): Promise<void> {
	const stmt = D1.prepare("DELETE FROM session_new WHERE id = ?").bind(sessionId);
	await stmt.run();
}

//
// Private types
//

interface SessionWithToken extends Session {
	token: string;
}

interface SessionRow {
	id: string;
	secret_hash: Uint8Array;
	created_at: number; // Unix timestamp in seconds
	user_id: string;
}

//
// Private functions
//

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.byteLength !== b.byteLength) return false;

	let c = 0;
	for (let i = 0; i < a.byteLength; i++) {
		c |= a[i] ^ b[i];
	}

	return c === 0;
}

function generateSecureRandomString(): string {
	// Human readable alphabet (a-z, 0-9 without l, o, 0, 1 to avoid confusion)
	const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";

	// Generate 24 bytes == 192 bits of entropy
	// We use only 5 bits per byte; total entropy will be 192 * 5 / 8 == 120 bits
	const bytes = new Uint8Array(24);
	crypto.getRandomValues(bytes);

	let id = "";
	for (let i = 0; i < bytes.length; i++) {
		id += alphabet[bytes[i] >> 3]; // Discard right-most 3 bits
	}

	return id;
}

async function getSession(D1: D1Database, sessionId: string): Promise<Session | null> {
	const now = new Date();

	const stmt = D1.prepare(
		"SELECT id, secret_hash, created_at, user_id FROM session_new WHERE id = ?",
	).bind(sessionId);

	const d1Result = await stmt.run<SessionRow>();
	if (d1Result.success !== true) return null;
	if (d1Result.results.length !== 1) return null;

	const row = d1Result.results[0];
	const session: Session = {
		id: row.id,
		secretHash: row.secret_hash,
		createdAt: new Date(row.created_at * 1000), // Convert s to ms
		userId: row.user_id,
	};

	// Check expiration
	if (now.getTime() - session.createdAt.getTime() >= SESSION_EXPIRES_SECONDS * 1000) {
		await deleteSession(D1, sessionId);
		return null;
	}

	return session;
}

async function hashSecret(secret: string): Promise<Uint8Array> {
	const secretBytes = new TextEncoder().encode(secret);
	const secretHashBuffer = await crypto.subtle.digest("SHA-256", secretBytes);
	return new Uint8Array(secretHashBuffer);
}
