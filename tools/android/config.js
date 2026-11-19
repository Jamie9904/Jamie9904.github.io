/*
  LPN Pallet Log: settings for the offline ANDROID APP only (the website uses config.js in the main folder).

  The two are separate: a feature switched off on the website stays on here, and the other way round.
  features: true shows a feature, false hides it.
  testing:  true adds a note to that feature saying it is still being tested.

  Edit only the true/false values. Keep the commas and quotes as they are.
  Unlike the website, a change here reaches phones only with the next APK: GitHub builds it after you save,
  then install the new APK from the "Android app" run's Artifacts.
  report and shareApp stay false here: they need the internet or the website.
  When a new feature is added to the website, add its line here too, or the APK build stops and says which.
*/
window.LPN_CONFIG = {
  features: {
    report: false,          // Report a problem button, and the report links in Settings, the Guide and the Manifest check
    manifestCheck: true,   // the whole Manifest check section
    manifestPhotos: true,  // reading manifests, printed logs and printed LPNs on labels from photos (PDFs and typing still work)
    liveScan: true,        // Live scan with the camera
    scanByPhoto: true,     // Scan by photo (opens the camera and reads the barcode; offers Read the printed LPN when photoUpload and manifestPhotos are on)
    photoUpload: true,     // Upload photo (choose one or more photos already taken; reads the printed LPN when there is no barcode, if manifestPhotos is on; also needed for Read the printed LPN)
    torch: true,           // Torch button in Live scan (only on phones that allow it)
    damage: true,          // marking a pallet as damaged
    refused: true,         // marking a pallet as refused (sent back with the driver)
    noLpn: true,           // No LPN button, for pallets that arrive without an LPN
    fppDesc: true,         // description box for FPP pallets, to say what is on them (e.g. kitchen roll)
    shareMissing: true,    // Share missing list in the Manifest check results
    findLpn: true,         // Find an LPN in Saved deliveries
    shareApp: false,        // Share this app (QR code) in Settings
    welcome: true,         // the welcome card on someone's first visit
    whatsNew: true,        // the card after an update saying what's new
    exportReminder: true,  // reminder when a delivery from an earlier day was never exported
    historyVideo: true,    // the one-minute video at the top of the Changelog showing how the app has grown
    twoPhones: true,       // Share log: send this log's pallets to another person's phone with QR codes, e.g. when two people unload one trailer
    tallySheet: true       // Blank tally sheet in the Export menu, a paper sheet to fill in by hand
  },
  testing: {
    report: false,
    manifestCheck: true,
    manifestPhotos: false,
    liveScan: false,
    scanByPhoto: false,
    photoUpload: false,
    torch: false,
    damage: false,
    refused: false,
    noLpn: false,
    fppDesc: false,
    shareMissing: false,
    findLpn: false,
    shareApp: false,
    exportReminder: false,
    historyVideo: false,
    twoPhones: false,
    tallySheet: false
  }
};
