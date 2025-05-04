"""
Script to check if FFmpeg is installed and install it if not present.
Compatible with Windows, macOS, and Linux.
"""

import time
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


"""
Script to check if Redis is installed and install it if not present.
Compatible with Windows, macOS, and Linux.
"""


def check_redis_installed():
    """Check if Redis is installed and accessible."""
    try:
        result = subprocess.run(
            ["redis-cli", "ping"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            check=False
        )
        return result.returncode == 0 and "PONG" in result.stdout
    except FileNotFoundError:
        return False


def start_redis_server():
    """Start Redis server based on the platform."""
    system = platform.system()

    try:
        if system == "Darwin":  # macOS
            subprocess.run(["brew", "services", "start", "redis"], check=True)
        elif system == "Linux":
            subprocess.run(["sudo", "systemctl", "start", "redis"], check=True)
        elif system == "Windows":
            # On Windows, Redis runs as a background service after installation
            pass

        # Wait for Redis to start
        time.sleep(2)

        # Verify Redis is running
        result = subprocess.run(
            ["redis-cli", "ping"],
            stdout=subprocess.PIPE,
            text=True,
            check=True
        )
        if "PONG" in result.stdout:
            print("Redis server started successfully!")
        else:
            print("Redis server may not have started correctly.")
    except Exception as e:
        print(f"Error starting Redis server: {e}")


def install_redis_windows():
    """Install Redis on Windows using chocolatey."""
    print("Installing Redis on Windows...")

    try:
        subprocess.run(["choco", "--version"], stdout=subprocess.PIPE,
                       stderr=subprocess.PIPE, check=False)
    except FileNotFoundError:
        print("Chocolatey is not installed. Installing Chocolatey...")
        command = 'powershell -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString(\'https://chocolatey.org/install.ps1\'))"'
        subprocess.run(command, shell=True, check=True)
        print("Chocolatey installed successfully.")

    subprocess.run(["choco", "install", "redis-64", "-y"], check=True)
    print("Redis installed successfully via Chocolatey.")


def install_redis_macos():
    """Install Redis on macOS using Homebrew."""
    print("Installing Redis on macOS...")

    try:
        subprocess.run(["brew", "--version"], stdout=subprocess.PIPE,
                       stderr=subprocess.PIPE, check=False)
    except FileNotFoundError:
        print("Homebrew is not installed. Installing Homebrew...")
        command = '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
        subprocess.run(command, shell=True, check=True)
        print("Homebrew installed successfully.")

    subprocess.run(["brew", "install", "redis"], check=True)
    print("Redis installed successfully via Homebrew.")


def install_redis_linux():
    """Install Redis on Linux using apt, yum, or pacman."""
    print("Installing Redis on Linux...")

    if os.path.exists("/usr/bin/apt") or os.path.exists("/usr/bin/apt-get"):
        update_cmd = ["sudo", "apt", "update"]
        install_cmd = ["sudo", "apt", "install", "-y", "redis-server"]
    elif os.path.exists("/usr/bin/yum"):
        install_cmd = ["sudo", "yum", "install", "-y", "redis"]
    elif os.path.exists("/usr/bin/pacman"):
        install_cmd = ["sudo", "pacman", "-S", "--noconfirm", "redis"]
    elif os.path.exists("/usr/bin/dnf"):
        install_cmd = ["sudo", "dnf", "install", "-y", "redis"]
    else:
        print("Unsupported Linux distribution. Please install Redis manually.")
        return

    if 'update_cmd' in locals():
        subprocess.run(update_cmd, check=True)
    subprocess.run(install_cmd, check=True)
    print("Redis installed successfully.")


def install_redis():
    """Main function to check and install Redis."""
    system = platform.system()
    print('[Platform]:', system)

    if check_redis_installed():
        print("Redis is already installed.")
        return True

    try:
        if system == "Windows":
            install_redis_windows()
        elif system == "Darwin":
            install_redis_macos()
        elif system == "Linux":
            install_redis_linux()
        else:
            print(f"Unsupported operating system: {system}")
            return False

        if check_redis_installed():
            print("\nRedis was successfully installed!")
            return True
        else:
            print("\nRedis installation failed. Please install manually.")
            return False

    except subprocess.CalledProcessError as e:
        print(f"An error occurred during installation: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False


def stop_redis_server():
    """Stop Redis server based on the platform"""
    system = platform.system()
    try:
        if system == "Darwin":  # macOS
            subprocess.run(["brew", "services", "stop", "redis"], check=True)
        elif system == "Linux":
            subprocess.run(["sudo", "systemctl", "stop", "redis"], check=True)
        elif system == "Windows":
            # On Windows, Redis runs as a service
            subprocess.run(["net", "stop", "Redis"], check=True)
        print("Redis server stopped successfully!")
    except Exception as e:
        print(f"Error stopping Redis server: {e}")
