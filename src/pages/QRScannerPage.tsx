
import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, FileImage } from "lucide-react";
import jsQR from "jsqr";

const QRScannerPage = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detectedData, setDetectedData] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Placeholder decrypt function
  const decryptData = (data: string) => {
    console.log("Decrypting QR data:", data.substring(0, 100) + "...");
    // TODO: Implement your decryption logic here
    return data;
  };

  const startCamera = async () => {
    setError(null);
    setIsProcessing(true);

    // Check for secure context
    if (!window.isSecureContext) {
      const securityError = "Camera requires HTTPS or localhost";
      setError(securityError);
      setIsProcessing(false);
      toast({
        title: "Security Error",
        description: securityError,
        variant: "destructive",
      });
      return;
    }

    // Check browser support
    if (!navigator.mediaDevices?.getUserMedia) {
      const supportError = "Camera not supported in this browser";
      setError(supportError);
      setIsProcessing(false);
      toast({
        title: "Browser Support",
        description: supportError,
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("Requesting camera access...");
      
      // Try with basic constraints first, then fallback to even simpler ones
      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });
      } catch (constraintError) {
        console.warn("Trying with simpler constraints:", constraintError);
        // Fallback to most basic constraints
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        
        videoRef.current.onloadedmetadata = () => {
          console.log("Video loaded, starting scan");
          setIsScanning(true);
          setIsProcessing(false);
          
          // Start QR scanning
          if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
          }
          scanIntervalRef.current = setInterval(scanForQR, 300);
          
          toast({
            title: "Camera Started",
            description: "Point camera at QR codes to scan",
          });
        };

        videoRef.current.onerror = (e) => {
          console.error("Video error:", e);
          setError("Video playback failed");
          setIsProcessing(false);
        };

        // Force video to play
        videoRef.current.play().catch(e => {
          console.error("Play failed:", e);
        });
      }
    } catch (error: any) {
      console.error("Camera error:", error);
      let errorMessage = "Camera access failed";
      
      if (error.name === 'NotAllowedError') {
        errorMessage = "Camera permission denied. Please allow camera access.";
      } else if (error.name === 'NotFoundError') {
        errorMessage = "No camera found on this device.";
      } else if (error.name === 'NotReadableError') {
        errorMessage = "Camera is already in use by another app.";
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = "Camera settings not supported.";
      }

      setError(errorMessage);
      setIsProcessing(false);
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
      });
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
    setError(null);
  };

  const scanForQR = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (qrCode?.data) {
        handleQRDetected(qrCode.data);
      }
    } catch (error) {
      console.error('QR scanning error:', error);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const image = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      image.onload = () => {
        if (!ctx) return;
        
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
        
        setIsProcessing(false);
        
        if (qrCode?.data) {
          handleQRDetected(qrCode.data);
          toast({
            title: "QR Code Found",
            description: "Successfully detected QR code from image",
          });
        } else {
          setError("No QR code found in image");
          toast({
            title: "No QR Code",
            description: "Could not detect any QR code in the uploaded image",
            variant: "destructive",
          });
        }
      };

      image.onerror = () => {
        setIsProcessing(false);
        setError("Failed to load image");
        toast({
          title: "Image Error",
          description: "Could not load the uploaded image",
          variant: "destructive",
        });
      };

      image.src = URL.createObjectURL(file);
    } catch (error) {
      setIsProcessing(false);
      setError("Error processing image");
      toast({
        title: "Processing Error",
        description: "Failed to process the uploaded image",
        variant: "destructive",
      });
    }

    // Clear the input
    event.target.value = '';
  };

  const handleQRDetected = (data: string) => {
    console.log("QR Code detected:", data);
    
    try {
      const decryptedData = decryptData(data);
      setDetectedData(decryptedData);
      
      toast({
        title: "QR Code Detected",
        description: "Processing QR code data...",
      });
    } catch (error) {
      console.error("Error processing QR data:", error);
      toast({
        title: "Processing Error",
        description: "Failed to process QR code data",
        variant: "destructive",
      });
    }
  };

  const clearResults = () => {
    setDetectedData(null);
    setError(null);
  };

  const retryCamera = () => {
    stopCamera();
    setTimeout(() => {
      startCamera();
    }, 1000);
  };

  // Auto-start camera when component mounts
  useEffect(() => {
    startCamera();
    
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background terminal-grid p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-mono font-bold matrix-text mb-2">
            DEAD DROP QR SCANNER
          </h1>
          <p className="text-lg text-muted-foreground font-mono">
            Fast QR Code Detection & Decryption
          </p>
          <div className="w-24 h-1 bg-matrix-green mx-auto mt-4 animate-pulse-green"></div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Camera Scanner */}
          <Card className="p-6 border-matrix-green/20 bg-card/50 backdrop-blur-sm">
            <h3 className="text-lg font-mono font-semibold matrix-text mb-4">
              CAMERA SCANNER
            </h3>
            
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden border-2 border-matrix-green/30 mb-4">
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
                    <Camera className="w-12 h-12 mx-auto text-matrix-green/50" />
                    <div className="text-sm font-mono text-muted-foreground">
                      {isProcessing ? "Starting camera..." : "Camera inactive"}
                    </div>
                    {error && (
                      <div className="text-xs font-mono text-red-400">
                        {error}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-2">
              <Button
                onClick={isScanning ? stopCamera : startCamera}
                disabled={isProcessing}
                className={`flex-1 font-mono font-semibold ${
                  isScanning 
                    ? "bg-red-600 hover:bg-red-700 text-white" 
                    : "bg-matrix-green text-black hover:bg-matrix-green-dark"
                }`}
              >
                <Camera className="w-4 h-4 mr-2" />
                {isProcessing ? "STARTING..." : isScanning ? "STOP CAMERA" : "START CAMERA"}
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
          </Card>

          {/* Image Upload */}
          <Card className="p-6 border-matrix-green/20 bg-card/50 backdrop-blur-sm">
            <h3 className="text-lg font-mono font-semibold matrix-text mb-4">
              IMAGE UPLOAD
            </h3>
            
            <div className="border-2 border-dashed border-matrix-green/30 rounded-lg p-8 mb-4 text-center">
              <FileImage className="w-12 h-12 mx-auto text-matrix-green/50 mb-4" />
              <p className="text-sm font-mono text-muted-foreground mb-4">
                Upload QR code image from gallery
              </p>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isProcessing}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                variant="outline"
                className="border-matrix-green/50 text-matrix-green hover:bg-matrix-green/10 font-mono"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isProcessing ? "PROCESSING..." : "CHOOSE IMAGE"}
              </Button>
            </div>
          </Card>
        </div>

        {/* Results Section */}
        {(detectedData || error) && (
          <Card className="mt-6 p-6 border-matrix-green/20 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-mono font-semibold matrix-text">
                SCAN RESULTS
              </h3>
              <Button
                onClick={clearResults}
                variant="outline"
                size="sm"
                className="border-matrix-green/50 text-matrix-green hover:bg-matrix-green/10 font-mono"
              >
                CLEAR
              </Button>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription className="font-mono text-sm">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {detectedData && (
              <div className="space-y-3">
                <div className="text-sm font-mono text-matrix-green">
                  QR CODE DATA DETECTED:
                </div>
                <div className="bg-black/50 p-4 rounded border border-matrix-green/30">
                  <pre className="text-xs font-mono text-matrix-green whitespace-pre-wrap break-all">
                    {detectedData.length > 500 
                      ? detectedData.substring(0, 500) + "...[truncated]"
                      : detectedData
                    }
                  </pre>
                </div>
                <div className="text-xs font-mono text-muted-foreground">
                  Data length: {detectedData.length} characters
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Security Notice */}
        {!window.isSecureContext && (
          <Alert variant="destructive" className="mt-6">
            <AlertDescription className="font-mono text-sm">
              ⚠️ Camera requires HTTPS or localhost. Please use a secure connection.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default QRScannerPage;
