from flask import Flask, request, jsonify, Response
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
from flask_sse import sse
import os
import tempfile
from concurrent.futures import ThreadPoolExecutor
import time
from functools import wraps
import atexit
from threading import Thread
import queue
import redis
import json
from setup import (check_redis_installed,
                   install_redis, start_redis_server,
                   stop_redis_server, install_ffmpeg)
import shutil
import platform
import torch


# Load .env file
load_dotenv()
# app = Flask(__name__)
# CORS(app)
# app.config["REDIS_URL"] = "redis://localhost"
# app.register_blueprint(sse, url_prefix='/stream')
# Configuration
ALLOWED_AUDIO_EXTENSIONS = {'wav', 'mp3'}
ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv'}
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_KEY")
AWS_REGION = os.getenv("AWS_REGION")
HF_TOKEN = os.getenv("HF_TOKEN")
MAX_CONTENT_LENGTH = 20 * 1024 * 1024  # 20MB max file size
# Initialize S3 client
s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY,
    region_name=AWS_REGION
)


def process_tasks(task_queue):
    """Background thread to process tasks from the queue"""
    while True:
        try:
            task = task_queue.get()
            if task is None:
                break
            task.start()
            task.join()
        except Exception as e:
            print(f"Error processing task: {e}")


def create_app():
    """Create and initialize the Flask application"""
    app = Flask(__name__)
    CORS(app)
    app.config["REDIS_URL"] = "redis://localhost"
    app.register_blueprint(sse, url_prefix='/stream')

    # Initialize dependencies
    with app.app_context():
        # install ffmpeg
        install_ffmpeg()
        # Initialize Redis
        if not check_redis_installed():
            install_redis()
        start_redis_server()

        # Initialize Redis client
        app.redis_client = redis.Redis(host='localhost', port=6379, db=0)

        # Initialize task queue
        app.task_queue = queue.Queue()

        # Start the task processor thread
        app.task_processor = Thread(
            target=process_tasks, args=(app.task_queue,))
        # Make thread daemon so it exits when main thread exits
        app.task_processor.daemon = True
        app.task_processor.start()

    return app


# Create the app
app = create_app()


