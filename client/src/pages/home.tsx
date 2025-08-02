import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Header from "@/components/header";
import FileUpload from "@/components/file-upload";
import FileGrid from "@/components/file-grid";
import FolderGrid from "@/components/folder-grid";
import ImageModal from "@/components/image-modal";
import DeleteModal from "@/components/delete-modal";
import RenameModal from "@/components/rename-modal";
import CreateFolderModal from "@/components/create-folder-modal";
import FolderRenameModal from "@/components/folder-rename-modal";
import FolderPinModal from "@/components/folder-pin-modal";
import FolderPinVerifyModal from "@/components/folder-pin-verify-modal";
import { FileRecord, FolderInfo } from "@shared/schema";
import { Grid, List, ArrowUpDown, ArrowLeft, Home as HomeIcon, Search, X, FolderPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [fileToDelete, setFileToDelete] = useState<FileRecord | null>(null);
  const [fileToRename, setFileToRename] = useState<FileRecord | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<FolderInfo | null>(null);
  const [folderToDeleteImages, setFolderToDeleteImages] = useState<FolderInfo | null>(null);
  const [folderToRename, setFolderToRename] = useState<FolderInfo | null>(null);
  const [folderToPin, setFolderToPin] = useState<FolderInfo | null>(null);
  const [folderToVerifyPin, setFolderToVerifyPin] = useState<FolderInfo | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const { data: files = [], isLoading: filesLoading, refetch: refetchFiles } = useQuery<FileRecord[]>({
    queryKey: ['/api/files'],
  });

  const { data: folders = [], isLoading: foldersLoading, refetch: refetchFolders } = useQuery<FolderInfo[]>({
    queryKey: ['/api/folders'],
  });

  const { data: currentFolderData, isLoading: folderContentLoading, refetch: refetchFolderContent } = useQuery({
    queryKey: ['/api/folders', currentFolder, 'contents'],
    enabled: !!currentFolder,
    staleTime: 0, // Don't use stale data
    gcTime: 0, // Don't cache results (renamed from cacheTime in v5)
  }) as { data: FolderInfo | undefined, isLoading: boolean, refetch: () => void };
  


  const { data: searchResults, isLoading: searchLoading } = useQuery<{ files: FileRecord[]; folders: FolderInfo[] }>({
    queryKey: ['/api/files/search', searchQuery, currentFolder],
    enabled: isSearching && searchQuery.trim().length > 0,
    queryFn: async () => {
      const params = new URLSearchParams({ q: searchQuery });
      if (currentFolder) {
        params.append('folder', currentFolder);
      }
      const response = await fetch(`/api/files/search?${params}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderPath: string) => {
      return apiRequest('DELETE', `/api/folders/${encodeURIComponent(folderPath)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      if (currentFolder) {
        queryClient.invalidateQueries({ queryKey: ['/api/folders', currentFolder, 'contents'] });
      }
      toast({
        title: "Success",
        description: "Folder deleted successfully",
      });
      setFolderToDelete(null);
      // If we're currently in the deleted folder, go back to main view
      if (currentFolder === folderToDelete?.path) {
        setCurrentFolder(null);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete folder",
        variant: "destructive",
      });
    },
  });

  const deleteAllImagesMutation = useMutation({
    mutationFn: async (folderPath: string) => {
      return apiRequest('DELETE', `/api/folders/${encodeURIComponent(folderPath)}/images`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      if (currentFolder) {
        queryClient.invalidateQueries({ queryKey: ['/api/folders', currentFolder, 'contents'] });
      }
      toast({
        title: "Success",
        description: `${data.deletedCount} images deleted successfully`,
      });
      setFolderToDeleteImages(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete images",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = () => {
    refetchFiles();
    refetchFolders();
    if (currentFolder) {
      refetchFolderContent();
    }
  };

  const handleFileDelete = () => {
    refetchFiles();
    refetchFolders();
    if (currentFolder) {
      refetchFolderContent();
    }
    setFileToDelete(null);
  };

  const handleFolderClick = (folder: FolderInfo) => {
    console.log('Clicking folder:', folder.path, 'Current folder was:', currentFolder);
    
    // Check if folder is PIN protected
    if (folder.hasPin) {
      setFolderToVerifyPin(folder);
      return;
    }
    
    // Clear the cache for the new folder to force a fresh fetch
    queryClient.removeQueries({ queryKey: ['/api/folders', folder.path, 'contents'] });
    setCurrentFolder(folder.path);
    // Clear search when navigating to a folder
    if (isSearching) {
      setSearchQuery("");
      setIsSearching(false);
    }
  };

  const handlePinVerified = () => {
    if (folderToVerifyPin) {
      // Clear the cache for the new folder to force a fresh fetch
      queryClient.removeQueries({ queryKey: ['/api/folders', folderToVerifyPin.path, 'contents'] });
      setCurrentFolder(folderToVerifyPin.path);
      setFolderToVerifyPin(null);
      // Clear search when navigating to a folder
      if (isSearching) {
        setSearchQuery("");
        setIsSearching(false);
      }
    }
  };

  const handleBackToFolders = () => {
    setCurrentFolder(null);
  };

  const handleDeleteFolder = (folder: FolderInfo) => {
    setFolderToDelete(folder);
  };

  const handleDeleteAllImages = (folder: FolderInfo) => {
    setFolderToDeleteImages(folder);
  };

  const confirmDeleteFolder = () => {
    if (folderToDelete) {
      deleteFolderMutation.mutate(folderToDelete.path);
    }
  };

  const confirmDeleteAllImages = () => {
    if (folderToDeleteImages) {
      deleteAllImagesMutation.mutate(folderToDeleteImages.path);
    }
  };

  const handleRename = (file: FileRecord) => {
    setFileToRename(file);
  };

  const handleRenameSuccess = () => {
    refetchFiles();
    refetchFolders();
    if (currentFolder) {
      refetchFolderContent();
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setIsSearching(true);
      // Don't exit folder view when searching - keep current folder context
    } else {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setIsSearching(false);
  };

  const handleCreateFolder = () => {
    setShowCreateFolder(true);
  };

  const handleFolderCreated = () => {
    refetchFolders();
    setShowCreateFolder(false);
  };

  const handleRenameFolder = (folder: FolderInfo) => {
    setFolderToRename(folder);
  };

  const handleAddPin = (folder: FolderInfo) => {
    setFolderToPin(folder);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header files={files} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 mb-6" aria-label="Breadcrumb">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground hover:text-foreground"
            onClick={currentFolder ? handleBackToFolders : undefined}
          >
            <HomeIcon className="w-4 h-4" />
          </Button>
          <span className="text-muted-foreground">/</span>
          {currentFolder ? (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:text-foreground"
                onClick={handleBackToFolders}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <span className="text-muted-foreground">/</span>
              <span className="text-foreground font-medium">{currentFolder}</span>
            </>
          ) : (
            <span className="text-foreground font-medium">All Files</span>
          )}
        </nav>

        {!isSearching && <FileUpload onUpload={handleFileUpload} currentFolder={currentFolder} />}

        {/* Create Folder Button - only show in main directory */}
        {!currentFolder && !isSearching && (
          <div className="mb-6">
            <Button 
              onClick={handleCreateFolder}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Create New Folder</span>
            </Button>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search files by name..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={clearSearch}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-foreground">
              {currentFolder ? `Files in ${currentFolder}` : 'Your Files'}
            </h2>
            <span className="text-sm text-muted-foreground">
              {currentFolder && currentFolderData
                ? `${currentFolderData.fileCount} files${currentFolderData.subfolderCount > 0 ? `, ${currentFolderData.subfolderCount} folders` : ''}`
                : `${files.filter(f => !f.folderPath).length} files, ${folders.length} folder${folders.length !== 1 ? 's' : ''}`
              }
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-accent' : ''}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-accent' : ''}
            >
              <List className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-border"></div>
            <Button variant="ghost" size="sm">
              <ArrowUpDown className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isSearching ? (
          // Search Results
          searchLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-foreground">
                Search Results {currentFolder ? `in ${currentFolder}` : ''} 
                {searchResults && `(${searchResults.files.length + searchResults.folders.length})`}
              </h3>
              
              {searchResults?.folders && searchResults.folders.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-foreground">Folders</h4>
                  <FolderGrid 
                    folders={searchResults.folders} 
                    onFolderClick={handleFolderClick}
                    onDeleteFolder={handleDeleteFolder}
                    onDeleteAllImages={handleDeleteAllImages}
                    onRenameFolder={handleRenameFolder}
                    onAddPin={handleAddPin}
                    viewMode={viewMode}
                  />
                </div>
              )}
              
              {searchResults?.files && searchResults.files.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-foreground">Files</h4>
                  <FileGrid 
                    files={searchResults.files} 
                    onDelete={setFileToDelete}
                    onRename={handleRename}
                  />
                </div>
              )}
              
              {searchResults && searchResults.files.length === 0 && searchResults.folders.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No files or folders found matching "{searchQuery}"
                  </p>
                </div>
              )}
            </div>
          )
        ) : currentFolder ? (
          // Inside a folder - show folder content or loading
          folderContentLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card rounded-xl overflow-hidden">
                  <div className="aspect-square bg-muted animate-pulse"></div>
                  <div className="p-3">
                    <div className="h-4 bg-muted rounded animate-pulse mb-2"></div>
                    <div className="h-3 bg-muted rounded animate-pulse w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : currentFolderData ? (
            <div className="space-y-8">
              {/* Debug: Show current folder path */}
              <div className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 p-2 rounded">
                Current Folder: "{currentFolder}" | Folder Name: "{currentFolderData.name}" | Files: {currentFolderData.files?.length || 0} | Subfolders: {currentFolderData.subfolders?.length || 0}
              </div>

              {currentFolderData.subfolders.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Subfolders</h3>
                  <FolderGrid 
                    folders={currentFolderData.subfolders} 
                    onFolderClick={handleFolderClick}
                    onDeleteFolder={handleDeleteFolder}
                    onDeleteAllImages={handleDeleteAllImages}
                    onRenameFolder={handleRenameFolder}
                    onAddPin={handleAddPin}
                    viewMode={viewMode}
                  />
                </div>
              )}
              {currentFolderData.files.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Files</h3>
                  <FileGrid 
                    files={currentFolderData.files} 
                    onDelete={setFileToDelete}
                    onRename={handleRename}
                  />
                </div>
              )}
              {currentFolderData.files.length === 0 && currentFolderData.subfolders.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-card rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v4H8V5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Empty folder</h3>
                  <p className="text-muted-foreground mb-6">This folder doesn't contain any files or subfolders</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground">Failed to load folder content</p>
            </div>
          )
        ) : filesLoading || foldersLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl overflow-hidden">
                <div className="aspect-square bg-muted animate-pulse"></div>
                <div className="p-3">
                  <div className="h-4 bg-muted rounded animate-pulse mb-2"></div>
                  <div className="h-3 bg-muted rounded animate-pulse w-1/2"></div>
                </div>
              </div>
            ))}
          </div>

        ) : (folders.length > 0 || files.filter(f => !f.folderPath).length > 0) ? (
          <div className="space-y-8">
            {folders.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Folders</h3>
                <FolderGrid 
                  folders={folders} 
                  onFolderClick={handleFolderClick}
                  onDeleteFolder={handleDeleteFolder}
                  onDeleteAllImages={handleDeleteAllImages}
                  onRenameFolder={handleRenameFolder}
                  onAddPin={handleAddPin}
                  viewMode={viewMode}
                />
              </div>
            )}
            {files.filter(f => !f.folderPath).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Files</h3>
                <FileGrid 
                  files={files.filter(f => !f.folderPath)} 
                  onDelete={setFileToDelete}
                  onRename={handleRename}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-card rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v4H8V5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No files uploaded yet</h3>
            <p className="text-muted-foreground mb-6">Start by uploading your first image files or folders</p>
          </div>
        )}
      </div>

      <ImageModal
        file={selectedFile}
        isOpen={!!selectedFile}
        onClose={() => setSelectedFile(null)}
        files={currentFolder && currentFolderData ? currentFolderData.files : files.filter(f => !f.folderPath)}
        onNavigate={setSelectedFile}
      />

      <DeleteModal
        file={fileToDelete}
        isOpen={!!fileToDelete}
        onClose={() => setFileToDelete(null)}
        onConfirm={handleFileDelete}
      />

      <RenameModal
        file={fileToRename}
        isOpen={!!fileToRename}
        onClose={() => setFileToRename(null)}
        onSuccess={handleRenameSuccess}
      />

      <CreateFolderModal
        isOpen={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onSuccess={handleFolderCreated}
      />

      {/* Folder Delete Modal */}
      <AlertDialog open={!!folderToDelete} onOpenChange={() => setFolderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              {folderToDelete && `Are you sure you want to delete the folder "${folderToDelete.name}" and all its contents? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteFolder}
              disabled={deleteFolderMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteFolderMutation.isPending ? "Deleting..." : "Delete Folder"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Images Modal */}
      <AlertDialog open={!!folderToDeleteImages} onOpenChange={() => setFolderToDeleteImages(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Images</AlertDialogTitle>
            <AlertDialogDescription>
              {folderToDeleteImages && `Are you sure you want to delete all images in the folder "${folderToDeleteImages.name}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteAllImages}
              disabled={deleteAllImagesMutation.isPending}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {deleteAllImagesMutation.isPending ? "Deleting..." : "Delete All Images"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FolderRenameModal
        folder={folderToRename}
        isOpen={!!folderToRename}
        onClose={() => setFolderToRename(null)}
      />

      <FolderPinModal
        folder={folderToPin}
        isOpen={!!folderToPin}
        onClose={() => setFolderToPin(null)}
      />

      <FolderPinVerifyModal
        folder={folderToVerifyPin}
        isOpen={!!folderToVerifyPin}
        onClose={() => setFolderToVerifyPin(null)}
        onVerified={handlePinVerified}
      />
    </div>
  );
}
