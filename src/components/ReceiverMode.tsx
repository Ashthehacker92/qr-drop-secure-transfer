
import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import QRScanner from "./QRScanner";
import { decryptFile, reconstructFile } from "@/utils/cryptoUtils";

interface ReceiverModeProps {
  onBack: () => void;
}

interface QRChunk {
  metadata: {
    index: number;
    total: number;
    filename: string;
    size: number;
  };
  data: string;
}

const ReceiverMode = ({ onBack }: ReceiverModeProps) => {
  const [password, setPassword] = useState("");
  const [scanningStarted, setScanningStarted] = useState(false);
  const [chunks, setChunks] = useState<Map<number, QRChunk>>(new Map());
  const [totalChunks, setTotalChunks] = useState(0);
  const [filename, setFilename] = useState("");
  const [isReconstructing, setIsReconstructing] = useState(false);
  const { toast } = useToast();

  const handleQRDetected = (data: string) => {
    try {
      const parsed: QRChunk = JSON.parse(data);
      const { metadata } = parsed;

      // Set total chunks and filename from first scan
      if (totalChunks === 0) {
        setTotalChunks(metadata.total);
        setFilename(metadata.filename);
      }

      // Check if this chunk is already received
      if (chunks.has(metadata.index)) {
        return; // Already have this chunk
      }

      // Add the new chunk
      const newChunks = new Map(chunks);
      newChunks.set(metadata.index, parsed);
      setChunks(newChunks);

      toast({
        title: "QR Code Scanned",
        description: `Chunk ${metadata.index + 1}/${metadata.total} received`,
      });

      // Check if all chunks are received
      if (newChunks.size === metadata.total) {
        toast({
          title: "All Chunks Received",
          description: "Ready to decrypt and reconstruct file",
        });
      }
    } catch (error) {
      console.error("Error parsing QR data:", error);
      toast({
        title: "Invalid QR Code",
        description: "This QR code is not part of a Dead Drop transmission",
        variant: "destructive",
      });
    }
  };

  const reconstructAndDecrypt = async () => {
    if (!password) {
      toast({
        title: "Password Required",
        description: "Please enter the decryption password",
        variant: "destructive",
      });
      return;
    }

    if (chunks.size !== totalChunks) {
      toast({
        title: "Missing Chunks",
        description: `${totalChunks - chunks.size} chunks still needed`,
        variant: "destructive",
      });
      return;
    }

    setIsReconstructing(true);

    try {
      console.log("Reconstructing file from chunks...");
      
      // Sort chunks by index and extract data
      const sortedChunks = Array.from(chunks.values()).sort((a, b) => a.metadata.index - b.metadata.index);
      const chunkData = sortedChunks.map(chunk => chunk.data);
      
      console.log("Merging chunks...");
      const encryptedData = reconstructFile(chunkData);
      
      console.log("Decrypting file...");
      const decryptedFile = await decryptFile(encryptedData, password, filename);
      
      // Create download link
      const url = URL.createObjectURL(decryptedFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "File Reconstructed",
        description: `${filename} has been decrypted and downloaded`,
      });

      // Reset state
      setChunks(new Map());
      setTotalChunks(0);
      setFilename("");
      setScanningStarted(false);
      setPassword("");
      
    } catch (error) {
      console.error("Error reconstructing file:", error);
      toast({
        title: "Decryption Failed",
        description: "Check password or file integrity",
        variant: "destructive",
      });
    } finally {
      setIsReconstructing(false);
    }
  };

  const resetScanning = () => {
    setChunks(new Map());
    setTotalChunks(0);
    setFilename("");
    setScanningStarted(false);
    setPassword("");
  };

  if (scanningStarted) {
    return (
      <div className="min-h-screen bg-background terminal-grid p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <Button 
              onClick={onBack}
              variant="outline" 
              className="border-matrix-green/50 text-matrix-green hover:bg-matrix-green/10 font-mono"
            >
              ← BACK TO MENU
            </Button>
            <h1 className="text-2xl font-mono font-bold matrix-text">SCANNING MODE</h1>
            <Button 
              onClick={resetScanning}
              variant="outline" 
              className="border-red-500/50 text-red-500 hover:bg-red-500/10 font-mono"
            >
              RESET
            </Button>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <QRScanner onQRDetected={handleQRDetected} />
            
            <Card className="p-6 border-matrix-green/20 bg-card/50 backdrop-blur-sm">
              <h3 className="text-lg font-mono font-semibold matrix-text mb-4">RECEPTION STATUS</h3>
              
              {totalChunks > 0 && (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-mono text-muted-foreground">TARGET FILE</div>
                    <div className="font-mono text-matrix-green">{filename}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-mono text-muted-foreground mb-2">
                      CHUNKS RECEIVED: {chunks.size}/{totalChunks}
                    </div>
                    <Progress 
                      value={(chunks.size / totalChunks) * 100} 
                      className="w-full"
                    />
                  </div>

                  <div>
                    <Label htmlFor="decrypt-password" className="text-sm font-mono">DECRYPTION PASSWORD</Label>
                    <Input
                      id="decrypt-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter decryption password..."
                      className="mt-2 font-mono border-matrix-green/30 focus:border-matrix-green"
                    />
                  </div>

                  <Button
                    onClick={reconstructAndDecrypt}
                    disabled={chunks.size !== totalChunks || !password || isReconstructing}
                    className="w-full bg-matrix-green text-black hover:bg-matrix-green-dark font-mono font-semibold disabled:opacity-50"
                  >
                    {isReconstructing ? "DECRYPTING..." : "DECRYPT & DOWNLOAD"}
                  </Button>
                </div>
              )}

              {totalChunks === 0 && (
                <div className="text-center py-8">
                  <div className="text-sm font-mono text-muted-foreground">
                    Waiting for first QR code...
                  </div>
                  <div className="w-8 h-8 border-2 border-matrix-green border-t-transparent rounded-full animate-spin mx-auto mt-4"></div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background terminal-grid p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Button 
            onClick={onBack}
            variant="outline" 
            className="border-matrix-green/50 text-matrix-green hover:bg-matrix-green/10 font-mono"
          >
            ← BACK TO MENU
          </Button>
          <h1 className="text-2xl font-mono font-bold matrix-text">RECEIVER MODE</h1>
        </div>

        <Card className="p-8 border-matrix-green/20 bg-card/50 backdrop-blur-sm text-center">
          <div className="space-y-6">
            <div className="w-24 h-24 mx-auto bg-matrix-green/10 rounded-lg flex items-center justify-center">
              <span className="text-4xl font-mono matrix-text">📱</span>
            </div>
            
            <div>
              <h3 className="text-xl font-mono font-semibold mb-2">Ready to Receive</h3>
              <p className="text-muted-foreground text-sm">
                Position QR codes in front of your camera to start receiving encrypted file chunks
              </p>
            </div>

            <Button
              onClick={() => setScanningStarted(true)}
              className="w-full bg-matrix-green text-black hover:bg-matrix-green-dark font-mono font-semibold"
            >
              START CAMERA SCANNING
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ReceiverMode;
