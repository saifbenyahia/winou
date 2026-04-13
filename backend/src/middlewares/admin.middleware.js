const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Acces reserve aux administrateurs.",
    });
  }

  next();
};

export default requireAdmin;
