import { FileRecord } from "@shared/schema";
import { Cloud, User } from "lucide-react";

interface HeaderProps {
  files: FileRecord[];
}

export default function Header({ files }: HeaderProps) {
  const totalSize = files.reduce((acc, file) => acc + file.size, 0);
  const totalSizeGB = (totalSize / (1024 * 1024 * 1024)).toFixed(1);
  const limitGB = "10";

  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Cloud className="text-primary-foreground w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-foreground">DarrkStorage</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-muted-foreground">
              {totalSizeGB} GB / {limitGB} GB used
            </div>
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <User className="text-muted-foreground w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
