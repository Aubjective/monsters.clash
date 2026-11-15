# Shared sound effects

Place reusable sound-effect files here. Examples:

- attack.mp3
- impact.mp3
- summon.mp3
- skill.mp3
- stun.mp3
- freeze.mp3
- shield.mp3
- tower-hit.mp3
- victory.mp3
- defeat.mp3

Audio is configured centrally in `/audio.json`, not duplicated in monster or tower folders.

For each `sfx.presets` entry, an optional `file` path can refer to the uploaded audio file. Until a file is uploaded, the engine uses its simple procedural audio cue. The current repository contains the two uploaded BGM tracks; these SFX filenames are suggestions, not uploaded files.
