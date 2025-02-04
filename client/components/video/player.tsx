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
} from "@vidstack/react";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/audio.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

// import { MediaPlayer, MediaProvider, Poster, Track } from "@vidstack/react"
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";

import { VideoLayout } from "./layout/video-layout";

export function Player({ videoSrc }: { videoSrc: string }) {
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

  return (
    <MediaPlayer
      src={videoSrc}
      viewType="video"
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
        icons={defaultLayoutIcons}
      />
    </MediaPlayer>
  );
}
