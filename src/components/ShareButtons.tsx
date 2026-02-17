"use client";

import { useState, useEffect } from "react";

interface ShareButtonsProps {
  trackTitle?: string;
  artistName?: string;
  url?: string;
}

export default function ShareButtons({ trackTitle, artistName, url }: ShareButtonsProps) {
  const [hasNativeShare, setHasNativeShare] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    setCurrentUrl(url || window.location.origin);
    setHasNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, [url]);

  const shareText = trackTitle && artistName
    ? `「${trackTitle} / ${artistName}」をMusic Requestでリクエストしました！ 🎵`
    : "Music Requestで曲をリクエストしました！ 🎧";

  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(currentUrl);

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;

  const handleTwitterShare = () => {
    window.open(twitterUrl, "_blank", "width=600,height=400");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Music Request",
          text: shareText,
          url: currentUrl,
        });
      } catch (err) {
        console.log("Share cancelled or failed", err);
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-center text-xs text-slate-600 font-light tracking-widest uppercase">
        Share
      </div>
      <div className="flex gap-2 justify-center flex-wrap">
        {hasNativeShare && (
          <button
            onClick={handleNativeShare}
            className="px-5 py-2 rounded-lg bg-purple-500 text-sm
                     text-white font-light tracking-wide hover:opacity-90
                     active:scale-95 transition-all duration-200"
          >
            Share
          </button>
        )}

        <button
          onClick={handleTwitterShare}
          className="px-5 py-2 rounded-lg glass text-sm
                   text-white font-light tracking-wide hover:glass-hover hover:border-purple-500
                   active:scale-95 transition-all duration-200"
        >
          X
        </button>
      </div>
    </div>
  );
}
