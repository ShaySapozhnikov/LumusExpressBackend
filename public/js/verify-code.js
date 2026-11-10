// /verify-email and /forgot-password: nicer code boxes, resend cooldown, show/hide password.
// The forms work without this; it only improves typing and feedback.
(function () {
	// ---------- busy buttons ----------
	document.querySelectorAll('[data-busy-form]').forEach(function (form) {
		form.addEventListener('submit', function () {
			const button = form.querySelector('[data-busy-label]');
			if (!button) return;
			button.disabled = true;
			button.textContent = button.dataset.busyLabel;
		});
	});

	// ---------- code boxes ----------
	const codeForm = document.querySelector('[data-code-form]');
	if (codeForm) {
		const inputs = Array.from(codeForm.querySelectorAll('.codeInput'));
		const submit = codeForm.querySelector('.submitButton');
		const length = inputs.length;

		// the first box allows the whole code for autofill, the rest only one character
		inputs.forEach(function (input) { input.maxLength = length; });

		const clean = function (value) { return value.toUpperCase().replace(/[^A-Z0-9]/g, ''); };
		const isComplete = function () { return inputs.every(function (input) { return input.value.length === 1; }); };
		const update = function () { submit.disabled = !isComplete(); };

		function clearError() {
			const error = codeForm.querySelector('#code-error');
			if (error) error.remove();
			inputs.forEach(function (input) {
				input.removeAttribute('aria-invalid');
				input.removeAttribute('aria-describedby');
			});
		}

		// spreads typed/pasted characters across the boxes starting at index
		function fillFrom(index, value) {
			const chars = clean(value).slice(0, length - index).split('');
			if (!chars.length) {
				inputs[index].value = '';
				update();
				return;
			}
			chars.forEach(function (c, i) { inputs[index + i].value = c; });
			clearError();
			inputs[Math.min(index + chars.length, length - 1)].focus();
			update();
		}

		inputs.forEach(function (input, index) {
			input.addEventListener('input', function () {
				if (!input.value) { update(); return; }
				fillFrom(index, input.value);
			});

			input.addEventListener('keydown', function (event) {
				if (event.key === 'Backspace' && !input.value && index > 0) {
					event.preventDefault();
					inputs[index - 1].value = '';
					inputs[index - 1].focus();
					update();
				} else if (event.key === 'ArrowLeft' && index > 0) {
					event.preventDefault();
					inputs[index - 1].focus();
				} else if (event.key === 'ArrowRight' && index < length - 1) {
					event.preventDefault();
					inputs[index + 1].focus();
				}
			});

			input.addEventListener('paste', function (event) {
				const text = event.clipboardData ? event.clipboardData.getData('text') : '';
				if (!text) return;
				event.preventDefault();
				fillFrom(index, text);
			});

			input.addEventListener('focus', function () { input.select(); });
		});

		update();
		const firstEmpty = inputs.find(function (input) { return !input.value; });
		(firstEmpty || inputs[0]).focus();
	}

	// ---------- resend cooldown ----------
	const resend = document.querySelector('[data-resend]');
	if (resend && resend.dataset.cooldown) {
		let left = Number(resend.dataset.cooldown);
		const tick = function () {
			if (left <= 0) {
				resend.disabled = false;
				resend.textContent = 'resend code';
				return;
			}
			resend.disabled = true;
			resend.textContent = 'resend in ' + left + 's';
			left -= 1;
			setTimeout(tick, 1000);
		};
		tick();
	}
	if (resend) {
		resend.form.addEventListener('submit', function () { resend.disabled = true; });
	}

	// ---------- show / hide password ----------
	const toggle = document.querySelector('[data-toggle-password]');
	if (toggle) {
		const fields = toggle.form.querySelectorAll('input[name="password"], input[name="confirmPassword"]');
		toggle.hidden = false;
		toggle.addEventListener('click', function () {
			const show = toggle.getAttribute('aria-pressed') !== 'true';
			toggle.setAttribute('aria-pressed', String(show));
			toggle.textContent = show ? 'Hide' : 'Show';
			fields.forEach(function (field) { field.type = show ? 'text' : 'password'; });
		});
	}
})();
