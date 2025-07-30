// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: import("$lib/server/auth").User | null;
			session: import("$lib/server/auth").Session | null;
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			cf: CfProperties;
			ctx: ExecutionContext;
			env: { DB: D1Database };
		}
	}
}

export {};
