
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SenderMode from "@/components/SenderMode";
import ReceiverMode from "@/components/ReceiverMode";

const Index = () => {
  const [mode, setMode] = useState<'select' | 'sender' | 'receiver'>('select');

  if (mode === 'sender') {
    return <SenderMode onBack={() => setMode('select')} />;
  }

  if (mode === 'receiver') {
    return <ReceiverMode onBack={() => setMode('select')} />;
  }

  return (
    <div className="min-h-screen bg-background terminal-grid flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-mono font-bold matrix-text mb-4">
            DEAD DROP
          </h1>
          <p className="text-xl text-muted-foreground font-mono">
            Offline Encrypted File Exchange System
          </p>
          <div className="w-32 h-1 bg-matrix-green mx-auto mt-4 animate-pulse-green"></div>
        </div>

        {/* Mode Selection */}
        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          <Card className="p-8 border-matrix-green/20 bg-card/50 backdrop-blur-sm hover:border-matrix-green/40 transition-all duration-300 scanline">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-matrix-green/10 rounded-lg flex items-center justify-center">
                <span className="text-2xl font-mono matrix-text">TX</span>
              </div>
              <h3 className="text-xl font-mono font-semibold">SENDER MODE</h3>
              <p className="text-muted-foreground text-sm">
                Encrypt and transmit files via QR code chains
              </p>
              <Button 
                onClick={() => setMode('sender')}
                className="w-full bg-matrix-green text-black hover:bg-matrix-green-dark font-mono font-semibold"
              >
                INITIATE TRANSMISSION
              </Button>
            </div>
          </Card>

          <Card className="p-8 border-matrix-green/20 bg-card/50 backdrop-blur-sm hover:border-matrix-green/40 transition-all duration-300 scanline">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-matrix-green/10 rounded-lg flex items-center justify-center">
                <span className="text-2xl font-mono matrix-text">RX</span>
              </div>
              <h3 className="text-xl font-mono font-semibold">RECEIVER MODE</h3>
              <p className="text-muted-foreground text-sm">
                Scan and decrypt incoming QR code chains
              </p>
              <Button 
                onClick={() => setMode('receiver')}
                className="w-full bg-matrix-green text-black hover:bg-matrix-green-dark font-mono font-semibold"
              >
                START SCANNING
              </Button>
            </div>
          </Card>
        </div>

        {/* Features */}
        <div className="mt-16 text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto text-sm font-mono text-muted-foreground">
            <div>AES-256 ENCRYPTION</div>
            <div>OFFLINE TRANSFER</div>
            <div>QR CHAIN PROTOCOL</div>
            <div>ZERO NETWORK</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
