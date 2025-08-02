import { z } from "zod";

export const insertFileSchema = z.object({
  name: z.string().min(1),
  originalName: z.string().min(1),
  path: z.string().min(1),
  size: z.number().min(0),
  mimeType: z.string().min(1),
  thumbnailPath: z.string().optional(),
  folderPath: z.string().optional(),
});

export type InsertFile = z.infer<typeof insertFileSchema>;

export interface FileRecord {
  id: string;
  name: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  thumbnailPath?: string;
  folderPath?: string;
  createdAt: Date;
}

export interface FolderInfo {
  name: string;
  path: string;
  parentPath?: string;
  fileCount: number;
  subfolderCount: number;
  files: FileRecord[];
  subfolders: FolderInfo[];
  isLocked?: boolean;
  hasPin?: boolean;
}

export const folderPinSchema = z.object({
  pin: z.string().min(4).max(8).regex(/^\d+$/, "PIN must contain only numbers"),
});

export type FolderPin = z.infer<typeof folderPinSchema>;

export const urlFileSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  folderPath: z.string().optional(),
});

export type UrlFile = z.infer<typeof urlFileSchema>;
