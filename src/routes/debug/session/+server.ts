import { SESSION_COOKIE_NAME, createSession } from "$lib/server/auth";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ cookies, platform }) => {
	// Test session creation
	const testUserId = "test-user-123";

	try {
		const sessionWithToken = await createSession(platform!.env.DB, testUserId);

		const debug = {
			sessionObject: {
				id: sessionWithToken.id,
				userId: sessionWithToken.userId,
				createdAt: sessionWithToken.createdAt,
				token: sessionWithToken.token,
				tokenType: typeof sessionWithToken.token,
				tokenLength: sessionWithToken.token?.length || 0,
			},
			cookieInfo: {
				cookieName: SESSION_COOKIE_NAME,
				allCookies: cookies.getAll(),
			},
		};

		return new Response(JSON.stringify(debug, null, 2), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		return new Response(
			JSON.stringify(
				{
					error: error instanceof Error ? error.message : "Unknown error",
					stack: error instanceof Error ? error.stack : undefined,
				},
				null,
				2,
			),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
