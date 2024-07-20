import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { generateState } from 'arctic';
import { github } from '$lib/server/auth';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, '/');
	}

	return {};
};

export const actions: Actions = {
	default: async (event) => {
		if (event.locals.session) {
			return redirect(302, '/');
		}

		const state = generateState();
		const url = await github.createAuthorizationURL(state);

		event.cookies.set('github_oauth_state', state, {
			path: '/',
			secure: import.meta.env.PROD,
			httpOnly: true,
			maxAge: 60 * 10,
			sameSite: 'lax'
		});

		return redirect(302, url.toString());
	}
};
