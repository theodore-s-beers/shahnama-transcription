//
// TYPES
//

export interface Line {
	heading: boolean;
	headingText?: string;
	numberWithinPage: number;
	numberListed?: number;
	hemistichOne?: Hemistich;
	hemistichTwo?: Hemistich;
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
	8: 488
};

//
// FUNCTIONS
//

export function validSelection(vol: number, pg: number): boolean {
	return vol >= 1 && vol <= 8 && pg >= 3 && pg <= maxPages[vol];
}
