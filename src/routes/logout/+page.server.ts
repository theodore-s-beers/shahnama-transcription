import { fail, redirect } from '@sveltejs/kit';
import { initializeLucia } from '$lib/server/auth';

export const load = async ({ locals }) => {
	if (!locals.user) {
		return redirect(302, '/login');
	}

	return {};
};

export const actions = {
	default: async (event) => {
		if (!event.locals.session) {
			return fail(401);
		}

		const lucia = initializeLucia(event.platform!.env.AUTH_DB);
		await lucia.invalidateSession(event.locals.session.id);

		const sessionCookie = lucia.createBlankSessionCookie();
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});

		return redirect(302, '/');
	}
};
