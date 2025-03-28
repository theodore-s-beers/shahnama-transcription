//
// TYPES
//

export interface Line {
	heading: boolean;
	headingText?: string;
	numberWithinPage: number;
	numberListed?: number;
	hemistichOne?: Hemistich | null;
	hemistichTwo?: Hemistich | null;
}

interface Hemistich {
	text: string;
	hasNotes: boolean;
}

//
// CONSTANTS
//

export const maxPages: Record<number, number> = {
	1: 358,
	2: 470,
	3: 397,
	4: 374,
	5: 565,
	6: 615,
	7: 629,
	8: 488,
};

//
// FUNCTIONS
//

export function normalizeLines(lines: Line[]): Line[] {
	const cleaned: Line[] = [];
	for (const line of lines) {
		cleaned.push({
			...line,
			headingText: line.headingText ? cleanString(line.headingText) : undefined,
			hemistichOne: line.hemistichOne
				? { text: cleanString(line.hemistichOne.text), hasNotes: line.hemistichOne.hasNotes }
				: null,
			hemistichTwo: line.hemistichTwo
				? { text: cleanString(line.hemistichTwo.text), hasNotes: line.hemistichTwo.hasNotes }
				: null,
		});
	}
	return cleaned;
}

export function validSelection(vol: number, pg: number): boolean {
	return vol >= 1 && vol <= 8 && pg >= 3 && pg <= maxPages[vol];
}

function cleanString(input: string): string {
	return input.trim().replace(/\p{White_Space}+/gu, " ");
}
