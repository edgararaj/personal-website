function router(pathname) {
	const routes = [
		{ path: "/", html: "" },
		{ path: "/computadores", html: "" },
	];
	pathname = (!pathname || pathname.type == "popstate") ? location.pathname : pathname;
	let route_matched = routes.find(route => route.path == pathname);
	if (pathname != location.pathname) history.pushState(0, 0, route_matched.path);
	const content = document.getElementById("content");
	content.innerHTML = route_matched.html;
}

addEventListener("popstate", router);

document.body.addEventListener("click", e => {
	let target = e.target;
	if (target.tagName != "A" && target.parentNode.tagName == "A")
		target = target.parentNode;

	if (target.matches("[route]")) {
		e.preventDefault();
		router(target.pathname);
	}
});

router();