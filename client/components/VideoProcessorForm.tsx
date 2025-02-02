// 'use client'

// import '@vidstack/react/player/styles/base.css';
// import { useState, useRef } from 'react'
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Textarea } from "@/components/ui/textarea"
// import { AudioRecorder } from 'react-audio-voice-recorder';
// import { X } from 'lucide-react'
// import { MediaPlayer, MediaProvider } from '@vidstack/react';
// import { Player } from './video/player';
// // Base styles for media player and provider (~400B).
// export default function VideoProcessorForm() {
//   const [youtubeUrl, setYoutubeUrl] = useState('')
//   const [videoFile, setVideoFile] = useState<File | null>(null)
//   const [referenceAudio, setReferenceAudio] = useState<File | null>(null)
//   const [recordedAudio, setRecordedAudio] = useState<{blob:Blob,url:string} | null>(null)
//   const [isRecording, setIsRecording] = useState(false)
//   const [result, setResult] = useState<any>(null)
//   const [error, setError] = useState<string | null>(null)
//   const [isLoading, setIsLoading] = useState(false)
  
//   const mediaRecorderRef = useRef<MediaRecorder | null>(null)
//   const audioChunksRef = useRef<Blob[]>([])

//   // const startRecording = async () => {
//   //   try {
//   //     const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
//   //     mediaRecorderRef.current = new MediaRecorder(stream)
//   //     mediaRecorderRef.current.ondataavailable = (event) => {
//   //       if (event.data.size > 0) {
//   //         audioChunksRef.current.push(event.data)
//   //       }
//   //     }
//   //     mediaRecorderRef.current.onstop = () => {
//   //       const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
//   //       setRecordedAudio(audioBlob)
//   //       audioChunksRef.current = []
//   //     }
//   //     mediaRecorderRef.current.start()
//   //     setIsRecording(true)
//   //   } catch (error) {
//   //     console.error('Error accessing microphone:', error)
//   //   }
//   // }

//   const stopRecording = () => {
//     if (mediaRecorderRef.current && isRecording) {
//       mediaRecorderRef.current.stop()
//       setIsRecording(false)
//     }
//   }

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setIsLoading(true)
//     setError(null)
//     setResult(null)

//     const formData = new FormData()
//     if (youtubeUrl) formData.append('youtube_url', youtubeUrl)
//     if (videoFile) formData.append('video_file', videoFile)
//     if (referenceAudio) formData.append('reference_audio', referenceAudio)
//     if (recordedAudio) formData.append('reference_audio', recordedAudio.blob, 'recorded_audio.wav')

//     try {
//       const response = await fetch('https://fearful-skeleton-64wvpw6qv5jf5w7j-5000.app.github.dev/process_video', {
//         method: 'POST',
//         body: formData,
//       })

//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`)
//       }

//       const data = await response.json()
//       setResult(data)
//     } catch (e) {
//       setError(e instanceof Error ? e.message : 'An unknown error occurred')
//     } finally {
//       setIsLoading(false)
//     }
//   }

//   const addAudioElement = (blob:Blob) => {
//     const url = URL.createObjectURL(blob);
//     setRecordedAudio({blob,url})
//     // const existingAudio = document.querySelector("audio");
  
//     // // If there's an existing audio element, remove it
//     // if (existingAudio) {
//     //   existingAudio.remove();
//     // }
  
//     // const audio = document.createElement("audio");
//     // audio.src = url;
//     // audio.controls = true;
//     // audio.classList.add("mt-4", "border-2", "border-blue-500", "rounded-lg", "shadow-lg");

//     // document.body.appendChild(audio);
//   };
//   console.log({recordedAudio})
  

