<script lang="ts">
	import { SignIn } from '@auth/sveltekit/components';
</script>

<div class="mx-auto flex h-svh max-w-2xl flex-col items-center justify-center p-4">
	<div class="mb-8 text-lg">In order to use this app, you’ll need to sign in via GitHub OAuth.</div>

	<SignIn provider="github" signInPage="sign-in">
		<span slot="submitButton" class="rounded bg-blue-700 px-4 py-3 text-lg text-white"
			>Sign in with GitHub</span
		>
	</SignIn>
</div>
