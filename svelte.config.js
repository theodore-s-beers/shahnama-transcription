import cloudflareAdapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: cloudflareAdapter({
			routes: {
				exclude: ['<build>', '<prerendered>', '/*.png']
			}
		})
	}
};

export default config;
