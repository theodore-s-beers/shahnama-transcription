import type { RequestHandler } from "@sveltejs/kit";
import { maxPages, type Line } from "$lib/utils";

export const POST: RequestHandler = async ({ locals, platform, request }) => {
	// Same origin only
	const origin = request.headers.get("origin");
	if (!origin || origin !== "https://shahnama-transcription.pages.dev") {
		return new Response("Invalid origin", { status: 403 });
	}

	// Committers only
	const user = locals.user;
	if (!user || !user.shortName) return new Response("User not authorized", { status: 403 });

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
		if (line.heading) {
			if (!line.headingText) return new Response("Missing heading text", { status: 400 });
			else continue;
		}

		if (!line.hemistichOne.text || typeof line.hemistichOne.hasNotes !== "boolean") {
			return new Response("Missing or invalid first hemistich", { status: 400 });
		}

		if (!line.hemistichTwo.text || typeof line.hemistichTwo.hasNotes !== "boolean") {
			return new Response("Missing or invalid second hemistich", { status: 400 });
		}

		if (typeof line.numberListed === "number") {
			if (line.numberListed === 0 || line.numberListed % 5 !== 0)
				return new Response("Invalid listed line number", { status: 400 });
		}
	}

	const db = platform!.env.DB;

	const sql = `
    INSERT INTO line (
      volume_number, page_number, number_within_page,
      editor, heading, heading_text, number_listed,
      hemistich_one_text, hemistich_one_notes,
      hemistich_two_text, hemistich_two_notes
    )
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
  `;

	const statements = lines.map((line) =>
		db
			.prepare(sql)
			.bind(
				vol,
				pg,
				line.numberWithinPage,
				user.shortName,
				line.heading,
				line.headingText ?? null,
				line.numberListed ?? null,
				line.hemistichOne.text ?? null,
				line.hemistichOne.hasNotes ?? null,
				line.hemistichTwo.text ?? null,
				line.hemistichTwo.hasNotes ?? null,
			),
	);

	try {
		await db.batch(statements);
		return new Response(null, { status: 201 });
	} catch (err) {
		if (err instanceof Error) console.error(err.message);
		else console.error(err);
		return new Response("Failed to save lines to database", { status: 500 });
	}
};
