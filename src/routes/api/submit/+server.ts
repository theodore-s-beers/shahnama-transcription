import type { RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request, locals }) => {
	const origin = request.headers.get("origin");
	if (!origin || origin !== "https://shahnama-transcription.pages.dev") {
		return new Response("Forbidden", { status: 403 });
	}

	const user = locals.user;
	if (!user || typeof user.shortName !== "string" || user.shortName.length === 0) {
		return new Response("Forbidden", { status: 403 });
	}

	// Implement logic later

	return new Response("Success", { status: 200 });
};
