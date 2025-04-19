import type { RequestHandler } from "@sveltejs/kit";
import { maxPages, type Line } from "$lib/utils";

export const POST: RequestHandler = async ({ locals, platform, request }) => {
	// Same origin only
	const origin = request.headers.get("origin");
	if (!origin || origin !== "https://shahnama-transcription.pages.dev") {
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

	// Request JSON must be a non-empty array
	const data = await request.json();
	if (!Array.isArray(data) || data.length === 0) {
		return new Response("Invalid data format", { status: 400 });
	}

	// Validate lines (to some extent)
	const lines: Line[] = data;
	for (const line of lines) {
		if (line.isHeading) {
			if (!line.headingText) return new Response("Missing heading text", { status: 400 });
			else continue;
		}

		if (!line.hemistichOne) return new Response("Missing first hemistich", { status: 400 });
		if (!line.hemistichTwo) return new Response("Missing second hemistich", { status: 400 });

		if (typeof line.numberListed === "number") {
			if (line.numberListed === 0 || line.numberListed % 5 !== 0)
				return new Response("Invalid listed line number", { status: 400 });
		}
	}

	const db = platform!.env.DB;

	// Check number of lines for this page/editor currently in DB
	// This is to handle a niche case where a user submits a page with fewer lines
	// than previously submitted. We then need to delete the existing lines before
	// inserting the new ones. Otherwise orphan lines would be left in the DB.

	const checkSql = `
    	SELECT COUNT(*)
    	FROM line_simplified
    	WHERE volume_number = ?1 AND page_number = ?2 AND editor = ?3;
  	`;

	const checkStmt = db.prepare(checkSql).bind(vol, pg, editor);
	const currentCount = await checkStmt.first<number>();

	if (currentCount && currentCount > lines.length) {
		const deleteSql = `
      		DELETE FROM line_simplified
      		WHERE volume_number = ?1 AND page_number = ?2 AND editor = ?3;
    	`;

		const deleteStmt = db.prepare(deleteSql).bind(vol, pg, editor);
		const { success } = await deleteStmt.run();
		if (!success) return new Response("Failed to delete existing lines", { status: 500 });
	}

	// Proceeding with business as usual...

	const upsertSql = `
    	INSERT INTO line_simplified (
      		volume_number, page_number, number_within_page,
      		editor, is_heading, has_notes, number_listed,
			heading_text, hemistich_one_text, hemistich_two_text 
    	)
    	VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
    	ON CONFLICT (volume_number, page_number, number_within_page, editor)
    	DO UPDATE SET
      		is_heading = excluded.is_heading,
			has_notes = excluded.has_notes,
			number_listed = excluded.number_listed,
      		heading_text = excluded.heading_text,
      		hemistich_one_text = excluded.hemistich_one_text,
      		hemistich_two_text = excluded.hemistich_two_text;
  	`;

	const statements = lines.map((line) =>
		db
			.prepare(upsertSql)
			.bind(
				vol,
				pg,
				line.numberWithinPage,
				editor,
				line.isHeading,
				line.hasNotes,
				line.numberListed ?? null,
				line.headingText ?? null,
				line.hemistichOne ?? null,
				line.hemistichTwo ?? null,
			),
	);

	try {
		await db.batch(statements);
		return new Response(null, { status: 200 }); // Not 201; it's an upsert
	} catch (err) {
		if (err instanceof Error) console.error(err.message);
		else console.error(err);
		return new Response("Failed to save lines to database", { status: 500 });
	}
};
