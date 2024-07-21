export const load = async ({ locals }) => {
	return {
		username: locals.user?.username,
		shortName: locals.user?.shortName
	};
};
