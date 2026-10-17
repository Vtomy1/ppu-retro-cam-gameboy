/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, FlipHorizontal, Pause, Play, SwitchCamera, Upload } from 'lucide-react';
import { TEST_CARDS } from '../utils/testCards';
import { playShutterSound, playUiTick } from '../utils/audio';

interface WebcamInputProps {
  onFrame: (canvas: HTMLCanvasElement) => void;
  targetWidth: number;
  targetHeight: number;
  mirror: boolean;
  onToggleMirror: () => void;
  onSetMirror?: (mirror: boolean) => void;
}

export type FacingMode = 'user' | 'environment';

export const WebcamInput: React.FC<WebcamInputProps> = ({
  onFrame,
  targetWidth,
  targetHeight,
  mirror,
  onToggleMirror,
  onSetMirror,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<FacingMode>('user');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [activeTestCard, setActiveTestCard] = useState<string | null>('gbc_camera_face');
  const [staticImageElement, setStaticImageElement] = useState<HTMLImageElement | null>(null);

  // Initialize hidden processing canvas
  useEffect(() => {
    if (!hiddenCanvasRef.current) {
      const c = document.createElement('canvas');
      c.width = targetWidth;
      c.height = targetHeight;
      hiddenCanvasRef.current = c;
    }
  }, [targetWidth, targetHeight]);

  // Enumerate video input devices
  const updateDeviceList = useCallback(async () => {
    try {
      if (navigator.mediaDevices?.enumerateDevices) {
        const devList = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devList.filter((d) => d.kind === 'videoinput');
        setDevices(videoDevs);
        if (videoDevs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevs[0].deviceId);
        }
      }
    } catch {
      // Ignore
    }
  }, [selectedDeviceId]);

  // Start webcam stream with specific facingMode or deviceId
  const startCamera = async (targetFacing: FacingMode = facingMode, specificDeviceId?: string) => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      // If a specific device ID was picked, use it. Otherwise request ideal facingMode ('environment' = Back, 'user' = Front)
      let videoConstraints: MediaTrackConstraints;
      if (specificDeviceId) {
        videoConstraints = {
          deviceId: { exact: specificDeviceId },
          width: { ideal: 640 },
          height: { ideal: 480 },
        };
      } else {
        videoConstraints = {
          facingMode: { ideal: targetFacing },
          width: { ideal: 640 },
          height: { ideal: 480 },
        };
      }

      const constraints: MediaStreamConstraints = {
        video: videoConstraints,
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Check the actual facing mode & device id assigned by browser
      const track = stream.getVideoTracks()[0];
      if (track) {
        const settings = track.getSettings?.();
        if (settings?.deviceId) {
          setSelectedDeviceId(settings.deviceId);
        }
        if (settings?.facingMode === 'environment' || settings?.facingMode === 'user') {
          setFacingMode(settings.facingMode as FacingMode);
        } else {
          setFacingMode(targetFacing);
        }
      }

      // Automatically disable mirror for back camera, enable for front camera
      if (targetFacing === 'environment') {
        onSetMirror?.(false);
      } else {
        onSetMirror?.(true);
      }

      setCameraActive(true);
      setActiveTestCard(null);
      setStaticImageElement(null);
      setIsPaused(false);
      await updateDeviceList();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Webcam permission denied or unavailable';
      setCameraError(msg);
      setCameraActive(false);
      // Fallback to default test card if camera unavailable
      if (!activeTestCard && !staticImageElement) {
        loadTestCard('gbc_camera_face');
      }
    }
  };

  // Toggle between Front and Back camera
  const handleToggleFacingMode = async () => {
    playUiTick();
    const nextFacing: FacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);

    // If we have device list, see if there's a device explicitly matching the next facing mode
    let targetDeviceId: string | undefined = undefined;
    if (devices.length > 1) {
      const match = devices.find((d) => {
        const label = (d.label || '').toLowerCase();
        if (nextFacing === 'environment') {
          return label.includes('back') || label.includes('rear') || label.includes('environment');
        } else {
          return label.includes('front') || label.includes('user') || label.includes('facetime');
        }
      });
      if (match) {
        targetDeviceId = match.deviceId;
      }
    }

    if (cameraActive) {
      await startCamera(nextFacing, targetDeviceId);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Load a test card pattern onto hidden canvas
  const loadTestCard = (cardId: string) => {
    stopCamera();
    setActiveTestCard(cardId);
    setStaticImageElement(null);
    setIsPaused(false);

    const card = TEST_CARDS.find((c) => c.id === cardId);
    if (!card) return;

    const canvas = hiddenCanvasRef.current || document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    hiddenCanvasRef.current = canvas;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      card.draw(ctx, targetWidth, targetHeight);
      onFrame(canvas);
    }
  };

  // Handle uploaded image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        stopCamera();
        setActiveTestCard(null);
        setStaticImageElement(img);
        setIsPaused(false);

        const canvas = hiddenCanvasRef.current || document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        hiddenCanvasRef.current = canvas;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imgAspect = img.width / img.height;
          const targetAspect = targetWidth / targetHeight;
          let drawW = targetWidth;
          let drawH = targetHeight;
          let offsetX = 0;
          let offsetY = 0;

          if (imgAspect > targetAspect) {
            drawW = targetHeight * imgAspect;
            offsetX = -(drawW - targetWidth) / 2;
          } else {
            drawH = targetWidth / imgAspect;
            offsetY = -(drawH - targetHeight) / 2;
          }

          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
          onFrame(canvas);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Processing render loop
  useEffect(() => {
    let isCancelled = false;

    const tick = () => {
      if (isCancelled) return;

      const canvas = hiddenCanvasRef.current;
      if (canvas) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx) {
          if (cameraActive && videoRef.current && videoRef.current.readyState >= 2 && !isPaused) {
            ctx.save();
            if (mirror) {
              ctx.translate(targetWidth, 0);
              ctx.scale(-1, 1);
            }

            // Aspect ratio calculation to avoid stretching
            const videoW = videoRef.current.videoWidth || 640;
            const videoH = videoRef.current.videoHeight || 480;
            const videoAspect = videoW / videoH;
            const targetAspect = targetWidth / targetHeight;

            let sW = videoW;
            let sH = videoH;
            let sx = 0;
            let sy = 0;

            if (videoAspect > targetAspect) {
              sW = videoH * targetAspect;
              sx = (videoW - sW) / 2;
            } else {
              sH = videoW / targetAspect;
              sy = (videoH - sH) / 2;
            }

            ctx.drawImage(videoRef.current, sx, sy, sW, sH, 0, 0, targetWidth, targetHeight);
            ctx.restore();
            onFrame(canvas);
          } else if (staticImageElement && !isPaused) {
            const img = staticImageElement;
            const imgAspect = img.width / img.height;
            const targetAspect = targetWidth / targetHeight;
            let drawW = targetWidth;
            let drawH = targetHeight;
            let offsetX = 0;
            let offsetY = 0;

            if (imgAspect > targetAspect) {
              drawW = targetHeight * imgAspect;
              offsetX = -(drawW - targetWidth) / 2;
            } else {
              drawH = targetWidth / imgAspect;
              offsetY = -(drawH - targetHeight) / 2;
            }

            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, targetWidth, targetHeight);
            ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
            onFrame(canvas);
          } else if (activeTestCard && !isPaused) {
            const card = TEST_CARDS.find((c) => c.id === activeTestCard);
            if (card) {
              card.draw(ctx, targetWidth, targetHeight);
              onFrame(canvas);
            }
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      isCancelled = true;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraActive, isPaused, mirror, targetWidth, targetHeight, activeTestCard, staticImageElement, onFrame]);

  // Initial mount test card load
  useEffect(() => {
    if (!cameraActive && activeTestCard) {
      loadTestCard(activeTestCard);
    }
  }, []);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col gap-4">
      {/* Video Stream Preview & Controller */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-neutral-200 tracking-wide">Video Feed Source</span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          {/* Flip / Switch Camera Button (Front <-> Back) */}
          <button
            onClick={handleToggleFacingMode}
            title={`Switch to ${facingMode === 'user' ? 'Back' : 'Front'} Camera`}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              facingMode === 'environment'
                ? 'bg-amber-400/20 border-amber-400/60 text-amber-300 font-semibold'
                : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:text-white'
            }`}
          >
            <SwitchCamera className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-mono">
              {facingMode === 'environment' ? 'Back' : 'Front'}
            </span>
          </button>

          {/* Mirror toggle */}
          {cameraActive && (
            <button
              onClick={() => {
                playUiTick();
                onToggleMirror();
              }}
              title={mirror ? 'Disable Mirror' : 'Enable Mirror'}
              className={`p-1.5 rounded-lg border transition-all ${
                mirror
                  ? 'bg-amber-400/10 border-amber-400/40 text-amber-300'
                  : 'bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Freeze / Snapshot toggle */}
          <button
            onClick={() => {
              playShutterSound();
              setIsPaused(!isPaused);
            }}
            title={isPaused ? 'Resume Live Stream' : 'Freeze Snapshot'}
            className={`p-1.5 rounded-lg border transition-all ${
              isPaused
                ? 'bg-red-950/80 border-red-500/50 text-red-300'
                : 'bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Hidden Live Video element */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="hidden"
      />

      {/* Camera Orientation Choice (Front Cam / Back Cam Selector) */}
      <div className="flex items-center gap-1 p-1 bg-neutral-950 rounded-lg border border-neutral-800">
        <button
          onClick={() => {
            playUiTick();
            setFacingMode('user');
            if (cameraActive) {
              startCamera('user');
            }
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-md transition-all ${
            facingMode === 'user'
              ? 'bg-neutral-800 text-amber-300 font-semibold shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Front Cam (Selfie)</span>
        </button>

        <button
          onClick={() => {
            playUiTick();
            setFacingMode('environment');
            if (cameraActive) {
              startCamera('environment');
            }
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-md transition-all ${
            facingMode === 'environment'
              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 font-semibold shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <SwitchCamera className="w-3.5 h-3.5 text-amber-400" />
          <span>Back Cam (Rear)</span>
        </button>
      </div>

      {/* Camera Toggle Button or Switcher */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          {!cameraActive ? (
            <button
              onClick={() => {
                playUiTick();
                startCamera(facingMode, selectedDeviceId);
              }}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold text-xs rounded-lg transition-all cursor-pointer shadow-sm active:scale-98"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Start {facingMode === 'environment' ? 'Back' : 'Front'} Cam</span>
            </button>
          ) : (
            <button
              onClick={() => {
                playUiTick();
                stopCamera();
                loadTestCard('gbc_camera_face');
              }}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs rounded-lg transition-all cursor-pointer border border-neutral-700"
            >
              <CameraOff className="w-3.5 h-3.5 text-neutral-400" />
              <span>Stop Camera</span>
            </button>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs rounded-lg transition-all cursor-pointer border border-neutral-700"
          >
            <Upload className="w-3.5 h-3.5 text-neutral-400" />
            <span>Upload Image</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Device selector if multiple video sources */}
        {devices.length > 1 && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-neutral-400 font-mono">Select Video Device:</span>
            <select
              value={selectedDeviceId}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value);
                if (cameraActive) {
                  startCamera(facingMode, e.target.value);
                }
              }}
              className="w-full text-xs bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-300 focus:outline-none focus:border-amber-400"
            >
              {devices.map((d, i) => {
                const label = d.label || `Camera ${i + 1}`;
                const isBack = label.toLowerCase().includes('back') || label.toLowerCase().includes('rear') || label.toLowerCase().includes('environment');
                const isFront = label.toLowerCase().includes('front') || label.toLowerCase().includes('user') || label.toLowerCase().includes('facetime');
                const tag = isBack ? ' [Back]' : isFront ? ' [Front]' : '';
                return (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {label}{tag}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {cameraError && (
          <div className="p-2 text-xs bg-red-950/40 border border-red-800/50 rounded-lg text-red-300">
            {cameraError}
          </div>
        )}
      </div>

      {/* Preset Test Patterns */}
      <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800/80">
        <span className="text-[11px] font-semibold text-neutral-400">
          Or Select Calibration Test Pattern:
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {TEST_CARDS.map((card) => {
            const isSelected = activeTestCard === card.id && !cameraActive;
            return (
              <button
                key={card.id}
                onClick={() => {
                  playUiTick();
                  loadTestCard(card.id);
                }}
                className={`text-left p-2 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-neutral-800 border-amber-400/50 text-amber-300 shadow-sm'
                    : 'bg-neutral-950/60 border-neutral-800/70 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                }`}
              >
                <div className="text-xs font-semibold truncate">{card.name}</div>
                <div className="text-[10px] text-neutral-400 truncate -mt-0.5">
                  {card.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
