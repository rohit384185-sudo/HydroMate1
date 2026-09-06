# HydroMate speaker-verification model

- File: `3dspeaker_speech_campplus_sv_en_voxceleb_16k.onnx`
- Model: CAM++ speaker embedding, trained on VoxCeleb
- Upstream: Alibaba ModelScope 3D-Speaker (`iic/speech_campplus_sv_en_voxceleb_16k`)
- Distribution source: k2-fsa/sherpa-onnx speaker-recognition model release
- License: Apache License 2.0 (3D-Speaker model repository)
- Size: 29,596,978 bytes
- SHA-256: `357a834f702b80161e5b981182c038e18553c1f2ca752ed6cec2052365d4129b`
- Input: float32 `[1, frames, 80]`, 16 kHz Kaldi-style log-mel filter-bank features
- Output: float32 `[1, 512]` speaker embedding

The model, enrollment recordings, and generated profile are used only on-device.
