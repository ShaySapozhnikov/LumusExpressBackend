// Landing page: switches between the home / blog / shop views without leaving the page.
// The views are all rendered by the server; this only toggles which one is shown (CSS does the crossfade).
(function () {
	const views = document.querySelectorAll('[data-view]');

	function show(name) {
		views.forEach(function (view) {
			const active = view.dataset.view === name;
			view.classList.toggle('active', active);
			view.inert = !active;
			if (active && view.dataset.title) document.title = view.dataset.title;
		});
		if (name !== 'blog') closePost();
	}

	// blog: open one post / back to the list
	const blogList = document.querySelector('[data-blog-list]');
	function openPost(index) {
		const post = document.querySelector('[data-post="' + index + '"]');
		if (!post || !blogList) return;
		blogList.hidden = true;
		post.hidden = false;
	}
	function closePost() {
		document.querySelectorAll('[data-post]').forEach(function (post) { post.hidden = true; });
		if (blogList) blogList.hidden = false;
	}

	document.addEventListener('click', function (event) {
		const target = event.target.closest('[data-view-link], [data-open-post], [data-close-post]');
		if (!target) return;

		if (target.hasAttribute('data-view-link')) {
			event.preventDefault();
			show(target.dataset.viewLink);
		} else if (target.hasAttribute('data-open-post')) {
			openPost(target.dataset.openPost);
		} else {
			closePost();
		}
	});
})();
