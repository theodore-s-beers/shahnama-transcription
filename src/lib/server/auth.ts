import { Lucia } from 'lucia';
import { D1Adapter } from '@lucia-auth/adapter-sqlite';
import type { D1Database } from '@cloudflare/workers-types';
import { dev } from '$app/environment';
import { GitHub } from 'arctic';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from '$env/static/private';

export const github = new GitHub(GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET);

export function initializeLucia(D1: D1Database) {
	const adapter = new D1Adapter(D1, {
		user: 'user',
		session: 'session'
	});

	return new Lucia(adapter, {
		sessionCookie: {
			attributes: {
				secure: !dev
			}
		},
		getUserAttributes: (attributes) => {
			return {
				githubId: attributes.github_id,
				username: attributes.username
			};
		}
	});
}

declare module 'lucia' {
	interface Register {
		Lucia: ReturnType<typeof initializeLucia>;
		DatabaseUserAttributes: DatabaseUserAttributes;
	}
}

interface DatabaseUserAttributes {
	github_id: number;
	username: string;
}
