import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	return {
		username: locals.user?.username,
		shortName: locals.user?.shortName,
	};
};
