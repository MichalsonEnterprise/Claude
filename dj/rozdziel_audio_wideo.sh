#!/usr/bin/env bash
# Rozdziela plik wideo na: osobny plik obrazu (bez dzwieku) + osobne pliki audio.
# Uzycie: ./rozdziel_audio_wideo.sh /sciezka/do/video.mov [katalog_wyjsciowy]
set -euo pipefail

IN="${1:?Podaj plik wejsciowy}"
OUTDIR="${2:-$(dirname "$IN")}"
BASE="$(basename "${IN%.*}")"
EXT="${IN##*.}"

command -v ffmpeg >/dev/null || { echo "Brak ffmpeg. Zainstaluj: brew install ffmpeg" >&2; exit 1; }
mkdir -p "$OUTDIR"

echo "== Zrodlo =="
ffprobe -hide_banner -i "$IN" 2>&1 | grep -E 'Duration|Stream'
echo

# 1) Obraz bez dzwieku - kopia strumienia, zero straty jakosci
echo "[1/4] obraz bez dzwieku (bez rekompresji)..."
ffmpeg -y -hide_banner -loglevel error -i "$IN" -map 0:v:0 -c:v copy -an \
  "$OUTDIR/${BASE}_OBRAZ_oryginal.${EXT}"

# 2) Obraz bez dzwieku - H.264 dla programow, ktore nie czytaja HEVC
echo "[2/4] obraz bez dzwieku (H.264, zgodnosc)..."
ffmpeg -y -hide_banner -loglevel error -i "$IN" -map 0:v:0 -an \
  -vf "scale=in_range=full:out_range=tv" -pix_fmt yuv420p \
  -c:v libx264 -profile:v high -preset slow -crf 18 -movflags +faststart \
  "$OUTDIR/${BASE}_OBRAZ_h264.mp4"

# 3) Dzwiek - WAV w natywnej czestotliwosci zrodla (bez przepróbkowania)
echo "[3/4] dzwiek WAV..."
SR="$(ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate \
      -of default=nw=1:nk=1 "$IN" | head -1)"
ffmpeg -y -hide_banner -loglevel error -i "$IN" -map 0:a:0 -vn \
  -c:a pcm_s16le -ar "${SR:-44100}" "$OUTDIR/${BASE}_DZWIEK.wav"

# 4) Dzwiek - MP3 320 na pendrive / starsze odtwarzacze
echo "[4/4] dzwiek MP3 320..."
ffmpeg -y -hide_banner -loglevel error -i "$IN" -map 0:a:0 -vn \
  -c:a libmp3lame -b:a 320k "$OUTDIR/${BASE}_DZWIEK.mp3"

echo
echo "== Gotowe =="
ls -lh "$OUTDIR/${BASE}_OBRAZ_oryginal.${EXT}" "$OUTDIR/${BASE}_OBRAZ_h264.mp4" \
       "$OUTDIR/${BASE}_DZWIEK.wav" "$OUTDIR/${BASE}_DZWIEK.mp3"
