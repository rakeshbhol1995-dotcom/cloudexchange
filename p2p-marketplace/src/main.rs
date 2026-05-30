mod escrow;
mod anti_fraud;
mod chat;

use escrow::P2PEscrowEngine;
use anti_fraud::AntiFraudScanner;
use chat::P2PChatSession;
use std::collections::HashMap;

fn main() {
    println!("============================================================");
    println!("CloudExchange — P2P Fiat Marketplace & Escrow Verification");
    println!("============================================================");

    // 1. Initialize P2P Escrow Engine and Fraud Scanner
    let mut escrow_engine = P2PEscrowEngine::new();
    let mut fraud_scanner = AntiFraudScanner::new();

    // SCENARIO A: Successful P2P Escrow Transaction
    println!("--- Scenario A: Legitimate P2P Transaction ---");
    let ad_id = 500;
    let buyer = "buyer_user_1".to_string();
    let seller = "seller_user_2".to_string();
    
    // E2E Chat setup
    let mut chat = P2PChatSession::new("session_escrow_500".to_string(), buyer.clone(), seller.clone());
    chat.send_message(buyer.clone(), "Hi, I am sending the bank transfer of ₹42,500 now. Please keep the escrow ready.").unwrap();
    chat.send_message(seller.clone(), "Sure, once I confirm the deposit, I will release the USDT.").unwrap();

    // Buyer locks 500.0 USDT escrow from seller
    let order_id = escrow_engine.lock_escrow(ad_id, buyer.clone(), seller.clone(), 500_00000000, 42500.0);

    // Buyer makes bank transfer, uploads receipt
    let receipt_hash = "phash_8a2f9c3b1e7d".to_string();
    
    let mut normal_exif = HashMap::new();
    normal_exif.insert("Make".to_string(), "Apple".to_string());
    normal_exif.insert("Model".to_string(), "iPhone 14".to_string());
    normal_exif.insert("DateTimeOriginal".to_string(), "2026-05-28 16:18:22".to_string());
    normal_exif.insert("Software".to_string(), "iOS 17.2".to_string());

    let scan_a = fraud_scanner.scan_receipt(order_id, "upi_receipt_0528.png", &normal_exif, &receipt_hash);
    println!("  Scan Risk Score: {}/100", scan_a.risk_score);
    for log in &scan_a.audit_log {
        println!("    Audit: {}", log);
    }

    // Biometric check for high-value account authorization
    let expected_gestures = vec!["blink", "smile", "turn_right"];
    let mut actual_gestures = HashMap::new();
    actual_gestures.insert("blink".to_string(), 0.98);
    actual_gestures.insert("smile".to_string(), 0.97);
    actual_gestures.insert("turn_right".to_string(), 0.95);

    let liveness_check = fraud_scanner.verify_selfie_liveness("buyer_selfie_a.mp4", &expected_gestures, &actual_gestures);

    if !scan_a.is_fraudulent && liveness_check.is_ok() {
        println!("  STATUS: Receipt and Biometric Liveness verification PASSED.");
        chat.send_message(buyer.clone(), "Payment sent. Receipt uploaded successfully!").unwrap();
        chat.send_message(seller.clone(), "Received payment. Releasing escrow...").unwrap();
        
        // Mark Paid and Release
        escrow_engine.mark_paid(order_id, "UPI_REF_202605289912".to_string()).unwrap();
        escrow_engine.release_escrow(order_id).unwrap();
        // Record receipt hash to prevent reuse
        fraud_scanner.record_receipt_hash(receipt_hash, order_id);
    } else {
        println!("  STATUS: Transaction BLOCKED due to security alerts.");
    }
    
    chat.print_chat_log();
    println!("------------------------------------------------------------");

    // SCENARIO B: Fake Receipt / Biometric Fraud Attempt
    println!("--- Scenario B: Duplicate Receipt & Biometric Fraud Attempt ---");
    let order_id_b = escrow_engine.lock_escrow(ad_id, "fraudulent_buyer_9".to_string(), seller.clone(), 500_00000000, 42500.0);

    // Fraudulent buyer uploads the identical screenshot perceptual hash from Scenario A
    let fraud_receipt_hash = "phash_8a2f9c3b1e7d".to_string(); // Duplicate of scenario A!
    
    let mut fraud_exif = HashMap::new();
    fraud_exif.insert("Software".to_string(), "Adobe Photoshop CC 2024".to_string());

    let scan_b = fraud_scanner.scan_receipt(order_id_b, "fake_receipt_copy.png", &fraud_exif, &fraud_receipt_hash);
    println!("  Scan Risk Score: {}/100", scan_b.risk_score);
    for log in &scan_b.audit_log {
        println!("    Audit: {}", log);
    }

    // Biometric check fails: smile confidence too low (potential static mask attack)
    let mut bad_gestures = HashMap::new();
    bad_gestures.insert("blink".to_string(), 0.98);
    bad_gestures.insert("smile".to_string(), 0.72); // Too low!
    bad_gestures.insert("turn_right".to_string(), 0.95);

    let liveness_check_b = fraud_scanner.verify_selfie_liveness("buyer_selfie_fake.mp4", &expected_gestures, &bad_gestures);

    match &liveness_check_b {
        Ok(_) => println!("  STATUS: Biometrics passed unexpectedly."),
        Err(e) => println!("  STATUS: Biometrics REJECTED as expected: {}", e),
    }

    if scan_b.is_fraudulent || liveness_check_b.is_err() {
        println!("  STATUS: Escrow verification FAILED. Fraud detected! Tripping Escrow lock.");
        escrow_engine.dispute_order(order_id_b).unwrap();
    } else {
        println!("  STATUS: Verification passed.");
    }
    println!("============================================================");
}
