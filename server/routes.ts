import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFileSchema, type FolderInfo, urlFileSchema } from "@shared/schema";
import multer, { type FileFilterCallback } from "multer";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import archiver from "archiver";

const upload = multer({
  dest: 'uploads/',
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedMimeTypes = [
      // Images
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      // Videos
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/avi',
      'video/mov',
      'video/quicktime',
      // Text files
      'text/plain',
      'text/csv',
      'text/javascript',
      'text/css',
      'text/html',
      'text/xml',
      'application/json',
      'application/javascript',
      'application/xml',
      'application/csv'
    ];

    // Also check file extensions for text files since MIME types can be inconsistent
    const allowedExtensions = [
      '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg',
      '.mp4', '.webm', '.ogg', '.avi', '.mov',
      '.txt', '.csv', '.js', '.css', '.html', '.xml', '.json',
      '.md', '.py', '.java', '.cpp', '.c', '.h', '.php', '.rb',
      '.go', '.rs', '.ts', '.tsx', '.jsx', '.vue', '.yml', '.yaml'
    ];
    
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, and text files are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all files
  app.get("/api/files", async (req, res) => {
    try {
      const files = await storage.getAllFiles();
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch files" });
    }
  });

  // Get folders
  app.get("/api/folders", async (req, res) => {
    try {
      const folders = await storage.getFolders();
      res.json(folders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch folders" });
    }
  });

  // Get specific folder contents
  app.get("/api/folders/:folderPath/contents", async (req, res) => {
    try {
      const folderPath = decodeURIComponent(req.params.folderPath);
      console.log('Getting folder contents for path:', folderPath);
      
      // Get folder directly from storage instead of searching through tree
      const folderInfo = await storage.getFolderByPath(folderPath);
      if (!folderInfo) {
        console.log('Folder not found:', folderPath);
        return res.status(404).json({ message: "Folder not found" });
      }
      
      console.log('Found folder:', folderInfo.name, 'Files:', folderInfo.files.length, 'Subfolders:', folderInfo.subfolders.length);
      res.json(folderInfo);
    } catch (error) {
      console.error('Error getting folder contents:', error);
      res.status(500).json({ message: "Failed to get folder contents" });
    }
  });

  // Get files in folder
  app.get("/api/folders/:folderPath/files", async (req, res) => {
    try {
      const folderPath = decodeURIComponent(req.params.folderPath);
      const files = await storage.getFilesInFolder(folderPath);
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch folder files" });
    }
  });

  // Upload files
  app.post("/api/files/upload", upload.array('files'), async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const uploadedFiles = [];
      const folderPaths = Array.isArray(req.body.folderPaths) ? req.body.folderPaths : [req.body.folderPaths];

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        // Generate unique filename
        const ext = path.extname(file.originalname);
        const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
        
        // Determine folder path first
        const folderPath = folderPaths[i] || '';
        let extractedFolderPath = '';
        
        if (folderPath) {
          // Check if this is a webkitRelativePath (contains a file path with directory)
          // If it contains a slash and the original filename, it's a webkitRelativePath  
          if (folderPath.includes('/') && folderPath.endsWith(file.originalname)) {
            // For webkitRelativePath, get the directory path by removing the filename
            const dirPath = path.dirname(folderPath);
            // Only use the directory path if it's not just '.' (which means no directory)
            extractedFolderPath = dirPath === '.' ? '' : dirPath;
          } else {
            // This is a currentFolder path, use it directly
            extractedFolderPath = folderPath;
          }
        }
        
        // Create the folder structure if needed
        let finalPath;
        if (extractedFolderPath) {
          const targetDir = path.join('uploads', extractedFolderPath);
          // Ensure the target directory exists
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          finalPath = path.join(targetDir, filename);
        } else {
          finalPath = path.join('uploads', filename);
        }
        
        // Move file to final location
        fs.renameSync(file.path, finalPath);

        // Generate thumbnail only for videos
        let thumbnailPath: string | undefined;
        try {
          if (file.mimetype.startsWith('video/')) {
            const thumbnailFilename = `thumb_${path.parse(filename).name}.jpg`;
            thumbnailPath = path.join('uploads', 'thumbnails', thumbnailFilename);
            
            // Ensure thumbnails directory exists
            const thumbnailDir = path.dirname(thumbnailPath);
            if (!fs.existsSync(thumbnailDir)) {
              fs.mkdirSync(thumbnailDir, { recursive: true });
            }
            
            // Generate video thumbnail using FFmpeg
            await new Promise<void>((resolve, reject) => {
              ffmpeg(finalPath)
                .screenshot({
                  timestamps: ['10%'],
                  filename: thumbnailFilename,
                  folder: thumbnailDir,
                  size: '300x?'
                })
                .on('end', () => resolve())
                .on('error', (err) => reject(err));
            });
          }
        } catch (thumbError) {
          console.error('Thumbnail generation failed:', thumbError);
          thumbnailPath = undefined;
        }



        // Save to storage
        const fileData = {
          name: filename,
          originalName: file.originalname,
          path: finalPath,
          size: file.size,
          mimeType: file.mimetype,
          thumbnailPath,
          folderPath: extractedFolderPath
        };

        const validatedData = insertFileSchema.parse(fileData);
        const savedFile = await storage.createFile(validatedData);
        uploadedFiles.push(savedFile);
      }

      res.json({ files: uploadedFiles });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: "Failed to upload files" });
    }
  });

  // Serve uploaded files
  app.get("/api/files/:id/view", async (req, res) => {
    try {
      const file = await storage.getFile(req.params.id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      if (!fs.existsSync(file.path)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
      res.sendFile(path.resolve(file.path));
    } catch (error) {
      res.status(500).json({ message: "Failed to serve file" });
    }
  });

  // Serve thumbnails
  app.get("/api/files/:id/thumbnail", async (req, res) => {
    try {
      const file = await storage.getFile(req.params.id);
      if (!file || !file.thumbnailPath) {
        return res.status(404).json({ message: "Thumbnail not found" });
      }

      if (!fs.existsSync(file.thumbnailPath)) {
        return res.status(404).json({ message: "Thumbnail not found on disk" });
      }

      res.setHeader('Content-Type', 'image/jpeg');
      res.sendFile(path.resolve(file.thumbnailPath));
    } catch (error) {
      res.status(500).json({ message: "Failed to serve thumbnail" });
    }
  });

  // Download file
  app.get("/api/files/:id/download", async (req, res) => {
    try {
      const file = await storage.getFile(req.params.id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      if (!fs.existsSync(file.path)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
      res.sendFile(path.resolve(file.path));
    } catch (error) {
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  // Delete file
  app.delete("/api/files/:id", async (req, res) => {
    try {
      const success = await storage.deleteFile(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "File not found" });
      }
      res.json({ message: "File deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  // Rename file
  app.patch("/api/files/:id/rename", async (req, res) => {
    try {
      const { newName } = req.body;
      if (!newName || typeof newName !== 'string' || !newName.trim()) {
        return res.status(400).json({ message: "Invalid file name" });
      }

      const updatedFile = await storage.updateFileName(req.params.id, newName.trim());
      if (!updatedFile) {
        return res.status(404).json({ message: "File not found" });
      }

      res.json(updatedFile);
    } catch (error) {
      res.status(500).json({ message: "Failed to rename file" });
    }
  });

  // Search files
  app.get("/api/files/search", async (req, res) => {
    try {
      const query = req.query.q as string || '';
      const folderPath = req.query.folder as string || undefined;
      
      if (!folderPath) {
        // When in main directory, search both files and folders
        const results = await storage.searchAll(query);
        res.json(results);
      } else {
        // When in a specific folder, only search files
        const files = await storage.searchFiles(query, folderPath);
        res.json({ files, folders: [] });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to search files" });
    }
  });

  // Delete folder
  app.delete("/api/folders/:folderPath", async (req, res) => {
    try {
      const folderPath = decodeURIComponent(req.params.folderPath);
      const success = await storage.deleteFolder(folderPath);
      res.json({ message: "Folder deleted successfully", deleted: success });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete folder" });
    }
  });

  // Download all files in folder as zip
  app.get("/api/folders/:folderPath/download", async (req, res) => {
    try {
      const folderPath = decodeURIComponent(req.params.folderPath);
      console.log('Downloading folder:', folderPath);
      
      const folderInfo = await storage.getFolderByPath(folderPath);
      if (!folderInfo) {
        return res.status(404).json({ message: "Folder not found" });
      }

      if (folderInfo.files.length === 0) {
        return res.status(400).json({ message: "No files to download in this folder" });
      }

      // Set headers for zip download
      const folderName = folderInfo.name || 'folder';
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${folderName}.zip"`);

      const archive = archiver('zip', { zlib: { level: 9 } });
      
      archive.pipe(res);

      // Add each file to the archive
      for (const file of folderInfo.files) {
        try {
          const filePath = file.path;
          console.log('Adding file to archive:', filePath, 'exists:', fs.existsSync(filePath));
          if (fs.existsSync(filePath)) {
            archive.file(filePath, { name: file.originalName });
          } else {
            console.log('File does not exist:', filePath);
          }
        } catch (error) {
          console.error('Error adding file to archive:', error);
        }
      }

      await archive.finalize();
    } catch (error) {
      console.error('Error creating folder download:', error);
      res.status(500).json({ message: "Failed to create folder download" });
    }
  });

  // Delete all images in folder
  app.delete("/api/folders/:folderPath/images", async (req, res) => {
    try {
      const folderPath = decodeURIComponent(req.params.folderPath);
      const deletedCount = await storage.deleteAllImagesInFolder(folderPath);
      res.json({ message: `${deletedCount} images deleted successfully`, deletedCount });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete images" });
    }
  });

  // Create folder endpoint
  app.post("/api/folders", async (req, res) => {
    try {
      const { folderName } = req.body;
      if (!folderName || typeof folderName !== 'string') {
        return res.status(400).json({ message: "Folder name is required" });
      }

      // Sanitize folder name
      const sanitizedName = folderName.trim().replace(/[<>:"/\\|?*]/g, '_');
      if (!sanitizedName) {
        return res.status(400).json({ message: "Invalid folder name" });
      }

      const success = await storage.createFolder(sanitizedName);
      if (!success) {
        return res.status(500).json({ message: "Failed to create folder" });
      }

      res.json({ success: true, folderName: sanitizedName });
    } catch (error) {
      res.status(500).json({ message: "Failed to create folder" });
    }
  });

  // Rename folder
  app.patch("/api/folders/:folderPath/rename", async (req, res) => {
    try {
      const folderPath = decodeURIComponent(req.params.folderPath);
      const { newName } = req.body;
      
      if (!newName || typeof newName !== 'string' || !newName.trim()) {
        return res.status(400).json({ message: "Invalid folder name" });
      }

      const success = await storage.renameFolder(folderPath, newName.trim());
      if (success) {
        res.json({ success: true, message: "Folder renamed successfully" });
      } else {
        res.status(400).json({ message: "Failed to rename folder - folder may not exist or name already taken" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to rename folder" });
    }
  });

  // Set folder PIN
  app.post("/api/folders/:folderPath/pin", async (req, res) => {
    try {
      const folderPath = decodeURIComponent(req.params.folderPath);
      const { pin } = req.body;
      
      if (!pin || typeof pin !== 'string' || !/^\d{4,8}$/.test(pin)) {
        return res.status(400).json({ message: "PIN must be 4-8 digits" });
      }

      const success = await storage.setFolderPin(folderPath, pin);
      if (success) {
        res.json({ success: true, message: "PIN set successfully" });
      } else {
        res.status(500).json({ message: "Failed to set PIN" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to set PIN" });
    }
  });

  // Verify folder PIN
  app.post("/api/folders/:folderPath/unlock", async (req, res) => {
    try {
      const folderPath = decodeURIComponent(req.params.folderPath);
      const { pin } = req.body;
      
      if (!pin || typeof pin !== 'string') {
        return res.status(400).json({ message: "PIN is required" });
      }

      const isValid = await storage.verifyFolderPin(folderPath, pin);
      if (isValid) {
        res.json({ success: true, message: "PIN verified successfully" });
      } else {
        res.status(401).json({ message: "Invalid PIN" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to verify PIN" });
    }
  });

  // Remove folder PIN
  app.delete("/api/folders/:folderPath/pin", async (req, res) => {
    try {
      const folderPath = decodeURIComponent(req.params.folderPath);
      const { pin } = req.body;
      
      // Verify current PIN before removing
      if (pin) {
        const isValid = await storage.verifyFolderPin(folderPath, pin);
        if (!isValid) {
          return res.status(401).json({ message: "Invalid PIN" });
        }
      }

      const success = await storage.removeFolderPin(folderPath);
      if (success) {
        res.json({ success: true, message: "PIN removed successfully" });
      } else {
        res.status(404).json({ message: "No PIN found for this folder" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to remove PIN" });
    }
  });

  // Upload file from URL
  app.post("/api/files/upload-url", async (req, res) => {
    try {
      const { url, folderPath } = urlFileSchema.parse(req.body);
      
      // Fetch the file from URL
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(400).json({ message: "Failed to fetch file from URL" });
      }
      
      const contentType = response.headers.get('content-type') || '';
      const allowedMimeTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
        'video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 'video/quicktime'
      ];
      
      if (!allowedMimeTypes.some(type => contentType.includes(type))) {
        return res.status(400).json({ message: "Invalid file type from URL" });
      }
      
      // Extract filename from URL or generate one
      const urlPath = new URL(url).pathname;
      const originalName = path.basename(urlPath) || `download-${Date.now()}`;
      const fileExtension = path.extname(originalName) || (contentType.includes('video') ? '.mp4' : '.jpg');
      const finalName = originalName.includes('.') ? originalName : originalName + fileExtension;
      
      // Generate unique filename
      const uniqueName = `${Date.now()}-${nanoid(6)}${path.extname(finalName)}`;
      const folderDir = folderPath ? path.join('uploads', folderPath) : 'uploads';
      const filePath = path.join(folderDir, uniqueName);
      
      // Ensure directory exists
      if (!fs.existsSync(folderDir)) {
        fs.mkdirSync(folderDir, { recursive: true });
      }
      
      // Download and save file
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(filePath, buffer);
      
      // Create file record
      const fileRecord: any = {
        name: uniqueName,
        originalName: finalName,
        path: filePath,
        size: buffer.length,
        mimeType: contentType,
        folderPath,
        thumbnailPath: undefined
      };
      
      // Generate thumbnail for images
      if (contentType.startsWith('image/') && contentType !== 'image/svg+xml') {
        const thumbnailName = `thumb-${Date.now()}-${nanoid(6)}.jpg`;
        const thumbnailPath = path.join('uploads', 'thumbnails', thumbnailName);
        
        try {
          await sharp(filePath)
            .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toFile(thumbnailPath);
          
          fileRecord.thumbnailPath = thumbnailPath;
        } catch (error) {
          console.error('Error generating thumbnail:', error);
        }
      }
      
      const savedFile = await storage.createFile(fileRecord);
      res.json(savedFile);
      
    } catch (error) {
      console.error('URL upload error:', error);
      res.status(500).json({ message: "Failed to upload file from URL" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
