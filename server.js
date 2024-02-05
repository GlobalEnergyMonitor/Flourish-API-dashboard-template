require("dotenv").config();

if (!process.env.FLOURISH_API_KEY) {
	console.error("No Flourish API key supplied");
	process.exit(1);
}

const express = require('express');
const path = require("path");
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

app.set("views", path.join(__dirname, "/public/views"));
app.set("view engine", "jade");

app.use("/", express.static("public"));

app.use("/flourish", createProxyMiddleware({
		target: "https://flourish-api.com/api/v1/live",
		onProxyReq: (proxyReq) => {
			const url = new URL(proxyReq.path, `${proxyReq.protocol}//${proxyReq.host}`);
			url.searchParams.set("api_key", process.env.FLOURISH_API_KEY);
			proxyReq.path = `${url.pathname}${url.hash}${url.search}`;
			console.log('path', proxyReq.path)
		},
		changeOrigin: true,
		pathRewrite: { "^/flourish": "" }
	}));

const port = process.env.PORT || 8080;
app.listen(port, () => {
	console.log(`Listening on http://localhost:${port}`);
});