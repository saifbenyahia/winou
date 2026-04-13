const errorMiddleware = (error, _req, res, _next) => {
  const statusCode = error.statusCode || error.status || 500;
  const message = error.message || "Erreur interne du serveur.";

  if (statusCode >= 500) {
    console.error("Unhandled backend error:", error);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};

export default errorMiddleware;
