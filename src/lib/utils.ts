//
// TYPES
//

export interface Line {
	heading: boolean;
	headingText?: string;
	numberWithinPage: number;
	numberListed?: number;
	hemistichOne: Hemistich;
	hemistichTwo: Hemistich;
}

interface Hemistich {
	text?: string;
	hasNotes?: boolean;
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
		const newLine: Line = line.heading
			? {
					heading: true,
					headingText: line.headingText,
					numberWithinPage: line.numberWithinPage,
					hemistichOne: {},
					hemistichTwo: {},
				}
			: {
					heading: false,
					numberWithinPage: line.numberWithinPage,
					numberListed: line.numberListed,
					hemistichOne: line.hemistichOne.text
						? { ...line.hemistichOne, text: cleanString(line.hemistichOne.text) }
						: {},
					hemistichTwo: line.hemistichTwo.text
						? { ...line.hemistichTwo, text: cleanString(line.hemistichTwo.text) }
						: {},
				};

		cleaned.push(newLine);
	}

	return cleaned;
}

export function validSelection(vol: number, pg: number): boolean {
	return vol >= 1 && vol <= 8 && pg >= 3 && pg <= maxPages[vol];
}

function cleanString(input: string): string {
	return input.trim().replace(/\p{White_Space}+/gu, " ");
}
