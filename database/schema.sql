-- PostgreSQL Database Schema for CloudExchange.in Production

-- Enable uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & CREDENTIALS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    kyc_status VARCHAR(50) DEFAULT 'Tier-1 Basic (Email Verified)', -- Tier-1, Tier-2 (Selfie Verified), Rejected
    kyc_document_url VARCHAR(512),
    is_merchant BOOLEAN DEFAULT FALSE,
    merchant_upi_id VARCHAR(100),
    merchant_deposit_txid VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. USER ASSET LEDGER
CREATE TABLE IF NOT EXISTS balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL, -- BTC, ETH, USDT
    amount NUMERIC(36, 18) DEFAULT 0.00,
    in_order NUMERIC(36, 18) DEFAULT 0.00,
    UNIQUE(user_id, symbol)
);

-- 3. HFT ORDER BOOK (MATCHING ENGINE)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    pair VARCHAR(30) NOT NULL, -- BTC/USDT, ETH/INR
    side VARCHAR(10) NOT NULL, -- BUY, SELL
    type VARCHAR(20) NOT NULL, -- LIMIT, MARKET, STOP_LIMIT
    price NUMERIC(24, 8) NOT NULL,
    quantity NUMERIC(24, 8) NOT NULL,
    filled NUMERIC(24, 8) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, FILLED, PARTIALLY_FILLED, CANCELED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. P2P ACTIVE AD LISTINGS
CREATE TABLE IF NOT EXISTS p2p_ads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) DEFAULT 'USDT',
    fiat VARCHAR(10) DEFAULT 'INR',
    side VARCHAR(10) DEFAULT 'BUY', -- BUY (Merchant buys from users)
    rate NUMERIC(12, 2) NOT NULL, -- e.g., 89.50 INR per USDT
    available NUMERIC(24, 8) NOT NULL, -- total available tokens
    min_limit NUMERIC(12, 2) NOT NULL, -- minimum transaction size in INR
    max_limit NUMERIC(12, 2) NOT NULL, -- maximum transaction size in INR
    payment_methods VARCHAR(50)[] NOT NULL, -- ['UPI', 'IMPS']
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. ESCROW DEALS
CREATE TABLE IF NOT EXISTS escrow_deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_id UUID REFERENCES p2p_ads(id) ON DELETE SET NULL,
    buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    seller_id UUID REFERENCES users(id) ON DELETE SET NULL,
    escrow_contract_address VARCHAR(100),
    onchain_deal_id NUMERIC(20), -- references index in solidity mapping
    token_amount NUMERIC(36, 18) NOT NULL,
    fiat_amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'CREATED', -- CREATED, PAID, RELEASED, REFUNDED, DISPUTED
    payment_receipt_url VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. SECURE P2P CHAT LOGS
CREATE TABLE IF NOT EXISTS escrow_chats (
    id SERIAL PRIMARY KEY,
    deal_id UUID REFERENCES escrow_deals(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for indexing performance
CREATE INDEX IF NOT EXISTS idx_orders_pair_status ON orders(pair, status);
CREATE INDEX IF NOT EXISTS idx_balances_user ON balances(user_id);
CREATE INDEX IF NOT EXISTS idx_p2p_ads_active ON p2p_ads(is_active);

-- 7. INSTITUTIONAL & AUDIT SCHEMA EXTENSIONS
CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    asset VARCHAR(20) NOT NULL,
    amount NUMERIC(36, 18) NOT NULL,
    destination_address VARCHAR(255) NOT NULL,
    withdrawal_risk_score NUMERIC(5, 4) DEFAULT 0.0000,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_bus_offsets (
    consumer_group VARCHAR(100) NOT NULL,
    stream_name VARCHAR(100) NOT NULL,
    last_processed_offset BIGINT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (consumer_group, stream_name)
);

CREATE TABLE IF NOT EXISTS custody_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_id VARCHAR(255) NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    signature_hex TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS travel_rule_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID,
    originator_vasp_id VARCHAR(100) NOT NULL,
    beneficiary_vasp_id VARCHAR(100) NOT NULL,
    jurisdiction VARCHAR(100) NOT NULL,
    risk_score NUMERIC(5, 4) DEFAULT 0.0000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS device_fingerprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    canvas_hash VARCHAR(64) NOT NULL,
    os_platform VARCHAR(100) NOT NULL,
    browser_details VARCHAR(255) NOT NULL,
    ip_geolocation VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS insurance_fund_snapshots (
    id SERIAL PRIMARY KEY,
    fund_balance NUMERIC(36, 18) NOT NULL,
    total_allocations NUMERIC(36, 18) DEFAULT 0.00,
    total_deficits_absorbed NUMERIC(36, 18) DEFAULT 0.00,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS liquidation_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(30) NOT NULL,
    position_size NUMERIC(24, 8) NOT NULL,
    bankruptcy_price NUMERIC(24, 8) NOT NULL,
    liquidation_price NUMERIC(24, 8) NOT NULL,
    insurance_fund_loss NUMERIC(36, 18) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS funding_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(30) NOT NULL,
    funding_rate NUMERIC(10, 8) NOT NULL,
    total_payment NUMERIC(36, 18) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

