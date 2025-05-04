"use client";
import "@vidstack/react/player/styles/base.css";
import { AudioRecorder } from "react-audio-voice-recorder";
import { CloudUpload, Download, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  Upload,
  Youtube,
  Mic,
  StopCircle,
  Play,
  Pause,
  Volume2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MediaPlayer, MediaProvider } from "@vidstack/react";
import { Player } from "./video/player";
import { cn } from "@/lib/utils";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
  FileUploadTrigger,
} from "@/components/ui/file-upload";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
const MAX_FILE_SIZE = 20; //20 mb
const ALLOWED_AUDIO_EXTENSIONS = ["wav", "mp3"];
const ALLOWED_VIDEO_EXTENSIONS = ["mp4", "avi", "mov", "mkv"];

export const youtubeRegex =
  /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
const youtubeUrlSchema = z
  .string()
  .trim()
  .refine((val) => val === "" || youtubeRegex.test(val), {
    message: "Must be a valid YouTube URL.",
  });
const schema = z
  .object({
    youtubeUrl: youtubeUrlSchema.optional(),
    // youtubeUrl: z
    //   .string()
    //   .url()
    //   .regex(youtubeRegex)
    //   .optional()
    //   .or(z.literal("")),
    videoFile: z
      .instanceof(File)
      .optional()
      .refine(
        (file) => {
          if (!file) return true; // allow undefined (optional)
          const ext = file.name.split(".").pop()?.toLowerCase();
          return ext && ALLOWED_VIDEO_EXTENSIONS.includes(ext);
        },
        {
          message: `Only ${ALLOWED_VIDEO_EXTENSIONS.join(
            ", "
          )} files are allowed.`,
        }
      ),
    audioSource: z.enum(["file", "record"]),
    referenceAudio: z
      .instanceof(File)
      .optional()
      .refine(
        (file) => {
          if (!file) return true; // allow undefined (optional)
          const ext = file.name.split(".").pop()?.toLowerCase();
          return ext && ALLOWED_AUDIO_EXTENSIONS.includes(ext);
        },
        {
          message: `Only ${ALLOWED_AUDIO_EXTENSIONS.join(
            ", "
          )} files are allowed.`,
        }
      ),
  })
  .refine(
    (data) => {
      // if (!data.youtubeUrl && !data.videoFile) {
      //   return false;
      // }
      if (data.audioSource === "file" && !data.referenceAudio) {
        return false;
      }
      // if (data.audioSource === "file" && !data.referenceAudio) {
      //   context.addIssue({
      //     path: ["referenceAudio"],
      //     code: z.ZodIssueCode.custom,
      //     message: "Reference audio file is required",
      //   });
      // }
      return true;
    },
    {
      message:
        "Please provide either a YouTube URL or a video file, and a reference audio file if 'Upload Audio File' is selected.",
      path: ["referenceAudio"],
    }
  );

type FormData = z.infer<typeof schema>;

