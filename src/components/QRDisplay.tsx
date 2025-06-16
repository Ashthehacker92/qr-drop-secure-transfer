
import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import QRCode from "qrcode";

interface QRDisplayProps {
  data: string;
  currentIndex: number;
  total: number;
  filename: string;
  onNext: () => void;
  onPrev: () => void;
}

const QRDisplay = ({ data, currentIndex, total, filename, onNext, onPrev }: QRDisplayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    console.log("QRDisplay useEffect triggered for chunk", currentIndex + 1);
    console.log("Data length:", data?.length || 0, "characters");
    
    if (canvasRef.current && data) {
      console.log("Generating QR code for chunk", currentIndex + 1, "with", data.length, "characters");
      
      // Use lower error correction and smaller modules for larger data capacity
      QRCode.toCanvas(canvasRef.current, data, {
        width: 400,
        margin: 2,
        errorCorrectionLevel: 'L', // Low error correction for maximum data capacity
        color: {
          dark: '#00ff41',
          light: '#000000'
        }
      }).then(() => {
        console.log("QR code generated successfully for chunk", currentIndex + 1);
      }).catch((error) => {
        console.error('QR Code generation error for chunk', currentIndex + 1, ':', error);
        console.error('Data length was:', data.length, 'characters');
        
        // Try with even more aggressive settings
        if (data.length > 1500) {
          console.log("Data too large, trying with medium error correction...");
          QRCode.toCanvas(canvasRef.current!, data, {
            width: 300,
            margin: 1,
            errorCorrectionLevel: 'L',
            version: 40, // Maximum version
            color: {
              dark: '#00ff41',
              light: '#000000'
            }
          }).catch((secondError) => {
            console.error('Second attempt failed:', secondError);
          });
        }
      });
    } else {
      console.log("Cannot generate QR: canvas or data missing", {
        canvas: !!canvasRef.current,
        data: !!data,
        dataLength: data?.length || 0
      });
    }
  }, [data, currentIndex]);

  const progress = ((currentIndex + 1) / total) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-8 border-matrix-green/20 bg-card/50 backdrop-blur-sm">
        <div className="text-center space-y-6">
          <div>
            <h3 className="text-xl font-mono font-semibold matrix-text mb-2">
              TRANSMITTING: {filename}
            </h3>
            <div className="text-sm font-mono text-muted-foreground">
              QR CODE {currentIndex + 1} OF {total}
            </div>
            <div className="text-xs font-mono text-muted-foreground mt-1">
              Data size: {data?.length || 0} characters
            </div>
            <Progress value={progress} className="w-full mt-2" />
          </div>

          <div className="flex justify-center">
            <div className="p-4 bg-black rounded-lg border-2 border-matrix-green/30">
              <canvas 
                ref={canvasRef}
                className="max-w-full h-auto"
              />
            </div>
          </div>

          <div className="flex justify-between gap-4">
            <Button
              onClick={onPrev}
              disabled={currentIndex === 0}
              variant="outline"
              className="flex-1 border-matrix-green/50 text-matrix-green hover:bg-matrix-green/10 font-mono disabled:opacity-30"
            >
              ← PREVIOUS
            </Button>
            
            <Button
              onClick={onNext}
              disabled={currentIndex === total - 1}
              variant="outline"
              className="flex-1 border-matrix-green/50 text-matrix-green hover:bg-matrix-green/10 font-mono disabled:opacity-30"
            >
              NEXT →
            </Button>
          </div>

          <div className="text-xs font-mono text-muted-foreground">
            Scan each QR code in sequence on the receiving device
          </div>
        </div>
      </Card>
    </div>
  );
};

export default QRDisplay;
