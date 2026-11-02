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
    report: true,          // Report button, and the report links in Settings, the Guide and the Manifest check
    manifestCheck: true,   // the whole Manifest check section
    manifestPhotos: true,  // reading manifests and printed logs from photos (PDFs and typing still work)
    liveScan: true,        // Live scan with the camera
    scanByPhoto: true,     // Scan by photo
    torch: true,           // Torch button in Live scan (only on phones that allow it)
    damage: true,          // marking a pallet as damaged
    shareMissing: true,    // Share missing list in the Manifest check results
    findLpn: true,         // Find an LPN in Saved deliveries
    shareApp: true,        // Share this app (QR code) in Settings
    welcome: true,         // the welcome card on someone's first visit
    whatsNew: true         // the card after an update saying what's new
  },
  testing: {
    report: false,
    manifestCheck: true,
    manifestPhotos: false,
    liveScan: false,
    scanByPhoto: false,
    torch: false,
    damage: false,
    shareMissing: false,
    findLpn: false,
    shareApp: false
  }
};
