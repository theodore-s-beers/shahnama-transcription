<script lang="ts">
	import { maxPages, validSelection } from '$lib/utils';

	let vol = 1;
	let pg = 3;

	$: link = validSelection(vol, pg) ? `/${vol}/${pg}` : '';

	export let data;
</script>

<div class="mx-auto max-w-7xl p-4 text-lg">
	<div class="mb-2 flex justify-end">
		{#if data.username}
			<div>
				Signed in: <a href="/logout" class="text-green-700 hover:underline">{data.username}</a>
			</div>
		{:else}
			<div><a href="/login" class="text-blue-800 hover:underline">Sign in</a></div>
		{/if}
	</div>

	<div class="mb-6 text-4xl">Transcribe the <em>Shāhnāma</em></div>

	<div class="mb-6">Choose a volume and page.</div>

	<div class="mb-4 flex items-center">
		<label for="vol" class="w-20 font-semibold">Volume</label>
		<input
			name="vol"
			type="number"
			bind:value={vol}
			min="1"
			max="8"
			class="w-14 rounded border border-black p-2 invalid:bg-red-100 disabled:bg-green-100"
		/>
	</div>

	<div class="mb-4 flex items-center">
		<label for="pg" class="w-20 font-semibold">Page</label>
		<input
			name="pg"
			type="number"
			bind:value={pg}
			min="3"
			max={maxPages[vol] || 0}
			class="w-20 rounded border border-black p-2 invalid:bg-red-100 disabled:bg-green-100"
		/>
	</div>

	<a href={link} class="ml-20 flex w-20 justify-center rounded bg-blue-700 py-2 text-white">Open</a>
</div>
