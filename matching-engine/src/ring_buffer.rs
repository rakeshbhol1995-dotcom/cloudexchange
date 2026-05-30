use std::sync::atomic::{AtomicU64, Ordering};
use std::cell::UnsafeCell;
use std::sync::Arc;

/// A cache-line aligned atomic index to prevent false sharing.
#[repr(align(64))]
struct CacheAlignedIndex {
    index: AtomicU64,
}

impl CacheAlignedIndex {
    fn new(val: u64) -> Self {
        Self {
            index: AtomicU64::new(val),
        }
    }
}

/// A lock-free Single-Producer Single-Consumer (SPSC) Ring Buffer (Disruptor Pattern).
pub struct SPSCQueue<T> {
    buffer: Vec<UnsafeCell<T>>,
    capacity: usize,
    mask: u64,
    // Align indices to prevent false sharing between producer and consumer threads
    write_idx: CacheAlignedIndex,
    read_idx: CacheAlignedIndex,
}

// Safety: UnsafeCell requires explicit synchronization, which we implement via atomics
unsafe impl<T: Send> Send for SPSCQueue<T> {}
unsafe impl<T: Sync> Sync for SPSCQueue<T> {}

impl<T: Default + Clone> SPSCQueue<T> {
    pub fn new(capacity_power_of_two: usize) -> Self {
        assert!(capacity_power_of_two.is_power_of_two(), "Capacity must be a power of two");
        let capacity = capacity_power_of_two;
        let mut buffer = Vec::with_capacity(capacity);
        for _ in 0..capacity {
            buffer.push(UnsafeCell::new(T::default()));
        }
        Self {
            buffer,
            capacity,
            mask: (capacity - 1) as u64,
            write_idx: CacheAlignedIndex::new(0),
            read_idx: CacheAlignedIndex::new(0),
        }
    }

    /// Tries to enqueue an item. Returns false if the queue is full.
    #[inline(always)]
    pub fn enqueue(&self, val: T) -> bool {
        let current_write = self.write_idx.index.load(Ordering::Relaxed);
        let current_read = self.read_idx.index.load(Ordering::Acquire);

        if current_write - current_read >= self.capacity as u64 {
            // Queue is full
            return false;
        }

        // Safety: We have exclusive access to the cell because the consumer is behind write_idx
        let cell_ptr = self.buffer[(current_write & self.mask) as usize].get();
        unsafe {
            *cell_ptr = val;
        }

        self.write_idx.index.store(current_write + 1, Ordering::Release);
        true
    }

    /// Tries to dequeue an item. Returns None if the queue is empty.
    #[inline(always)]
    pub fn dequeue(&self) -> Option<T> {
        let current_read = self.read_idx.index.load(Ordering::Relaxed);
        let current_write = self.write_idx.index.load(Ordering::Acquire);

        if current_read == current_write {
            // Queue is empty
            return None;
        }

        // Safety: We have exclusive access to the cell because the producer is ahead of read_idx
        let cell_ptr = self.buffer[(current_read & self.mask) as usize].get();
        let val = unsafe { (*cell_ptr).clone() };

        self.read_idx.index.store(current_read + 1, Ordering::Release);
        Option::Some(val)
    }

    /// Size of the queue
    pub fn size(&self) -> u64 {
        let write = self.write_idx.index.load(Ordering::Relaxed);
        let read = self.read_idx.index.load(Ordering::Relaxed);
        if write >= read {
            write - read
        } else {
            0
        }
    }
}
