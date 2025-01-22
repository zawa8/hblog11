'use client'

import { useEffect, useState, useCallback } from 'react'
import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack, IRemoteVideoTrack } from 'agora-rtc-sdk-ng'
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
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<IRemoteVideoTrack | null>(null)
  const [isLive, setIsLive] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const joinLiveStream = useCallback(async () => {
    try {
      console.log('Student joining live stream...')
      const response = await axios.post(`/api/courses/${courseId}/live`, {})
      console.log('Agora credentials received:', {
        appId: response.data.appId,
        channelName: response.data.channelName,
        uid: response.data.uid,
        token: '[REDACTED]'
      })
      const { token, channelName, appId } = response.data

      if (!client) {
        throw new Error('Video client not initialized')
      }

      await client.join(appId, channelName, token)
      console.log('Joined live stream as viewer')
    } catch (error: any) {
      console.error('Failed to join stream:', error)
      toast.error('Failed to join live stream')
    }
  }, [courseId, client])

  useEffect(() => {
    const checkLiveStatus = async () => {
      try {
        console.log('Checking live status...')
        const response = await axios.get(`/api/courses/${courseId}`)
        console.log('Live status response:', response.data)
        const isLiveNow = response.data.isCourseLive && response.data.isLiveActive
        setIsLive(isLiveNow)

        // If student and session is live, join the stream
        if (!isTeacher && isLiveNow && client) {
          joinLiveStream()
        }
      } catch (error: any) {
        console.error('Status check error:', error)
        toast.error(error?.response?.data || error?.message || 'Failed to check live status')
      } finally {
        setIsInitialLoading(false)
      }
    }

    // Initial check
    checkLiveStatus()

    // Poll every 5 seconds for updates
    const interval = setInterval(checkLiveStatus, 5000)

    return () => clearInterval(interval)
  }, [courseId, client, isTeacher, joinLiveStream])

  const fetchRecordings = useCallback(async () => {
    try {
      const response = await axios.get(`/api/courses/${courseId}/live/recording`)
      setRecordings(response.data)
    } catch (error: any) {
      console.error('Fetch recordings error:', error)
      toast.error(error?.response?.data || error?.message || 'Failed to fetch recordings')
    }
  }, [courseId])

  useEffect(() => {
    fetchRecordings()
  }, [fetchRecordings])

  useEffect(() => {
    const initAgora = async () => {
      try {
        console.log('Initializing Agora client...')
        const agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })

        // Set up user published handler for students
        if (!isTeacher) {
          agoraClient.on('user-published', async (user, mediaType) => {
            await agoraClient.subscribe(user, mediaType)
            console.log('Subscribed to teacher stream:', mediaType)

            if (mediaType === 'video') {
              const videoTrack = user.videoTrack
              if (videoTrack) {
                setRemoteVideoTrack(videoTrack)
              }
            }
            if (mediaType === 'audio') {
              user.audioTrack?.play()
            }
          })

          agoraClient.on('user-unpublished', (user, mediaType) => {
            console.log('Teacher stopped streaming:', mediaType)
            if (mediaType === 'video') {
              setRemoteVideoTrack(null)
            }
          })
        }

        setClient(agoraClient)
        console.log('Agora client initialized')
      } catch (error: any) {
        console.error('Agora init error:', error)
        toast.error('Failed to initialize video client')
      }
    }

    initAgora()
  }, [isTeacher])

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
      console.log('Starting live stream...')
      // Get Agora token and channel name from backend
      console.log('Getting Agora credentials...')
      const response = await axios.post(`/api/courses/${courseId}/live`, {})
      console.log('Agora credentials received:', {
        appId: response.data.appId,
        channelName: response.data.channelName,
        uid: response.data.uid,
        token: '[REDACTED]'
      })
      const { token, channelName, appId } = response.data

      if (!client) {
        throw new Error('Video client not initialized')
      }

      // Join channel
      console.log('Joining Agora channel...')
      await client.join(appId, channelName, token)
      console.log('Joined Agora channel')

      // Create and publish tracks
      console.log('Creating video and audio tracks...')
      const videoTrack = await AgoraRTC.createCameraVideoTrack()
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack()

      console.log('Publishing tracks...')
      await client.publish([videoTrack, audioTrack])
      console.log('Tracks published')

      setLocalVideoTrack(videoTrack)
      setLocalAudioTrack(audioTrack)
      // Only update course live status after successful publish
      try {
        console.log('Updating course status...')
        await axios.patch(`/api/courses/${courseId}`, {
          isCourseLive: true,
          isLiveActive: true
        })
        setIsLive(true)
        toast.success('Live stream started!')
        console.log('Live stream started successfully')
      } catch (error: any) {
        console.error('Status update error:', error)
        // If updating status fails, cleanup the stream
        videoTrack.close()
        audioTrack.close()
        await client.leave()
        throw new Error(error?.response?.data || error?.message || 'Failed to update course status')
      }
    } catch (error: any) {
      console.error('Live stream error:', error)
      toast.error(error?.response?.data || error?.message || 'Failed to start live stream')
    } finally {
      setIsLoading(false)
    }
  }

  const stopLiveStream = async () => {
    try {
      setIsLoading(true)
      console.log('Stopping live stream...')
      if (!client) {
        throw new Error('Video client not initialized')
      }

      // Get recording URL from Agora Cloud Recording (you'll need to implement this)
      // For this example, we'll use a placeholder URL
      const recordingUrl = 'https://example.com/recording.mp4'

      // Unpublish and close tracks
      console.log('Closing tracks...')
      localVideoTrack?.close()
      localAudioTrack?.close()
      await client.leave()
      console.log('Left Agora channel')

      // Update backend
      console.log('Updating live session status...')
      await axios.delete(`/api/courses/${courseId}/live`)

      // Store recording in Mux
      console.log('Storing recording...')
      await axios.post(`/api/courses/${courseId}/live/recording`, {
        recordingUrl,
        title: `Live Session - ${new Date().toLocaleDateString()}`,
      })

      setLocalVideoTrack(null)
      setLocalAudioTrack(null)
      // Update course live status
      try {
        console.log('Updating course status...')
        await axios.patch(`/api/courses/${courseId}`, {
          isCourseLive: false,
          isLiveActive: false
        })
        setIsLive(false)
        toast.success('Live stream ended and recording saved')
        console.log('Live stream ended successfully')
      } catch (error: any) {
        console.error('Status update error:', error)
        toast.error(error?.response?.data || error?.message || 'Failed to update course status')
        throw error
      }
      fetchRecordings()
    } catch (error: any) {
      console.error('Stop stream error:', error)
      toast.error(error?.response?.data || error?.message || 'Failed to stop live stream')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='flex flex-col space-y-8'>
      {/* Live Stream Section */}
      {isInitialLoading ? (
        <div className="flex items-center justify-center h-[300px]">
          <p className="text-slate-500">Loading...</p>
        </div>
      ) : (
        <div className='space-y-4'>
          {isTeacher && (
          <div className='flex items-center gap-x-2 mb-4'>
            {!isLive && (
              <Button
                onClick={startLiveStream}
                variant='default'
                size='lg'
                className='w-full md:w-auto'
                disabled={isLoading}
              >
                Start Live Session
              </Button>
            )}
            {isLive && (
              <Button
                onClick={stopLiveStream}
                variant='destructive'
                size='lg'
                className='w-full md:w-auto'
                disabled={isLoading}
              >
                End Live Session
              </Button>
            )}
          </div>
        )}
        <div className='relative w-full aspect-video bg-slate-800 rounded-lg overflow-hidden'>
          {/* Teacher's local video */}
          {isTeacher && localVideoTrack && (
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
          {/* Student's remote video */}
          {!isTeacher && remoteVideoTrack && (
            <div className='absolute inset-0'>
              <div
                id='remote-video'
                className='w-full h-full'
                ref={(element) => {
                  if (element) {
                    remoteVideoTrack.play(element)
                  }
                }}
              />
            </div>
          )}
          {/* Placeholder when no video */}
          {((isTeacher && !localVideoTrack) || (!isTeacher && !remoteVideoTrack)) && (
            <div className='absolute inset-0 flex items-center justify-center'>
              <p className='text-slate-400'>
                {isTeacher
                  ? 'Click Start Live to begin streaming'
                  : isLive
                    ? 'Connecting to live stream...'
                    : 'Waiting for teacher to start the live stream'
                }
              </p>
            </div>
          )}
          </div>
        </div>
      )}

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
