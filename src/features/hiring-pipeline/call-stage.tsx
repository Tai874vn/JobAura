'use client'

import '@livekit/components-styles'
import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import type { CallState } from './call-state'

export type CallConnection = 'connecting' | 'connected' | 'failed' | 'disconnected'

/** The two video tiles (one per person). A tile with the camera off shows a placeholder. */
function Tiles() {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }])
  return (
    <GridLayout tracks={tracks} className="min-h-0 flex-1">
      <ParticipantTile />
    </GridLayout>
  )
}

/**
 * The LiveKit part of the call screen: joins the room and shows the tiles and the mic and camera controls.
 * It is the only file that imports LiveKit and its styles, and it is loaded in the browser only, so tests
 * and the rest of the app never touch it. It reports how the connection goes through `onConnection`.
 */
export default function CallStage({
  url,
  token,
  state,
  onConnection,
}: {
  url: string
  token: string
  state: CallState
  onConnection: (connection: CallConnection) => void
}) {
  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect
      video
      audio
      data-lk-theme="default"
      className="flex min-h-0 flex-1 flex-col"
      onConnected={() => onConnection('connected')}
      onDisconnected={() => onConnection('disconnected')}
      // A refused camera or microphone, or any room error, ends in the plain "could not start" message.
      onError={() => onConnection('failed')}
      onMediaDeviceFailure={() => onConnection('failed')}
    >
      <Tiles />
      <RoomAudioRenderer />
      {/* Mic and camera only. Leave is the page's own button, which asks the recruiter first. */}
      <div className={state === 'live' ? '' : 'invisible'}>
        <ControlBar
          variation="minimal"
          controls={{ microphone: true, camera: true, screenShare: false, chat: false, leave: false, settings: false }}
        />
      </div>
    </LiveKitRoom>
  )
}
