import { SESSION_COOKIE_NAME, getUserById, validateSessionToken } from "$lib/server/auth";
import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get(SESSION_COOKIE_NAME);

	if (!sessionToken) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const session = await validateSessionToken(event.platform!.env.DB, sessionToken);

	if (!session) {
		event.cookies.delete(SESSION_COOKIE_NAME, { path: "/" });
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const user = await getUserById(event.platform!.env.DB, session.userId);

	if (!user) {
		event.cookies.delete(SESSION_COOKIE_NAME, { path: "/" });
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	event.locals.user = user;
	event.locals.session = session;
	return resolve(event);
};
