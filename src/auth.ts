import { SvelteKitAuth } from '@auth/sveltekit';
import GitHub from '@auth/sveltekit/providers/github';

export const { handle, signIn } = SvelteKitAuth({
	providers: [GitHub],
	callbacks: {
		signIn({ profile }) {
			if (!profile || !profile.given_name) {
				return false;
			}

			if (profile.given_name.includes('Theo')) {
				return true;
			}

			return false;
		}
	}
});
