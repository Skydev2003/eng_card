"""Render the original WordRun score, Lanterns in the Glade, with Python and FFmpeg."""

from array import array
from math import exp, pi, sin, sqrt, tau
from pathlib import Path
from random import Random
import subprocess
import tempfile
import wave

SAMPLE_RATE = 32_000
BEAT = 60 / 88
BAR = 4 * BEAT
BARS = 16
LENGTH = round(BARS * BAR * SAMPLE_RATE)
ROOT = Path(__file__).resolve().parents[1]

# Four phrases in C, with a Gsus turnaround into the first C6.
CHORDS = [
    (48, (60, 64, 67, 69)), (43, (55, 59, 62, 67)),
    (45, (57, 60, 64, 67)), (41, (57, 60, 64, 65)),
    (48, (60, 62, 64, 67)), (40, (55, 60, 64, 67)),
    (38, (57, 60, 62, 65)), (43, (55, 60, 62, 69)),
    (45, (57, 60, 64, 71)), (41, (57, 60, 64, 67)),
    (48, (60, 64, 67, 74)), (43, (55, 59, 62, 69)),
    (41, (57, 60, 64, 65)), (38, (57, 60, 62, 65)),
    (40, (55, 60, 64, 69)), (43, (55, 60, 62, 67)),
]
MELODY = [
    ((.5, 76), (1.5, 79), (2.5, 81), (3.25, 79)),
    ((.5, 74), (1.5, 76), (3, 74)),
    ((.5, 72), (1.25, 76), (2.25, 79), (3, 76)),
    ((1, 77), (2, 76), (3.1, 72)),
    ((.5, 74), (1.25, 76), (2.5, 79)),
    ((.5, 84), (1.5, 81), (2.5, 79), (3.5, 76)),
    ((.75, 77), (1.75, 76), (3, 74)),
    ((1, 72), (2.5, 74)),
    ((.5, 76), (1.5, 83), (2.5, 81), (3.25, 79)),
    ((.5, 77), (1.5, 79), (2.75, 76)),
    ((.75, 84), (1.75, 86), (2.5, 84), (3.25, 79)),
    ((.75, 81), (1.75, 79), (3, 74)),
    ((.5, 76), (1.5, 77), (2.5, 81), (3.25, 77)),
    ((1, 74), (2, 76), (3, 77)),
    ((.75, 79), (2, 76), (2.75, 72)),
    ((1, 74), (2.5, 67), (3.25, 72)),
]


def render():
    left = array("f", [0]) * LENGTH
    right = array("f", [0]) * LENGTH
    random = Random(19)

    def add(voice, midi, beat, duration, volume, pan):
        angular = tau * 440 * (2 ** ((midi - 69) / 12)) / SAMPLE_RATE
        start = round(beat * BEAT * SAMPLE_RATE)
        frames = round(duration * BEAT * SAMPLE_RATE)
        l_gain = sqrt((1 - pan) / 2) * volume
        r_gain = sqrt((1 + pan) / 2) * volume
        for i in range(frames):
            t = i / SAMPLE_RATE
            phase = i * angular
            envelope = min(1, t / .019, (frames - i) / (SAMPLE_RATE * .09))
            if voice == "pad":
                value = (sin(phase) + .28 * sin(phase * 1.003) + .12 * sin(phase * 2)) * sin(pi * i / frames) ** 1.3
            elif voice == "bass":
                value = (sin(phase) + .17 * sin(2 * phase)) * exp(-t * 2.9)
            elif voice == "glass":
                value = sin(phase) * exp(-t * 2.65) + .22 * sin(phase * 2.006) * exp(-t * 5.2) + .11 * sin(phase * 3.99) * exp(-t * 9)
            else:
                value = (sin(phase) + .34 * sin(phase * 2) + .12 * sin(phase * 3)) * exp(-t * 5.2)
            position = (start + i) % LENGTH
            left[position] += value * envelope * l_gain
            right[position] += value * envelope * r_gain

    for bar, (bass, chord) in enumerate(CHORDS):
        stem = bar * 4
        for j, note in enumerate(chord):
            add("pad", note, stem - .22 + j * .06, 4.65, .019, (-.48, .23, -.15, .51)[j])
        add("bass", bass, stem, 2.25, .105, -.08)
        add("bass", bass + (7 if bar % 4 != 3 else 12), stem + 2.25, 1.65, .059, .07)
        for j, beat in enumerate((.25, 1, 1.75, 2.25, 3, 3.65)):
            add("pluck", chord[(0, 2, 1, 3, 2, 1)[j]], stem + beat, 1.27,
                random.uniform(.038, .054), -.27 if j % 2 else .26)
        for beat, note in MELODY[bar]:
            add("glass", note, stem + beat, 1.7, .075, -.17)
            add("glass", note, stem + beat + .3, 1.35, .018, .57)

    crest = max(max(abs(x) for x in left), max(abs(x) for x in right))
    pcm = array("h")
    gain = 24_575 / crest
    for l_channel, r_channel in zip(left, right):
        pcm.extend((round(l_channel * gain), round(r_channel * gain)))

    target = ROOT / "public/audio/lanterns-in-the-glade.mp3"
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as folder:
        raw = Path(folder) / "garden.wav"
        with wave.open(str(raw), "wb") as wav:
            wav.setparams((2, 2, SAMPLE_RATE, 0, "NONE", "not compressed"))
            wav.writeframes(pcm.tobytes())
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw),
                        "-codec:a", "libmp3lame", "-b:a", "80k",
                        "-metadata", "title=Lanterns in the Glade", str(target)], check=True)


if __name__ == "__main__":
    render()
