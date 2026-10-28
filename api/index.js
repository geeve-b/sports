// Vercel serverless entry: every /api/* request is rewritten here and handled by the Express app.
// The server is an ES module, so it is loaded with a dynamic import and cached per instance.
let app;

module.exports = async (req, res) => {
  app ??= (await import('../server/app.js')).default;
  return app(req, res);
};
