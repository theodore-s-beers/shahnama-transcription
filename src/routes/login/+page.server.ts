import { redirect } from "@sveltejs/kit";
import { generateState } from "arctic";
import { github } from "$lib/server/auth";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) return redirect(302, "/");
};

export const actions = {
	default: async (event) => {
		if (event.locals.session) return redirect(302, "/");

		const state = generateState();
		const scopes = ["read:user"];
		const url = github.createAuthorizationURL(state, scopes);

		event.cookies.set("github_oauth_state", state, {
			path: "/",
			secure: import.meta.env.PROD,
			httpOnly: true,
			maxAge: 60 * 10,
			sameSite: "lax",
		});

		return redirect(302, url.toString());
	},
} satisfies Actions;
