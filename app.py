from flask import Flask, request, jsonify
import os
import yt_dlp
from pydub import AudioSegment
from pyannote.audio import Pipeline, Model, Inference
from scipy.spatial.distance import cdist
import numpy as np
from moviepy.editor import VideoFileClip, concatenate_videoclips
import subprocess
import boto3
from werkzeug.utils import secure_filename
import tempfile
import uuid
from flask_cors import CORS
from dotenv import load_dotenv

# Load .env file
load_dotenv()
app = Flask(__name__)
CORS(app)
# Configuration
ALLOWED_AUDIO_EXTENSIONS = {'wav', 'mp3'}
ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv'}
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_KEY")
AWS_REGION = os.getenv("AWS_REGION")
HF_TOKEN = os.getenv("HF_TOKEN")
MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500MB max file size

# Initialize S3 client
s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY,
    region_name=S3_BUCKET_NAME
)


def allowed_audio_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_AUDIO_EXTENSIONS


def allowed_video_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_VIDEO_EXTENSIONS


def upload_to_s3(file_path, bucket, object_name=None):
    """Upload a file to S3 bucket and return the public URL"""
    if object_name is None:
        object_name = os.path.basename(file_path)

    try:
        s3_client.upload_file(file_path, bucket, object_name)
        url = f"https://{bucket}.s3.amazonaws.com/{object_name}"
        return url
    except Exception as e:
        print(f"Error uploading to S3: {e}")
        return None


def download_youtube_video(youtube_link, output_path):
    output_base = os.path.splitext(output_path)[0]

    ydl_opts = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4',
        'outtmpl': output_base + '.mp4',
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([youtube_link])
    actual_output = output_base + '.mp4'
    return actual_output


def extract_audio_from_video(video_path, audio_path):
    command = f"ffmpeg -i {video_path} -vn -acodec pcm_s16le -ar 44100 -ac 2 {audio_path} -y"
    subprocess.call(command, shell=True)
    return audio_path


def get_speaker_embedding(audio_path, embedding_model):
    inference = Inference(embedding_model, window="whole")
    embedding = inference(audio_path).reshape(1, -1)
    return embedding


def extract_matching_speaker_segments(video_path, diarization_result, matching_speakers, output_path):
    video = VideoFileClip(video_path)
    segments = []

    for speech_turn, _, speaker_label in diarization_result.itertracks(yield_label=True):
        if speaker_label in matching_speakers:
            start_time = speech_turn.start
            end_time = speech_turn.end
            segment = video.subclip(start_time, end_time)
            segments.append(segment)

    if not segments:
        video.close()
        return None

    final_video = concatenate_videoclips(segments)
    final_video.write_videofile(
        output_path,
        codec='libx264',
        audio_codec='aac',
        temp_audiofile='temp-audio.m4a',
        remove_temp=True,
        threads=4
    )

    video.close()
    final_video.close()
    return output_path


def match_speakers(reference_audio, extracted_speakers_dir, threshold=0.3):
    embedding_model = Model.from_pretrained(
        "pyannote/embedding", use_auth_token=HF_TOKEN)
    reference_embedding = get_speaker_embedding(
        reference_audio, embedding_model)

    matching_speakers = set()
    distances = {}

    for filename in os.listdir(extracted_speakers_dir):
        if not filename.endswith('.wav'):
            continue

        speaker_path = os.path.join(extracted_speakers_dir, filename)
        speaker_embedding = get_speaker_embedding(
            speaker_path, embedding_model)
        distance = cdist(reference_embedding,
                         speaker_embedding, metric="cosine")[0, 0]

        speaker_label = os.path.splitext(filename)[0]
        distances[speaker_label] = distance

        if distance <= threshold:
            matching_speakers.add(speaker_label)

    return matching_speakers, distances


def extract_speaker_segments(audio_path, diarization_result, output_dir):
    audio = AudioSegment.from_wav(audio_path)

    for speech_turn, _, speaker_label in diarization_result.itertracks(yield_label=True):
        start_time = int(speech_turn.start * 1000)
        end_time = int(speech_turn.end * 1000)

        segment = audio[start_time:end_time]
        output_file = os.path.join(output_dir, f"{speaker_label}.wav")

        if not os.path.exists(output_file):
            segment.export(output_file, format="wav")


def validate_inputs(request):
    """Validate the incoming request data"""
    youtube_url = request.form.get('youtube_url')
    video_file = request.files.get('video_file')
    reference_audio = request.files.get('reference_audio')

    # Check if reference audio is provided and valid
    if not reference_audio or not allowed_audio_file(reference_audio.filename):
        return None, 'No reference audio file or invalid format'

    # Check if either YouTube URL or video file is provided (but not both)
    if youtube_url and video_file:
        return None, 'Please provide either YouTube URL or video file, not both'

    if not youtube_url and not video_file:
        return None, 'Please provide either YouTube URL or video file'

    if video_file and not allowed_video_file(video_file.filename):
        return None, 'Invalid video file format'

    return {
        'youtube_url': youtube_url,
        'video_file': video_file,
        'reference_audio': reference_audio
    }, None


@app.route('/', methods=['GET'])
def hello():
    return jsonify({"message": "Hello"})


@app.route('/process_video', methods=['POST'])
def process_video():
    try:
        # Validate inputs
        inputs, error = validate_inputs(request)
        if error:
            return jsonify({'error': error}), 400

        # Create temporary directory for processing
        with tempfile.TemporaryDirectory() as temp_dir:
            # Save paths
            video_path = os.path.join(temp_dir, 'video.mp4')
            audio_path = os.path.join(temp_dir, 'audio.wav')
            reference_path = os.path.join(
                temp_dir, secure_filename(inputs['reference_audio'].filename))
            output_dir = os.path.join(temp_dir, 'extracted_speakers')
            output_video = os.path.join(temp_dir, f'output_{uuid.uuid4()}.mp4')

            os.makedirs(output_dir, exist_ok=True)
            inputs['reference_audio'].save(reference_path)

            # Process video based on input type
            if inputs['youtube_url']:
                video_path = download_youtube_video(
                    inputs['youtube_url'], video_path)
            else:
                # Save and process uploaded video file
                video_file = inputs['video_file']
                video_file_path = os.path.join(
                    temp_dir, secure_filename(video_file.filename))
                video_file.save(video_file_path)
                # Convert video to standard format if needed
                command = f"ffmpeg -i {video_file_path} -c:v libx264 -c:a aac {video_path} -y"
                subprocess.call(command, shell=True)
                os.remove(video_file_path)  # Clean up original video file

            # Extract audio from video
            audio_path = extract_audio_from_video(video_path, audio_path)

            # Perform diarization
            pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization", use_auth_token=HF_TOKEN)
            diarization_result = pipeline(audio_path)

            # Extract and match speakers
            extract_speaker_segments(
                audio_path, diarization_result, output_dir)
            matching_speakers, distances = match_speakers(
                reference_path, output_dir)

            if not matching_speakers:
                return jsonify({'error': 'No matching speakers found'}), 404

            # Generate and upload final video
            extract_matching_speaker_segments(
                video_path,
                diarization_result,
                matching_speakers,
                output_video
            )

            # Upload to S3
            s3_url = upload_to_s3(
                output_video,
                S3_BUCKET,
                f'processed_videos/{os.path.basename(output_video)}'
            )

            if not s3_url:
                return jsonify({'error': 'Failed to upload to S3'}), 500

            return jsonify({
                'status': 'success',
                'video_url': s3_url,
                'matching_speakers': list(matching_speakers),
                'speaker_distances': distances
            })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
