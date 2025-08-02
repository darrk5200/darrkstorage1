import { type FileRecord, type InsertFile, type FolderInfo } from "@shared/schema";
import { randomUUID, createHash } from "crypto";
import fs from "fs";
import path from "path";

export interface IStorage {
  createFile(file: InsertFile): Promise<FileRecord>;
  getAllFiles(): Promise<FileRecord[]>;
  getFile(id: string): Promise<FileRecord | undefined>;
  deleteFile(id: string): Promise<boolean>;
  updateFileName(id: string, newName: string): Promise<FileRecord | null>;
  searchFiles(query: string, folderPath?: string): Promise<FileRecord[]>;
  searchAll(query: string): Promise<{ files: FileRecord[]; folders: FolderInfo[] }>;
  getFolders(): Promise<FolderInfo[]>;
  createFolder(folderPath: string): Promise<boolean>;
  getFilesInFolder(folderPath: string): Promise<FileRecord[]>;
  deleteFolder(folderPath: string): Promise<boolean>;
  deleteAllImagesInFolder(folderPath: string): Promise<number>;
  
  // Folder PIN operations
  setFolderPin(folderPath: string, pin: string): Promise<boolean>;
  verifyFolderPin(folderPath: string, pin: string): Promise<boolean>;
  removeFolderPin(folderPath: string): Promise<boolean>;
  isFolderLocked(folderPath: string): Promise<boolean>;
  
