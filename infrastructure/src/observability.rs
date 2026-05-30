use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;

#[derive(Debug, Default)]
pub struct MetricsStore {
    counters: HashMap<String, u64>,
    gauges: HashMap<String, f64>,
    histograms: HashMap<String, Vec<f64>>,
}

#[derive(Clone)]
pub struct ObservabilityExporter {
    store: Arc<Mutex<MetricsStore>>,
}

impl ObservabilityExporter {
    pub fn new() -> Self {
        Self {
            store: Arc::new(Mutex::new(MetricsStore::default())),
        }
    }

    /// Increment a counter metric
    pub fn increment_counter(&self, metric_name: &str) {
        let mut store = self.store.lock().unwrap();
        let counter = store.counters.entry(metric_name.to_string()).or_insert(0);
        *counter += 1;
    }

    /// Update a gauge value
    pub fn set_gauge(&self, metric_name: &str, value: f64) {
        let mut store = self.store.lock().unwrap();
        store.gauges.insert(metric_name.to_string(), value);
    }

    /// Record a value in a histogram
    pub fn record_histogram(&self, metric_name: &str, value: f64) {
        let mut store = self.store.lock().unwrap();
        let list = store.histograms.entry(metric_name.to_string()).or_insert_with(Vec::new);
        list.push(value);
    }

    /// Print Prometheus-compatible metrics representation
    pub fn print_metrics_snapshot(&self) {
        let store = self.store.lock().unwrap();
        println!("--- Prometheus Observability Exporter Snapshot ---");
        
        for (name, val) in &store.counters {
            println!("# TYPE {} counter", name);
            println!("{} {}", name, val);
        }
        
        for (name, val) in &store.gauges {
            println!("# TYPE {} gauge", name);
            println!("{} {:.2}", name, val);
        }
        
        for (name, list) in &store.histograms {
            if list.is_empty() {
                continue;
            }
            let sum: f64 = list.iter().sum();
            let avg = sum / list.len() as f64;
            let mut sorted = list.clone();
            sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
            let p99 = sorted[(list.len() * 99 / 100).min(list.len() - 1)];

            println!("# TYPE {} histogram", name);
            println!("{}_count {}", name, list.len());
            println!("{}_sum {:.6}", name, sum);
            println!("{}_avg {:.6}", name, avg);
            println!("{}_p99 {:.6}", name, p99);
        }
        println!("--------------------------------------------------");
    }
}
