
// Crypto utilities for file encryption, chunking, and QR code generation

export const encryptFile = async (file: File, password: string): Promise<string> => {
  console.log("Starting encryption process...");
  
  // Convert file to ArrayBuffer
  const fileBuffer = await file.arrayBuffer();
  console.log("File converted to buffer, size:", fileBuffer.byteLength);
  
  // Create encryption key from password
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  
  const key = await window.crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // Generate salt
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  
  // Derive AES key
  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    key,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  
  // Generate IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt the file
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    aesKey,
    fileBuffer
  );
  
  // Combine salt, iv, and encrypted data
  const resultBuffer = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength);
  resultBuffer.set(salt, 0);
  resultBuffer.set(iv, salt.length);
  resultBuffer.set(new Uint8Array(encryptedBuffer), salt.length + iv.length);
  
  // Convert to base64 for transmission
  const base64String = btoa(String.fromCharCode(...resultBuffer));
  console.log("Encryption complete, base64 length:", base64String.length);
  
  return base64String;
};

export const decryptFile = async (encryptedData: string, password: string, filename: string): Promise<File> => {
  console.log("Starting decryption process...");
  
  // Convert from base64
  const encryptedBuffer = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  
  // Extract salt, iv, and encrypted data
  const salt = encryptedBuffer.slice(0, 16);
  const iv = encryptedBuffer.slice(16, 28);
  const encrypted = encryptedBuffer.slice(28);
  
  // Create decryption key from password
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  
  const key = await window.crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // Derive AES key
  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    key,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  
  // Decrypt the data
  const decryptedBuffer = await window.crypto.subtle.decrypt(
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
};

export const chunkFile = (data: string, chunkSizeBytes: number): string[] => {
  console.log("Chunking file, data length:", data.length, "chunk size:", chunkSizeBytes);
  
  const chunks: string[] = [];
  
  // Calculate characters per chunk (base64 encoding is ~1.33x original size)
  const charsPerChunk = Math.floor(chunkSizeBytes * 0.75); // Approximate for base64
  
  for (let i = 0; i < data.length; i += charsPerChunk) {
    const chunk = data.slice(i, i + charsPerChunk);
    chunks.push(chunk);
  }
  
  console.log("File chunked into", chunks.length, "pieces");
  return chunks;
};

export const reconstructFile = (chunks: string[]): string => {
  console.log("Reconstructing file from", chunks.length, "chunks");
  
  // Simply concatenate all chunks in order
  const reconstructed = chunks.join('');
  
  console.log("File reconstructed, total length:", reconstructed.length);
  return reconstructed;
};
