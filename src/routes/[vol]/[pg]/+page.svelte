<script lang="ts">
	import { onMount } from "svelte";
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import { createLines, maxPages, normalizeLines, type Line } from "$lib/utils";
	import type { PageProps } from "./$types";

	const volNumber = parseInt(page.params.vol);
	const pgNumber = parseInt(page.params.pg);

	let lineCount = $state(0);
	let lineCountConfirmed = $state(false);
	let lines: Line[] = $state([]);
	let showTranscription = $state(false);

	let { data }: PageProps = $props();
	const committer = typeof data.shortName === "string" && data.shortName.length > 0;

	function confirmLineCount() {
		if (lineCount < 1 || lineCount > 25) return;

		lineCountConfirmed = true;
		showTranscription = true;
		lines = createLines(lineCount);

		localStorage.setItem(`lineCount-${volNumber}-${pgNumber}`, lineCount.toString());
		localStorage.setItem(`lines-${volNumber}-${pgNumber}`, JSON.stringify(lines));
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "\\" && lineCountConfirmed) showTranscription = !showTranscription;
	}

	function resetLines() {
		[lineCount, lineCountConfirmed] = [0, false];
		lines = [];
		showTranscription = false;

		localStorage.removeItem(`lineCount-${volNumber}-${pgNumber}`);
		localStorage.removeItem(`lines-${volNumber}-${pgNumber}`);
	}

	// Non-committers can download transcriptions in JSON
	function downloadLines() {
		lines = normalizeLines(lines);
		const data = JSON.stringify(lines, null, 2);
		const blob = new Blob([data], { type: "application/json" });

		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `vol${volNumber}-pg${pgNumber}.json`;

		document.body.appendChild(a);
		a.click();

		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	// Committers can save their transcriptions to the DB
	async function submitLines() {
		lines = normalizeLines(lines);

		try {
			const params = new URLSearchParams({
				vol: volNumber.toString(),
				pg: pgNumber.toString(),
			}).toString();

			const res = await fetch(`/api/submit?${params}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(lines),
			});

			if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
			console.log("Success");
		} catch (err) {
			if (err instanceof Error) console.error(err.message);
			else console.error(err);
		}
	}

	onMount(async () => {
		if (volNumber < 1 || volNumber > 8) return goto("/");
		if (pgNumber < 3 || pgNumber > maxPages[volNumber]) return goto("/");

		try {
			const params = new URLSearchParams({
				vol: volNumber.toString(),
				pg: pgNumber.toString(),
			}).toString();

			const res = await fetch(`/api/submitted-page?${params}`);
			if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);

			const dbLines: Line[] = await res.json();
			lines = dbLines;

			lineCount = dbLines.length;
			lineCountConfirmed = true;
			showTranscription = true;

			localStorage.setItem(`lineCount-${volNumber}-${pgNumber}`, lineCount.toString());
			localStorage.setItem(`lines-${volNumber}-${pgNumber}`, JSON.stringify(lines));

			return;
		} catch (err) {
			if (err instanceof Error && !err.message.startsWith("404")) console.error(err.message);
			else console.error(err);
		}

		// Handle localStorage if the API call came back empty

		const lsLineCount = localStorage.getItem(`lineCount-${volNumber}-${pgNumber}`);
		if (!lsLineCount) {
			resetLines();
			return;
		}

		const storedLineCount = parseInt(lsLineCount);
		if (storedLineCount < 1 || storedLineCount > 25) {
			resetLines();
			return;
		}

		const lsLines = localStorage.getItem(`lines-${volNumber}-${pgNumber}`);
		if (!lsLines) {
			resetLines();
			return;
		}

		const storedLines: Line[] = JSON.parse(lsLines);
		if (storedLines.length === 0 || storedLines.length !== storedLineCount) {
			resetLines();
			return;
		}

		// If all looks good...
		[lineCount, lineCountConfirmed] = [storedLineCount, true];
		lines = storedLines;
		showTranscription = true;
	});
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="mx-auto max-w-7xl p-4 text-lg">
	<div class="mb-3 flex justify-end">
		<div class="mr-8">
			<a href="/" class="text-blue-800 hover:underline">Home</a>
		</div>

		{#if committer}
			<div>
				Signed in: <a href="/account" class="text-green-700 hover:underline">{data.shortName}</a>
			</div>
		{:else if data.username}
			<div>
				Signed in: <a href="/logout" class="text-green-700 hover:underline">{data.username}</a>
			</div>
		{:else}
			<div><a href="/login" class="text-blue-800 hover:underline">Sign in</a></div>
		{/if}
	</div>

	<div class="mb-6 text-4xl">
		Transcribe the <em>Shāhnāma</em> – vol. {volNumber}, pg. {pgNumber}
	</div>

	{#if lineCountConfirmed}
		<div class="mb-6">
			<em>Use the</em> <strong>\</strong>
			<em>key to switch between viewing the page image and the transcription.</em>
		</div>
	{/if}

	<div class="mb-6 flex items-center">
		<label for="lines-count" class="w-16 font-semibold">Lines</label>
		<input
			name="lines-count"
			type="number"
			bind:value={lineCount}
			min="0"
			max="25"
			class="mr-4 w-16 rounded border border-black p-2 invalid:bg-red-100 disabled:bg-green-100"
			disabled={lineCountConfirmed}
			onkeydown={(e) => {
				if (e.key === "Enter") confirmLineCount();
			}}
		/>

		<button
			class="cursor-pointer rounded border bg-blue-700 px-3 py-2 text-white"
			class:bg-gray-600={lineCountConfirmed}
			onclick={confirmLineCount}
			disabled={lineCountConfirmed}
		>
			Set
		</button>
	</div>

	{#if lineCountConfirmed && showTranscription}
		<div class="-mt-2 mb-6 ml-16 flex gap-4">
			<button
				onclick={committer ? submitLines : downloadLines}
				class="cursor-pointer rounded bg-green-800 px-3 py-2 text-white"
			>
				{committer ? "Submit" : "Download"}
			</button>

			<button onclick={resetLines} class="cursor-pointer rounded bg-red-800 px-3 py-2 text-white">
				Reset
			</button>
		</div>

		<hr class="mb-6 border border-dashed border-black" />

		{#each lines as line, i (line.numberWithinPage)}
			<div class="flex items-center">
				<div class="w-9 font-semibold">{i + 1}</div>

				<div
					class="mb-4 flex grow items-center gap-4 rounded border border-black bg-white p-4"
					dir="rtl"
					spellcheck="false"
					onchange={() =>
						localStorage.setItem(`lines-${volNumber}-${pgNumber}`, JSON.stringify(lines))}
				>
					<div class="flex flex-col">
						<input type="checkbox" name="heading-check" bind:checked={line.heading} />
						<label for="heading-check">ع</label>
					</div>
					{#if line.heading}
						<div class="flex grow flex-col">
							<input
								name="heading-text"
								type="text"
								class="rounded border border-black p-2"
								bind:value={line.headingText}
							/>
							<label for="heading-text" class="self-center">عنوان</label>
						</div>
					{:else}
						<div class="flex flex-col">
							<input
								name="line-number"
								type="number"
								class="w-20 rounded border border-black p-2 invalid:bg-red-100"
								min="5"
								max="995"
								step="5"
								dir="ltr"
								bind:value={line.numberListed}
							/>
							<label for="line-number" class="self-center">ش</label>
						</div>
						<div class="flex grow flex-col">
							<input
								name="hem-one-text"
								type="text"
								class="rounded border border-black p-2"
								bind:value={line.hemistichOne!.text}
							/>
							<label for="hem-one-text" class="self-center">مصراع اول</label>
						</div>
						<div class="flex flex-col">
							<input
								name="hem-one-notes"
								type="checkbox"
								bind:checked={line.hemistichOne!.hasNotes}
							/>
							<label for="hem-one-notes">ح</label>
						</div>
						<div class="flex grow flex-col">
							<input
								name="hem-two-text"
								type="text"
								class="rounded border border-black p-2"
								bind:value={line.hemistichTwo!.text}
							/>
							<label for="hem-two-text" class="self-center">مصراع دوم</label>
						</div>
						<div class="flex flex-col">
							<input
								name="hem-two-notes"
								type="checkbox"
								bind:checked={line.hemistichTwo!.hasNotes}
							/>
							<label for="hem-two-notes">ح</label>
						</div>
					{/if}
				</div>
			</div>
		{/each}
	{/if}

	{#if !showTranscription}
		<hr class="mb-6 border border-dashed border-black" />

		<img
			src={`/km/${volNumber}-${String(pgNumber).padStart(3, "0")}.png`}
			alt="A page from the Shahnama"
			class="rounded border border-black"
		/>
	{/if}
</div>
