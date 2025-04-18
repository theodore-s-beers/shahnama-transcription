<script lang="ts">
	import toast, { Toaster } from "svelte-french-toast";
	import { onMount } from "svelte";
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import {
		createLinesSimplified,
		maxPages,
		normalizeLinesSimplified,
		type LineSimplified,
	} from "$lib/utils";
	import type { PageProps } from "./$types";

	const volNumber = parseInt(page.params.vol);
	const pgNumber = parseInt(page.params.pg);

	let lineCount = $state(0);
	let lineCountConfirmed = $state(false);
	let lines: LineSimplified[] = $state([]);
	let transcriptionFirst = $state(false);
	let savedLines = $state(false);

	let { data }: PageProps = $props();
	const committer = typeof data.shortName === "string" && data.shortName.length > 0;

	function confirmLineCount() {
		if (lineCount < 1 || lineCount > 25) return;

		lineCountConfirmed = true;
		transcriptionFirst = true;
		lines = createLinesSimplified(lineCount);

		localStorage.setItem(`lineCount-${volNumber}-${pgNumber}`, lineCount.toString());
		localStorage.setItem(`lines-${volNumber}-${pgNumber}`, JSON.stringify(lines));
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "\\" && lineCountConfirmed) transcriptionFirst = !transcriptionFirst;
	}

	function resetLines() {
		[lineCount, lineCountConfirmed] = [0, false];
		lines = [];
		transcriptionFirst = false;

		localStorage.removeItem(`lineCount-${volNumber}-${pgNumber}`);
		localStorage.removeItem(`lines-${volNumber}-${pgNumber}`);
	}

	// Non-committers can download transcriptions in JSON
	function downloadLines() {
		lines = normalizeLinesSimplified(lines);
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
		lines = normalizeLinesSimplified(lines);

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
			savedLines = true;
			toast.success("Transcription saved successfully");
		} catch (err) {
			if (err instanceof Error) console.error(err.message);
			else console.error(err);
			toast.error("Failed to save (see console)");
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

			const res = await fetch(`/api/saved-page?${params}`);
			if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);

			const dbLines: LineSimplified[] = await res.json();
			lines = dbLines;

			lineCount = lines.length;
			lineCountConfirmed = true;
			transcriptionFirst = true;
			savedLines = true;

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

		const storedLines: LineSimplified[] = JSON.parse(lsLines);
		if (storedLines.length === 0 || storedLines.length !== storedLineCount) {
			resetLines();
			return;
		}

		// If all looks good...
		[lineCount, lineCountConfirmed] = [storedLineCount, true];
		lines = storedLines;
		transcriptionFirst = true;
	});
</script>

<svelte:window on:keydown={handleKeydown} />

<svelte:head>
	<title>Transcribe the Shāhnāma – vol. {volNumber}, pg. {pgNumber}</title>
</svelte:head>

<Toaster />

