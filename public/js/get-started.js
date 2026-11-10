// /get-started: switch between sign in and create account without a reload,
// and show progress on the OAuth buttons and the email form.
(function () {
	const page = document.querySelector('[data-mode]');
	const form = document.querySelector('[data-email-form]');
	if (!page || !form) return;

	const password = form.querySelector('input[name="password"]');
	const submit = form.querySelector('.submitButton');

	function clearErrors() {
		form.querySelectorAll('.fieldError, [data-form-error]').forEach(function (el) { el.remove(); });
		form.querySelectorAll('[aria-invalid]').forEach(function (el) {
			el.removeAttribute('aria-invalid');
			el.removeAttribute('aria-describedby');
		});
	}

	function setMode(mode) {
		const signup = mode === 'signup';
		page.dataset.mode = mode;
		form.elements.mode.value = mode;
		document.title = (signup ? 'Create account' : 'Sign in') + ' | Lumus';

		document.querySelectorAll('[data-signin][data-signup]').forEach(function (el) {
			el.textContent = el.dataset[mode];
		});
		document.querySelectorAll('[data-mode-button]').forEach(function (button) {
			const active = button.dataset.modeButton === mode;
			button.classList.toggle('active', active);
			button.setAttribute('aria-pressed', String(active));
		});
		document.querySelector('[data-mode-toggle]').value = signup ? 'signin' : 'signup';
		document.querySelector('[data-signin-only]').hidden = signup;

		password.autocomplete = signup ? 'new-password' : 'current-password';
		password.placeholder = signup ? 'At least 8 characters' : 'Your password';
		if (signup) password.minLength = 8; else password.removeAttribute('minlength');

		clearErrors();
	}

	document.querySelectorAll('[data-mode-button], [data-mode-toggle]').forEach(function (button) {
		button.addEventListener('click', function (event) {
			event.preventDefault();
			setMode(button.value);
		});
	});

	// email form: block double submits and show what's happening
	form.addEventListener('submit', function () {
		submit.disabled = true;
		submit.setAttribute('aria-busy', 'true');
		submit.textContent = submit.dataset[page.dataset.mode + 'Busy'];
	});

	// OAuth: the link navigates away, just disable the buttons meanwhile
	const providers = document.querySelectorAll('[data-provider]');
	providers.forEach(function (link) {
		link.addEventListener('click', function () {
			providers.forEach(function (other) { other.setAttribute('aria-disabled', 'true'); });
			link.setAttribute('aria-busy', 'true');
			link.querySelector('span').textContent = 'Redirecting to ' + link.dataset.provider + '…';
		});
	});

	// coming back with the back button restores the page from cache, reset the buttons
	window.addEventListener('pageshow', function (event) {
		if (!event.persisted) return;
		providers.forEach(function (link) {
			link.removeAttribute('aria-disabled');
			link.removeAttribute('aria-busy');
			link.querySelector('span').textContent = 'Continue with ' + link.dataset.provider;
		});
		submit.disabled = false;
		submit.removeAttribute('aria-busy');
		submit.textContent = submit.dataset[page.dataset.mode];
	});
})();
