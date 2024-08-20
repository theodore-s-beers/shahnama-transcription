//
// TYPES
//

/*
id INTEGER NOT NULL PRIMARY KEY,
volume_number INTEGER NOT NULL,
page_number INTEGER NOT NULL,
number_within_page INTEGER NOT NULL,
editor TEXT NOT NULL,
FOREIGN KEY (editor) REFERENCES user(short_name),
heading INTEGER NOT NULL,
heading_text TEXT,
number_listed INTEGER,
hemistich_one_text TEXT,
hemistich_one_notes INTEGER,
hemistich_two_text TEXT,
hemistich_two_notes INTEGER
*/

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
