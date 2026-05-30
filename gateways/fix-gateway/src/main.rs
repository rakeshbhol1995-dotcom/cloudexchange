use std::collections::HashMap;
use std::io::{self, Read, Write};
use std::net::TcpListener;
use std::thread;
use std::time::{Instant, SystemTime, UNIX_EPOCH};

const SOH: char = '\x01';

/// A simplified, low-latency parsed FIX message.
#[derive(Debug, Clone)]
pub struct FixMessage {
    pub fields: HashMap<u32, String>,
}

impl FixMessage {
    /// Parse a raw FIX byte string into tags and values.
    pub fn parse(raw: &str) -> Self {
        let mut fields = HashMap::new();
        for kv in raw.split(SOH) {
            if kv.is_empty() {
                continue;
            }
            let mut parts = kv.splitn(2, '=');
            if let (Some(tag_str), Some(val_str)) = (parts.next(), parts.next()) {
                if let Ok(tag) = tag_str.parse::<u32>() {
                    fields.insert(tag, val_str.to_string());
                }
            }
        }
        Self { fields }
    }

    /// Retrieve the value for a tag.
    pub fn get(&self, tag: u32) -> Option<&String> {
        self.fields.get(&tag)
    }

    /// Generate raw FIX string from map.
    pub fn to_raw(&self) -> String {
        let mut raw = String::new();
        // Standard tags ordering: 8, 9, 35, 49, 56, 34, ...
        // For simplicity, we just format all fields.
        for (tag, val) in &self.fields {
            raw.push_str(&format!("{}={}{}", tag, val, SOH));
        }
        raw
    }
}

pub struct FixSession {
    pub comp_id: String,
    pub expected_inbound_seq: u32,
    pub next_outbound_seq: u32,
}

impl FixSession {
    pub fn new(comp_id: String) -> Self {
        Self {
            comp_id,
            expected_inbound_seq: 1,
            next_outbound_seq: 1,
        }
    }

    /// Process an incoming message, checks sequence numbers.
    /// Returns Ok(()) if sequence matches, or Err(expected_seq) if a gap is detected.
    pub fn process_inbound_msg(&mut self, msg: &FixMessage) -> Result<(), u32> {
        let seq_num = msg
            .get(34) // Tag 34: MsgSeqNum
            .and_then(|s| s.parse::<u32>().ok())
            .unwrap_or(0);

        println!(
            "[FIX Session {}] Received MsgType={:?}, SeqNum={}",
            self.comp_id,
            msg.get(35),
            seq_num
        );

        if seq_num == self.expected_inbound_seq {
            self.expected_inbound_seq += 1;
            Ok(())
        } else if seq_num > self.expected_inbound_seq {
            let missing_start = self.expected_inbound_seq;
            // Gap detected! Institutional client missed some messages.
            // Under FIX, we must send a Resend Request (35=2) for tags [missing_start, seq_num - 1]
            println!(
                "[FIX WARNING] Gap detected! Expected sequence {}, received {}. Requesting Resend [{} to {}]",
                missing_start, seq_num, missing_start, seq_num - 1
            );
            Err(missing_start)
        } else {
            // Sequence number is lower than expected. Typically triggers an error or logout.
            println!(
                "[FIX ERROR] Sequence number too low! Expected {}, received {}",
                self.expected_inbound_seq, seq_num
            );
            Ok(())
        }
    }
}

fn main() {
    println!("============================================================");
    println!("CloudExchange — Institutional FIX Gateway Simulator");
    println!("============================================================");

    // 1. Initialize a mock FIX session for client "INST_DESK_LONDON"
    let mut session = FixSession::new("INST_DESK_LONDON".to_string());
    println!("Created FIX Session for: {}", session.comp_id);

    // 2. Simulate standard Logon
    let logon_raw = format!("8=FIX.4.4{}9=58{}35=A{}34=1{}49=INST_DESK_LONDON{}56=CLOUD_EXCH{}98=0{}108=30{}", SOH, SOH, SOH, SOH, SOH, SOH, SOH, SOH);
    let logon_msg = FixMessage::parse(&logon_raw);
    assert!(session.process_inbound_msg(&logon_msg).is_ok());
    println!("  -> Logon Successful! Outbound Sequence: {}", session.next_outbound_seq);
    println!("------------------------------------------------------------");

    // 3. Simulate correct Order Placement (SeqNum 2)
    let order_raw = format!("8=FIX.4.4{}35=D{}34=2{}49=INST_DESK_LONDON{}56=CLOUD_EXCH{}55=BTC_USDT{}54=1{}38=10000{}44=65000{}", SOH, SOH, SOH, SOH, SOH, SOH, SOH, SOH, SOH);
    let order_msg = FixMessage::parse(&order_raw);
    assert!(session.process_inbound_msg(&order_msg).is_ok());
    println!("  -> Order #2 Processed!");
    println!("------------------------------------------------------------");

    // 4. Simulate a Sequence Gap: Client drops connection, reconnects, and sends SeqNum 5 (missing 3 and 4)
    println!("Client disconnects/reconnects and sends message out-of-order...");
    let out_of_order_raw = format!("8=FIX.4.4{}35=D{}34=5{}49=INST_DESK_LONDON{}56=CLOUD_EXCH{}55=BTC_USDT{}54=2{}", SOH, SOH, SOH, SOH, SOH, SOH, SOH);
    let out_of_order_msg = FixMessage::parse(&out_of_order_raw);

    match session.process_inbound_msg(&out_of_order_msg) {
        Ok(_) => println!("Processed successfully."),
        Err(expected) => {
            // Send Resend Request: Tag 35=2, Tag 7=ExpectedSeq, Tag 16=0 (or infinite)
            let mut resend_req = HashMap::new();
            resend_req.insert(8, "FIX.4.4".to_string());
            resend_req.insert(35, "2".to_string()); // Resend Request
            resend_req.insert(34, session.next_outbound_seq.to_string());
            resend_req.insert(49, "CLOUD_EXCH".to_string());
            resend_req.insert(56, "INST_DESK_LONDON".to_string());
            resend_req.insert(7, expected.to_string()); // BeginSeqNo
            resend_req.insert(16, "4".to_string());     // EndSeqNo

            let resend_msg = FixMessage { fields: resend_req };
            println!("[FIX GATEWAY OUTBOUND] Sending Resend Request: {}", resend_msg.to_raw().replace(SOH, "|"));
            session.next_outbound_seq += 1;
        }
    }
    println!("============================================================");
}
