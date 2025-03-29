import type { RequestHandler } from "@sveltejs/kit";
import type { PageNumber } from "$lib/utils";

export const GET: RequestHandler = async ({ locals, platform }) => {
	// Committers only
	const editor = locals.user?.shortName;
	if (!editor) return new Response("User not authorized", { status: 403 });

	const db = platform!.env.DB;

	const sql = `
	  SELECT DISTINCT volume_number AS vol, page_number AS pg
		FROM line
		WHERE editor = ?;
	`;

	const stmt = db.prepare(sql).bind(editor);
	const { results } = await stmt.all<PageNumber>();

	if (results.length === 0) return new Response("No pages found", { status: 404 });

	return new Response(JSON.stringify(results), {
		status: 200,
		headers: { "content-type": "application/json" },
	});
};
