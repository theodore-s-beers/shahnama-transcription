import { fail, redirect } from "@sveltejs/kit";
import { deleteSession, SESSION_COOKIE_NAME } from "$lib/server/auth";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return redirect(302, "/login");
};

export const actions = {
	default: async (event) => {
		if (!event.locals.session) return fail(401);

		await deleteSession(event.platform!.env.DB, event.locals.session.id);

		event.cookies.delete(SESSION_COOKIE_NAME, { path: "/" });

		return redirect(302, "/");
	},
} satisfies Actions;
