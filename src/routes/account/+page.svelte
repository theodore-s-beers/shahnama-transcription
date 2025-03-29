<script lang="ts">
	import { onMount } from "svelte";
	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();
	const shortName = data.shortName;

	interface PageNumber {
		vol: string; // Number (which will be parsed) or "N/A"
		pg: string; // Number (which will be parsed) or "N/A"
	}

	let myPages: PageNumber[] = $state([]);

	onMount(() => {
		if (myPages.length === 0) {
			myPages.push({ vol: "N/A", pg: "N/A" }, { vol: "N/A", pg: "N/A" });
		}
	});
</script>

<div class="mx-auto max-w-7xl p-4 text-lg">
	<div class="mb-3 flex justify-end">
		<div class="mr-8"><a href="/" class="text-blue-800 hover:underline">Home</a></div>
		<div><a href="/logout" class="text-blue-800 hover:underline">Log out</a>?</div>
	</div>

	<div class="mb-6 text-4xl">User Account: {shortName}</div>

	<div class="mb-4">Pages you have submitted:</div>

	<ul class="list-inside list-disc">
		{#each myPages as { vol, pg } (pg)}
			<li>vol. {vol}, pg. {pg}</li>
		{/each}
	</ul>
</div>
