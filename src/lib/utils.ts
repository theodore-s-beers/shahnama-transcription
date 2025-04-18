//
// TYPES
//

export interface LineSimplified {
	numberWithinPage: number;
	isHeading: boolean;
	hasNotes: boolean;
	numberListed?: number;
	headingText?: string;
	hemistichOne?: string;
	hemistichTwo?: string;
}

export interface PageNumber {
	vol: number;
	pg: number;
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

export function createLinesSimplified(count: number): LineSimplified[] {
	return Array.from({ length: count }, (_, i) => ({
		numberWithinPage: i + 1,
		isHeading: false,
		hasNotes: false,
		hemistichOne: "",
		hemistichTwo: "",
	}));
}

export function normalizeLinesSimplified(lines: LineSimplified[]): LineSimplified[] {
	return lines.map((line) =>
		line.isHeading
			? {
					numberWithinPage: line.numberWithinPage,
					isHeading: true,
					hasNotes: line.hasNotes,
					headingText: line.headingText ? cleanString(line.headingText) : undefined,
				}
			: {
					numberWithinPage: line.numberWithinPage,
					isHeading: false,
					hasNotes: line.hasNotes,
					numberListed: line.numberListed,
					hemistichOne: line.hemistichOne ? cleanString(line.hemistichOne) : undefined,
					hemistichTwo: line.hemistichTwo ? cleanString(line.hemistichTwo) : undefined,
				},
	);
}

export function validSelection(vol: number, pg: number): boolean {
	return vol >= 1 && vol <= 8 && pg >= 3 && pg <= maxPages[vol];
}

function cleanString(input: string): string {
	return input.trim().replace(/\p{White_Space}+/gu, " ");
}
