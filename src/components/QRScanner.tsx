
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import jsQR from "jsqr";

interface QRScannerProps {
  onQRDetected: (data: string) => void;
}

const QRScanner = ({ onQRDetected }: QRScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastScannedData, setLastScannedData] = useState<string | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const getCameraConstraints = () => {
    return {
      video: {
        facingMode: { ideal: 'environment' }, // Prefer back camera on mobile
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 }
      }
    };
  };

  const handleCameraError = (error: any) => {
    console.error('Camera error:', error);
    let errorMessage = "Unknown camera error occurred";
    
    if (error.name === 'NotAllowedError') {
      errorMessage = "Camera access denied. Please allow camera permissions and try again.";
    } else if (error.name === 'NotFoundError') {
      errorMessage = "No camera found on this device.";
    } else if (error.name === 'NotReadableError') {
      errorMessage = "Camera is already in use by another application.";
    } else if (error.name === 'OverconstrainedError') {
      errorMessage = "Camera constraints not supported. Trying with basic settings...";
    } else if (error.name === 'NotSupportedError') {
      errorMessage = "Camera not supported on this browser.";
    } else if (error.message) {
      errorMessage = error.message;
    }

    setError(errorMessage);
    setIsLoading(false);
    setIsScanning(false);

    toast({
      title: "Camera Error",
      description: errorMessage,
      variant: "destructive",
    });
  };

  const startCamera = async () => {
    setIsLoading(true);
    setError(null);
    console.log("Starting camera...");

    // Check if running on secure context
    if (!window.isSecureContext) {
      const securityError = "Camera requires HTTPS or localhost. Please use a secure connection.";
      setError(securityError);
      setIsLoading(false);
      toast({
        title: "Security Error",
        description: securityError,
        variant: "destructive",
      });
      return;
    }

    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const supportError = "Camera access not supported in this browser.";
      setError(supportError);
      setIsLoading(false);
      toast({
        title: "Browser Support",
        description: supportError,
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("Requesting camera access...");
      
      let mediaStream;
      try {
        // Try with preferred constraints first
        mediaStream = await navigator.mediaDevices.getUserMedia(getCameraConstraints());
      } catch (constraintError) {
        console.warn("Failed with preferred constraints, trying basic:", constraintError);
        // Fallback to basic constraints
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
          });
        } catch (basicError) {
          console.warn("Failed with environment camera, trying any camera:", basicError);
          // Final fallback to any camera
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
        }
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          console.log("Video metadata loaded, starting scan");
          setIsScanning(true);
          setIsLoading(false);
          setError(null);
          
          // Start scanning for QR codes
          if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
          }
          scanIntervalRef.current = setInterval(scanForQR, 200); // Scan every 200ms
          
          toast({
            title: "Camera Started",
            description: "Position QR codes in the scanning area",
          });
        };

        videoRef.current.onerror = (e) => {
          console.error("Video element error:", e);
          handleCameraError(new Error("Video playback error"));
        };

        // Force video to play
        videoRef.current.play().catch(e => {
          console.error("Play failed:", e);
        });
      }
    } catch (error) {
      handleCameraError(error);
    }
  };

  const stopCamera = () => {
    console.log("Stopping camera");
    
    if (stream) {
      stream.getTracks().forEach(track => {
        console.log("Stopping track:", track.kind);
        track.stop();
      });
      setStream(null);
    }
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsScanning(false);
    setIsLoading(false);
    setError(null);
    setLastScannedData(null);
  };

  const scanForQR = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
      // Get image data from canvas
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Use jsQR to detect QR codes
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      
      if (qrCode && qrCode.data) {
        // Prevent duplicate detections
        if (qrCode.data !== lastScannedData) {
          console.log("QR Code detected:", qrCode.data.substring(0, 100) + "...");
          setLastScannedData(qrCode.data);
          onQRDetected(qrCode.data);
          
          // Clear the last scanned data after a delay to allow re-scanning
          setTimeout(() => {
            setLastScannedData(null);
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error scanning QR:', error);
    }
  };

  const retryCamera = () => {
    stopCamera();
    setTimeout(() => {
      startCamera();
    }, 500);
  };

  // Auto-start camera when component mounts
  useEffect(() => {
    console.log("QRScanner mounted, auto-starting camera...");
    startCamera();
    
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <Card className="p-6 border-matrix-green/20 bg-card/50 backdrop-blur-sm">
      <div className="space-y-4">
        <h3 className="text-lg font-mono font-semibold matrix-text">QR SCANNER</h3>
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="font-mono text-sm">
              {error}
            </AlertDescription>
          </Alert>
        )}
        
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
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-matrix-green animate-pulse">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-matrix-green"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-matrix-green"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-matrix-green"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-matrix-green"></div>
              </div>
              <div className="absolute bottom-4 left-4 right-4 text-center">
                <div className="bg-black/70 text-matrix-green text-sm font-mono px-3 py-1 rounded">
                  SCANNING FOR QR CODES...
                </div>
              </div>
            </>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="w-8 h-8 border-2 border-matrix-green border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div className="text-sm font-mono text-matrix-green">
                  Starting camera...
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-matrix-green/10 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📷</span>
                </div>
                <div className="text-sm font-mono text-muted-foreground">
                  {error ? "Camera error" : "Camera inactive"}
                </div>
              </div>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="flex gap-2">
          <Button
            onClick={isScanning ? stopCamera : startCamera}
            disabled={isLoading}
            className={`flex-1 font-mono font-semibold ${
              isScanning 
                ? "bg-red-600 hover:bg-red-700 text-white" 
                : "bg-matrix-green text-black hover:bg-matrix-green-dark"
            }`}
          >
            {isLoading ? "STARTING..." : isScanning ? "STOP SCANNING" : "START CAMERA"}
          </Button>
          
          {error && (
            <Button
              onClick={retryCamera}
              variant="outline"
              className="border-matrix-green/50 text-matrix-green hover:bg-matrix-green/10 font-mono"
            >
              RETRY
            </Button>
          )}
        </div>

        <div className="text-xs font-mono text-muted-foreground text-center space-y-1">
          <div>Position QR codes within the scanning area</div>
          {!window.isSecureContext && (
            <div className="text-red-400">⚠️ Requires HTTPS or localhost for camera access</div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default QRScanner;
