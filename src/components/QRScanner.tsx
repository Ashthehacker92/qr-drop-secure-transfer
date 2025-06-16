
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface QRScannerProps {
  onQRDetected: (data: string) => void;
}

const QRScanner = ({ onQRDetected }: QRScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsScanning(true);
        
        // Start scanning for QR codes
        scanIntervalRef.current = setInterval(scanForQR, 500);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsScanning(false);
  };

  const scanForQR = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.videoWidth === 0) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Simple QR detection simulation (in a real app, you'd use a library like jsQR)
      // For demo purposes, we'll use a placeholder detection
      const mockQRData = detectMockQR(imageData);
      if (mockQRData) {
        onQRDetected(mockQRData);
      }
    } catch (error) {
      console.error('Error scanning QR:', error);
    }
  };

  // Mock QR detection for demo purposes
  // In a real implementation, you'd use a library like jsQR
  const detectMockQR = (imageData: ImageData): string | null => {
    // This is a placeholder - in reality you'd process the imageData
    // to detect and decode QR codes using a proper library
    return null;
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <Card className="p-6 border-matrix-green/20 bg-card/50 backdrop-blur-sm">
      <div className="space-y-4">
        <h3 className="text-lg font-mono font-semibold matrix-text">QR SCANNER</h3>
        
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden border-2 border-matrix-green/30">
          {isScanning ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 border-4 border-matrix-green/50 rounded-lg"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-matrix-green animate-pulse">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-matrix-green"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-matrix-green"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-matrix-green"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-matrix-green"></div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-matrix-green/10 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📷</span>
                </div>
                <div className="text-sm font-mono text-muted-foreground">
                  Camera inactive
                </div>
              </div>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <Button
          onClick={isScanning ? stopCamera : startCamera}
          className={`w-full font-mono font-semibold ${
            isScanning 
              ? "bg-red-600 hover:bg-red-700 text-white" 
              : "bg-matrix-green text-black hover:bg-matrix-green-dark"
          }`}
        >
          {isScanning ? "STOP SCANNING" : "START CAMERA"}
        </Button>

        <div className="text-xs font-mono text-muted-foreground text-center">
          Position QR codes within the scanning area
        </div>
      </div>
    </Card>
  );
};

export default QRScanner;
