
// Crypto utilities for file encryption, chunking, and QR code generation

// Constants for memory-efficient processing
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks for processing
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB max file size

export const encryptFile = async (file: File, password: string): Promise<string> => {
  console.log("Starting encryption process for file:", file.name, "size:", file.size);
  
  // Validate inputs
  if (!file || file.size === 0) {
    throw new Error("Invalid file or empty file");
  }
  
  if (!password || password.length < 1) {
    throw new Error("Password is required");
  }
  
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }
  
  try {
    // Convert file to ArrayBuffer using FileReader for better memory management
    const fileBuffer = await readFileAsArrayBuffer(file);
    console.log("File read successfully, size:", fileBuffer.byteLength);
    
    // Create encryption key from password
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    
    // Import key for PBKDF2
    const baseKey = await crypto.subtle.importKey(
      'raw',
      passwordData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    console.log("Base key imported successfully");
    
    // Generate salt
    const salt = crypto.getRandomValues(new Uint8Array(16));
    console.log("Salt generated");
    
    // Derive AES key using PBKDF2
    const aesKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    console.log("AES key derived successfully");
    
    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    console.log("IV generated");
    
    // Encrypt the file data
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      aesKey,
      fileBuffer
    );
    console.log("File encrypted successfully, encrypted size:", encryptedBuffer.byteLength);
    
    // Combine salt, iv, and encrypted data
    const resultArray = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength);
    resultArray.set(salt, 0);
    resultArray.set(iv, salt.length);
    resultArray.set(new Uint8Array(encryptedBuffer), salt.length + iv.length);
    
    // Convert to base64 in chunks to avoid memory issues
    const base64String = arrayBufferToBase64(resultArray.buffer);
    console.log("Encryption complete, base64 length:", base64String.length);
    
    return base64String;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Helper function to read file as ArrayBuffer with proper error handling
const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file as ArrayBuffer"));
      }
    };
    
    reader.onerror = () => {
      reject(new Error("File reading failed"));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

// Memory-efficient base64 conversion
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192; // Process in 8KB chunks
  let result = '';
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    result += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(result);
};

export const decryptFile = async (encryptedData: string, password: string, filename: string): Promise<File> => {
  console.log("Starting decryption process...");
  
  try {
    // Convert from base64
    const encryptedBuffer = base64ToArrayBuffer(encryptedData);
    const encryptedArray = new Uint8Array(encryptedBuffer);
    
    // Extract salt, iv, and encrypted data
    const salt = encryptedArray.slice(0, 16);
    const iv = encryptedArray.slice(16, 28);
    const encrypted = encryptedArray.slice(28);
    
    // Create decryption key from password
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    
    const baseKey = await crypto.subtle.importKey(
      'raw',
      passwordData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    // Derive AES key
    const aesKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      aesKey,
      encrypted
    );
    
    console.log("Decryption complete, creating file...");
    
    // Create file from decrypted data
    return new File([decryptedBuffer], filename);
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Invalid password or corrupted data'}`);
  }
};

// Memory-efficient base64 to ArrayBuffer conversion
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes.buffer;
};

export const chunkFile = (data: string, chunkSizeBytes: number): string[] => {
  console.log("Chunking file, data length:", data.length, "chunk size:", chunkSizeBytes);
  
  const chunks: string[] = [];
  
  // Calculate characters per chunk (base64 encoding)
  const charsPerChunk = Math.floor(chunkSizeBytes * 0.75); // Account for base64 overhead
  
  // Use iterative approach to avoid stack overflow
  let currentIndex = 0;
  while (currentIndex < data.length) {
    const endIndex = Math.min(currentIndex + charsPerChunk, data.length);
    const chunk = data.slice(currentIndex, endIndex);
    chunks.push(chunk);
    currentIndex = endIndex;
    
    // Allow event loop to process other tasks
    if (chunks.length % 10 === 0) {
      console.log(`Processed ${chunks.length} chunks...`);
    }
  }
  
  console.log("File chunked into", chunks.length, "pieces");
  return chunks;
};

export const reconstructFile = (chunks: string[]): string => {
  console.log("Reconstructing file from", chunks.length, "chunks");
  
  // Use iterative concatenation with pre-allocated array for better performance
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const parts: string[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    parts.push(chunks[i]);
    
    // Log progress for large reconstructions
    if (i > 0 && i % 50 === 0) {
      console.log(`Reconstructed ${i}/${chunks.length} chunks`);
    }
  }
  
  const reconstructed = parts.join('');
  console.log("File reconstructed, total length:", reconstructed.length);
  return reconstructed;
};

// New utility function for asynchronous processing with progress
export const processFileAsync = async (
  file: File,
  password: string,
  chunkSizeKB: number,
  onProgress?: (step: string, progress: number) => void
): Promise<string[]> => {
  try {
    // Step 1: Encrypt file
    onProgress?.("Encrypting file...", 0);
    const encryptedData = await encryptFile(file, password);
    
    // Step 2: Chunk the data
    onProgress?.("Chunking data...", 50);
    const chunks = chunkFile(encryptedData, chunkSizeKB * 1024);
    
    // Step 3: Prepare QR data with metadata
    onProgress?.("Preparing QR codes...", 75);
    const qrData: string[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const metadata = {
        index: i,
        total: chunks.length,
        filename: file.name,
        size: file.size,
      };
      
      const qrContent = JSON.stringify({ metadata, data: chunks[i] });
      qrData.push(qrContent);
      
      // Yield control periodically to prevent UI blocking
      if (i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
        onProgress?.("Preparing QR codes...", 75 + (i / chunks.length) * 25);
      }
    }
    
    onProgress?.("Complete", 100);
    return qrData;
    
  } catch (error) {
    console.error("Async processing error:", error);
    throw error;
  }
};