//   return (
//     <form onSubmit={handleSubmit} className="space-y-4">
//       <div>
//         <Label htmlFor="youtube_url">YouTube URL</Label>
//         <Input
//           id="youtube_url"
//           type="text"
//           value={youtubeUrl}
//           onChange={(e) => setYoutubeUrl(e.target.value)}
//           placeholder="https://www.youtube.com/watch?v=..."
//         />
//       </div>
//       <div>
//         <Label htmlFor="video_file">Or upload a video file</Label>
//         <Input
//           id="video_file"
//           type="file"
//           onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
//           accept=".mp4,.avi,.mov,.mkv"
//         />
//       </div>
//       <div>
//         <Label htmlFor="reference_audio">Reference Audio (upload or record)</Label>
//         <Input
//           id="reference_audio"
//           type="file"
//           onChange={(e) => {
//             setReferenceAudio(e.target.files?.[0] || null)
//             setRecordedAudio(null)
//           }}
          
//           accept=".wav,.mp3"
//           disabled={isRecording || !!recordedAudio}
//         />
//       </div>
  //     <div className="flex items-center space-x-4">
  //     <AudioRecorder 
  //     onRecordingComplete={addAudioElement}
  //     audioTrackConstraints={{
  //       noiseSuppression: true,
  //       echoCancellation: true,
  //     }}
  //     showVisualizer={true}
  //     downloadOnSavePress={false}
  //     downloadFileExtension="mp3"
  //   />
  //  {recordedAudio&& <div className='flex items-center justify-center gap-2'>
  //   <audio 
  //               src={recordedAudio.url} 
  //               controls={true}
  //               className="w-72" 
  //               // style={{ aspectRatio: '16/9' }}
  //             >
  //               Your browser does not support the audio tag.
  //             </audio>
  //             <Button size={'icon'} variant={'outline'} onClick={()=>setRecordedAudio(null)}><X className="h-6 w-6"/></Button>
  //   </div>}
  //       {/* <Button
  //         type="button"
  //         onClick={isRecording ? stopRecording : startRecording}
  //         disabled={!!referenceAudio}
  //       >
  //         {isRecording ? 'Stop Recording' : 'Start Recording'}
  //       </Button> */}
  //       {/* {recordedAudio && <span className="text-green-500">Audio recorded!</span>} */}
  //     </div>
//       <Button type="submit" disabled={isLoading}>
//         {isLoading ? 'Processing...' : 'Process Video'}
//       </Button>
//       <Player videoSrc={"https://krmu-app.s3.amazonaws.com/processed_videos/output_492771d6-406b-4d70-9218-4b1d5ad83a2d.mp4"} />
//       {/* <MediaPlayer className="w-full aspect-video bg-slate-900 text-white font-sans overflow-hidden rounded-md ring-media-focus data-[focus]:ring-4" title="Sprite Fight" src="https://files.vidstack.io/sprite-fight/720p.mp4">
//         <MediaProvider />
//       </MediaPlayer> */}
//       {error && <p className="text-red-500">{error}</p>}
//       {result && (
//         <div>
//           <h2 className="text-xl font-bold">Result:</h2>
//           <Textarea value={JSON.stringify(result, null, 2)} readOnly rows={10} />
//           {result.video_url && (
//             <div className="mt-4">
//               <h3 className="text-lg font-bold mb-2">Processed Video:</h3>
//               <video 
//                 src={result.video_url} 
//                 controls 
//                 className="w-full" 
//                 style={{ aspectRatio: '16/9' }}
//               >
//                 Your browser does not support the video tag.
//               </video>
//             </div>
//           )}
//         </div>
//       )}
//     </form>
//   )
// }

'use client';
import '@vidstack/react/player/styles/base.css';
import { AudioRecorder } from 'react-audio-voice-recorder';
import { X } from 'lucide-react'
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertCircle,
  Upload,
  Youtube,
  Mic,
  StopCircle,
  Play,
  Pause,
  Volume2,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MediaPlayer, MediaProvider } from '@vidstack/react';
import { Player } from './video/player';

