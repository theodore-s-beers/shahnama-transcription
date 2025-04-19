import type { RequestHandler } from "@sveltejs/kit";
import { maxPages, type Line } from "$lib/utils";

export const GET: RequestHandler = async ({ locals, platform, request }) => {
	// Same origin only (if origin is provided)
	const origin = request.headers.get("origin");
	if (origin && origin !== "https://shahnama-transcription.pages.dev") {
		return new Response("Invalid origin", { status: 403 });
	}

	// Committers only
	const editor = locals.user?.shortName;
	if (!editor) return new Response("User not authorized", { status: 403 });

	// Volume and page required as query params
	const params = new URL(request.url).searchParams;
	const [volParam, pgParam] = [params.get("vol"), params.get("pg")];
	if (!volParam || !pgParam) return new Response("Missing volume or page", { status: 400 });

	// Volume and page must be valid
	const vol = parseInt(volParam);
	if (vol < 1 || vol > 8) return new Response("Invalid volume", { status: 400 });
	const pg = parseInt(pgParam);
	if (pg < 3 || pg > maxPages[vol]) return new Response("Invalid page", { status: 400 });

	const db = platform!.env.DB;

	const sql = `
    	SELECT
      		number_within_page,
      		is_heading,
			has_notes,
			number_listed,
      		heading_text,
      		hemistich_one_text,
      		hemistich_two_text
    	FROM line_simplified
    	WHERE volume_number = $1 AND page_number = $2 AND editor = $3
    	ORDER BY number_within_page;
  	`;

	const stmt = db.prepare(sql).bind(vol, pg, editor);
	const { results } = await stmt.all<RawLine>();

	if (results.length === 0) return new Response("No transcription found", { status: 404 });

	const lines: Line[] = results.map((row) => ({
		numberWithinPage: row.number_within_page,
		isHeading: !!row.is_heading,
		hasNotes: !!row.has_notes,
		numberListed: row.number_listed ?? undefined,
		headingText: row.heading_text ?? undefined,
		hemistichOne: row.hemistich_one_text ?? undefined,
		hemistichTwo: row.hemistich_two_text ?? undefined,
	}));

	return new Response(JSON.stringify(lines), {
		status: 200,
		headers: { "content-type": "application/json" },
	});
};

interface RawLine {
	number_within_page: number;
	is_heading: number;
	has_notes: number;
	number_listed: number | null;
	heading_text: string | null;
	hemistich_one_text: string | null;
	hemistich_two_text: string | null;
}
