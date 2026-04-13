const notFoundMiddleware = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route introuvable: ${req.method} ${req.originalUrl}`,
  });
};

export default notFoundMiddleware;