export default function VideoProcessor() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>({
    matching_speakers: ["SPEAKER_01"],
    speaker_distances: {
      SPEAKER_00: 0.7720759629429036,
      SPEAKER_01: 0.04126668025657687,
    },
    status: "success",
    video_url: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [videoSrc, setVideoSrc] = useState<string | null>("");
  const [audioSrc, setAudioSrc] = useState<string | null>("");
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [processingMessage, setProcessingMessage] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      youtubeUrl: "",
      audioSource: "file",
    },
  });
  const {
    handleSubmit,
    watch,
    setValue,
    setError: setFormError,
    formState: { errors },
    ...rest
  } = form;
  const audioSource = watch("audioSource");
  const referenceAudio = watch("referenceAudio");
  const youtubeUrl = watch("youtubeUrl");
  const videoFile = watch("videoFile");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const addAudioElement = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    setRecordedAudio(url);
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
    console.log({ audioSource, videoSrc });
    if (youtubeUrl) {
      setVideoSrc(youtubeUrl);
    } else if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoSrc(url);
      // Cleanup the URL when the component unmounts or when the video changes
      return () => URL.revokeObjectURL(url);
    } else {
      setVideoSrc(null);
    }
    if (audioSource === "file" && referenceAudio) {
      const url = URL.createObjectURL(referenceAudio);
      console.log({ url });
      setAudioSrc(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioSrc(null);
    }
  }, [youtubeUrl, videoFile, referenceAudio, audioSource]);

  // Add this function to handle SSE events
  const listenToProgress = (progressId: string) => {
    const eventSource = new EventSource(`/stream?channel=${progressId}`);

    eventSource.addEventListener("progress", (event) => {
      const data = JSON.parse(event.data);
      setProcessingMessage(data.message);
      setProcessingProgress(data.percentage);

      if (data.percentage === 100) {
        eventSource.close();
      }
    });

    eventSource.onerror = () => {
      eventSource.close();
    };

    return eventSource;
  };

  // Update the onSubmit function
  const onSubmit = async (data: FormData) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setProcessingProgress(0);
    setProcessingMessage("Starting process...");
    try {
      const formData = new FormData();
      if (data.youtubeUrl) formData.append("youtube_url", data.youtubeUrl);
      if (data.videoFile) formData.append("video_file", data.videoFile);

      if (data.audioSource === "file" && data.referenceAudio) {
        formData.append("reference_audio", data.referenceAudio);
      } else if (data.audioSource === "record" && recordedAudio) {
        const response = await fetch(recordedAudio);
        const blob = await response.blob();
        formData.append("reference_audio", blob, "recorded_audio.wav");
      }

      const response = await fetch("http://127.0.0.1:5000/process_video", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      console.log("response", result);
      if (result?.error) {
        throw new Error(result?.error);
      }

      const progressId = response.headers.get("X-Progress-ID");

      if (progressId) {
        const eventSource = listenToProgress(progressId);
      }
      setResult(result);

      // const videoBlob = await response.blob();
      // const videoUrl = URL.createObjectURL(videoBlob);
      // setResult({
      //   status: "success",
      //   video_url: videoUrl,
      // });
    } catch (err) {
      console.log("error ", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    console.log("error form", error, errors);
  }, [error, errors]);
  // <form onSubmit={handleSubmit(onSubmit)}>
  //   <div>
  //     <div className="space-y-1">
  //       <Label
  //         htmlFor="youtube-url"
  //         className={cn("flex items-center gap-2")}
  //       >
  //         <Youtube className="h-5 w-5 text-gray-500" />
  //         YouTube URL
  //         <span className="text-xs text-gray-400"></span>
  //       </Label>
  //       <Controller
  //         name="youtubeUrl"
  //         control={control}
  //         render={({ field }) => (
  //           <div className="space-y-1">
  //             <Input
  //               id="youtube-url"
  //               type="url"
  //               // disabled
  //               placeholder="https://www.youtube.com/watch?v=..."
  //               {...field}
  //               onChange={(e) => {
  //                 field.onChange(e);
  //                 setValue("videoFile", undefined);
  //               }}
  //             />
  //             <p className="text-sm text-muted-foreground">
  //               Enter a YouTube video URL to process.
  //             </p>
  //             {errors?.youtubeUrl && (
  //               <p className="text-sm text-red-600">
  //                 {errors?.youtubeUrl?.message}
  //               </p>
  //             )}
  //           </div>
  //         )}
  //       />
  //     </div>
  //     <div className="my-3 flex justify-center">
  //       <p className="text-gray-500 font-semibold">----- Or -----</p>
  //     </div>
  //     {/* Upload Video */}
  //     <div className="space-y-1">
  //       <Label htmlFor="video-file" className="flex items-center gap-2">
  //         <Upload className="h-5 w-5 text-gray-500" />
  //         Upload Video File
  //       </Label>
  //       <Controller
  //         disabled={!!watch("youtubeUrl")}
  //         name="videoFile"
  //         control={control}
  //         render={({ field: { value, onChange, ...field } }) => (
  //           <div>
  //             {/* <Input
  //             id="video-file"
  //             type="file"
  //             accept="video/*"
  //             onChange={(e) => {
  //               onChange(e.target.files?.[0]);
  //               setValue("youtubeUrl", "");
  //             }}
  //             {...field}
  //           /> */}
  //             <FileUpload
  //               // disabled={!!watch("youtubeUrl")}
  //               // value={value?.[0]}
  //               onValueChange={onChange}
  //               accept="video/*"
  //               maxFiles={1}
  //               maxSize={5 * 1024 * 1024}
  //               onFileReject={(_, message) => {
  //                 setFormError("videoFile", {
  //                   message,
  //                 });
  //               }}
  //               {...field}
  //             >
  //               <FileUploadDropzone>
  //                 <div className="flex flex-col items-center gap-1 text-center">
  //                   <div className="flex items-center justify-center rounded-full border p-2.5">
  //                     <Upload className="size-6 text-muted-foreground" />
  //                   </div>
  //                   <p className="font-medium text-sm">
  //                     Drag & drop video file here
  //                   </p>
  //                   <p className="text-muted-foreground text-xs">
  //                     Or click to browse (max 1 file, up to 5MB)
  //                   </p>
  //                 </div>
  //                 <FileUploadTrigger asChild>
  //                   <Button
  //                     variant="outline"
  //                     size="sm"
  //                     className="mt-2 w-fit"
  //                   >
  //                     Browse file
  //                   </Button>
  //                 </FileUploadTrigger>
  //               </FileUploadDropzone>
  //               <FileUploadList>
  //                 {value && (
  //                   <FileUploadItem value={value}>
  //                     <FileUploadItemPreview />
  //                     <FileUploadItemMetadata />
  //                     <FileUploadItemDelete asChild>
  //                       <Button
  //                         variant="ghost"
  //                         size="icon"
  //                         className="size-7"
  //                       >
  //                         <X />
  //                         <span className="sr-only">Delete</span>
  //                       </Button>
  //                     </FileUploadItemDelete>
  //                   </FileUploadItem>
  //                 )}
  //                 {/* {value?.map((file, index) => (
  //               ))} */}
  //               </FileUploadList>
  //             </FileUpload>
  //             {errors?.youtubeUrl && (
  //               <p className="text-sm text-red-600">
  //                 {errors?.youtubeUrl?.message}
  //               </p>
  //             )}
  //           </div>
  //         )}
  //       />

  //       <p className="text-sm text-muted-foreground">
  //         Upload a video file from your device.
  //       </p>
  //     </div>
  //   </div>
  //   <div className="space-y-6">
  //     {/* Video Preview */}
  //     {videoSrc && !(errors.youtubeUrl || errors.videoFile) && (
  //       <div className="mt-3">
  //         <Player key={videoSrc} src={videoSrc} />
  //       </div>
  //     )}

  //     {/* Reference Audio Option */}
  //     <div className="space-y-2">
  //       <Label className="block">Reference Audio</Label>
  //       <Controller
  //         name="audioSource"
  //         control={control}
  //         render={({ field: { onChange, value } }) => (
  //           <RadioGroup
  //             value={value}
  //             onValueChange={(val: "file" | "record") => {
  //               onChange(val);
  //               setValue("referenceAudio", undefined);
  //               setRecordedAudio(null);
  //             }}
  //           >
  //             <div className="flex items-center gap-2">
  //               <RadioGroupItem value="file" id="audio-file" />
  //               <Label htmlFor="audio-file">Upload Audio File</Label>
  //             </div>
  //             <div className="flex items-center gap-2">
  //               <RadioGroupItem value="record" id="audio-record" />
  //               <Label htmlFor="audio-record">Record Audio</Label>
  //             </div>
  //           </RadioGroup>
  //         )}
  //       />
  //     </div>

  //     {/* Upload Audio */}
  //     {audioSource === "file" && (
  //       <div className="space-y-1">
  //         <Label htmlFor="reference-audio">
  //           Upload Reference Audio
  //         </Label>
  //         <Controller
  //           name="referenceAudio"
  //           control={control}
  //           render={({ field: { value, onChange, ...field } }) => (
  //             <Input
  //               id="reference-audio"
  //               type="file"
  //               accept="audio/*"
  //               onChange={(e) => onChange(e.target.files?.[0])}
  //               aria-describedby="reference-audio-description"
  //               {...field}
  //             />
  //           )}
  //         />

  //         <p className="text-sm text-muted-foreground">
  //           Upload a reference audio file for speaker matching.
  //         </p>
  //         {audioSrc && (
  //           <div className="mt-3">
  //             <Player type="audio" key={audioSrc} src={audioSrc} />
  //           </div>
  //         )}
  //       </div>
  //     )}

  //     {/* Record Audio */}
  //     {audioSource === "record" && (
  //       <div className="space-y-3">
  //         <AudioRecorder
  //           onRecordingComplete={addAudioElement}
  //           audioTrackConstraints={{
  //             noiseSuppression: true,
  //             echoCancellation: true,
  //           }}
  //           showVisualizer
  //           downloadOnSavePress={false}
  //           downloadFileExtension="mp3"
  //         />
  //         {recordedAudio && (
  //           <div className="flex items-center gap-3">
  //             <audio src={recordedAudio} controls className="w-64" />
  //             <Button
  //               size="icon"
  //               variant="outline"
  //               onClick={() => setRecordedAudio(null)}
  //             >
  //               <X className="h-5 w-5" />
  //             </Button>
  //           </div>
  //         )}
  //       </div>
  //     )}

  //     {/* Submit */}
  //     <Button
  //       type="submit"
  //       disabled={
  //         !videoSrc ||
  //         !(audioSource === "file" ? referenceAudio : recordedAudio) ||
  //         isLoading ||
  //         isProcessing
  //       }
  //       className="w-full"
  //     >
  //       {isProcessing ? "Processing..." : "Process Video"}
  //     </Button>

  //     {/* Validation/Error Alerts */}
  //     {/* {(errors.youtubeUrl ||
  //       errors.videoFile ||
  //       errors.referenceAudio) && (
  //       <Alert variant="destructive">
  //         <AlertCircle className="h-4 w-4" />
  //         <AlertTitle>Error</AlertTitle>
  //         <AlertDescription>
  //           {errors.youtubeUrl?.message ||
  //             errors.videoFile?.message ||
  //             errors.referenceAudio?.message}
  //         </AlertDescription>
  //       </Alert>
  //     )} */}

  //     {error && (
  //       <Alert variant="destructive" className="mt-2">
  //         <AlertCircle className="h-4 w-4" />
  //         <AlertTitle>Error</AlertTitle>
  //         <AlertDescription>{error}</AlertDescription>
  //       </Alert>
  //     )}
  //   </div>
  // </form>
  return (
    <div className="container mx-auto max-w-3xl p-6 space-y-6">
      <h3 className="text-center text-3xl font-bold">SNIPCLIPS</h3>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">🎬 Video Processor</CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload a video and reference speaker audio to get all the clips of
            the speaker's matched segments.
          </p>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 p-6">
            <div className="space-y-2">
              <FormField
                disabled={!!watch("videoFile")}
                name="youtubeUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel
                      htmlFor="youtube-url"
                      className="flex items-center gap-2"
                    >
                      <Youtube className="h-5 w-5 text-gray-500" />
                      YouTube URL
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="youtube-url"
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=..."
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setValue("videoFile", undefined);
                        }}
                      />
                    </FormControl>
                    {/* <p className="text-sm text-muted-foreground">
                      Enter a YouTube video URL to process.
                    </p> */}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="my-3 flex justify-center">
                <p className="text-gray-500 font-semibold">----- Or -----</p>
              </div>

              <FormField
                disabled={!!watch("youtubeUrl")}
                name="videoFile"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel
                      htmlFor="video-file"
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-5 w-5 text-gray-500" />
                      Upload Video File
                    </FormLabel>
                    <FormControl>
                      <FileUpload
                        onValueChange={(files) => {
                          console.log("files", files);
                          if (files) {
                            form.setValue("videoFile", files[0]);
                          }
                        }}
                        accept={ALLOWED_VIDEO_EXTENSIONS.map(
                          (ext) => `video/${ext}`
                        ).join(", ")}
                        maxFiles={1}
                        maxSize={MAX_FILE_SIZE * 1024 * 1024}
                        onFileReject={(_, message) => {
                          setFormError("videoFile", { message });
                        }}
                        {...field}
                      >
                        <FileUploadDropzone>
                          <div className="flex flex-col items-center gap-1 text-center">
                            <div className="flex items-center justify-center rounded-full border p-2.5">
                              <Upload className="size-6 text-muted-foreground" />
                            </div>
                            <p className="font-medium text-sm">
                              Drag & drop video file here
                            </p>
                            <p className="text-muted-foreground text-xs">
                              Or click to browse (max 1 file, up to{" "}
                              {MAX_FILE_SIZE}MB)
                            </p>
                          </div>
                          <FileUploadTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 w-fit"
                            >
                              Browse file
                            </Button>
                          </FileUploadTrigger>
                        </FileUploadDropzone>
                        <FileUploadList>
                          {value && (
                            <FileUploadItem value={value}>
                              <FileUploadItemPreview />
                              <FileUploadItemMetadata />
                              <FileUploadItemDelete asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7"
                                >
                                  <X />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </FileUploadItemDelete>
                            </FileUploadItem>
                          )}
                        </FileUploadList>
                      </FileUpload>
                    </FormControl>
                    {/* <p className="text-sm text-muted-foreground">
                      Upload a video file from your device.
                    </p> */}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {videoSrc && !(errors.youtubeUrl || errors.videoFile) && (
                <div className="mt-3">
                  <Player key={videoSrc} src={videoSrc} />
                </div>
              )}
            </div>
            <div className="space-y-6">
              {/* Audio Source */}
              <FormField
                name="audioSource"
                render={({ field: { value, onChange } }) => (
                  <FormItem>
                    <FormLabel className="block">Reference Audio</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={value}
                        onValueChange={(val: "file" | "record") => {
                          onChange(val);
                          setValue("referenceAudio", undefined);
                          setRecordedAudio(null);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="file" id="audio-file" />
                          <Label htmlFor="audio-file">Upload Audio File</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="record" id="audio-record" />
                          <Label htmlFor="audio-record">Record Audio</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Upload Audio File */}
              {audioSource === "file" && (
                <FormField
                  name="referenceAudio"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel htmlFor="reference-audio">
                        Upload Reference Audio
                      </FormLabel>
                      <FormControl>
                        {/* <Input
                          id="reference-audio"
                          type="file"
                          accept="audio/*"
                          onChange={(e) => onChange(e.target.files?.[0])}
                          aria-describedby="reference-audio-description"
                          {...field}
                        /> */}
                        <FileUpload
                          aria-describedby="reference-audio-description"
                          onValueChange={(files) => {
                            console.log("files", files);
                            if (files) {
                              form.setValue("referenceAudio", files[0]);
                            }
                          }}
                          accept={ALLOWED_AUDIO_EXTENSIONS.map(
                            (ext) => `audio/${ext}`
                          ).join(", ")}
                          maxFiles={1}
                          maxSize={MAX_FILE_SIZE * 1024 * 1024}
                          onFileReject={(_, message) => {
                            setFormError("referenceAudio", { message });
                          }}
                          {...field}
                        >
                          <FileUploadDropzone>
                            <div className="flex flex-col items-center gap-1 text-center">
                              <div className="flex items-center justify-center rounded-full border p-2.5">
                                <Upload className="size-6 text-muted-foreground" />
                              </div>
                              <p className="font-medium text-sm">
                                Drag & drop audio file here
                              </p>
                              <p className="text-muted-foreground text-xs">
                                Or click to browse (max 1 file, up to{" "}
                                {MAX_FILE_SIZE}MB)
                              </p>
                            </div>
                            <FileUploadTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2 w-fit"
                              >
                                Browse file
                              </Button>
                            </FileUploadTrigger>
                          </FileUploadDropzone>
                          <FileUploadList>
                            {value && (
                              <FileUploadItem value={value}>
                                <FileUploadItemPreview />
                                <FileUploadItemMetadata />
                                <FileUploadItemDelete asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7"
                                  >
                                    <X />
                                    <span className="sr-only">Delete</span>
                                  </Button>
                                </FileUploadItemDelete>
                              </FileUploadItem>
                            )}
                          </FileUploadList>
                        </FileUpload>
                      </FormControl>
                      <p className="text-sm text-muted-foreground">
                        Upload a reference audio file for speaker matching.
                      </p>
                      {audioSrc && (
                        <div className="mt-3">
                          <Player type="audio" key={audioSrc} src={audioSrc} />
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Record Audio */}
              {audioSource === "record" && (
                <div className="space-y-3">
                  <AudioRecorder
                    onRecordingComplete={addAudioElement}
                    audioTrackConstraints={{
                      noiseSuppression: true,
                      echoCancellation: true,
                    }}
                    showVisualizer
                    downloadOnSavePress={false}
                    downloadFileExtension="mp3"
                  />
                  {recordedAudio && (
                    <div className="flex items-center gap-3">
                      <audio src={recordedAudio} controls className="w-64" />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => setRecordedAudio(null)}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={
                  !videoSrc ||
                  !(audioSource === "file" ? referenceAudio : recordedAudio) ||
                  isLoading ||
                  isProcessing
                }
                className="w-full"
              >
                {isProcessing ? "Processing..." : "Process Video"}
              </Button>

              {error && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </form>
        </Form>

        <CardContent>
          {/* Processing Progress */}
          {/* {isProcessing && (
            <div className="mt-6 space-y-1">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{processingMessage}</span>
                <span>{processingProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${processingProgress}%` }}
                />
              </div>
            </div>
          )} */}

          {/* Final Output */}
          {result?.video_url && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Processed Video</CardTitle>
              </CardHeader>
              <CardContent>
                <Player src={result?.video_url} />
                <div className="mt-4 flex justify-end">
                  <a
                    href={result?.video_url}
                    download
                    className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm"
                  >
                    <Download size={16} /> Download
                  </a>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// return (
//   <>
//     <div className="container mx-auto p-4">
//       <Card>
//         <CardHeader>
//           <CardTitle>Video Processor</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
//             <div>
//               <Label htmlFor="youtube-url" className="flex gap-1 mb-1">
//                 YouTube URL<p className="text-gray-500">(Coming soon)</p>
//               </Label>
//               <div className="flex items-center space-x-2">
//                 <Youtube className="h-5 w-5 text-gray-500" />
//                 <Controller
//                   name="youtubeUrl"
//                   control={control}
//                   render={({ field }) => (
//                     <Input
//                       id="youtube-url"
//                       type="url"
//                       disabled={true}
//                       placeholder="https://www.youtube.com/watch?v=..."
//                       {...field}
//                       onChange={(e) => {
//                         field.onChange(e);
//                         setValue("videoFile", undefined);
//                       }}
//                       aria-describedby="youtube-url-description"
//                     />
//                   )}
//                 />
//               </div>
//               <p
//                 id="youtube-url-description"
//                 className="text-sm text-gray-500 mt-1"
//               >
//                 Enter a YouTube video URL to process
//               </p>
//             </div>
//             <div>
//               <Label htmlFor="video-file">Or upload a video file</Label>
//               <div className="flex items-center space-x-2">
//                 <Upload className="h-5 w-5 text-gray-500" />
//                 <Controller
//                   name="videoFile"
//                   control={control}
//                   render={({ field: { value, onChange, ...field } }) => (
//                     <Input
//                       id="video-file"
//                       type="file"
//                       accept="video/*"
//                       onChange={(e) => {
//                         onChange(e.target.files?.[0]);
//                         setValue("youtubeUrl", "");
//                       }}
//                       aria-describedby="video-file-description"
//                       {...field}
//                     />
//                   )}
//                 />
//               </div>
//               <p
//                 id="video-file-description"
//                 className="text-sm text-gray-500 mt-1"
//               >
//                 Upload a video file from your device
//               </p>
//             </div>

//             {videoSrc && (
//               <div className="mt-4">
//                 <Player key={videoSrc} src={videoSrc} />
//               </div>
//             )}
//             <div>
//               <Label>Reference Audio</Label>
//               <Controller
//                 name="audioSource"
//                 control={control}
//                 render={({ field: { onChange, value } }) => (
//                   <RadioGroup
//                     value={value}
//                     onValueChange={(value: "file" | "record") => {
//                       onChange(value);
//                       setValue("referenceAudio", undefined);
//                       setRecordedAudio(null);
//                     }}
//                     aria-label="Choose audio source"
//                   >
//                     <div className="flex items-center space-x-2">
//                       <RadioGroupItem value="file" id="audio-file" />
//                       <Label htmlFor="audio-file">Upload Audio File</Label>
//                     </div>
//                     <div className="flex items-center space-x-2">
//                       <RadioGroupItem value="record" id="audio-record" />
//                       <Label htmlFor="audio-record">Record Audio</Label>
//                     </div>
//                   </RadioGroup>
//                 )}
//               />
//             </div>
//             {audioSource === "file" && (
//               <>
//                 <div>
//                   <Label htmlFor="reference-audio">
//                     Upload Reference Audio
//                   </Label>
// <Controller
//   name="referenceAudio"
//   control={control}
//   render={({ field: { value, onChange, ...field } }) => (
//     <Input
//       id="reference-audio"
//       type="file"
//       accept="audio/*"
//       onChange={(e) => onChange(e.target.files?.[0])}
//       aria-describedby="reference-audio-description"
//       {...field}
//     />
//   )}
// />
//                   <p
//                     id="reference-audio-description"
//                     className="text-sm text-gray-500 mt-1"
//                   >
//                     Upload a reference audio file for speaker matching
//                   </p>
//                 </div>
//                 {audioSrc && (
//                   <div className="mt-4">
//                     <Player type="audio" key={audioSrc} src={audioSrc} />
//                   </div>
//                 )}
//               </>
//             )}
//             {audioSource === "record" && (
//               <div className="space-y-2">
//                 <div className="flex items-center space-x-4">
//                   <AudioRecorder
//                     onRecordingComplete={addAudioElement}
//                     audioTrackConstraints={{
//                       noiseSuppression: true,
//                       echoCancellation: true,
//                     }}
//                     showVisualizer={true}
//                     downloadOnSavePress={false}
//                     downloadFileExtension="mp3"
//                   />
//                   {recordedAudio && (
//                     <div className="flex items-center justify-center gap-2">
//                       <audio
//                         src={recordedAudio}
//                         controls={true}
//                         className="w-72"
//                         // style={{ aspectRatio: '16/9' }}
//                       >
//                         Your browser does not support the audio tag.
//                       </audio>
//                       <Button
//                         size={"icon"}
//                         variant={"outline"}
//                         onClick={() => setRecordedAudio(null)}
//                       >
//                         <X className="h-6 w-6" />
//                       </Button>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             )}
//             <Button
//               type="submit"
//               disabled={
//                 !videoSrc ||
//                 !(audioSource === "file" ? referenceAudio : recordedAudio) ||
//                 isLoading
//               }
//             >
//               {isLoading ? "Processing..." : "Process Video"}
//             </Button>
//           </form>

//           {(errors.youtubeUrl ||
//             errors.videoFile ||
//             errors.referenceAudio) && (
//             <Alert variant="destructive" className="mt-4">
//               <AlertCircle className="h-4 w-4" />
//               <AlertTitle>Error</AlertTitle>
//               <AlertDescription>
//                 {errors.youtubeUrl?.message ||
//                   errors.videoFile?.message ||
//                   errors.referenceAudio?.message}
//               </AlertDescription>
//             </Alert>
//           )}

//           {error && (
//             <Alert variant="destructive" className="mt-4">
//               <AlertCircle className="h-4 w-4" />
//               <AlertTitle>Error</AlertTitle>
//               <AlertDescription>{error}</AlertDescription>
//             </Alert>
//           )}

//           {result.video_url && (
//             <Card className="mt-4">
//               <CardHeader>
//                 <CardTitle>Processed Video</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 {/* <p>Status: {result.status}</p> */}
//                 {/* {result.video_url && ( */}
//                 <div className="">
//                   {/* <p className="font-semibold text-lg">Processed Video</p> */}
//                   <Player src={result.video_url} />
//                 </div>
//                 {/* )} */}
//                 {/* <p>
//                   Matching Speakers: {result.matching_speakers.join(', ')}
//                 </p>
//                 <h4 className="font-semibold mt-2">Speaker Distances:</h4>
//                 <ul>
//                   {Object.entries(result.speaker_distances).map(
//                     ([speaker, distance]) => (
//                       <li key={speaker}>
//                         {speaker}: {Number(distance).toFixed(4)}
//                       </li>
//                     )
//                   )}
//                 </ul> */}
//               </CardContent>
//             </Card>
//           )}
//           {isProcessing && (
//             <div className="mt-4">
//               <div className="flex justify-between mb-1">
//                 <span className="text-sm font-medium">
//                   {processingMessage}
//                 </span>
//                 <span className="text-sm font-medium">
//                   {processingProgress}%
//                 </span>
//               </div>
//               <div className="w-full bg-gray-200 rounded-full h-2.5">
//                 <div
//                   className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
//                   style={{ width: `${processingProgress}%` }}
//                 ></div>
//               </div>
//             </div>
//           )}
//         </CardContent>
//       </Card>
//     </div>
//   </>
// );
