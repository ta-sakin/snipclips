<h1 style="text-align:center">VOXSPLIT</h1>

## Backend setup(for linux)

```
cd voxsplit
python3 -m venv .venv
source .venv/bin/activate
```

## install packages

```
pip install -r requrements.txt
```

## install ffmpeg

```
sudo apt update
sudo apt install ffmpeg
```

## [yt-dlp](https://github.com/yt-dlp/yt-dlp/wiki/Installation) oAuth setup

If setup correctly it will fix this error.

`Sign in to confirm you’re not a bot. This helps protect our community`

### Install yt-dlp in the machine

```
sudo add-apt-repository ppa:tomtomtom/yt-dlp    # Add ppa repo to apt
sudo apt update                                 # Update package list
sudo apt install yt-dlp                         # Install yt-dlp
```

### Install [yt-dlp-youtube-oauth](https://github.com/coletdjnz/yt-dlp-youtube-oauth2)

Requires yt-dlp `2024.09.27` or above

```py
python3 -m pip install -U https://github.com/coletdjnz/yt-dlp-youtube-oauth2/archive/refs/heads/master.zip
```

### Check if installed

```
yt-dlp -v
```

If installed correctly it will show

`[debug] Extractor Plugins: oauth2 (YoutubeIE), oauth2 (Youtube...), ...
`
Run this to authenticate

```
yt-dlp "https://www.youtube.com/watch?v=C253MjavrBs"  --username oauth2 --password ''
```

It will show this

`[youtube+oauth2] To give yt-dlp access to your account, go to  https://www.google.com/device  and enter code  XXX-XXX-XXX`

Enter the code here `https://www.google.com/device`. That should authenticate and download the video.
