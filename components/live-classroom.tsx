'use client'

import { useEffect, useState, useCallback } from 'react'
import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng'
import axios from 'axios'
import MuxPlayer from '@mux/mux-player-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'

interface LiveClassroomProps {
  courseId: string;
  isTeacher: boolean;
}

interface Recording {
  id: string;
  title: string;
  playbackId: string;
  sessionDate: string;
}

export const LiveClassroom = ({ courseId, isTeacher }: LiveClassroomProps) => {
  const [client, setClient] = useState<IAgoraRTCClient | null>(null)
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null)
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null)
  const [isLive, setIsLive] = useState(false)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const fetchRecordings = useCallback(async () => {
    try {
      const response = await axios.get(`/api/courses/${courseId}/live/recording`)
      setRecordings(response.data)
    } catch (error) {
      toast.error('Failed to fetch recordings')
    }
  }, [courseId])

  useEffect(() => {
    fetchRecordings()
  }, [fetchRecordings])

  useEffect(() => {
    const initAgora = async () => {
      const agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
      setClient(agoraClient)
    }

    initAgora()
  }, [])

  // Separate cleanup effect
  useEffect(() => {
    return () => {
      if (localVideoTrack) {
        localVideoTrack.close()
      }
      if (localAudioTrack) {
        localAudioTrack.close()
      }
      if (client) {
        client.leave()
      }
    }
  }, [client, localAudioTrack, localVideoTrack])

  const startLiveStream = async () => {
    try {
      setIsLoading(true)
      // Get Agora token and channel name from backend
      const response = await axios.post(`/api/courses/${courseId}/live`)
      const { token, channelName, appId } = response.data

      if (!client) return

      // Join channel
      await client.join(appId, channelName, token)

      // Create and publish tracks
      const videoTrack = await AgoraRTC.createCameraVideoTrack()
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack()

      await client.publish([videoTrack, audioTrack])

      setLocalVideoTrack(videoTrack)
      setLocalAudioTrack(audioTrack)
      setIsLive(true)

      toast.success('Live stream started!')
    } catch (error) {
      toast.error('Failed to start live stream')
    } finally {
      setIsLoading(false)
    }
  }

  const stopLiveStream = async () => {
    try {
      setIsLoading(true)
      if (!client) return

      // Get recording URL from Agora Cloud Recording (you'll need to implement this)
      // For this example, we'll use a placeholder URL
      const recordingUrl = 'https://example.com/recording.mp4'

      // Unpublish and close tracks
      localVideoTrack?.close()
      localAudioTrack?.close()
      await client.leave()

      // Update backend
      await axios.delete(`/api/courses/${courseId}/live`)

      // Store recording in Mux
      await axios.post(`/api/courses/${courseId}/live/recording`, {
        recordingUrl,
        title: `Live Session - ${new Date().toLocaleDateString()}`,
      })

      setLocalVideoTrack(null)
      setLocalAudioTrack(null)
      setIsLive(false)

      toast.success('Live stream ended and recording saved')
      fetchRecordings()
    } catch (error) {
      toast.error('Failed to stop live stream')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='flex flex-col space-y-8'>
      {/* Live Stream Section */}
      <div className='space-y-4'>
        <div className='relative w-full aspect-video bg-slate-800 rounded-lg overflow-hidden'>
          {localVideoTrack && (
            <div className='absolute inset-0'>
              <div
                id='local-video'
                className='w-full h-full'
                ref={(element) => {
                  if (element) {
                    localVideoTrack.play(element)
                  }
                }}
              />
            </div>
          )}
          {!localVideoTrack && (
            <div className='absolute inset-0 flex items-center justify-center'>
              <p className='text-slate-400'>
                {isTeacher
                  ? 'Click Start Live to begin streaming'
                  : 'Waiting for teacher to start the live stream'
                }
              </p>
            </div>
          )}
        </div>

        {isTeacher && (
          <div className='flex items-center gap-x-2'>
            {!isLive && (
              <Button
                onClick={startLiveStream}
                variant='default'
                size='sm'
                className='w-full md:w-auto'
                disabled={isLoading}
              >
                Start Live
              </Button>
            )}
            {isLive && (
              <Button
                onClick={stopLiveStream}
                variant='destructive'
                size='sm'
                className='w-full md:w-auto'
                disabled={isLoading}
              >
                End Live
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Past Recordings Section */}
      {recordings.length > 0 && (
        <div className='space-y-4'>
          <h3 className='text-lg font-medium'>Past Recordings</h3>
          <div className='grid grid-cols-1 gap-4'>
            {recordings.map((recording) => (
              <div key={recording.id} className='space-y-2'>
                <h4 className='font-medium'>{recording.title}</h4>
                <p className='text-sm text-slate-500'>
                  {new Date(recording.sessionDate).toLocaleDateString()}
                </p>
                <div className='aspect-video'>
                  <MuxPlayer
                    playbackId={recording.playbackId}
                    metadata={{
                      video_title: recording.title,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
