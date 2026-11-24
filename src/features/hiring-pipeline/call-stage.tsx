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
import { useCallback, useState } from 'react'
import { deviceNotice, isDeviceError, type CallState } from './call-state'

export type CallConnection = 'connecting' | 'connected' | 'failed' | 'disconnected'

// Stable module-level options keep LiveKit hooks and controls from recreating references on every render.
const cameraTracks = [{ source: Track.Source.Camera, withPlaceholder: true }]
const roomStyle = { '--lk-accent-bg': '#006d43' } as React.CSSProperties
const barControls = { microphone: true, camera: true, screenShare: false, chat: false, leave: false, settings: false }

/** The two video tiles (one per person). A tile with the camera off shows a placeholder. */
function Tiles() {
  const tracks = useTracks(cameraTracks)
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
  // A camera or microphone that cannot start is turned off on its own; the call goes on without it.
  const [failed, setFailed] = useState<{ camera?: boolean; microphone?: boolean }>({})
  const notice = deviceNotice(failed)

  const handleConnected = useCallback(() => onConnection('connected'), [onConnection])
  const handleDisconnected = useCallback(() => onConnection('disconnected'), [onConnection])
  // Only a failure that is not a camera or microphone problem (for example the room cannot be joined) ends the call.
  const handleError = useCallback((error: Error) => {
    if (!isDeviceError(error)) onConnection('failed')
  }, [onConnection])
  const handleDeviceFailure = useCallback((_failure?: unknown, kind?: MediaDeviceKind) => {
    if (kind === 'videoinput') setFailed((old) => ({ ...old, camera: true }))
    else if (kind === 'audioinput') setFailed((old) => ({ ...old, microphone: true }))
  }, [])

  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect
      video={!failed.camera}
      audio={!failed.microphone}
      data-lk-theme="default"
      // The speaking border uses the brand green instead of LiveKit's blue.
      style={roomStyle}
      className="flex min-h-0 flex-1 flex-col"
      onConnected={handleConnected}
      onDisconnected={handleDisconnected}
      onError={handleError}
      onMediaDeviceFailure={handleDeviceFailure}
    >
      <Tiles />
      <RoomAudioRenderer />
      {notice ? <p role="status" className="py-1 text-center text-sm text-muted">{notice}</p> : null}
      {/* Mic and camera only. Leave is the page's own button, which asks the recruiter first. */}
      <div className={state === 'live' ? '' : 'invisible'}>
        <ControlBar
          variation="minimal"
          controls={barControls}
        />
      </div>
    </LiveKitRoom>
  )
}
