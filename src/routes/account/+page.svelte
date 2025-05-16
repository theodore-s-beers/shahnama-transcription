<script lang="ts">
	import { onMount } from "svelte";
	import type { PageProps } from "./$types";
	import type { PageNumber } from "$lib/utils";

	let { data }: PageProps = $props();
	const shortName = data.shortName;

	let myPages: PageNumber[] = $state([]);

	onMount(async () => {
		try {
			const res = await fetch("/api/submitted-pages");
			if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
			myPages = await res.json();
		} catch (err) {
			if (err instanceof Error) console.error(err.message);
			else console.error(err);
		}
	});
</script>

<svelte:head>
	<title>User Account: {shortName}</title>
</svelte:head>

<div class="mx-auto max-w-7xl p-4 pb-8 text-lg">
	<div class="mb-3 flex justify-end">
		<div class="mr-8"><a href="/" class="text-blue-800 hover:underline">Home</a></div>
		<div><a href="/logout" class="text-blue-800 hover:underline">Sign out</a></div>
	</div>

	<div class="mb-6 text-4xl">User Account: <span class="text-green-700">{shortName}</span></div>

	<div class="mb-4">Pages you have submitted (and can always update if needed):</div>

	<ul class="list-inside list-disc">
		{#each myPages as { vol, pg } (`${vol}-${pg}`)}
			<li>
				<a href={`/${vol}/${pg}`} class="text-blue-800 hover:underline">vol. {vol}, pg. {pg}</a>
			</li>
		{/each}
	</ul>
</div>
