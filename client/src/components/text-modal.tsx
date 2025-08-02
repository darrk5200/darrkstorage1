import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileRecord } from "@shared/schema";
import { Download, Copy, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TextModalProps {
  file: FileRecord | null;
  onClose: () => void;
}

export default function TextModal({ file, onClose }: TextModalProps) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!file) {
      setContent("");
      setError(null);
      return;
    }

    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/files/${file.id}/view`);
        if (!response.ok) {
          throw new Error('Failed to load file content');
        }
        const text = await response.text();
        setContent(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [file]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied to clipboard",
        description: "File content has been copied to your clipboard.",
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Failed to copy content to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (!file) return;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.originalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLanguageFromExtension = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      css: 'css',
      html: 'html',
      xml: 'xml',
      json: 'json',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      php: 'php',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      vue: 'vue',
      md: 'markdown',
      yml: 'yaml',
      yaml: 'yaml'
    };
    return languageMap[ext || ''] || 'text';
  };

  if (!file) return null;

  const isTextFile = file.mimeType.startsWith('text/') || 
                    file.mimeType === 'application/json' ||
                    file.mimeType === 'application/javascript' ||
                    file.mimeType === 'application/xml' ||
                    ['.txt', '.csv', '.js', '.css', '.html', '.xml', '.json', '.md', '.py', '.java', '.cpp', '.c', '.h', '.php', '.rb', '.go', '.rs', '.ts', '.tsx', '.jsx', '.vue', '.yml', '.yaml'].some(ext => 
                      file.originalName.toLowerCase().endsWith(ext)
                    );

  if (!isTextFile) return null;

  return (
    <Dialog open={!!file} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <div className="flex-shrink-0 p-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold truncate">
                {file.originalName}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Text file viewer
              </DialogDescription>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={loading || !!error}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={loading || !!error}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden px-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-32 text-red-500">
              <p>{error}</p>
            </div>
          ) : (
            <div className="h-full border rounded-lg bg-muted overflow-hidden">
              <div className="h-full overflow-auto">
                <pre className="text-sm p-4 whitespace-pre-wrap break-words font-mono">
                  <code className={`language-${getLanguageFromExtension(file.originalName)}`}>
                    {content}
                  </code>
                </pre>
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 px-6 pb-6 pt-4">
          <div className="text-xs text-muted-foreground">
            File size: {(file.size / 1024).toFixed(1)} KB • 
            Type: {file.mimeType} • 
            Lines: {content.split('\n').length}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}