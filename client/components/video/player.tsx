import "@vidstack/react/player/styles/base.css";

import { useEffect, useRef } from "react";

import {
  isHLSProvider,
  MediaPlayer,
  MediaProvider,
  Poster,
  Track,
  type MediaCanPlayDetail,
  type MediaCanPlayEvent,
  type MediaPlayerInstance,
  type MediaProviderAdapter,
  type MediaProviderChangeEvent,
  VideoMimeType,
  AudioMimeType,
  isYouTubeProvider,
} from "@vidstack/react";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/audio.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

// import { MediaPlayer, MediaProvider, Poster, Track } from "@vidstack/react"
import {
  DefaultAudioLayout,
  DefaultVideoLayout,
  defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";

import { VideoLayout } from "./layout/video-layout";
import { youtubeRegex } from "../VideoProcessorForm";
import {
  PlyrLayout,
  plyrLayoutIcons,
} from "@vidstack/react/player/layouts/plyr";
import type { PlyrLayoutIcons } from "@vidstack/react/player/layouts/plyr";
import { DownloadIcon } from "lucide-react";
// import { DownloadIcon } from "@vidstack/react/icons";

const customIcons: PlyrLayoutIcons = {
  ...plyrLayoutIcons,
  // AirPlay: AirPlayIcon,
  // CaptionsOff: CaptionsOffIcon,
  // CaptionsOn: CaptionsOnIcon,
  Download: DownloadIcon,
  // EnterFullscreen: EnterFullscreenIcon,
  // ExitFullscreen: ExitFullscreenIcon,
  // EnterPiP: EnterPiPIcon,
  // ExitPiP: ExitPiPIcon,
  // FastForward: FastForwardIcon,
  // Muted: MutedIcon,
  // Pause: PauseIcon,
  // Play: PlayIcon,
  // Restart: RestartIcon,
  // Rewind: RewindIcon,
  // Settings: SettingsIcon,
  // Volume: VolumeIcon,
};
function isBlobUrl(url: string): string | undefined {
  if (url.startsWith("blob:")) return "video/object";
}

function matchYoutubeUrl(url: string) {
  if (!url) return;
  return youtubeRegex.test(url);
}
export function Player({
  src,
  type = "video",
}: {
  src: string;
  type?: "audio" | "video";
}) {
  if (!src) return null;
  function getVideoMimeType(url: string): VideoMimeType | AudioMimeType {
    // if (url.startsWith("blob:")) return "video/object";
    const extension = url.split(".").pop()?.toLowerCase();

    if (type === "audio") {
      switch (extension) {
        case "webm":
          return "audio/webm";
        case "ogg":
          return "audio/ogg";
        case "3gp":
          return "audio/3gp";
        case "flac":
          return "audio/flac";
        case "mpeg":
          return "audio/mpeg";
        default:
          return "audio/mpeg";
      }
    } else {
      switch (extension) {
        case "webm":
          return "video/webm";
        case "ogg":
          return "video/ogg";
        case "ogv":
          return "video/ogg";
        case "avi":
          return "video/avi";
        case "3gp":
          return "video/3gp";
        case "mpeg":
          return "video/mpeg";
        default:
          return "video/mp4";
      }
    }
  }
  let player = useRef<MediaPlayerInstance>(null);

  // useEffect(() => {
  //   // Subscribe to state updates.
  //   return player.current!.subscribe(({ paused, viewType }) => {
  //     // console.log('is paused?', '->', state.paused);
  //     // console.log('is audio view?', '->', state.viewType === 'audio');
  //   });
  // }, []);

  function onProviderChange(
    provider: MediaProviderAdapter | null,
    nativeEvent: MediaProviderChangeEvent
  ) {
    // We can configure provider's here.
    if (isHLSProvider(provider)) {
      provider.config = {};
    }
  }

  // We can listen for the `can-play` event to be notified when the player is ready.
  function onCanPlay(
    detail: MediaCanPlayDetail,
    nativeEvent: MediaCanPlayEvent
  ) {
    // ...
  }
  const handleProviderChange = (provider: MediaProviderAdapter | null) => {
    if (isYouTubeProvider(provider)) {
      provider.cookies = true;
      // provider.referrerPolicy = "no-referrer-when-downgrade";
      // provider.iframe.referrerPolicy = "no-referrer-when-downgrade";
    }
  };
  return (
    <>
      <MediaPlayer
        onProviderChange={handleProviderChange}
        key={src}
        src={
          matchYoutubeUrl(src)
            ? src
            : [
                {
                  src: src,
                  type: getVideoMimeType(src),
                },
              ]
        }
        viewType={"video"}
        streamType="on-demand"
        logLevel="warn"
        // crossOrigin
        playsInline
        title="Detected speaker"
        // poster="https://files.vidstack.io/sprite-fight/poster.webp"
      >
        <MediaProvider>
          <Poster className="vds-poster" />
          {/* {textTracks.map(track => (
      <Track {...track} key={track.src} />
    ))} */}
        </MediaProvider>

        <DefaultVideoLayout
          // thumbnails="https://files.vidstack.io/sprite-fight/thumbnails.vtt"
          icons={{
            ...defaultLayoutIcons,
            DownloadButton: {
              Default: DownloadIcon,
            },
          }}
        />

        {/* <PlyrLayout icons={plyrLayoutIcons} /> */}
      </MediaPlayer>
    </>
  );
}