const schema = z
  .object({
    youtubeUrl: z
      .string()
      .url()
      .regex(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/)
      .optional()
      .or(z.literal('')),
    videoFile: z.instanceof(File).optional(),
    audioSource: z.enum(['file', 'record']),
    referenceAudio: z.instanceof(File).optional(),
  })
  .refine(
    (data) => {
      if (!data.youtubeUrl && !data.videoFile) {
        return false;
      }
      if (data.audioSource === 'file' && !data.referenceAudio) {
        return false;
      }
      return true;
    },
    {
      message:
        "Please provide either a YouTube URL or a video file, and a reference audio file if 'Upload Audio File' is selected.",
      path: ['youtubeUrl', 'videoFile', 'referenceAudio'],
    }
  );

type FormData = z.infer<typeof schema>;

export default function VideoProcessor() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>({
    matching_speakers: ['SPEAKER_01'],
    speaker_distances: {
      SPEAKER_00: 0.7720759629429036,
      SPEAKER_01: 0.04126668025657687,
    },
    status: 'success',
    video_url:
      'https://krmu-app.s3.amazonaws.com/processed_videos/output_492771d6-406b-4d70-9218-4b1d5ad83a2d.mp4',
  });
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [videoSrc, setVideoSrc] = useState<string | null>(
    'https://krmu-app.s3.amazonaws.com/processed_videos/output_492771d6-406b-4d70-9218-4b1d5ad83a2d.mp4'
  );

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      youtubeUrl: '',
      audioSource: 'file',
    },
  });

  const audioSource = watch('audioSource');
  const youtubeUrl = watch('youtubeUrl');
  const videoFile = watch('videoFile');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const addAudioElement = (blob:Blob) => {
        const url = URL.createObjectURL(blob);
        setRecordedAudio(url)
    //     // const existingAudio = document.querySelector("audio");
      
    //     // // If there's an existing audio element, remove it
    //     // if (existingAudio) {
    //     //   existingAudio.remove();
    //     // }
      
    //     // const audio = document.createElement("audio");
    //     // audio.src = url;
    //     // audio.controls = true;
    //     // audio.classList.add("mt-4", "border-2", "border-blue-500", "rounded-lg", "shadow-lg");
    
    //     // document.body.appendChild(audio);
      };
  useEffect(() => {
    if (youtubeUrl) {
      setVideoSrc(youtubeUrl);
    } else if (videoFile) {
      setVideoSrc(URL.createObjectURL(videoFile));
    } else {
      setVideoSrc(null);
    }
  }, [youtubeUrl, videoFile]);

 

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      if (data.youtubeUrl) formData.append('youtube_url', data.youtubeUrl);
      if (data.videoFile) formData.append('video_file', data.videoFile);

      if (data.audioSource === 'file' && data.referenceAudio) {
        formData.append('reference_audio', data.referenceAudio);
      } else if (data.audioSource === 'record' && recordedAudio) {
        const response = await fetch(recordedAudio);
        const blob = await response.blob();
        formData.append('reference_audio', blob, 'recorded_audio.wav');
      } else {
        throw new Error(
          'Please provide a reference audio (either upload or record)'
        );
      }

      const response = await fetch('http://localhost:5000/process_video', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process video');
      }

      const result = await response.json();
      setResult(result);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  console.log(result.video_url);
  return (
    <>
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Video Processor</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="youtube-url">YouTube URL</Label>
                <div className="flex items-center space-x-2">
                  <Youtube className="h-5 w-5 text-gray-500" />
                  <Controller
                    name="youtubeUrl"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="youtube-url"
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=..."
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setValue('videoFile', undefined);
                        }}
                        aria-describedby="youtube-url-description"
                      />
                    )}
                  />
                </div>
                <p
                  id="youtube-url-description"
                  className="text-sm text-gray-500 mt-1"
                >
                  Enter a YouTube video URL to process
                </p>
              </div>
              <div>
                <Label htmlFor="video-file">Or upload a video file</Label>
                <div className="flex items-center space-x-2">
                  <Upload className="h-5 w-5 text-gray-500" />
                  <Controller
                    name="videoFile"
                    control={control}
                    render={({ field: { value, onChange, ...field } }) => (
                      <Input
                        id="video-file"
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          onChange(e.target.files?.[0]);
                          setValue('youtubeUrl', '');
                        }}
                        aria-describedby="video-file-description"
                        {...field}
                      />
                    )}
                  />
                </div>
                <p
                  id="video-file-description"
                  className="text-sm text-gray-500 mt-1"
                >
                  Upload a video file from your device
                </p>
              </div>
              {videoSrc && (
                <div className="mt-4">
                  alkdjfalksdf
                  <MediaPlayer
                    title="Video Player"
                    src={videoSrc}
                    className="w-full aspect-video bg-slate-900 text-white font-sans overflow-hidden rounded-md ring-media-focus data-[focus]:ring-4"
                  >
                    <MediaProvider />
                  </MediaPlayer>
                </div>
              )}
              <div>
                <Label>Reference Audio</Label>
                <Controller
                  name="audioSource"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <RadioGroup
                      value={value}
                      onValueChange={(value: 'file' | 'record') => {
                        onChange(value);
                        setValue('referenceAudio', undefined);
                        setRecordedAudio(null);
                      }}
                      aria-label="Choose audio source"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="file" id="audio-file" />
                        <Label htmlFor="audio-file">Upload Audio File</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="record" id="audio-record" />
                        <Label htmlFor="audio-record">Record Audio</Label>
                      </div>
                    </RadioGroup>
                  )}
                />
              </div>
              {audioSource === 'file' && (
                <div>
                  <Label htmlFor="reference-audio">
                    Upload Reference Audio
                  </Label>
                  <Controller
                    name="referenceAudio"
                    control={control}
                    render={({ field: { value, onChange, ...field } }) => (
                      <Input
                        id="reference-audio"
                        type="file"
                        accept="audio/*"
                        onChange={(e) => onChange(e.target.files?.[0])}
                        aria-describedby="reference-audio-description"
                        {...field}
                      />
                    )}
                  />
                  <p
                    id="reference-audio-description"
                    className="text-sm text-gray-500 mt-1"
                  >
                    Upload a reference audio file for speaker matching
                  </p>
                </div>
              )}
              {audioSource === 'record' && (
                <div className="space-y-2">
                      <div className="flex items-center space-x-4">
      <AudioRecorder 
      onRecordingComplete={addAudioElement}
      audioTrackConstraints={{
        noiseSuppression: true,
        echoCancellation: true,
      }}
      showVisualizer={true}
      downloadOnSavePress={false}
      downloadFileExtension="mp3"
    />
   {recordedAudio&& <div className='flex items-center justify-center gap-2'>
    <audio 
                src={recordedAudio} 
                controls={true}
                className="w-72" 
                // style={{ aspectRatio: '16/9' }}
              >
                Your browser does not support the audio tag.
              </audio>
              <Button size={'icon'} variant={'outline'} onClick={()=>setRecordedAudio(null)}><X className="h-6 w-6"/></Button>
    </div>}
      </div>
                </div>
              )}
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Processing...' : 'Process Video'}
              </Button>
            </form>

            {(errors.youtubeUrl ||
              errors.videoFile ||
              errors.referenceAudio) && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {errors.youtubeUrl?.message ||
                    errors.videoFile?.message ||
                    errors.referenceAudio?.message}
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Status: {result.status}</p>
                  {result.video_url && (
                    <div className="mt-4">
                      <p>Processed Video:</p>
                      <Player videoSrc={result.video_url} />
                    </div>
                  )}
                  <p>
                    Matching Speakers: {result.matching_speakers.join(', ')}
                  </p>
                  <h4 className="font-semibold mt-2">Speaker Distances:</h4>
                  <ul>
                    {Object.entries(result.speaker_distances).map(
                      ([speaker, distance]) => (
                        <li key={speaker}>
                          {speaker}: {Number(distance).toFixed(4)}
                        </li>
                      )
                    )}
                  </ul>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