  // Folder rename operations  
  renameFolder(folderPath: string, newName: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private files: Map<string, FileRecord>;
  private uploadsDir: string;
  private folderPins: Map<string, string>; // folderPath -> hashedPin

  constructor() {
    this.files = new Map();
    this.folderPins = new Map();
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
    
    // Ensure thumbnails directory exists
    const thumbnailsDir = path.join(this.uploadsDir, 'thumbnails');
    if (!fs.existsSync(thumbnailsDir)) {
      fs.mkdirSync(thumbnailsDir, { recursive: true });
    }
  }

  async createFile(insertFile: InsertFile): Promise<FileRecord> {
    const id = randomUUID();
    const file: FileRecord = { 
      ...insertFile, 
      id, 
      createdAt: new Date() 
    };
    this.files.set(id, file);
    return file;
  }

  async getAllFiles(): Promise<FileRecord[]> {
    return Array.from(this.files.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async getFile(id: string): Promise<FileRecord | undefined> {
    return this.files.get(id);
  }

  async deleteFile(id: string): Promise<boolean> {
    const file = this.files.get(id);
    if (!file) return false;

    // Delete physical files
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      if (file.thumbnailPath && fs.existsSync(file.thumbnailPath)) {
        fs.unlinkSync(file.thumbnailPath);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }

    this.files.delete(id);
    return true;
  }

  async getFolders(): Promise<FolderInfo[]> {
    const allFiles = Array.from(this.files.values());
    const folderMap = new Map<string, FileRecord[]>();
    const allFolderPaths = new Set<string>();
    
    // Collect all files by folder path and build full folder tree
    allFiles.forEach(file => {
      if (file.folderPath) {
        if (!folderMap.has(file.folderPath)) {
          folderMap.set(file.folderPath, []);
        }
        folderMap.get(file.folderPath)!.push(file);
        
        // Add all parent paths to ensure we have the full tree
        const pathParts = file.folderPath.split('/');
        for (let i = 1; i <= pathParts.length; i++) {
          const parentPath = pathParts.slice(0, i).join('/');
          allFolderPaths.add(parentPath);
        }
      }
    });

    // Also scan file system for empty directories
    try {
      const uploadsPath = this.uploadsDir;
      if (fs.existsSync(uploadsPath)) {
        const entries = fs.readdirSync(uploadsPath, { withFileTypes: true });
        entries.forEach(entry => {
          if (entry.isDirectory() && entry.name !== 'thumbnails') {
            allFolderPaths.add(entry.name);
            this.scanForSubfolders(path.join(uploadsPath, entry.name), entry.name, allFolderPaths);
          }
        });
      }
    } catch (error) {
      console.error('Error scanning for empty folders:', error);
    }
    
    // Create folder info objects
    const folders = new Map<string, FolderInfo>();
    
    for (const folderPath of Array.from(allFolderPaths)) {
      const pathParts = folderPath.split('/');
      const name = pathParts[pathParts.length - 1];
      const parentPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : undefined;
      const files = folderMap.get(folderPath) || [];
      
      folders.set(folderPath, {
        name,
        path: folderPath,
        parentPath,
        fileCount: files.length,
        subfolderCount: 0,
        files: files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
        subfolders: [],
        hasPin: this.folderPins.has(folderPath),
        isLocked: this.folderPins.has(folderPath)
      });
    }
    
    // Build hierarchy by linking subfolders to parents
    for (const folder of Array.from(folders.values())) {
      if (folder.parentPath && folders.has(folder.parentPath)) {
        const parent = folders.get(folder.parentPath)!;
        parent.subfolders.push(folder);
        parent.subfolderCount++;
      }
    }
    
    // Return only root-level folders (those without parents or whose parents don't exist)
    return Array.from(folders.values())
      .filter(folder => !folder.parentPath || !folders.has(folder.parentPath))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private scanForSubfolders(dirPath: string, relativePath: string, allFolderPaths: Set<string>): void {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      entries.forEach(entry => {
        if (entry.isDirectory()) {
          const subfolderPath = `${relativePath}/${entry.name}`;
          allFolderPaths.add(subfolderPath);
          this.scanForSubfolders(path.join(dirPath, entry.name), subfolderPath, allFolderPaths);
        }
      });
    } catch (error) {
      console.error('Error scanning subfolder:', error);
    }
  }

  async getFilesInFolder(folderPath: string): Promise<FileRecord[]> {
    return Array.from(this.files.values())
      .filter(file => file.folderPath === folderPath)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async deleteFolder(folderPath: string): Promise<boolean> {
    // Get all files in this folder and its subfolders
    const filesToDelete = Array.from(this.files.values()).filter(file => 
      file.folderPath === folderPath || (file.folderPath && file.folderPath.startsWith(folderPath + '/'))
    );

    // Delete all files in the folder and subfolders
    for (const file of filesToDelete) {
      await this.deleteFile(file.id);
    }

    // Delete the physical directory from the filesystem
    const physicalFolderPath = path.join(this.uploadsDir, folderPath);
    try {
      if (fs.existsSync(physicalFolderPath)) {
        fs.rmSync(physicalFolderPath, { recursive: true, force: true });
      }
    } catch (error) {
      console.error('Error deleting physical folder:', error);
    }

    return true;
  }

  async deleteAllImagesInFolder(folderPath: string): Promise<number> {
    // Get all image files in this specific folder (not subfolders)
    const imageFiles = Array.from(this.files.values()).filter(file => 
      file.folderPath === folderPath && file.mimeType.startsWith('image/')
    );

    // Delete all image files
    for (const file of imageFiles) {
      await this.deleteFile(file.id);
    }

    return imageFiles.length;
  }

  async updateFileName(id: string, newName: string): Promise<FileRecord | null> {
    const file = this.files.get(id);
    if (!file) return null;

    // Extract the extension from the original name
    const ext = path.extname(file.originalName);
    const updatedFile = {
      ...file,
      originalName: newName + ext
    };

    this.files.set(id, updatedFile);
    return updatedFile;
  }

  async searchFiles(query: string, folderPath?: string): Promise<FileRecord[]> {
    if (!query.trim()) {
      const allFiles = Array.from(this.files.values());
      const filteredFiles = folderPath 
        ? allFiles.filter(file => file.folderPath === folderPath)
        : allFiles.filter(file => !file.folderPath); // Root level files only if no folder specified
      
      return filteredFiles.sort((a, b) => 
        b.createdAt.getTime() - a.createdAt.getTime()
      );
    }

    const searchTerm = query.toLowerCase().trim();
    const allFiles = Array.from(this.files.values());
    
    // Filter by folder first, then by search term
    const filteredFiles = folderPath 
      ? allFiles.filter(file => file.folderPath === folderPath)
      : allFiles.filter(file => !file.folderPath); // Root level files only if no folder specified
    
    return filteredFiles
      .filter(file => file.originalName.toLowerCase().includes(searchTerm))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async searchAll(query: string): Promise<{ files: FileRecord[]; folders: FolderInfo[] }> {
    if (!query.trim()) {
      return { files: [], folders: [] };
    }

    const searchTerm = query.toLowerCase().trim();
    
    // Search files (only root level when in main directory)
    const allFiles = Array.from(this.files.values())
      .filter(file => !file.folderPath) // Only root level files
      .filter(file => file.originalName.toLowerCase().includes(searchTerm))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Search folders (only root level)
    const allFolders = await this.getFolders();
    const matchingFolders = allFolders
      .filter(folder => folder.name.toLowerCase().includes(searchTerm))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { files: allFiles, folders: matchingFolders };
  }

  async createFolder(folderPath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.uploadsDir, folderPath);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
      return true;
    } catch (error) {
      console.error('Error creating folder:', error);
      return false;
    }
  }

  // PIN functionality
  private hashPin(pin: string): string {
    return createHash('sha256').update(pin).digest('hex');
  }

  async setFolderPin(folderPath: string, pin: string): Promise<boolean> {
    try {
      const hashedPin = this.hashPin(pin);
      this.folderPins.set(folderPath, hashedPin);
      return true;
    } catch (error) {
      console.error('Error setting folder PIN:', error);
      return false;
    }
  }

  async verifyFolderPin(folderPath: string, pin: string): Promise<boolean> {
    try {
      const storedPin = this.folderPins.get(folderPath);
      if (!storedPin) return false;
      const hashedPin = this.hashPin(pin);
      return storedPin === hashedPin;
    } catch (error) {
      console.error('Error verifying folder PIN:', error);
      return false;
    }
  }

  async removeFolderPin(folderPath: string): Promise<boolean> {
    try {
      return this.folderPins.delete(folderPath);
    } catch (error) {
      console.error('Error removing folder PIN:', error);
      return false;
    }
  }

  async isFolderLocked(folderPath: string): Promise<boolean> {
    return this.folderPins.has(folderPath);
  }

  // Folder rename functionality
  async renameFolder(folderPath: string, newName: string): Promise<boolean> {
    try {
      const pathParts = folderPath.split('/');
      const parentPath = pathParts.slice(0, -1).join('/');
      const newFolderPath = parentPath ? `${parentPath}/${newName}` : newName;
      
      const oldFullPath = path.join(this.uploadsDir, folderPath);
      const newFullPath = path.join(this.uploadsDir, newFolderPath);
      
      if (!fs.existsSync(oldFullPath)) {
        return false;
      }
      
      if (fs.existsSync(newFullPath)) {
        return false; // Destination already exists
      }
      
      // Rename physical folder
      fs.renameSync(oldFullPath, newFullPath);
      
      // Update file records to point to new folder path
      for (const [id, file] of Array.from(this.files.entries())) {
        if (file.folderPath === folderPath) {
          file.folderPath = newFolderPath;
          file.path = file.path.replace(folderPath, newFolderPath);
          this.files.set(id, file);
        } else if (file.folderPath && file.folderPath.startsWith(folderPath + '/')) {
          // Handle nested folders
          file.folderPath = file.folderPath.replace(folderPath, newFolderPath);
          file.path = file.path.replace(folderPath, newFolderPath);
          this.files.set(id, file);
        }
      }
      
      // Update PIN mapping if exists
      if (this.folderPins.has(folderPath)) {
        const pin = this.folderPins.get(folderPath)!;
        this.folderPins.delete(folderPath);
        this.folderPins.set(newFolderPath, pin);
      }
      
      return true;
    } catch (error) {
      console.error('Error renaming folder:', error);
      return false;
    }
  }
}

export const storage = new MemStorage();
