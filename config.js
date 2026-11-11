/*
  LPN Pallet Log: site settings for everyone who uses this copy of the app.

  features: true shows a feature, false hides it.
  testing:  true adds a note to that feature saying it is still being tested,
            so people check its results and report problems.

  Edit only the true/false values. Keep the commas and quotes as they are.
  Phones pick up a change the next time they open the app online.
  If this file is missing or has a mistake, every feature is shown and no notes appear.
*/
window.LPN_CONFIG = {
  features: {
    report: true,          // Report a problem button, and the report links in Settings, the Guide and the Manifest check
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
    shareApp: true,        // Share this app (QR code) in Settings
    welcome: true,         // the welcome card on someone's first visit
    whatsNew: true,        // the card after an update saying what's new
    exportReminder: true   // reminder when a delivery from an earlier day was never exported
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
    exportReminder: false
  }
};
