import React, { useRef, useState, useEffect } from "react";

/**
 * CurtainIntro - a theatrical curtain reveal intro
 * 
 * - videoSrc: Path to the curtain opening video
 * - onComplete: Callback when intro finishes
 * - fadeThreshold: How many seconds before video ends to start fading (default 0.5)
 * - audioRef: Ref to audio element for background music (optional)
 */
export default function CurtainIntro({
  videoSrc = "/curtain-intro.mp4",
  onComplete,
  fadeThreshold = 0.5,
  audioRef,
  onAudioStart,
}) {
  const videoRef = useRef(null);
  const [phase, setPhase] = useState("waiting"); // "waiting" | "playing" | "fading" | "done"
  const [videoReady, setVideoReady] = useState(false);
  const [showButton, setShowButton] = useState(false);

  // Fade in the button after a short delay for dramatic effect
  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 600);
    return () => clearTimeout(timer);
  }, []);

  // Preload video and pause at first frame
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

    const handleCanPlayThrough = () => {
      if (cancelled) return;
      if (!videoReady) {
        setVideoReady(true);
      }
    };

    const handleLoadedMetadata = () => {
      if (cancelled) return;
      // Only set currentTime if not already playing
      if (video.paused && video.currentTime === 0) {
        video.currentTime = 0.001; // Slight offset to show first frame
      }
    };

    video.addEventListener("canplaythrough", handleCanPlayThrough);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    // Only call load if video hasn't started loading
    if (video.readyState === 0) {
      video.load();
    }

    return () => {
      cancelled = true;
      video.removeEventListener("canplaythrough", handleCanPlayThrough);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [videoReady]);

  // Separate effect for playback monitoring (only when playing)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || phase !== "playing") return;

    const handleTimeUpdate = () => {
      const remaining = video.duration - video.currentTime;
      if (remaining <= fadeThreshold) {
        setPhase("fading");
      }
    };

    const handleEnded = () => {
      setPhase("done");
      if (onComplete) onComplete();
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
    };
  }, [phase, fadeThreshold, onComplete]);

  // Handle fade completion - call onComplete after fade animation
  useEffect(() => {
    if (phase !== "fading") return;

    const timer = setTimeout(() => {
      setPhase("done");
      if (onComplete) onComplete();
    }, 0);

    return () => clearTimeout(timer);
  }, [phase, onComplete]);

  const handleEnter = async () => {
    const video = videoRef.current;
    if (!video || !videoReady || phase !== "waiting") return;

    setPhase("playing");

    // Start background music on user interaction (bypasses autoplay restriction)
    if (audioRef?.current) {
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(() => {});
    }

    // Notify that intro has started (for showing mute button)
    if (onAudioStart) onAudioStart();

    try {
      await video.play();
    } catch (err) {
      console.error("Video play failed:", err);
      setPhase("done");
      if (onComplete) onComplete();
    }
  };

  // Don't render anything once done
  if (phase === "done") return null;

  return (
    <div
      className={`fixed inset-0 z-[100] transition-opacity duration-1000 ${
        phase === "fading" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ background: "#000" }}
    >
      {/* Video element - starts paused at frame 0 */}
      <video
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover object-center"
        style={{ display: "block" }}
      >
        <source src={videoSrc} type="video/mp4" />
      </video>

      {/* Vignette overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      {/* Tune In button - only shown when waiting */}
      {phase === "waiting" && (
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${
            showButton ? "opacity-100" : "opacity-0"
          }`}
        >
          <button
            onClick={handleEnter}
            disabled={!videoReady}
            className={`relative transition-all duration-300 hover:scale-105 active:scale-95 ${
              !videoReady ? "opacity-50 cursor-wait" : "cursor-pointer"
            }`}
            style={{
              animation: "float 3s ease-in-out infinite",
            }}
          >
            <img
              src="/tune-in.png"
              alt="Tune In - Press to Begin"
              className="w-64 md:w-80 h-auto drop-shadow-[0_0_30px_rgba(100,255,200,0.3)]"
            />
          </button>
        </div>
      )}

      {/* Subtle spotlight effect at top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(255,240,200,0.08) 0%, transparent 60%)",
        }}
      />

      {/* Keyframes for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
}