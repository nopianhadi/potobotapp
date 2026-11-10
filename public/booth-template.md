---
accentColor: "#246A5A"
welcomeMessage: Satu momen untuk dikenang
layout: classic
consentEnabled: false
consentText: I agree that my photos may be included in this event gallery.
surveyEnabled: false
surveyQuestion: What should we remember about tonight?
enabledModes:
  - photo
cameraFacingMode: user
cameraAudioEnabled: false
printTemplate:
  paperSize: 4x6
  backgroundColor: "#FFFFFF"
  backgroundImage: ""
  slots:
    - id: photo-1
      x: 8
      y: 8
      width: 84
      height: 84
---

# Template Booth

Ubah nilai di metadata YAML di atas, lalu unggah file ini pada pengaturan event.

Nilai `layout`: `classic`, `strip`, atau `portrait`.
Nilai `enabledModes`: satu atau lebih dari `photo`, `gif`, `video`, dan `360`.
Nilai boolean menggunakan `true` atau `false`.
`printTemplate` mengatur ukuran kertas (`4x6` atau `2x6`), warna dasar, dan posisi slot foto dalam persen.