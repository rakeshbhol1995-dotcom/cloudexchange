use std::collections::HashMap;

pub struct FraudCheckResult {
    pub is_fraudulent: bool,
    pub risk_score: u32, // 0 to 100
    pub audit_log: Vec<String>,
}

pub struct AntiFraudScanner {
    // Database of previously submitted transaction receipt image hashes to detect reuse scams
    known_image_hashes: HashMap<String, u64>, // Hash -> OrderID
}

impl AntiFraudScanner {
    pub fn new() -> Self {
        Self {
            known_image_hashes: HashMap::new(),
        }
    }

    /// Add a verified receipt hash to database
    pub fn record_receipt_hash(&mut self, hash: String, order_id: u64) {
        self.known_image_hashes.insert(hash, order_id);
    }

    /// Scan a receipt upload for fraud indicators.
    /// Check 1: EXIF Metadata Analysis (Device model presence, GPS presence, timestamp alignment).
    /// Check 2: Perceptual Hashing (Has this receipt screenshot been uploaded before by someone else?).
    pub fn scan_receipt(
        &self,
        order_id: u64,
        image_name: &str,
        raw_exif_metadata: &HashMap<String, String>,
        image_perceptual_hash: &str,
    ) -> FraudCheckResult {
        let mut risk_score = 0;
        let mut audit_log = Vec::new();

        println!("[Anti-Fraud Scanner] Initiating metadata scan for order #{} (file: {})...", order_id, image_name);

        // 1. Check for Duplicate Image Hash (Reused screenshot template attack)
        if let Some(&previous_order_id) = self.known_image_hashes.get(image_perceptual_hash) {
            risk_score += 90;
            audit_log.push(format!(
                "CRITICAL: Identical screenshot perceptual hash matches order #{}! This is a duplicate receipt scam.",
                previous_order_id
            ));
        }

        // 2. EXIF: Check camera model and software editing
        if let Some(software) = raw_exif_metadata.get("Software") {
            if software.to_lowercase().contains("photoshop") || software.to_lowercase().contains("edit") {
                risk_score += 40;
                audit_log.push("WARNING: Receipt EXIF metadata shows modification software: Photoshop/Editor.".to_string());
            }
        }

        // 3. EXIF: Check date creation match
        if let Some(created_time) = raw_exif_metadata.get("DateTimeOriginal") {
            audit_log.push(format!("EXIF Created Time: {}", created_time));
        } else {
            risk_score += 15;
            audit_log.push("NOTICE: Image missing original creation timestamp in EXIF metadata.".to_string());
        }

        // 4. Device verification: Screenshots from actual mobile devices normally contain metadata.
        if !raw_exif_metadata.contains_key("Model") && !raw_exif_metadata.contains_key("Make") {
            risk_score += 10;
            audit_log.push("NOTICE: Receipt contains no device capture metadata.".to_string());
        }

        let is_fraudulent = risk_score >= 50;
        
        FraudCheckResult {
            is_fraudulent,
            risk_score,
            audit_log,
        }
    }

    /// Perform Video Selfie Liveness Biometric Check
    pub fn verify_selfie_liveness(
        &self,
        video_name: &str,
        expected_gestures: &[&str],
        actual_gestures: &HashMap<String, f64>, // Gesture -> Confidence Score (0.0 to 1.0)
    ) -> Result<u32, String> {
        println!("[Biometric Liveness] Scanning video selfie: {}...", video_name);
        
        let mut total_confidence = 0.0;
        let mut verified_count = 0;

        for &gesture in expected_gestures {
            if let Some(&confidence) = actual_gestures.get(gesture) {
                if confidence < 0.90 {
                    return Err(format!(
                        "Biometric failure: Gesture '{}' confidence is too low ({:.2}%). Potential deepfake/replay bypass!",
                        gesture, confidence * 100.0
                    ));
                }
                println!("  [Liveness Check] Verified gesture: '{}' with confidence: {:.2}%", gesture, confidence * 100.0);
                total_confidence += confidence;
                verified_count += 1;
            } else {
                return Err(format!("Biometric failure: Required dynamic gesture '{}' was missing from video.", gesture));
            }
        }

        let liveness_score = ((total_confidence / verified_count as f64) * 100.0) as u32;
        println!("  [Liveness SUCCESS] Biometrics verified. Liveness Score: {}/100", liveness_score);
        Ok(liveness_score)
    }
}