def timer(func):
    """Decorator to measure execution time of functions"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        print(f"{func.__name__} took {end - start:.2f} seconds")
        return result
    return wrapper


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
    actual_output = output_base + '.mp4'
    error = {
        "msg": None
    }

    def yt_filesize_filter(info_dict):
        size = info_dict.get('filesize') or info_dict.get('filesize_approx', 0)
        if size > MAX_CONTENT_LENGTH:
            error['msg'] = "Failed to process Youtube video. Youtube video size is too large"
        return error['msg']
    ydl_opts = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4',
        'outtmpl': actual_output,
        'match_filter': yt_filesize_filter,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([youtube_link])
    return actual_output, error['msg']


def extract_audio_from_video(video_path, audio_path):
    command = f"ffmpeg -i {video_path} -vn -acodec pcm_s16le -ar 44100 -ac 2 {audio_path} -y"
    subprocess.call(command, shell=True)
    return audio_path


def get_speaker_embedding(audio_path, embedding_model, batch_size=32):
    inference = Inference(embedding_model, window="whole",
                          batch_size=batch_size)
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
    if not reference_audio:
        return None, 'No reference audio file'
    if not allowed_audio_file(reference_audio.filename):
        return None, 'Invalid audio file format'

    # Check if either YouTube URL or video file is provided (but not both)
    if youtube_url and video_file:
        return None, 'Please provide either YouTube URL or video file, not both'

    if not youtube_url and not video_file:
        return None, 'Please provide either YouTube URL or a video file'

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


@app.route('/ping', methods=['GET'])
def ping():
    return jsonify({"message": "Pong!"})


def preprocess_audio(input_path, output_path, max_duration=300):
    """Preprocess audio to reduce size and duration"""
    try:
        # Load audio
        audio = AudioSegment.from_file(input_path)

        # Convert to mono
        audio = audio.set_channels(1)

        # Downsample to 16kHz
        audio = audio.set_frame_rate(16000)

        # Limit duration if needed (e.g., 5 minutes)
        if len(audio) > max_duration * 1000:
            audio = audio[:max_duration * 1000]

        # Export
        audio.export(output_path, format='wav')
        return True
    except Exception as e:
        print(f"Error preprocessing audio: {e}")
        return False


class VideoProcessor(Thread):
    def __init__(self, app, task_id, youtube_url=None, video_file_path=None, reference_audio_path=None):
        super().__init__()
        self.app = app
        self.task_id = task_id
        self.youtube_url = youtube_url
        self.video_file_path = video_file_path
        self.reference_audio_path = reference_audio_path

    def update_progress(self, message, percentage):
        self.app.redis_client.set(
            f"task:{self.task_id}",
            json.dumps({
                'state': 'PROGRESS',
                'message': message,
                'percentage': percentage
            })
        )

    def run(self):
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                # Initialize paths
                video_path = os.path.join(temp_dir, 'processed_video.mp4')
                audio_path = os.path.join(temp_dir, 'audio.wav')
                output_dir = os.path.join(temp_dir, 'extracted_speakers')
                output_video = os.path.join(
                    temp_dir, f'output_{uuid.uuid4()}.mp4')
                os.makedirs(output_dir, exist_ok=True)

                self.update_progress("Processing input files...", 10)

                # Process video based on input type
                if self.youtube_url:
                    actual_output, error = download_youtube_video(
                        self.youtube_url, video_path)
                    if error:
                        raise Exception(error)
                    video_path = actual_output
                else:
                    # Copy uploaded video to processing directory
                    shutil.copy2(self.video_file_path, video_path)

                self.update_progress("Extracting audio...", 30)
                # Extract audio with optimized settings
                command = f"ffmpeg -i {video_path} -vn -acodec pcm_s16le -ar 16000 -ac 1 {audio_path} -y"
                subprocess.call(command, shell=True)

                self.update_progress("Performing speaker diarization...", 50)
                # Initialize and configure diarization pipeline
                pipeline = Pipeline.from_pretrained(
                    "pyannote/speaker-diarization",
                    use_auth_token=HF_TOKEN
                )
                device = 'cpu'
                if torch.cuda.is_available():
                    device = "cuda"
                    print(f"Using GPU: {torch.cuda.get_device_name()}")
                pipeline.to(torch.device(device))
                pipeline.instantiate({
                    "segmentation": {
                        "min_duration_off": 0.8,
                        "threshold": 0.55
                    },
                    # "clustering": {
                    #     "method": "fast",
                    #     "min_cluster_size": 10
                    # }
                })

                # Perform diarization
                diarization_result = pipeline(audio_path)

                self.update_progress("Extracting speaker segments...", 70)
                # Extract speaker segments
                extract_speaker_segments(
                    audio_path, diarization_result, output_dir)

                self.update_progress("Matching speakers...", 80)
                # Match speakers
                matching_speakers, distances = match_speakers(
                    self.reference_audio_path, output_dir)

                if not matching_speakers:
                    raise Exception('No matching speakers found')

                self.update_progress("Generating final video...", 90)
                # Generate final video
                video = VideoFileClip(video_path)
                segments = []

                for speech_turn, _, speaker_label in diarization_result.itertracks(yield_label=True):
                    if speaker_label in matching_speakers:
                        try:
                            segment = video.subclip(
                                speech_turn.start, speech_turn.end)
                            segments.append(segment)
                        except Exception as e:
                            print(f"Error processing segment: {e}")
                            continue

                if not segments:
                    video.close()
                    raise Exception('No segments found for matching speakers')

                final_video = concatenate_videoclips(segments)
                final_video.write_videofile(
                    output_video,
                    codec='libx264',
                    audio_codec='aac',
                    preset='ultrafast',
                    threads=4,
                    temp_audiofile='temp-audio.m4a',
                    remove_temp=True
                )

                # Clean up video objects
                for segment in segments:
                    segment.close()
                video.close()
                final_video.close()

                # Upload to S3
                self.update_progress("Uploading video...", 95)
                s3_url = upload_to_s3(
                    output_video,
                    S3_BUCKET_NAME,
                    f'processed_videos/{os.path.basename(output_video)}'
                )

                if not s3_url:
                    raise Exception('Failed to upload to S3')

                # Final result
                result = {
                    'status': 'success',
                    'video_url': s3_url,
                    'matching_speakers': list(matching_speakers),
                    'speaker_distances': distances
                }

                self.update_progress("Complete!", 100)
                self.app.redis_client.set(
                    f"task:{self.task_id}",
                    json.dumps({'state': 'SUCCESS', 'result': result})
                )

        except Exception as e:
            print(f"Error in video processing: {e}")
            self.app.redis_client.set(
                f"task:{self.task_id}",
                json.dumps({'state': 'FAILURE', 'error': str(e)})
            )
        finally:
            # Clean up temporary files
            if self.video_file_path and os.path.exists(self.video_file_path):
                try:
                    os.remove(self.video_file_path)
                except Exception as e:
                    print(f"Error cleaning up video file: {e}")

            if self.reference_audio_path and os.path.exists(self.reference_audio_path):
                try:
                    os.remove(self.reference_audio_path)
                except Exception as e:
                    print(f"Error cleaning up audio file: {e}")


@app.route('/process_video', methods=['POST'])
def process_video():
    try:
        # Validate inputs
        inputs, error = validate_inputs(request)
        if error:
            return jsonify({'error': error}), 400

        # Create temporary directory for file storage
        temp_dir = tempfile.mkdtemp()

        try:
            # Save files to temporary directory
            video_file_path = None
            if inputs['video_file']:
                video_file_path = os.path.join(
                    temp_dir, secure_filename(inputs['video_file'].filename))
                inputs['video_file'].save(video_file_path)

            reference_audio_path = os.path.join(
                temp_dir, secure_filename(inputs['reference_audio'].filename))
            inputs['reference_audio'].save(reference_audio_path)

            # Generate task ID
            task_id = str(uuid.uuid4())

            # Create and queue the task
            task = VideoProcessor(
                app,  # Pass the app instance
                task_id,
                youtube_url=inputs.get('youtube_url'),
                video_file_path=video_file_path,
                reference_audio_path=reference_audio_path
            )

            # Initialize task status in Redis
            app.redis_client.set(
                f"task:{task_id}",
                json.dumps({'state': 'PENDING'})
            )

            # Add task to queue
            app.task_queue.put(task)

            return jsonify({'task_id': task_id}), 202

        except Exception as e:
            # Clean up temp directory if there's an error
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise e

    except Exception as e:
        print(f"Error in process_video: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/task_status/<task_id>', methods=['GET'])
def task_status(task_id):
    try:
        status = app.redis_client.get(f"task:{task_id}")
        if status is None:
            return jsonify({'state': 'PENDING'})

        return jsonify(json.loads(status))
    except Exception as e:
        print(f"Error getting task status: {e}")
        return jsonify({'error': str(e)}), 500


# Update the cleanup function


@atexit.register
def cleanup():
    try:
        # Stop task processor
        app.task_queue.put(None)  # Signal the task processor to stop
        # Wait for task processor to finish with timeout
        app.task_processor.join(timeout=1)

        # Close Redis client connection
        app.redis_client.close()

        # Stop Redis server
        stop_redis_server()

    except Exception as e:
        print(f"Error during cleanup: {e}")


def generate_video_stream(video_path):
    """Generate video stream in chunks"""
    chunk_size = 1024 * 1024  # 1MB chunks
    with open(video_path, 'rb') as video_file:
        while True:
            chunk = video_file.read(chunk_size)
            if not chunk:
                break
            yield chunk


def calculate_progress(current_step, total_steps):
    return int((current_step / total_steps) * 100)


@app.route('/stream_video', methods=['POST'])
def stream_video():
    try:
        progress_id = str(uuid.uuid4())
        total_steps = 6  # Total number of processing steps
        current_step = 0

        def send_progress(message, percentage):
            sse.publish(
                {"message": message, "percentage": percentage},
                type='progress',
                channel=progress_id
            )

        # Validate inputs
        inputs, error = validate_inputs(request)
        if error:
            return jsonify({'error': error}), 400

        current_step += 1
        send_progress("Processing input files...",
                      calculate_progress(current_step, total_steps))

        with tempfile.TemporaryDirectory() as temp_dir:
            # Setup paths and initial processing
            video_path = os.path.join(temp_dir, 'video.mp4')
            audio_path = os.path.join(temp_dir, 'audio.wav')
            reference_path = os.path.join(
                temp_dir, secure_filename(inputs['reference_audio'].filename))
            output_dir = os.path.join(temp_dir, 'extracted_speakers')
            output_video = os.path.join(temp_dir, f'output_{uuid.uuid4()}.mp4')

            os.makedirs(output_dir, exist_ok=True)
            inputs['reference_audio'].save(reference_path)

            # Process video
            current_step += 1
            send_progress("Processing video...",
                          calculate_progress(current_step, total_steps))

            if inputs['youtube_url']:
                video_path = download_youtube_video(
                    inputs['youtube_url'], video_path)
                if not video_path:
                    return jsonify({'error': 'Failed to download YouTube video'}), 500
            else:
                video_file = inputs['video_file']
                video_file_path = os.path.join(
                    temp_dir, secure_filename(video_file.filename))
                video_file.save(video_file_path)
                command = f"ffmpeg -i {video_file_path} -c:v libx264 -c:a aac {video_path} -y"
                subprocess.call(command, shell=True)
                os.remove(video_file_path)

            # Extract audio
            current_step += 1
            send_progress("Extracting audio...",
                          calculate_progress(current_step, total_steps))
            audio_path = extract_audio_from_video(video_path, audio_path)

            # Perform diarization
            current_step += 1
            send_progress("Performing speaker diarization...",
                          calculate_progress(current_step, total_steps))
            pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization", use_auth_token=HF_TOKEN)
            diarization_result = pipeline(audio_path)

            # Match speakers
            current_step += 1
            send_progress("Matching speakers...",
                          calculate_progress(current_step, total_steps))
            extract_speaker_segments(
                audio_path, diarization_result, output_dir)
            matching_speakers, distances = match_speakers(
                reference_path, output_dir)

            if not matching_speakers:
                return jsonify({'error': 'No matching speakers found'}), 404

            # Generate final video
            current_step += 1
            send_progress("Generating final video...",
                          calculate_progress(current_step, total_steps))
            final_video_path = extract_matching_speaker_segments(
                video_path,
                diarization_result,
                matching_speakers,
                output_video
            )

            if not final_video_path:
                return jsonify({'error': 'Failed to generate video'}), 500

            # Return progress ID along with the video stream
            headers = {
                'Content-Disposition': 'inline',
                'Content-Type': 'video/mp4',
                'X-Progress-ID': progress_id
            }

            return Response(
                generate_video_stream(final_video_path),
                mimetype='video/mp4',
                headers=headers
            )

    except Exception as e:
        return jsonify({'error': str(e)}), 500
