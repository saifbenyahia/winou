import fs from "fs";
import multer from "multer";
import path from "path";

const createStorage = ({ destinationFolder, filePrefix }) => multer.diskStorage({
  destination: function (_req, _file, cb) {
    const targetDirectory = path.join("uploads", destinationFolder);
    fs.mkdirSync(targetDirectory, { recursive: true });
    cb(null, targetDirectory);
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${filePrefix}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

export const uploadMedia = multer({
  storage: createStorage({
    destinationFolder: "campaigns",
    filePrefix: "media",
  }),
  limits: {
    fileSize: 5000 * 1024 * 1024,
  },
});

export const uploadSupportAttachment = multer({
  storage: createStorage({
    destinationFolder: "support",
    filePrefix: "support",
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});
