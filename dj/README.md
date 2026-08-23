# Rozdzielenie audio / wideo

DJ potrzebuje materiału jako **dwa osobne pliki** — sam obraz i sam dźwięk.
Ten katalog zawiera skrypt, który to robi, oraz opis wykonanej konwersji.

## Materiał źródłowy

`video.mov` — asset release'u [`Video`](https://github.com/MichalsonEnterprise/Claude/releases/tag/Video)

| | |
|---|---|
| Długość | 21,54 s |
| Obraz | HEVC (H.265), 1078×1822 pionowo, 43 fps, 14,4 Mb/s |
| Dźwięk | AAC-LC, 44,1 kHz, stereo, 248 kb/s |
| SHA-256 | `ef69fbcaec84ffd6cf550292ce47962925b5da77cb8f5cd3e596ca1792e59478` |

## Pliki wynikowe

| Plik | Zawartość | Rozmiar | Uwagi |
|---|---|---|---|
| `video_OBRAZ_h264.mp4` | sam obraz, bez dźwięku | 13 MB | H.264 CRF 18 — **zalecany**, otworzy się wszędzie |
| `video_OBRAZ_hevc.mov` | sam obraz, bez dźwięku | 37 MB | oryginalny HEVC, kopia strumienia — zero straty jakości |
| `video_DZWIEK.wav` | sam dźwięk | 3,7 MB | PCM 44,1 kHz / 16-bit stereo — **zalecany** |
| `video_DZWIEK.mp3` | sam dźwięk | 845 KB | 320 kb/s — zapas na pendrive |

Zestaw do przekazania DJ-owi: **`video_OBRAZ_h264.mp4` + `video_DZWIEK.wav`**.

Obraz i dźwięk mają wspólny start i zgodną długość (21,53 s / 21,55 s),
więc zsynchronizują się bez ręcznego przesuwania.

> Same pliki multimedialne **nie są w repo** — przy 13–37 MB na sztukę
> zaśmiecałyby historię gita na stałe. Zostały przekazane bezpośrednio.
> Aby odtworzyć je z oryginału, użyj skryptu lub komend poniżej.

## Podjęte decyzje

- **H.264 obok HEVC** — nagranie jest prosto z iPhone'a w H.265, a to
  najczęstsza przyczyna „nie chce mi się otworzyć" w programach DJ-skich.
  CRF 18 jest wizualnie nieodróżnialny od źródła.
- **WAV 16-bit, nie 24-bit** — źródło to stratny AAC 248 kb/s, więc
  24 bity nie dodałyby żadnej informacji, a plik byłby półtora raza większy.
- **44,1 kHz bez zmian** — natywna częstotliwość źródła, brak przepróbkowania.
- **Konwersja zakresu full → limited** w wersji H.264 (`in_range=full:out_range=tv`),
  bo źródło jest `yuvj420p`; bez tego poziomy jasności mogłyby się przesunąć.
- **Rozdzielczość i klatkaż bez zmian** — 1078×1822, 43 fps.

## Użyte komendy

```bash
# obraz bez dzwieku, bez rekompresji (zero straty jakosci)
ffmpeg -i video.mov -map 0:v:0 -c:v copy -an video_OBRAZ_hevc.mov

# obraz bez dzwieku, przekodowany na H.264 (maksymalna zgodnosc)
ffmpeg -i video.mov -map 0:v:0 -an \
  -vf "scale=in_range=full:out_range=tv" -pix_fmt yuv420p \
  -c:v libx264 -profile:v high -preset slow -crf 18 -movflags +faststart \
  video_OBRAZ_h264.mp4

# sam dzwiek
ffmpeg -i video.mov -map 0:a:0 -vn -c:a pcm_s16le -ar 44100 video_DZWIEK.wav
ffmpeg -i video.mov -map 0:a:0 -vn -c:a libmp3lame -b:a 320k video_DZWIEK.mp3
```

## Skrypt

`rozdziel_audio_wideo.sh` robi to samo dla dowolnego pliku:

```bash
./rozdziel_audio_wideo.sh sciezka/do/pliku.mov [katalog_wyjsciowy]
```

Wymaga `ffmpeg` (`brew install ffmpeg` na macOS, `apt install ffmpeg` na Linuksie).
