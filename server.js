const express = require("express");
const path = require("path");
const fs = require("fs");
const WebSocket = require("faye-websocket");
const { spawn, spawnSync } = require("child_process");
const open = require("open");
const sass = require("sass");
const readline = require('readline');

function parsa(to_preprocess, to_output)
{
	const to_process2 = path.join("frontend", to_preprocess);
	const to_output2 = path.join("frontend", "gen", to_output);
	console.log(to_process2, to_output2)
	const proc = spawnSync("utils/parsa.exe", [to_process2, "-o", to_output2]);
	if (proc.stdout != null)
	{
		console.log(proc.stdout.toString());
	}
	console.log(`Exited with code ${proc.status}`);
	return !proc.status
}

function sass_render(filenames)
{
	filenames.forEach(filename => {
		const no_ext = filename.substring(0, filename.lastIndexOf("."));
		try {
			const result = sass.compile(`frontend/${filename}`);
			fs.writeFileSync(`frontend/gen/${no_ext}.css`, result.css.toString());
		}
		catch(err)
		{
			console.log(err)
		}
	});
}

function gen_frontend()
{
	const dir = "frontend";
	const gen_dir = path.join(dir, "gen");
	if (fs.existsSync(gen_dir))
	{
		fs.rmSync(gen_dir, {recursive: true, force: true});
	}
	fs.mkdirSync(gen_dir, {recursive: true});

	fs.readdir(dir, function (err, files) {
		if (err)
		{
			console.error(`Coulnd't list directory ${dir}`);
			return;
		}

		const sass_to_render = []
		files.forEach(function (filename, index) {
			const filepath = path.join(dir, filename);
			fs.stat(filepath, function (err, stat) {
				if (err) {
					console.error(`Coulnd't stat entry ${filepath}`);
					return;
				}

				if (stat.isFile())
				{
					if (filename.includes(".parsa.")) {
						parsa(filename, filename.replace(".parsa.", "."));
					}
					else if (filename.match(".(scss)$"))
					{
						sass_to_render.push(filename);
					}
				}
			})
		})
		sass_render(sass_to_render);
	});
}

const app = express();

app.use("/static", express.static(path.resolve("frontend")));

app.get("/*", function (req, res) {
	res.sendFile(path.resolve("frontend", "index.html"));
});

const port = 5700;
const server = app.listen(port, function () {
	console.log("Generating website...");
	gen_frontend()
	const url = `http://localhost:${port}`;
	console.log(`Server running at ${url}`);
	open(url);
});

let ws;
server.on("upgrade", function (req, socket, head) {
	if (!WebSocket.isWebSocket(req)) return;
	ws = new WebSocket(req, socket, head);
	let wssend = ws.send;
	ws.send = function () {
		console.log("[WEBSOCKET]: Sending reload");
		wssend.apply(ws, arguments);
	};
});

let watch_wait;
const dir = "frontend/";
fs.watch(dir, { recursive: true }, function (event_type, filename) {
	if (watch_wait) clearTimeout(watch_wait);
	watch_wait = setTimeout(function () {
		const filepath = path.join(dir, filename);

		console.log(`[FSWATCH]: ${filepath} was ${event_type}`);

		if (filename.includes(".parsa.") && ws) {
			if (parsa(filename, filename.replace(".parsa.", "."))) ws.send("reload");
		} else if (filename.match(".(html)$") && ws) {
			ws.send("reload");
		} else if (filename.match(".(css)$") && ws) {
			ws.send("reload");
		} else if (filename.match(".(scss)$")) {
			sass_render([filename]);
		}
	}, 100);
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', function(line){
	if (line == "build-fonts")
	{
		const proc = spawnSync("utils/woff2_compress.exe", {cwd: "frontend/fonts/"});
	}
	else if (line == "build")
	{
		gen_frontend();
	}
})
