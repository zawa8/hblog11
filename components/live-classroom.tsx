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
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  useEffect(() => {
    const checkLiveStatus = async () => {
      try {
        const response = await axios.get(`/api/courses/${courseId}`)
        if (response.data.courseType !== 'LIVE') {
          toast.error('This course is not configured for live sessions')
          return
        }
        setIsLive(response.data.isCourseLive || false)
      } catch (error: any) {
        console.error('Failed to check live status:', error)
        toast.error(error.response?.data || 'Failed to check live status')
      } finally {
        setIsInitialLoading(false)
      }
    }
    checkLiveStatus()
  }, [courseId])
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
      
      if (!client) {
        throw new Error("Agora client not initialized");
      }

      // Check if course is configured for live sessions
      const courseResponse = await axios.get(`/api/courses/${courseId}`);
      if (courseResponse.data.courseType !== 'LIVE') {
        throw new Error('This course is not configured for live sessions');
      }

      console.log("Requesting Agora credentials from backend...");
      const response = await axios.post(`/api/courses/${courseId}/live`, {
        maxParticipants: 100, // Default max participants
        nextLiveDate: new Date().toISOString()
      }).catch(error => {
        console.error("Backend API error:", error.response?.data || error.message);
        if (error.response?.data) {
          throw new Error(error.response.data);
        }
        throw new Error("Failed to get Agora credentials");
      });

      const { token, channelName, appId } = response.data;
      
      if (!appId || !token || !channelName) {
        console.error("Missing Agora credentials:", { 
          appId: appId ? 'present' : 'missing',
          token: token ? 'present' : 'missing',
          channelName: channelName ? 'present' : 'missing'
        });
        throw new Error("Invalid Agora credentials received from server");
      }

      console.log("Received Agora credentials successfully");

      console.log("Joining Agora channel...");
      await client.join(appId, channelName, token).catch(error => {
        console.error("Failed to join Agora channel:", error);
        throw new Error("Failed to join live session");
      });

      console.log("Creating media tracks...");
      const videoTrack = await AgoraRTC.createCameraVideoTrack().catch(error => {
        console.error("Failed to create video track:", error);
        throw new Error("Failed to access camera");
      });
      
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack().catch(error => {
        console.error("Failed to create audio track:", error);
        throw new Error("Failed to access microphone");
      });

      console.log("Publishing media tracks...");
      await client.publish([videoTrack, audioTrack]).catch(error => {
        console.error("Failed to publish tracks:", error);
        throw new Error("Failed to start streaming");
      });

      setLocalVideoTrack(videoTrack);
      setLocalAudioTrack(audioTrack);
      
      console.log("Updating course live status...");
      await axios.patch(`/api/courses/${courseId}`, {
        isCourseLive: true
      }).catch(error => {
        console.error("Failed to update course status:", error);
        throw new Error("Failed to update course status");
      });
      
      setIsLive(true);
      toast.success('Live stream started successfully!');
    } catch (error: any) {
      console.error("Live stream error:", error);
      toast.error(error.message || 'Failed to start live stream');
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
      // Update course live status
      await axios.patch(`/api/courses/${courseId}`, {
        isCourseLive: false
      })
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
