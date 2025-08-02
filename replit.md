# Overview

DarrkStorage is a modern file hosting platform built with React and Express. It provides a clean, intuitive interface for uploading, viewing, and managing image and video files with advanced folder management capabilities. Key features include thumbnail generation, video player, drag-and-drop uploads, URL-based file storage, nested folder structures, responsive grid/list views, PIN-protected folders, and comprehensive deletion options for both individual files and entire folders. The application uses a full-stack TypeScript architecture with a React frontend and Express backend, designed for simplicity and performance.

# Recent Changes

## Image Modal and Navigation Enhancement (February 2025)
- Added direct image click functionality to open images in modal instead of new tabs
- Implemented image navigation with arrow keys and buttons to switch between images
- Enhanced image modal with keyboard shortcuts (arrow keys for navigation, escape to close)
- Added cursor pointer styling to images for better UX indication
- Modified file grid to support image modal opening through onImageView callback
- Filtered image navigation to only include image files in the modal carousel

## Thumbnail Generation Optimization (February 2025)
- Modified thumbnail generation to only create thumbnails for video files
- Images now display directly without thumbnail generation for better performance and quality
- Updated file grid component to always show full images instead of checking for thumbnails
- Reduced server processing time and storage requirements for image uploads

## Application Rename, Video Support, and URL Storage (January 2025)
- Renamed application from "FileVault" to "DarrkStorage" across all components and documentation
- Added comprehensive video file support (.mp4, .webm, .ogg, .avi, .mov, .quicktime)
- Implemented custom video player component with full controls, seeking, volume, and fullscreen
- Added URL-based file upload functionality for downloading and storing remote files
- Enhanced file grid component with video previews, play overlays, and modal video player
- Increased file upload size limit to 100MB to accommodate video files
- Updated file type validation to include video formats in both frontend and backend

## File Renaming and Search Features (January 2025)
- Added file renaming functionality with extension preservation
- Implemented folder-scoped search that searches within the current directory
- Created dropdown action menus for files with rename, download, and delete options
- Added search bar with real-time results and folder context awareness
- Enhanced file management with modal-based rename interface
- Added "Create New Folder" button in main directory for creating empty folders
- Fixed file upload to respect current folder context (uploads go to current folder)
- Enhanced main directory search to include both files and folders by name

## Folder Management Features (January 2025)
- Added folder deletion functionality with confirmation dialogs
- Implemented "Delete All Images" option for removing only image files from folders
- Added hover-based action menus for both grid and list view modes
- Created responsive dropdown menus with trash and image deletion icons
- Enhanced folder navigation with breadcrumb system

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React with TypeScript**: Built using Vite for fast development and building
- **UI Framework**: shadcn/ui components with Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with a dark theme design system using CSS custom properties
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **File Uploads**: React Dropzone for drag-and-drop file upload functionality

## Backend Architecture
- **Express.js**: RESTful API server with TypeScript
- **File Processing**: Sharp for image processing and thumbnail generation
- **File Upload**: Multer middleware for handling multipart form data with file type validation
- **Storage**: In-memory storage with file system for actual file storage (uploads directory)
- **Development**: Vite integration for seamless development experience with HMR

## Data Storage Solutions
- **File Storage**: Local file system with organized directory structure
  - Main uploads in `/uploads` directory
  - Thumbnails in `/uploads/thumbnails` subdirectory
- **Metadata Storage**: In-memory storage using Map for file metadata
- **Schema Validation**: Zod schemas for type-safe data validation

## API Design
- **RESTful Endpoints**:
  - `GET /api/files` - Retrieve all files
  - `POST /api/files/upload` - Upload multiple files
  - `GET /api/files/:id/view` - Serve full-size images
  - `GET /api/files/:id/thumbnail` - Serve thumbnail images
  - `GET /api/files/:id/download` - Download files
  - `DELETE /api/files/:id` - Delete files
  - `GET /api/folders` - Retrieve folder structure
  - `GET /api/folders/:folderPath/contents` - Get specific folder contents
  - `GET /api/folders/:folderPath/files` - Get files in specific folder
  - `DELETE /api/folders/:folderPath` - Delete entire folder and contents
  - `DELETE /api/folders/:folderPath/images` - Delete all images in folder
  - `POST /api/files/upload-url` - Upload files from remote URLs
  - `POST /api/folders/:folderPath/pin` - Set PIN protection for folders
  - `POST /api/folders/:folderPath/verify-pin` - Verify folder PIN access
  - `DELETE /api/folders/:folderPath/pin` - Remove folder PIN protection

## External Dependencies

### Frontend Dependencies
- **shadcn/ui**: Component library built on Radix UI primitives
- **TanStack Query**: Server state management and data fetching
- **React Dropzone**: File upload with drag-and-drop support
- **Wouter**: Lightweight routing library
- **date-fns**: Date manipulation and formatting
- **Lucide React**: Icon library

### Backend Dependencies
- **Sharp**: High-performance image processing library
- **Multer**: File upload middleware for Express
- **Zod**: Runtime type validation and schema definition

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type safety and enhanced developer experience
- **Tailwind CSS**: Utility-first CSS framework
- **ESBuild**: Fast JavaScript bundler for production builds
- **Drizzle**: Database ORM (configured for PostgreSQL but not currently in use)

### Database Integration
- **Drizzle ORM**: Configured for PostgreSQL with Neon Database serverless driver
- **Current State**: Database schema defined but application uses in-memory storage
- **Migration Ready**: Database migrations configured in `/migrations` directory