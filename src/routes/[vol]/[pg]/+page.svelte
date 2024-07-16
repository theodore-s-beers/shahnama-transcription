<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { maxPages, type Line } from '$lib/utils';

	$: vol = $page.params.vol;
	$: volNumber = parseInt(vol);

	$: pg = $page.params.pg;
	$: pgNumber = parseInt(pg);

	let lines: Line[] = [];
	let lineCount = 0;
	let lineCountConfirmed = false;

	function confirmLineCount() {
		if (lineCount < 1 || lineCount > 25) {
			return;
		}

		lineCountConfirmed = true;
		showTranscription = true;

		lines = Array.from({ length: lineCount }, (_, i) => ({
			heading: false,
			numberWithinPage: i + 1,
			hemistichOne: { text: '', hasNotes: false },
			hemistichTwo: { text: '', hasNotes: false }
		}));

		localStorage.setItem(`lineCount-${volNumber}-${pgNumber}`, lineCount.toString());
		localStorage.setItem(`lines-${volNumber}-${pgNumber}`, JSON.stringify(lines));
	}

	let showTranscription = false;

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === '\\' && lineCountConfirmed) {
			showTranscription = !showTranscription;
		}
	}

	function resetLines() {
		lineCountConfirmed = false;
		lineCount = 0;
		showTranscription = false;
		lines = [];

		localStorage.removeItem(`lineCount-${volNumber}-${pgNumber}`);
		localStorage.removeItem(`lines-${volNumber}-${pgNumber}`);
	}

	function downloadLines() {
		const linesFixed = lines.map((line) => {
			if (line.heading) {
				return {
					heading: true,
					headingText: line.headingText,
					numberWithinPage: line.numberWithinPage
				};
			} else {
				return line;
			}
		});

		const data = JSON.stringify(linesFixed, null, 2);
		const blob = new Blob([data], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `vol${volNumber}-pg${pgNumber}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	onMount(() => {
		if (!volNumber || volNumber < 1 || volNumber > 8) {
			goto('/');
		}

		if (!pgNumber || pgNumber < 3 || pgNumber > maxPages[volNumber]) {
			goto('/');
		}

		const storedLineCount = localStorage.getItem(`lineCount-${volNumber}-${pgNumber}`);
		if (storedLineCount) {
			lineCount = parseInt(storedLineCount);
			lineCountConfirmed = true;
			showTranscription = true;
		}

		const storedLines = localStorage.getItem(`lines-${volNumber}-${pgNumber}`);
		if (storedLines) {
			lines = JSON.parse(storedLines);
		} else if (lineCountConfirmed) {
			lines = Array.from({ length: lineCount }, (_, i) => ({
				heading: false,
				numberWithinPage: i + 1,
				hemistichOne: { text: '', hasNotes: false },
				hemistichTwo: { text: '', hasNotes: false }
			}));
		}
	});
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="mx-auto max-w-7xl p-4 text-lg">
	<div class="mb-2 flex justify-center">
		<a href="/" class="text-blue-800 hover:underline">Home</a>
	</div>

	<div class="mb-6 text-4xl">
		{@html `Transcribe the <em>Shāhnāma</em> – vol. ${volNumber}, pg. ${pgNumber}`}
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
			on:keydown={(e) => {
				if (e.key === 'Enter') confirmLineCount();
			}}
		/>
		<button
			class="rounded border bg-blue-700 px-3 py-2 text-white"
			class:bg-gray-600={lineCountConfirmed}
			on:click={confirmLineCount}
			disabled={lineCountConfirmed}>Set</button
		>
	</div>

	{#if lineCountConfirmed && showTranscription}
		<div class="-mt-2 mb-6 ml-16 flex gap-4">
			<button on:click={downloadLines} class="rounded bg-green-800 px-3 py-2 text-white"
				>Download</button
			>
			<button on:click={resetLines} class="rounded bg-red-800 px-3 py-2 text-white">Reset</button>
		</div>

		<hr class="mb-6 border border-dashed border-black" />

		{#each lines as line, i}
			<div class="flex items-center">
				<div class="w-9 font-semibold">{i + 1}</div>

				<div
					class="mb-4 flex grow items-center gap-4 rounded border border-black bg-white p-4"
					dir="rtl"
					spellcheck="false"
					on:change={() =>
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
			src={`/km/${volNumber}-${String(pgNumber).padStart(3, '0')}.png`}
			alt="Go fuck yourself"
			class="rounded border border-black"
		/>
	{/if}
</div>
