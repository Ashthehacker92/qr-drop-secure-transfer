import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import QRDisplay from "./QRDisplay";
import { encryptFile, chunkFile } from "@/utils/cryptoUtils";

interface SenderModeProps {
  onBack: () => void;
}

const SenderMode = ({ onBack }: SenderModeProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [chunkSize, setChunkSize] = useState("512");
  const [qrCodes, setQrCodes] = useState<string[]>([]);
  const [currentQR, setCurrentQR] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transmissionStarted, setTransmissionStarted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      console.log("File selected:", selectedFile.name, selectedFile.size);
      toast({
        title: "File Selected",
        description: `${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`,
      });
    }
  };

  const processFile = async () => {
    if (!file || !password) {
      toast({
        title: "Missing Information",
        description: "Please select a file and enter a password",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      console.log("Starting file encryption...");
      const encryptedData = await encryptFile(file, password);
      console.log("File encrypted, data length:", encryptedData.length);
      
      const chunks = chunkFile(encryptedData, parseInt(chunkSize) * 1024);
      console.log(`Created ${chunks.length} chunks`);
      
      // Convert chunks to QR codes (base64 encoded)
      const qrData = chunks.map((chunk, index) => {
        const metadata = {
          index,
          total: chunks.length,
          filename: file.name,
          size: file.size,
        };
        const qrContent = JSON.stringify({ metadata, data: chunk });
        console.log(`QR ${index + 1} content length:`, qrContent.length);
        return qrContent;
      });
      
      console.log("QR data array created with", qrData.length, "items");
      
      setQrCodes(qrData);
      setCurrentQR(0);
      setTransmissionStarted(true);
      
      toast({
        title: "File Processed",
        description: `Ready to transmit ${chunks.length} QR codes`,
      });
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "Processing Error",
        description: "Failed to encrypt and chunk file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const nextQR = () => {
    if (currentQR < qrCodes.length - 1) {
      const newIndex = currentQR + 1;
      console.log("Moving to QR", newIndex + 1);
      setCurrentQR(newIndex);
    }
  };

  const prevQR = () => {
    if (currentQR > 0) {
      const newIndex = currentQR - 1;
      console.log("Moving to QR", newIndex + 1);
      setCurrentQR(newIndex);
    }
  };

  const resetTransmission = () => {
    setFile(null);
    setPassword("");
    setQrCodes([]);
    setCurrentQR(0);
    setTransmissionStarted(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (transmissionStarted && qrCodes.length > 0) {
    console.log("Rendering QR display with", qrCodes.length, "QR codes, current:", currentQR);
    
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
            <h1 className="text-2xl font-mono font-bold matrix-text">TRANSMISSION MODE</h1>
            <Button 
              onClick={resetTransmission}
              variant="outline" 
              className="border-red-500/50 text-red-500 hover:bg-red-500/10 font-mono"
            >
              RESET
            </Button>
          </div>

          <QRDisplay 
            data={qrCodes[currentQR]}
            currentIndex={currentQR}
            total={qrCodes.length}
            filename={file?.name || ""}
            onNext={nextQR}
            onPrev={prevQR}
          />
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
          <h1 className="text-2xl font-mono font-bold matrix-text">SENDER MODE</h1>
        </div>

        <Card className="p-8 border-matrix-green/20 bg-card/50 backdrop-blur-sm">
          <div className="space-y-6">
            <div>
              <Label htmlFor="file" className="text-sm font-mono">FILE SELECTION</Label>
              <Input
                ref={fileInputRef}
                id="file"
                type="file"
                onChange={handleFileSelect}
                className="mt-2 font-mono border-matrix-green/30 focus:border-matrix-green"
              />
              {file && (
                <p className="mt-2 text-sm text-matrix-green font-mono">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-mono">ENCRYPTION PASSWORD</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter strong password..."
                className="mt-2 font-mono border-matrix-green/30 focus:border-matrix-green"
              />
            </div>

            <div>
              <Label htmlFor="chunkSize" className="text-sm font-mono">CHUNK SIZE (KB)</Label>
              <Select value={chunkSize} onValueChange={setChunkSize}>
                <SelectTrigger className="mt-2 font-mono border-matrix-green/30 focus:border-matrix-green">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="256">256 KB</SelectItem>
                  <SelectItem value="512">512 KB</SelectItem>
                  <SelectItem value="1024">1 MB</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={processFile}
              disabled={!file || !password || isProcessing}
              className="w-full bg-matrix-green text-black hover:bg-matrix-green-dark font-mono font-semibold disabled:opacity-50"
            >
              {isProcessing ? "PROCESSING..." : "ENCRYPT & GENERATE QR CODES"}
            </Button>

            {isProcessing && (
              <div className="space-y-2">
                <div className="text-sm font-mono text-matrix-green">Processing file...</div>
                <Progress value={50} className="w-full" />
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SenderMode;
