import VideoProcessorForm from "@/components/VideoProcessorForm";

export default function Home() {
  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Video Processor</h1>
      <VideoProcessorForm />
    </div>
  )
}

