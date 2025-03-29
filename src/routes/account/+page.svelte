<script lang="ts">
	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();
	const shortName = data.shortName;
</script>

<div class="mx-auto max-w-7xl p-4 text-lg">
	<div class="mb-6 text-4xl">User Account: {shortName}</div>

	<div>Want to <a href="/logout" class="text-blue-800 hover:underline">log out</a>?</div>
</div>