<div class="mx-auto p-4 pb-6 text-lg">
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
		<div class="mb-6 italic">
			<p class="2xl:hidden">
				To swap the positions of the page image and the transcription:
				<strong class="not-italic">\</strong>
			</p>
			<p>
				To change the line count after setting it, you must clear your current work on this page.
			</p>
		</div>
	{/if}

	<div class="mb-6 flex items-center">
		<label for="lines-count" class="w-16 font-semibold">Lines</label>
		<input
			id="lines-count"
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

	{#if lineCountConfirmed}
		<div class="-mt-2 mb-6 ml-16 flex items-center gap-4">
			<button
				onclick={committer ? submitLines : downloadLines}
				class="cursor-pointer rounded bg-green-800 px-3 py-2 text-white"
			>
				{committer ? "Save" : "Download"}
			</button>

			<button onclick={resetLines} class="cursor-pointer rounded bg-red-800 px-3 py-2 text-white">
				Clear
			</button>

			{#if savedLines}
				<div>(“Save” updates the DB; “Clear” affects <em>only</em> current work.)</div>
			{/if}
		</div>
	{/if}

	<hr class="mb-6 border border-dashed border-black" />

	{#if !transcriptionFirst}
		<div class="2xl:hidden">
			<img
				src={`/km/${volNumber}-${String(pgNumber).padStart(3, "0")}.png`}
				alt="A page from the Shāhnāma"
				class="rounded border border-black"
			/>
			<hr class="my-6 border border-dashed border-black" />
		</div>
	{/if}

	<div class="2xl:flex 2xl:gap-4">
		{#if lineCountConfirmed}
			<div class="w-full space-y-4 2xl:w-1/2">
				{#each lines as line, i (line.numberWithinPage)}
					<div class="flex items-center">
						<div class="w-9 font-semibold">{i + 1}</div>

						<div
							class="flex grow items-center gap-4 rounded border border-black bg-white p-4 pb-3"
							dir="rtl"
							spellcheck="false"
							onchange={() =>
								localStorage.setItem(`lines-${volNumber}-${pgNumber}`, JSON.stringify(lines))}
						>
							<div class="flex flex-col">
								<input
									type="checkbox"
									id={`heading-check-${line.numberWithinPage}`}
									bind:checked={line.isHeading}
								/>
								<label for={`heading-check-${line.numberWithinPage}`}>ع</label>
							</div>

							{#if line.isHeading}
								<div class="flex grow flex-col">
									<input
										id={`heading-text-${line.numberWithinPage}`}
										type="text"
										class="rounded border border-black p-2"
										bind:value={line.headingText}
									/>
									<label for={`heading-text-${line.numberWithinPage}`} class="self-center">
										عنوان
									</label>
								</div>

								<div class="flex flex-col">
									<input
										id={`has-notes-${line.numberWithinPage}`}
										type="checkbox"
										bind:checked={line.hasNotes}
									/>
									<label for={`has-notes-${line.numberWithinPage}`}>پ</label>
								</div>
							{:else}
								<div class="flex flex-col">
									<input
										id={`line-number-${line.numberWithinPage}`}
										type="number"
										class="w-20 rounded border border-black p-2 invalid:bg-red-100"
										min="5"
										max="995"
										step="5"
										dir="ltr"
										bind:value={line.numberListed}
									/>
									<label for={`line-number-${line.numberWithinPage}`} class="self-center">ش</label>
								</div>

								<div class="flex grow flex-col">
									<input
										id={`hem-one-${line.numberWithinPage}`}
										type="text"
										class="rounded border border-black p-2"
										bind:value={line.hemistichOne}
									/>
									<label for={`hem-one-${line.numberWithinPage}`} class="self-center">م ا</label>
								</div>

								<div class="flex grow flex-col">
									<input
										id={`hem-two-${line.numberWithinPage}`}
										type="text"
										class="rounded border border-black p-2"
										bind:value={line.hemistichTwo}
									/>
									<label for={`hem-two-${line.numberWithinPage}`} class="self-center">م د</label>
								</div>

								<div class="flex flex-col">
									<input
										id={`has-notes-${line.numberWithinPage}`}
										type="checkbox"
										bind:checked={line.hasNotes}
									/>
									<label for={`has-notes-${line.numberWithinPage}`}>پ</label>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<img
			src={`/km/${volNumber}-${String(pgNumber).padStart(3, "0")}.png`}
			alt="A page from the Shāhnāma"
			class="hidden 2xl:mx-auto 2xl:block 2xl:h-full 2xl:w-1/2 2xl:rounded 2xl:border 2xl:border-black"
		/>
	</div>

	{#if transcriptionFirst}
		<div class="2xl:hidden">
			<hr class="my-6 border border-dashed border-black" />
			<img
				src={`/km/${volNumber}-${String(pgNumber).padStart(3, "0")}.png`}
				alt="A page from the Shāhnāma"
				class="rounded border border-black 2xl:hidden"
			/>
		</div>
	{/if}
</div>
