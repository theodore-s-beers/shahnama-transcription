import { OAuth2RequestError } from "arctic";
import type { RequestHandler } from "./$types";
import { v7 as uuidv7 } from "uuid";
import { type UserRow, createSession, github } from "$lib/server/auth";

export const GET: RequestHandler = async ({ cookies, platform, url }) => {
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const storedState = cookies.get("github_oauth_state") ?? null;

	if (!code || !state || !storedState || state !== storedState) {
		return new Response(null, { status: 400 });
	}

	try {
		const tokens = await github.validateAuthorizationCode(code);

		const githubUserResponse = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `Bearer ${tokens.accessToken()}`,
				"User-Agent": "Shahnama-Transcription-Alpha",
			},
		});
		const githubUser: GitHubUser = await githubUserResponse.json();

		const sql = "SELECT * FROM user WHERE github_id = ?";
		const stmt = platform!.env.DB.prepare(sql).bind(githubUser.id);
		const existingUser = await stmt.first<UserRow>();

		let userId: string;

		if (existingUser) {
			userId = existingUser.id;
		} else {
			userId = uuidv7();

			const sql = "INSERT INTO user (id, github_id, username) VALUES (?, ?, ?)";
			const stmt = platform!.env.DB.prepare(sql).bind(userId, githubUser.id, githubUser.login);
			await stmt.run();
		}

		const sessionWithToken = await createSession(platform!.env.DB, userId);

		// Does this even work?
		// cookies.set("test_cookie", sessionWithToken.token, { path: "/" });

		// Minimal options, for debugging
		cookies.set("session_token", sessionWithToken.token, { path: "/" });

		return new Response(null, {
			status: 302,
			headers: { Location: "/" },
		});
	} catch (err) {
		if (err instanceof OAuth2RequestError) {
			return new Response(null, { status: 400 });
		}

		if (err instanceof Error) {
			return new Response(JSON.stringify({ message: err.message, stack: err.stack }), {
				status: 500,
				headers: { "Content-Type": "application/json" },
			});
		}

		return new Response("Unknown error", { status: 500 });
	}
};

interface GitHubUser {
	id: number;
	login: string;
}
