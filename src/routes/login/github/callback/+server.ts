import { OAuth2RequestError } from 'arctic';
import { generateIdFromEntropySize } from 'lucia';
import { github, initializeLucia } from '$lib/server/auth';

import type { RequestEvent } from '@sveltejs/kit';

export async function GET(event: RequestEvent): Promise<Response> {
	const code = event.url.searchParams.get('code');
	const state = event.url.searchParams.get('state');
	const storedState = event.cookies.get('github_oauth_state') ?? null;

	if (!code || !state || !storedState || state !== storedState) {
		return new Response(null, {
			status: 400
		});
	}

	try {
		const tokens = await github.validateAuthorizationCode(code);
		const githubUserResponse = await fetch('https://api.github.com/user', {
			headers: {
				Authorization: `Bearer ${tokens.accessToken}`
			}
		});
		const githubUser: GitHubUser = await githubUserResponse.json();

		// Replace this with your own DB client.
		// const existingUser = await db.table('user').where('github_id', '=', githubUser.id).get();
		const sql = 'SELECT * FROM user WHERE github_id = ?';
		const stmt = event.platform?.env.AuthDB.prepare(sql).bind(githubUser.id);
		const existingUser = await stmt.first<UserRow>();

		const lucia = initializeLucia(event.platform?.env.AuthDB);

		if (existingUser) {
			const session = await lucia.createSession(existingUser.id, {});
			const sessionCookie = lucia.createSessionCookie(session.id);
			event.cookies.set(sessionCookie.name, sessionCookie.value, {
				path: '.',
				...sessionCookie.attributes
			});
		} else {
			const userId = generateIdFromEntropySize(10); // 16 characters long

			// Replace this with your own DB client.
			// await db.table('user').insert({
			// 	id: userId,
			// 	github_id: githubUser.id,
			// 	username: githubUser.login
			// });
			const sql = 'INSERT INTO user (id, github_id, username) VALUES (?1, ?2, ?3)';
			const stmt = event.platform?.env.AuthDB.prepare(sql).bind(
				userId,
				githubUser.id,
				githubUser.login
			);
			await stmt.run();

			const session = await lucia.createSession(userId, {});
			const sessionCookie = lucia.createSessionCookie(session.id);
			event.cookies.set(sessionCookie.name, sessionCookie.value, {
				path: '.',
				...sessionCookie.attributes
			});
		}
		return new Response(null, {
			status: 302,
			headers: {
				Location: '/'
			}
		});
	} catch (e) {
		// the specific error message depends on the provider
		if (e instanceof OAuth2RequestError) {
			// invalid code
			return new Response(null, {
				status: 400
			});
		}
		return new Response(null, {
			status: 500
		});
	}
}

interface GitHubUser {
	id: number;
	login: string;
}

interface UserRow {
	id: string;
	github_id: number;
	username: string;
}
