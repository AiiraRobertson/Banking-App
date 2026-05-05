import { useEffect, useRef, useState } from 'react';

const TARGET_SIZE = 320;
const JPEG_QUALITY = 0.82;

async function compressImage(fileOrDataUrl) {
  const dataUrl = typeof fileOrDataUrl === 'string'
    ? fileOrDataUrl
    : await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(fileOrDataUrl);
      });

  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Invalid image'));
    i.src = dataUrl;
  });

  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, sx, sy, side, side, 0, 0, TARGET_SIZE, TARGET_SIZE);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

export default function PhotoCapture({ value, onChange, label = 'Verification Photo', required = false }) {
  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [mode, setMode] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => () => stopCamera(), []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Image too large (max 8MB before compression)');
      return;
    }
    setError('');
    try {
      const compressed = await compressImage(file);
      onChange(compressed);
      setMode('idle');
    } catch {
      setError('Could not process image');
    }
  };

  const startCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      setMode('camera');
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 0);
    } catch {
      setError('Camera access denied or unavailable');
      setMode('idle');
    }
  };

  const snap = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const side = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - side) / 2;
    const sy = (video.videoHeight - side) / 2;
    const canvas = document.createElement('canvas');
    canvas.width = TARGET_SIZE;
    canvas.height = TARGET_SIZE;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, sx, sy, side, side, 0, 0, TARGET_SIZE, TARGET_SIZE);
    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    onChange(dataUrl);
    stopCamera();
    setMode('idle');
  };

  const cancelCamera = () => {
    stopCamera();
    setMode('idle');
  };

  const clear = () => onChange(null);

  return (
    <div>
      <label className="block text-sm font-medium text-t-secondary mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {mode === 'camera' ? (
        <div className="border border-b-input rounded-lg p-3 bg-elevated">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full max-w-xs mx-auto rounded-lg bg-black aspect-square object-cover"
          />
          <div className="mt-3 flex justify-center gap-2">
            <button
              type="button"
              onClick={snap}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
            >
              Capture
            </button>
            <button
              type="button"
              onClick={cancelCamera}
              className="px-4 py-2 border border-b-input text-t-secondary rounded-lg text-sm hover:bg-hover"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-b-input bg-elevated flex items-center justify-center shrink-0">
            {value ? (
              <img src={value} alt="profile" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-10 h-10 text-t-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="px-3 py-1.5 border border-b-input text-t-secondary rounded-lg text-sm hover:bg-hover"
              >
                {value ? 'Change file' : 'Upload photo'}
              </button>
              <button
                type="button"
                onClick={startCamera}
                className="px-3 py-1.5 border border-b-input text-t-secondary rounded-lg text-sm hover:bg-hover"
              >
                Use camera
              </button>
              {value && (
                <button
                  type="button"
                  onClick={clear}
                  className="px-3 py-1.5 text-red-600 text-sm hover:bg-red-50 rounded-lg"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-xs text-t-tertiary">
              Clear face shot; we'll resize and store securely.
            </p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
