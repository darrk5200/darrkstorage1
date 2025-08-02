import { FolderInfo } from "@shared/schema";
import { Folder, Image, MoreVertical, Trash2, ImageOff, Edit2, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FolderGridProps {
  folders: FolderInfo[];
  onFolderClick: (folder: FolderInfo) => void;
  onDeleteFolder?: (folder: FolderInfo) => void;
  onDeleteAllImages?: (folder: FolderInfo) => void;
  onRenameFolder?: (folder: FolderInfo) => void;
  onAddPin?: (folder: FolderInfo) => void;
  viewMode: 'grid' | 'list';
}

export default function FolderGrid({ folders, onFolderClick, onDeleteFolder, onDeleteAllImages, onRenameFolder, onAddPin, viewMode }: FolderGridProps) {
  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };
  if (viewMode === 'list') {
    return (
      <div className="space-y-2">
        {folders.map((folder) => (
          <div 
            key={folder.path} 
            className="group bg-card hover:bg-accent rounded-lg p-4 flex items-center space-x-4 transition-colors cursor-pointer"
            onClick={() => onFolderClick(folder)}
          >
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Folder className="w-6 h-6 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-foreground truncate">{folder.name}</h4>
              <p className="text-xs text-muted-foreground">
                {folder.fileCount > 0 && `${folder.fileCount} files`}
                {folder.subfolderCount > 0 && folder.fileCount > 0 && ', '}
                {folder.subfolderCount > 0 && `${folder.subfolderCount} folders`}
                {folder.fileCount === 0 && folder.subfolderCount === 0 && 'Empty'}
              </p>
            </div>

            {(onDeleteFolder || onDeleteAllImages || onRenameFolder || onAddPin) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleActionClick(e, () => {})}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onRenameFolder && (
                    <DropdownMenuItem
                      onClick={(e) => handleActionClick(e, () => onRenameFolder(folder))}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Rename folder
                    </DropdownMenuItem>
                  )}
                  {onAddPin && !folder.hasPin && (
                    <DropdownMenuItem
                      onClick={(e) => handleActionClick(e, () => onAddPin(folder))}
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Add PIN
                    </DropdownMenuItem>
                  )}
                  {onDeleteAllImages && folder.fileCount > 0 && (
                    <DropdownMenuItem
                      onClick={(e) => handleActionClick(e, () => onDeleteAllImages(folder))}
                      className="text-orange-600 focus:text-orange-600"
                    >
                      <ImageOff className="w-4 h-4 mr-2" />
                      Delete all images
                    </DropdownMenuItem>
                  )}
                  {onDeleteFolder && (
                    <DropdownMenuItem
                      onClick={(e) => handleActionClick(e, () => onDeleteFolder(folder))}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete folder
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {folders.map((folder) => (
        <Card 
          key={folder.path} 
          className="group relative bg-card hover:bg-accent transition-colors cursor-pointer"
          onClick={() => onFolderClick(folder)}
        >
          <CardContent className="p-0">
            <div className="aspect-square relative rounded-t-lg bg-muted flex items-center justify-center">
              <Folder className="w-8 h-8 text-primary" />
              <div className="absolute bottom-2 right-2 bg-primary/20 rounded-full p-1">
                <Image className="w-3 h-3 text-primary" />
              </div>
              
              {(onDeleteFolder || onDeleteAllImages || onRenameFolder || onAddPin) && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 bg-background/80 hover:bg-background"
                        onClick={(e) => handleActionClick(e, () => {})}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onRenameFolder && (
                        <DropdownMenuItem
                          onClick={(e) => handleActionClick(e, () => onRenameFolder(folder))}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Rename folder
                        </DropdownMenuItem>
                      )}
                      {onAddPin && !folder.hasPin && (
                        <DropdownMenuItem
                          onClick={(e) => handleActionClick(e, () => onAddPin(folder))}
                        >
                          <Lock className="w-4 h-4 mr-2" />
                          Add PIN
                        </DropdownMenuItem>
                      )}
                      {onDeleteAllImages && folder.fileCount > 0 && (
                        <DropdownMenuItem
                          onClick={(e) => handleActionClick(e, () => onDeleteAllImages(folder))}
                          className="text-orange-600 focus:text-orange-600"
                        >
                          <ImageOff className="w-4 h-4 mr-2" />
                          Delete all images
                        </DropdownMenuItem>
                      )}
                      {onDeleteFolder && (
                        <DropdownMenuItem
                          onClick={(e) => handleActionClick(e, () => onDeleteFolder(folder))}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete folder
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
            
            <div className="p-3">
              <h4 className="text-sm font-medium text-foreground truncate">{folder.name}</h4>
              <p className="text-xs text-muted-foreground mt-1">
                {folder.fileCount > 0 && `${folder.fileCount} files`}
                {folder.subfolderCount > 0 && folder.fileCount > 0 && ', '}
                {folder.subfolderCount > 0 && `${folder.subfolderCount} folders`}
                {folder.fileCount === 0 && folder.subfolderCount === 0 && 'Empty'}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}