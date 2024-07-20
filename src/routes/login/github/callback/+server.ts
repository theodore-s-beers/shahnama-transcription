import { OAuth2RequestError } from 'arctic';
import { generateIdFromEntropySize } from 'lucia';
import { github, initializeLucia } from '$lib/server/auth';

export async function GET({ cookies, platform, url }) {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = cookies.get('github_oauth_state') ?? null;

	if (!code || !state || !storedState || state !== storedState) {
		return new Response(null, { status: 400 });
	}

	try {
		const tokens = await github.validateAuthorizationCode(code);
		const githubUserResponse = await fetch('https://api.github.com/user', {
			headers: { Authorization: `Bearer ${tokens.accessToken}` }
		});
		const githubUser: GitHubUser = await githubUserResponse.json();

		const sql = 'SELECT * FROM user WHERE github_id = ?';
		const stmt = platform!.env.AUTH_DB.prepare(sql).bind(githubUser.id);
		const existingUser = await stmt.first<UserRow>();

		const lucia = initializeLucia(platform!.env.AUTH_DB);

		if (existingUser) {
			const session = await lucia.createSession(existingUser.id, {});
			const sessionCookie = lucia.createSessionCookie(session.id);
			cookies.set(sessionCookie.name, sessionCookie.value, {
				path: '.',
				...sessionCookie.attributes
			});
		} else {
			const userId = generateIdFromEntropySize(10); // 16 characters long

			const sql = 'INSERT INTO user (id, github_id, username) VALUES (?1, ?2, ?3)';
			const stmt = platform!.env.AUTH_DB.prepare(sql).bind(userId, githubUser.id, githubUser.login);
			await stmt.run();

			const session = await lucia.createSession(userId, {});
			const sessionCookie = lucia.createSessionCookie(session.id);
			cookies.set(sessionCookie.name, sessionCookie.value, {
				path: '.',
				...sessionCookie.attributes
			});
		}

		return new Response(null, {
			status: 302,
			headers: { Location: '/' }
		});
	} catch (err) {
		if (err instanceof OAuth2RequestError) {
			return new Response(null, { status: 400 }); // Invalid code
		}

		return new Response('Unspecified error', { status: 500 });
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
