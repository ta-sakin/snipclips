#!/usr/bin/env python3
"""
Script to check if FFmpeg is installed and install it if not present.
Compatible with Windows, macOS, and Linux.
"""

import os
import platform
import subprocess
import sys


def check_ffmpeg_installed():
    """Check if FFmpeg is installed and accessible in the PATH."""
    try:
        # Run ffmpeg -version and redirect stderr to stdout
        result = subprocess.run(
            ["ffmpeg", "-version"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            check=False
        )
        return result.returncode == 0
    except FileNotFoundError:
        return False


def install_ffmpeg_windows():
    """Install FFmpeg on Windows using chocolatey."""
    print("Installing FFmpeg on Windows...")

    # Check if Chocolatey is installed
    try:
        subprocess.run(["choco", "--version"], stdout=subprocess.PIPE,
                       stderr=subprocess.PIPE, check=False)
    except FileNotFoundError:
        print("Chocolatey is not installed. Installing Chocolatey...")
        # Install Chocolatey
        command = 'powershell -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString(\'https://chocolatey.org/install.ps1\'))"'
        subprocess.run(command, shell=True, check=True)
        print("Chocolatey installed successfully.")

    # Install FFmpeg using Chocolatey
    subprocess.run(["choco", "install", "ffmpeg", "-y"], check=True)
    print("FFmpeg installed successfully via Chocolatey.")


def install_ffmpeg_macos():
    """Install FFmpeg on macOS using Homebrew."""
    print("Installing FFmpeg on macOS...")

    # Check if Homebrew is installed
    try:
        subprocess.run(["brew", "--version"], stdout=subprocess.PIPE,
                       stderr=subprocess.PIPE, check=False)
    except FileNotFoundError:
        print("Homebrew is not installed. Installing Homebrew...")
        # Install Homebrew
        command = '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
        subprocess.run(command, shell=True, check=True)
        print("Homebrew installed successfully.")

    # Install FFmpeg using Homebrew
    subprocess.run(["brew", "install", "ffmpeg"], check=True)
    print("FFmpeg installed successfully via Homebrew.")


def install_ffmpeg_linux():
    """Install FFmpeg on Linux using apt, yum, or pacman."""
    print("Installing FFmpeg on Linux...")

    # Detect package manager
    if os.path.exists("/usr/bin/apt") or os.path.exists("/usr/bin/apt-get"):
        # Debian, Ubuntu, and derivatives
        update_cmd = ["sudo", "apt", "update"]
        install_cmd = ["sudo", "apt", "install", "-y", "ffmpeg"]
    elif os.path.exists("/usr/bin/yum"):
        # Red Hat, CentOS, Fedora
        update_cmd = ["sudo", "yum", "update", "-y"]
        install_cmd = ["sudo", "yum", "install", "-y", "ffmpeg"]
    elif os.path.exists("/usr/bin/pacman"):
        # Arch Linux
        update_cmd = ["sudo", "pacman", "-Sy"]
        install_cmd = ["sudo", "pacman", "-S", "--noconfirm", "ffmpeg"]
    elif os.path.exists("/usr/bin/dnf"):
        # Newer Fedora
        update_cmd = ["sudo", "dnf", "check-update"]
        install_cmd = ["sudo", "dnf", "install", "-y", "ffmpeg"]
    else:
        print("Unsupported Linux distribution. Please install FFmpeg manually.")
        return

    # Update repositories and install FFmpeg
    subprocess.run(update_cmd, check=True)
    subprocess.run(install_cmd, check=True)
    print("FFmpeg installed successfully.")


def install_ffmpeg():
    system = platform.system()
    print('[Platform]:', system)
    """Main function to check and install FFmpeg."""
    if check_ffmpeg_installed():
        print("FFmpeg is already installed.")
        # Display FFmpeg version
        subprocess.run(["ffmpeg", "-version"], check=True)
        return

    # FFmpeg is not installed, install ffmpeg
    try:
        if system == "Windows":
            install_ffmpeg_windows()
        elif system == "Darwin":  # macOS
            install_ffmpeg_macos()
        elif system == "Linux":
            install_ffmpeg_linux()
        else:
            print(f"Unsupported operating system: {system}")
            return

        # Verify installation
        if check_ffmpeg_installed():
            print("\nFFmpeg was successfully installed!")
            # Display FFmpeg version
            subprocess.run(["ffmpeg", "-version"], check=True)
        else:
            print("\nFFmpeg installation failed. Please install manually.")
            return

    except subprocess.CalledProcessError as e:
        print(f"An error occurred during installation: {e}")
        return
    except Exception as e:
        print(f"Unexpected error: {e}")
        return
