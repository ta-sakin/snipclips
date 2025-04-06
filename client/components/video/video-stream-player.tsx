import { useEffect, useRef } from "react";

const VideoStreamPlayer = ({
  stream,
}: {
  stream: ReadableStream<Uint8Array>;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaSourceRef = useRef(new MediaSource());

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    const mediaSource = mediaSourceRef.current;

    videoElement.src = URL.createObjectURL(mediaSource);

    mediaSource.addEventListener("sourceopen", async () => {
      const sourceBuffer = mediaSource.addSourceBuffer(
        'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'
      );
      const reader = stream.getReader();
      const pump = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            mediaSource.endOfStream();
            return;
          }
          sourceBuffer.appendBuffer(value);
          pump();
        });
      };
      pump();
    });

    return () => {
      URL.revokeObjectURL(videoElement.src);
    };
  }, [stream]);

  return <video ref={videoRef} controls width="100%" />;
};

export default VideoStreamPlayer;
