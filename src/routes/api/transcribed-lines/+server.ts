import type { RequestHandler } from "@sveltejs/kit";
import { validSelection } from "$lib/utils";

export const GET: RequestHandler = async ({ platform, request }) => {
	// Allowed origins only (if origin is provided)
	// I will probably remove this restriction later
	const origin = request.headers.get("origin");
	if (origin && !allowedOrigins.includes(origin)) {
		return new Response("Invalid origin", { status: 403 });
	}

	// Required params:
	//   - start vol.
	//   - start pg.
	//   - start line
	//   - end vol.
	//   - end pg.
	//   - end line
	//   - editor

	const params = new URL(request.url).searchParams;

	const [
		startVolParam,
		startPgParam,
		startLineParam,
		endVolParam,
		endPgParam,
		endLineParam,
		editor,
	] = [
		params.get("start-vol"),
		params.get("start-pg"),
		params.get("start-line"),
		params.get("end-vol"),
		params.get("end-pg"),
		params.get("end-line"),
		params.get("editor"),
	];

	if (
		!startVolParam ||
		!startPgParam ||
		!startLineParam ||
		!endVolParam ||
		!endPgParam ||
		!endLineParam ||
		!editor
	) {
		return new Response("Missing at least one required parameter", { status: 400 });
	}

	// Volume, page, and line numbers must be valid

	const startVol = parseInt(startVolParam);
	const startPg = parseInt(startPgParam);
	if (!validSelection(startVol, startPg))
		return new Response("Invalid start volume or page", { status: 400 });

	const endVol = parseInt(endVolParam);
	const endPg = parseInt(endPgParam);
	if (!validSelection(endVol, endPg))
		return new Response("Invalid end volume or page", { status: 400 });

	const startLine = parseInt(startLineParam);
	const endLine = parseInt(endLineParam);
	if (startLine < 1 || startLine > 25 || endLine < 1 || endLine > 25)
		return new Response("Invalid start or end line number", { status: 400 });

	// If we made it this far, we need the DB
	const db = platform!.env.DB;

	// Editor must be valid

	const editorSql = "SELECT EXISTS ( SELECT 1 FROM line_simplified WHERE editor = ? ) AS 'exists';";
	const editorStmt = db.prepare(editorSql).bind(editor);

	const editorResult = await editorStmt.first<{ exists: number }>();
	const validEditor = editorResult?.exists === 1;
	if (!validEditor) return new Response("No transcription found for editor", { status: 404 });

	const lineSql = `
		SELECT *
		FROM line_simplified
		WHERE editor = ?
			AND volume_number BETWEEN ? AND ?
			AND page_number BETWEEN ? AND ?
		ORDER BY volume_number, page_number, number_within_page
		LIMIT 1152;
	`;

	const lineStmt = db.prepare(lineSql).bind(editor, startVol, endVol, startPg, endPg);
	const { results } = await lineStmt.all<RawLine>();

	if (results.length === 0) return new Response("No relevant lines found", { status: 404 });

	const lines: ReturnLine[] = results.map((row) => ({
		volumeNumber: row.volume_number,
		pageNumber: row.page_number,
		numberWithinPage: row.number_within_page,
		editor: row.editor,
		isHeading: !!row.is_heading,
		hasNotes: !!row.has_notes,
		numberListed: row.number_listed ?? undefined,
		headingText: row.heading_text ?? undefined,
		hemistichOne: row.hemistich_one_text ?? undefined,
		hemistichTwo: row.hemistich_two_text ?? undefined,
	}));

	// We grabbed whole pages' worth of lines and may need to remove
	// leading or trailing lines from the first or last page, respectively.
	const linesFiltered = lines.filter((line) => {
		if (
			line.volumeNumber === startVol &&
			line.pageNumber === startPg &&
			line.numberWithinPage < startLine
		)
			return false;

		if (
			line.volumeNumber === endVol &&
			line.pageNumber === endPg &&
			line.numberWithinPage > endLine
		)
			return false;

		return true;
	});

	const headers = new Headers({ "content-type": "application/json" });
	if (origin && allowedOrigins.includes(origin)) headers.set("Access-Control-Allow-Origin", origin);

	return new Response(JSON.stringify(linesFiltered), { status: 200, headers: headers });
};

interface RawLine {
	id: number;
	volume_number: number;
	page_number: number;
	number_within_page: number;
	editor: string;
	is_heading: number;
	has_notes: number;
	number_listed: number | null;
	heading_text: string | null;
	hemistich_one_text: string | null;
	hemistich_two_text: string | null;
}

interface ReturnLine {
	volumeNumber: number;
	pageNumber: number;
	numberWithinPage: number;
	editor: string;
	isHeading: boolean;
	hasNotes: boolean;
	numberListed?: number;
	headingText?: string;
	hemistichOne?: string;
	hemistichTwo?: string;
}

const allowedOrigins = [
	"https://transcribe.akvan.dev",
	"https://shahnama-transcription.pages.dev",
	"https://www.theobeers.com",
];
