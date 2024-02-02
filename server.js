require("dotenv").config();

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

console.log('process.env', process.env.FLOURISH_API_KEY)

app.use("/flourish", createProxyMiddleware({
	target: "https://flourish-api.com/api/v1/live",
	onProxyReq: (proxyReq) => {
		const url = new URL(proxyReq.path, `${proxyReq.protocol}//${proxyReq.host}`);
		url.searchParams.set("api_key", process.env.FLOURISH_API_KEY);
		proxyReq.path = `${url.pathname}${url.hash}${url.search}`;
	},
	changeOrigin: true,
	pathRewrite: { "^/flourish": "" }
}));

const port = process.env.PORT || 8080;
app.listen(port, () => {
	console.log(`Listening on http://localhost:${port}`);
});