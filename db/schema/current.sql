--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Homebrew)
-- Dumped by pg_dump version 14.18 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: account_provider_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.account_provider_type_enum AS ENUM (
    'BANK',
    'PAYMENT_PROCESSOR',
    'PAYMENT_SWITCH',
    'FINTECH'
);


--
-- Name: account_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.account_status_enum AS ENUM (
    'PENDING',
    'ACTIVE',
    'SUSPENDED',
    'FROZEN',
    'CLOSED'
);


--
-- Name: account_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.account_type_enum AS ENUM (
    'VIRTUAL_BANK_ACCOUNT',
    'WALLET',
    'SETTLEMENT_ACCOUNT',
    'ESCROW_ACCOUNT'
);


--
-- Name: beneficiary_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.beneficiary_type_enum AS ENUM (
    'BANK_ACCOUNT',
    'MOBILE_MONEY',
    'OTHER'
);


--
-- Name: bill_category_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bill_category_enum AS ENUM (
    'AIRTIME',
    'DATA',
    'ELECTRICITY',
    'CABLE_TV',
    'INTERNET',
    'OTHER'
);


--
-- Name: bill_transaction_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bill_transaction_status_enum AS ENUM (
    'PENDING',
    'PROCESSING',
    'SUCCESSFUL',
    'FAILED',
    'REVERSED',
    'REFUNDED'
);


--
-- Name: fee_bearer_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.fee_bearer_enum AS ENUM (
    'CUSTOMER',
    'TENANT',
    'PARC',
    'SHARED'
);


--
-- Name: fee_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.fee_type_enum AS ENUM (
    'TRANSFER_FEE',
    'PROCESSING_FEE',
    'SERVICE_FEE',
    'VAT',
    'OTHER'
);


--
-- Name: ledger_posting_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ledger_posting_status_enum AS ENUM (
    'NOT_REQUESTED',
    'PENDING',
    'POSTED',
    'FAILED',
    'REVERSED'
);


--
-- Name: payment_attempt_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_attempt_status_enum AS ENUM (
    'PENDING',
    'PROCESSING',
    'SUCCESSFUL',
    'FAILED',
    'TIMEOUT'
);


--
-- Name: payment_channel_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_channel_enum AS ENUM (
    'MOBILE_APP',
    'WEB',
    'API',
    'ADMIN',
    'SYSTEM'
);


--
-- Name: payment_inbox_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_inbox_status_enum AS ENUM (
    'RECEIVED',
    'PROCESSING',
    'PROCESSED',
    'FAILED',
    'DEAD_LETTER'
);


--
-- Name: payment_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status_enum AS ENUM (
    'PENDING',
    'PROCESSING',
    'SUCCESSFUL',
    'FAILED',
    'CANCELLED',
    'REVERSED',
    'EXPIRED'
);


--
-- Name: payment_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_type_enum AS ENUM (
    'BANK_TRANSFER',
    'INTERNAL_TRANSFER',
    'ACCOUNT_FUNDING',
    'WITHDRAWAL',
    'REFUND',
    'PAYOUT',
    'PLATFORM_REVENUE_SETTLEMENT',
    'PLATFORM_REVENUE_REFUND',
    'BILL_PAYMENT'
);


--
-- Name: platform_revenue_model_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.platform_revenue_model_enum AS ENUM (
    'REVENUE_SHARE',
    'COMMISSION',
    'FIXED_FEE',
    'MARKUP',
    'SUBSCRIPTION',
    'API_USAGE',
    'OTHER'
);


--
-- Name: platform_revenue_settlement_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.platform_revenue_settlement_status_enum AS ENUM (
    'UNSETTLED',
    'PARTIALLY_SETTLED',
    'SETTLED',
    'EXCLUDED'
);


--
-- Name: platform_revenue_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.platform_revenue_status_enum AS ENUM (
    'CALCULATED',
    'EARNED',
    'REVERSED',
    'CANCELLED'
);


--
-- Name: platform_revenue_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.platform_revenue_type_enum AS ENUM (
    'LOAN_INTEREST_SHARE',
    'LOAN_ORIGINATION_SHARE',
    'TRANSFER_REVENUE',
    'BILL_PAYMENT_REVENUE',
    'PAYMENT_REVENUE',
    'SAVINGS_REVENUE',
    'PROVIDER_COMMISSION',
    'PLATFORM_FEE',
    'API_USAGE_FEE',
    'SUBSCRIPTION_FEE',
    'OTHER'
);


--
-- Name: reconciliation_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.reconciliation_status_enum AS ENUM (
    'MATCHED',
    'UNMATCHED',
    'EXCEPTION',
    'RESOLVED'
);


--
-- Name: revenue_adjustment_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.revenue_adjustment_type_enum AS ENUM (
    'CREDIT',
    'DEBIT',
    'REVERSAL',
    'CORRECTION'
);


--
-- Name: revenue_settlement_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.revenue_settlement_status_enum AS ENUM (
    'PENDING',
    'READY',
    'INITIATED',
    'PROCESSING',
    'PARTIALLY_SETTLED',
    'SETTLED',
    'FAILED',
    'CANCELLED',
    'REVERSED'
);


--
-- Name: reversal_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.reversal_status_enum AS ENUM (
    'PENDING',
    'PROCESSING',
    'SUCCESSFUL',
    'FAILED'
);


--
-- Name: webhook_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.webhook_status_enum AS ENUM (
    'RECEIVED',
    'PROCESSED',
    'FAILED',
    'IGNORED',
    'DEAD_LETTERED'
);


--
-- Name: claim_due_bill_inquiries(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_due_bill_inquiries(p_worker_id text, p_limit integer, p_lease_seconds integer DEFAULT 60) RETURNS TABLE(attempt_id uuid, tenant_id uuid, bill_transaction_id uuid, provider_code character varying, provider_reference character varying, inquiry_attempts integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$ BEGIN IF nullif(btrim(p_worker_id),'') IS NULL OR p_limit<1 OR p_limit>100 OR p_lease_seconds<10 OR p_lease_seconds>600 THEN RAISE EXCEPTION 'Invalid bill inquiry claim'; END IF; RETURN QUERY WITH due AS (SELECT a.id FROM public.bill_transaction_attempts a WHERE a.outcome_class IN ('ACKNOWLEDGED_PENDING','AMBIGUOUS') AND a.next_inquiry_at<=now() AND (a.inquiry_lease_expires_at IS NULL OR a.inquiry_lease_expires_at<now()) ORDER BY a.next_inquiry_at,a.id FOR UPDATE SKIP LOCKED LIMIT p_limit), claimed AS (UPDATE public.bill_transaction_attempts a SET inquiry_lease_expires_at=now()+make_interval(secs=>p_lease_seconds),inquiry_attempts=a.inquiry_attempts+1 FROM due WHERE a.id=due.id RETURNING a.*) SELECT c.id,c.tenant_id,c.bill_transaction_id,bp.provider_code,COALESCE(c.provider_reference,'PARC-'||c.bill_transaction_id::text)::varchar,c.inquiry_attempts FROM claimed c JOIN public.bill_transactions b ON b.tenant_id=c.tenant_id AND b.id=c.bill_transaction_id JOIN public.bill_providers bp ON bp.tenant_id=b.tenant_id AND bp.id=b.provider_id; END $$;


--
-- Name: claim_due_payment_inquiries(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_due_payment_inquiries(p_worker_id text, p_limit integer, p_lease_seconds integer DEFAULT 60) RETURNS TABLE(attempt_id uuid, tenant_id uuid, external_transfer_id uuid, provider_code character varying, provider_reference character varying)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$ BEGIN
      IF nullif(btrim(p_worker_id),'') IS NULL OR p_limit<1 OR p_limit>100 OR p_lease_seconds<10 OR p_lease_seconds>600 THEN RAISE EXCEPTION 'Invalid inquiry claim'; END IF;
      RETURN QUERY WITH due AS (SELECT a.id FROM public.payment_attempts a WHERE a.outcome_class IN('ACKNOWLEDGED_PENDING','AMBIGUOUS') AND a.next_inquiry_at<=now() AND (a.inquiry_lease_expires_at IS NULL OR a.inquiry_lease_expires_at<now()) ORDER BY a.next_inquiry_at FOR UPDATE SKIP LOCKED LIMIT p_limit), claimed AS (UPDATE public.payment_attempts a SET inquiry_lease_expires_at=now()+make_interval(secs=>p_lease_seconds),last_inquiry_at=now(),inquiry_attempts=a.inquiry_attempts+1 FROM due WHERE a.id=due.id RETURNING a.*) SELECT c.id,c.tenant_id,c.external_transfer_id,c.provider_code,c.provider_reference FROM claimed c;
    END $$;


--
-- Name: current_tenant_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_tenant_id() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
    SELECT NULLIF(
        current_setting('app.current_tenant_id', true),
        ''
    )::uuid;
$$;


--
-- Name: enforce_new_platform_revenue_settlement_pending(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_new_platform_revenue_settlement_pending() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.status <> 'PENDING' THEN
        RAISE EXCEPTION
            'New platform revenue settlements must start in PENDING status.';
    END IF;

    IF NEW.payment_id IS NOT NULL THEN
        RAISE EXCEPTION
            'A new PENDING revenue settlement cannot already have a payment_id.';
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: prevent_payment_routing_decision_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_payment_routing_decision_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN RAISE EXCEPTION 'Provider routing decisions are immutable'; END $$;


--
-- Name: prevent_platform_revenue_settlement_item_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_platform_revenue_settlement_item_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_status revenue_settlement_status_enum;
BEGIN
    SELECT status
    INTO v_status
    FROM platform_revenue_settlements
    WHERE id = OLD.settlement_id;

    IF v_status NOT IN ('PENDING', 'READY') THEN
        RAISE EXCEPTION
            'Settlement items cannot be deleted after settlement initiation.';
    END IF;

    RETURN OLD;
END;
$$;


--
-- Name: prevent_unsafe_provider_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_unsafe_provider_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE prior record; BEGIN
      IF NEW.attempt_number>1 THEN SELECT outcome_class INTO prior FROM public.payment_attempts WHERE tenant_id=NEW.tenant_id AND payment_id=NEW.payment_id AND attempt_number=NEW.attempt_number-1;
        IF prior.outcome_class NOT IN('NOT_SENT','DEFINITE_PRE_SUBMISSION_FAILURE','FINAL_FAILURE') THEN RAISE EXCEPTION 'Previous provider outcome prohibits failover'; END IF;
      END IF; RETURN NEW;
    END $$;


--
-- Name: protect_bill_immutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_bill_immutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN RAISE EXCEPTION 'Financial evidence is immutable'; END $$;


--
-- Name: protect_collection_history(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_collection_history() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN RAISE EXCEPTION 'Collection status history is immutable'; END $$;


--
-- Name: protect_earned_platform_revenue_event(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_earned_platform_revenue_event() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.status IN ('REVERSED', 'CANCELLED')
       AND NEW.status <> OLD.status THEN
        RAISE EXCEPTION
            'Platform revenue event % cannot leave terminal status %.',
            OLD.id,
            OLD.status;
    END IF;

    IF OLD.status = 'EARNED' THEN
        IF NEW.revenue_model IS DISTINCT FROM OLD.revenue_model
           OR NEW.revenue_type IS DISTINCT FROM OLD.revenue_type
           OR NEW.source_service IS DISTINCT FROM OLD.source_service
           OR NEW.source_event_type IS DISTINCT FROM OLD.source_event_type
           OR NEW.source_reference IS DISTINCT FROM OLD.source_reference
           OR NEW.commercial_agreement_id IS DISTINCT FROM OLD.commercial_agreement_id
           OR NEW.revenue_share_rule_id IS DISTINCT FROM OLD.revenue_share_rule_id
           OR NEW.calculation_basis IS DISTINCT FROM OLD.calculation_basis
           OR NEW.basis_amount IS DISTINCT FROM OLD.basis_amount
           OR NEW.percentage_rate IS DISTINCT FROM OLD.percentage_rate
           OR NEW.fixed_amount IS DISTINCT FROM OLD.fixed_amount
           OR NEW.gross_revenue_amount IS DISTINCT FROM OLD.gross_revenue_amount
           OR NEW.fee_amount IS DISTINCT FROM OLD.fee_amount
           OR NEW.tax_amount IS DISTINCT FROM OLD.tax_amount
           OR NEW.net_revenue_amount IS DISTINCT FROM OLD.net_revenue_amount
           OR NEW.currency IS DISTINCT FROM OLD.currency THEN

            RAISE EXCEPTION
                'Economic fields of an EARNED platform revenue event are immutable. Use an adjustment or reversal.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: protect_external_transfer_history(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_external_transfer_history() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN RAISE EXCEPTION 'External transfer history is immutable'; END $$;


--
-- Name: protect_internal_transfer_history(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_internal_transfer_history() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN RAISE EXCEPTION 'Internal transfer history is immutable'; END $$;


--
-- Name: protect_payment_reversal_history(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_payment_reversal_history() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN RAISE EXCEPTION 'Reversal history is immutable'; END $$;


--
-- Name: protect_payment_webhook_evidence(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_payment_webhook_evidence() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN
      IF NEW.provider_code IS DISTINCT FROM OLD.provider_code OR NEW.event_reference IS DISTINCT FROM OLD.event_reference OR NEW.event_type IS DISTINCT FROM OLD.event_type OR NEW.payload IS DISTINCT FROM OLD.payload OR NEW.payload_hash IS DISTINCT FROM OLD.payload_hash OR NEW.signature_hash IS DISTINCT FROM OLD.signature_hash OR NEW.signature_verified IS DISTINCT FROM OLD.signature_verified OR NEW.signature_scheme IS DISTINCT FROM OLD.signature_scheme OR NEW.credential_key_version IS DISTINCT FROM OLD.credential_key_version OR NEW.received_at IS DISTINCT FROM OLD.received_at THEN RAISE EXCEPTION 'Webhook receipt evidence is immutable'; END IF; RETURN NEW; END $$;


--
-- Name: protect_platform_revenue_share_economics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_platform_revenue_share_economics() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_status platform_revenue_status_enum;
BEGIN
    SELECT status
    INTO v_status
    FROM platform_revenue_events
    WHERE id = OLD.revenue_event_id;

    IF v_status = 'EARNED' THEN
        IF NEW.share_basis_amount IS DISTINCT FROM OLD.share_basis_amount
           OR NEW.parc_share_rate IS DISTINCT FROM OLD.parc_share_rate
           OR NEW.parc_share_amount IS DISTINCT FROM OLD.parc_share_amount
           OR NEW.tenant_retained_amount IS DISTINCT FROM OLD.tenant_retained_amount
           OR NEW.provider_share_amount IS DISTINCT FROM OLD.provider_share_amount
           OR NEW.partner_share_amount IS DISTINCT FROM OLD.partner_share_amount
           OR NEW.currency IS DISTINCT FROM OLD.currency THEN
            RAISE EXCEPTION
                'Revenue-share economics are immutable after the parent event is EARNED.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: protect_published_bill_product_version(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_published_bill_product_version() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Published bill product versions are immutable'; END IF;
      IF OLD.effective_to IS NULL AND NEW.effective_to IS NOT NULL AND
         (to_jsonb(NEW)-'effective_to'-'updated_at')=(to_jsonb(OLD)-'effective_to'-'updated_at')
      THEN RETURN NEW; END IF;
      RAISE EXCEPTION 'Published bill product versions are immutable';
    END $$;


--
-- Name: protect_submitted_payment_attempt(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_submitted_payment_attempt() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF OLD.submission_state<>'NOT_SENT' AND (NEW.provider_code IS DISTINCT FROM OLD.provider_code OR NEW.routing_decision_id IS DISTINCT FROM OLD.routing_decision_id OR NEW.request_hash IS DISTINCT FROM OLD.request_hash OR NEW.request_payload IS DISTINCT FROM OLD.request_payload) THEN RAISE EXCEPTION 'Submitted provider-attempt request evidence is immutable'; END IF;
      IF NEW.outcome_certainty='AMBIGUOUS' AND NEW.submission_state='NOT_SENT' THEN RAISE EXCEPTION 'An unsubmitted attempt cannot have an ambiguous outcome'; END IF;
      RETURN NEW;
    END $$;


--
-- Name: record_bill_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_bill_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN INSERT INTO public.bill_transaction_status_history(tenant_id,bill_transaction_id,previous_status,new_status,reason) VALUES(NEW.tenant_id,NEW.id,CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.status END,NEW.status,NEW.failure_reason); END IF; RETURN NEW; END $$;


--
-- Name: record_collection_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_collection_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN
      IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO public.payment_collection_status_history(tenant_id,collection_id,previous_status,new_status,reason)
        VALUES(NEW.tenant_id,NEW.id,CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.status END,NEW.status,NEW.failure_reason);
      END IF; RETURN NEW;
    END $$;


--
-- Name: record_external_transfer_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_external_transfer_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN
      IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN INSERT INTO public.payment_external_transfer_history(tenant_id,transfer_id,previous_status,new_status,reason) VALUES(NEW.tenant_id,NEW.id,CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.status END,NEW.status,NEW.failure_reason); END IF; RETURN NEW; END $$;


--
-- Name: record_internal_transfer_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_internal_transfer_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN
      IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN INSERT INTO public.payment_internal_transfer_history(tenant_id,transfer_id,previous_status,new_status,reason) VALUES(NEW.tenant_id,NEW.id,CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.status END,NEW.status,NEW.failure_reason); END IF; RETURN NEW; END $$;


--
-- Name: record_payment_reversal_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_payment_reversal_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN INSERT INTO public.payment_reversal_history(tenant_id,reversal_id,previous_status,new_status,reason) VALUES(NEW.tenant_id,NEW.id,CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.status END,NEW.status,NEW.failure_reason); END IF; RETURN NEW; END $$;


--
-- Name: record_verified_payment_webhook(text, text, text, jsonb, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_verified_payment_webhook(p_provider_code text, p_event_reference text, p_event_type text, p_payload jsonb, p_payload_hash text, p_signature_hash text, p_signature_scheme text, p_credential_key_version text) RETURNS TABLE(webhook_id uuid, replayed boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
    DECLARE existing public.payment_webhooks%ROWTYPE; inserted_id uuid; BEGIN
      IF p_provider_code NOT IN ('PAYSTACK','WEMA','BANKONE') OR nullif(btrim(p_event_reference),'') IS NULL OR length(p_payload_hash)<>64 OR length(p_signature_hash)<>64 OR nullif(btrim(p_signature_scheme),'') IS NULL OR nullif(btrim(p_credential_key_version),'') IS NULL THEN RAISE EXCEPTION 'Invalid verified webhook evidence'; END IF;
      INSERT INTO public.payment_webhooks(provider_code,event_reference,event_type,payload,payload_hash,signature_verified,signature_hash,signature_scheme,credential_key_version) VALUES(p_provider_code,p_event_reference,p_event_type,p_payload,p_payload_hash,true,p_signature_hash,p_signature_scheme,p_credential_key_version) ON CONFLICT(provider_code,event_reference) DO NOTHING RETURNING id INTO inserted_id;
      IF inserted_id IS NOT NULL THEN RETURN QUERY SELECT inserted_id,false; RETURN; END IF;
      SELECT * INTO existing FROM public.payment_webhooks WHERE provider_code=p_provider_code AND event_reference=p_event_reference;
      IF existing.payload_hash<>p_payload_hash OR existing.signature_scheme<>p_signature_scheme OR existing.credential_key_version<>p_credential_key_version THEN RAISE EXCEPTION 'Webhook identity reused with different evidence'; END IF;
      RETURN QUERY SELECT existing.id,true;
    END $$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: validate_bill_transaction(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_bill_transaction() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF TG_OP='UPDATE' AND (NEW.tenant_id,NEW.customer_id,NEW.source_account_id,NEW.product_id,NEW.provider_id,NEW.amount,NEW.fee_amount,NEW.tax_amount,NEW.cashback_amount,NEW.currency,NEW.idempotency_key,NEW.request_hash,NEW.routing_decision_id,NEW.quote_id) IS DISTINCT FROM (OLD.tenant_id,OLD.customer_id,OLD.source_account_id,OLD.product_id,OLD.provider_id,OLD.amount,OLD.fee_amount,OLD.tax_amount,OLD.cashback_amount,OLD.currency,OLD.idempotency_key,OLD.request_hash,OLD.routing_decision_id,OLD.quote_id) THEN RAISE EXCEPTION 'Bill command evidence is immutable'; END IF; RETURN NEW; END $$;


--
-- Name: validate_external_transfer(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_external_transfer() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
    DECLARE src record; BEGIN
      SELECT tenant_id,currency,status,customer_id,ledger_account_id INTO src FROM public.financial_accounts WHERE id=NEW.source_account_id;
      IF src.tenant_id<>NEW.tenant_id OR btrim(src.currency)<>btrim(NEW.currency) OR src.status<>'ACTIVE' OR src.customer_id<>NEW.customer_id OR src.ledger_account_id IS DISTINCT FROM NEW.source_ledger_account_id THEN RAISE EXCEPTION 'External transfer requires an owned active mapped source account'; END IF;
      IF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NOT (
        (OLD.status='CREATED' AND NEW.status IN('RESERVED','FAILED')) OR (OLD.status='RESERVED' AND NEW.status IN('SUBMITTING','FAILED')) OR
        (OLD.status='SUBMITTING' AND NEW.status IN('PENDING','SUCCEEDED','FAILED','MANUAL_REVIEW')) OR
        (OLD.status='PENDING' AND NEW.status IN('SUCCEEDED','FAILED','REVERSED','MANUAL_REVIEW')) OR
        (OLD.status='MANUAL_REVIEW' AND NEW.status IN('PENDING','SUCCEEDED','FAILED','REVERSED')) OR
        (OLD.status='SUCCEEDED' AND NEW.status='REVERSED')
      ) THEN RAISE EXCEPTION 'Invalid external transfer transition'; END IF;
      IF TG_OP='UPDATE' AND (NEW.tenant_id,NEW.payment_id,NEW.customer_id,NEW.source_account_id,NEW.source_ledger_account_id,NEW.settlement_ledger_account_id,NEW.beneficiary_name,NEW.destination_account_number,NEW.destination_bank_code,NEW.amount,NEW.currency,NEW.idempotency_key,NEW.request_hash) IS DISTINCT FROM (OLD.tenant_id,OLD.payment_id,OLD.customer_id,OLD.source_account_id,OLD.source_ledger_account_id,OLD.settlement_ledger_account_id,OLD.beneficiary_name,OLD.destination_account_number,OLD.destination_bank_code,OLD.amount,OLD.currency,OLD.idempotency_key,OLD.request_hash) THEN RAISE EXCEPTION 'External transfer command evidence is immutable'; END IF;
      RETURN NEW;
    END $$;


--
-- Name: validate_internal_transfer(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_internal_transfer() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
    DECLARE src record; dst record; BEGIN
      SELECT tenant_id,currency,status,ledger_account_id INTO src FROM public.financial_accounts WHERE id=NEW.source_account_id;
      SELECT tenant_id,currency,status,ledger_account_id INTO dst FROM public.financial_accounts WHERE id=NEW.destination_account_id;
      IF src.tenant_id<>NEW.tenant_id OR dst.tenant_id<>NEW.tenant_id OR btrim(src.currency)<>btrim(NEW.currency) OR btrim(dst.currency)<>btrim(NEW.currency) THEN RAISE EXCEPTION 'Internal transfer tenant/currency mismatch'; END IF;
      IF src.status<>'ACTIVE' OR dst.status<>'ACTIVE' OR src.ledger_account_id IS DISTINCT FROM NEW.source_ledger_account_id OR dst.ledger_account_id IS DISTINCT FROM NEW.destination_ledger_account_id THEN RAISE EXCEPTION 'Internal transfer requires active mapped accounts'; END IF;
      IF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NOT (
        (OLD.status='CREATED' AND NEW.status IN('RESERVED','FAILED')) OR
        (OLD.status='RESERVED' AND NEW.status IN('CAPTURING','FAILED')) OR
        (OLD.status='CAPTURING' AND NEW.status IN('SUCCEEDED','MANUAL_REVIEW')) OR
        (OLD.status='MANUAL_REVIEW' AND NEW.status IN('CAPTURING','SUCCEEDED','FAILED'))
      ) THEN RAISE EXCEPTION 'Invalid internal transfer transition'; END IF;
      IF TG_OP='UPDATE' AND (NEW.tenant_id,NEW.payment_id,NEW.customer_id,NEW.source_account_id,NEW.destination_account_id,NEW.source_ledger_account_id,NEW.destination_ledger_account_id,NEW.amount,NEW.currency,NEW.idempotency_key,NEW.request_hash) IS DISTINCT FROM (OLD.tenant_id,OLD.payment_id,OLD.customer_id,OLD.source_account_id,OLD.destination_account_id,OLD.source_ledger_account_id,OLD.destination_ledger_account_id,OLD.amount,OLD.currency,OLD.idempotency_key,OLD.request_hash) THEN RAISE EXCEPTION 'Internal transfer command evidence is immutable'; END IF;
      RETURN NEW;
    END $$;


--
-- Name: validate_payment_reversal(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_payment_reversal() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN
      IF NEW.approval_id IS NULL AND NEW.automated_rule_id IS NULL THEN RAISE EXCEPTION 'Reversal authority is required'; END IF;
      IF TG_OP='UPDATE' AND (NEW.tenant_id,NEW.payment_id,NEW.amount,NEW.currency,NEW.idempotency_key,NEW.request_hash,NEW.original_ledger_transaction_id,NEW.approval_id,NEW.automated_rule_id) IS DISTINCT FROM (OLD.tenant_id,OLD.payment_id,OLD.amount,OLD.currency,OLD.idempotency_key,OLD.request_hash,OLD.original_ledger_transaction_id,OLD.approval_id,OLD.automated_rule_id) THEN RAISE EXCEPTION 'Reversal command evidence is immutable'; END IF;
      IF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NOT((OLD.status='PENDING' AND NEW.status IN('PROCESSING','FAILED')) OR (OLD.status='PROCESSING' AND NEW.status IN('SUCCESSFUL','FAILED'))) THEN RAISE EXCEPTION 'Invalid reversal transition'; END IF; RETURN NEW;
    END $$;


--
-- Name: validate_platform_revenue_settlement(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_platform_revenue_settlement() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_item_total NUMERIC(20,2);
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_item_total
    FROM platform_revenue_settlement_items
    WHERE settlement_id = NEW.id;

    IF NEW.status IN (
        'READY',
        'INITIATED',
        'PROCESSING',
        'PARTIALLY_SETTLED',
        'SETTLED'
    )
    AND v_item_total <> NEW.gross_revenue_amount THEN
        RAISE EXCEPTION
            'Settlement % gross revenue amount % does not equal settlement item total %.',
            NEW.id,
            NEW.gross_revenue_amount,
            v_item_total;
    END IF;

    IF OLD.status = 'SETTLED'
       AND NEW.status <> 'SETTLED' THEN
        RAISE EXCEPTION
            'A SETTLED revenue settlement cannot leave SETTLED. Use a reversal transaction.';
    END IF;

    IF OLD.status = 'SETTLED' THEN
        IF NEW.gross_revenue_amount IS DISTINCT FROM OLD.gross_revenue_amount
           OR NEW.adjustment_amount IS DISTINCT FROM OLD.adjustment_amount
           OR NEW.settlement_fee_amount IS DISTINCT FROM OLD.settlement_fee_amount
           OR NEW.tax_amount IS DISTINCT FROM OLD.tax_amount
           OR NEW.net_settlement_amount IS DISTINCT FROM OLD.net_settlement_amount
           OR NEW.currency IS DISTINCT FROM OLD.currency
           OR NEW.payment_id IS DISTINCT FROM OLD.payment_id THEN
            RAISE EXCEPTION
                'Financial fields of a SETTLED revenue settlement are immutable.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: validate_platform_revenue_settlement_item(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_platform_revenue_settlement_item() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_settlement_tenant UUID;
    v_settlement_currency CHAR(3);
    v_settlement_status revenue_settlement_status_enum;

    v_event_tenant UUID;
    v_event_currency CHAR(3);
    v_event_status platform_revenue_status_enum;
BEGIN
    SELECT tenant_id, currency, status
    INTO v_settlement_tenant, v_settlement_currency, v_settlement_status
    FROM platform_revenue_settlements
    WHERE id = NEW.settlement_id;

    SELECT tenant_id, currency, status
    INTO v_event_tenant, v_event_currency, v_event_status
    FROM platform_revenue_events
    WHERE id = NEW.revenue_event_id;

    IF v_settlement_tenant IS NULL THEN
        RAISE EXCEPTION
            'Platform revenue settlement % does not exist.',
            NEW.settlement_id;
    END IF;

    IF v_event_tenant IS NULL THEN
        RAISE EXCEPTION
            'Platform revenue event % does not exist.',
            NEW.revenue_event_id;
    END IF;

    IF NEW.tenant_id <> v_settlement_tenant
       OR NEW.tenant_id <> v_event_tenant THEN
        RAISE EXCEPTION
            'Settlement item tenant mismatch.';
    END IF;

    IF NEW.currency <> v_settlement_currency
       OR NEW.currency <> v_event_currency THEN
        RAISE EXCEPTION
            'Settlement item currency mismatch.';
    END IF;

    IF v_event_status <> 'EARNED' THEN
        RAISE EXCEPTION
            'Only EARNED platform revenue events can be settled.';
    END IF;

    IF v_settlement_status NOT IN ('PENDING', 'READY') THEN
        RAISE EXCEPTION
            'Settlement items cannot be changed after settlement initiation.';
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: validate_platform_revenue_share(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_platform_revenue_share() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_model platform_revenue_model_enum;
    v_event_tenant UUID;
    v_event_currency CHAR(3);
    v_event_gross NUMERIC(20,2);
BEGIN
    SELECT
        revenue_model,
        tenant_id,
        currency,
        gross_revenue_amount
    INTO
        v_model,
        v_event_tenant,
        v_event_currency,
        v_event_gross
    FROM platform_revenue_events
    WHERE id = NEW.revenue_event_id;

    IF v_event_tenant IS NULL THEN
        RAISE EXCEPTION
            'Platform revenue event % does not exist.',
            NEW.revenue_event_id;
    END IF;

    IF v_model <> 'REVENUE_SHARE' THEN
        RAISE EXCEPTION
            'platform_revenue_shares may only reference REVENUE_SHARE events.';
    END IF;

    IF NEW.tenant_id <> v_event_tenant THEN
        RAISE EXCEPTION
            'Revenue share tenant does not match revenue event tenant.';
    END IF;

    IF NEW.currency <> v_event_currency THEN
        RAISE EXCEPTION
            'Revenue share currency does not match revenue event currency.';
    END IF;

    IF NEW.parc_share_amount <> v_event_gross THEN
        RAISE EXCEPTION
            'Parc share amount must equal event gross revenue amount.';
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: validate_provider_attempt_outcome(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_provider_attempt_outcome() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN
      IF NEW.outcome_class IN('ACKNOWLEDGED_PENDING','AMBIGUOUS','FINAL_SUCCESS','FINAL_FAILURE','REVERSED') AND NEW.submission_state='NOT_SENT' THEN RAISE EXCEPTION 'Submitted outcome requires submission evidence'; END IF;
      IF NEW.request_payload::text ~* '"(bvn|nin|pin|password|token|secret|credential)"[[:space:]]*:' OR NEW.response_payload::text ~* '"(bvn|nin|pin|password|token|secret|credential)"[[:space:]]*:' THEN RAISE EXCEPTION 'Sensitive provider evidence is prohibited'; END IF;
      RETURN NEW;
    END $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_provider_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_provider_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    account_id uuid NOT NULL,
    provider_id uuid NOT NULL,
    provider_account_id character varying(150) NOT NULL,
    provider_account_number character varying(100),
    provider_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

ALTER TABLE ONLY public.account_provider_accounts FORCE ROW LEVEL SECURITY;


--
-- Name: account_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    provider_code character varying(50) NOT NULL,
    provider_name character varying(150) NOT NULL,
    provider_type public.account_provider_type_enum NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    configuration jsonb DEFAULT '{}'::jsonb NOT NULL,
    secret_reference character varying(500),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);

ALTER TABLE ONLY public.account_providers FORCE ROW LEVEL SECURITY;


--
-- Name: account_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    account_id uuid NOT NULL,
    previous_status public.account_status_enum,
    new_status public.account_status_enum NOT NULL,
    reason text,
    changed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.account_status_history FORCE ROW LEVEL SECURITY;


--
-- Name: beneficiaries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.beneficiaries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    beneficiary_type public.beneficiary_type_enum NOT NULL,
    name character varying(200) NOT NULL,
    account_number character varying(100),
    bank_code character varying(20),
    bank_name character varying(150),
    phone_number character varying(30),
    nickname character varying(100),
    is_verified boolean DEFAULT false NOT NULL,
    is_favourite boolean DEFAULT false NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);

ALTER TABLE ONLY public.beneficiaries FORCE ROW LEVEL SECURITY;


--
-- Name: bill_catalogue_import_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bill_catalogue_import_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    import_id uuid NOT NULL,
    category_code character varying(100) NOT NULL,
    category_name character varying(200) NOT NULL,
    category character varying(30) NOT NULL,
    biller_code character varying(100) NOT NULL,
    biller_name character varying(200) NOT NULL,
    product_code character varying(100) NOT NULL,
    product_name character varying(200) NOT NULL,
    description text,
    denomination_type character varying(20) NOT NULL,
    amount bigint,
    min_amount bigint,
    max_amount bigint,
    currency character(3) NOT NULL,
    source_payload jsonb NOT NULL,
    evidence_hash character(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bill_catalogue_import_items_category_check CHECK (((category)::text = ANY (ARRAY[('AIRTIME'::character varying)::text, ('DATA'::character varying)::text, ('ELECTRICITY'::character varying)::text, ('CABLE_TV'::character varying)::text, ('INTERNET'::character varying)::text]))),
    CONSTRAINT bill_catalogue_import_items_currency_check CHECK ((currency = 'NGN'::bpchar)),
    CONSTRAINT bill_catalogue_import_items_denomination_type_check CHECK (((denomination_type)::text = ANY (ARRAY[('FIXED'::character varying)::text, ('VARIABLE'::character varying)::text]))),
    CONSTRAINT chk_bill_catalogue_item_amounts CHECK (((((denomination_type)::text = 'FIXED'::text) AND (amount > 0) AND (min_amount IS NULL) AND (max_amount IS NULL)) OR (((denomination_type)::text = 'VARIABLE'::text) AND (amount IS NULL) AND (min_amount > 0) AND (max_amount >= min_amount))))
);

ALTER TABLE ONLY public.bill_catalogue_import_items FORCE ROW LEVEL SECURITY;


--
-- Name: bill_catalogue_imports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bill_catalogue_imports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    provider_code character varying(50) NOT NULL,
    status character varying(20) NOT NULL,
    idempotency_key character varying(255) NOT NULL,
    request_hash character(64) NOT NULL,
    source_hash character(64),
    category_count integer DEFAULT 0 NOT NULL,
    product_count integer DEFAULT 0 NOT NULL,
    failure_code character varying(100),
    started_by uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    raw_evidence_expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bill_catalogue_imports_category_count_check CHECK ((category_count >= 0)),
    CONSTRAINT bill_catalogue_imports_product_count_check CHECK ((product_count >= 0)),
    CONSTRAINT bill_catalogue_imports_provider_code_check CHECK (((provider_code)::text = 'MONNIFY'::text)),
    CONSTRAINT bill_catalogue_imports_status_check CHECK (((status)::text = ANY (ARRAY[('IMPORTING'::character varying)::text, ('DRAFT'::character varying)::text, ('FAILED'::character varying)::text, ('PUBLISHED'::character varying)::text])))
);

ALTER TABLE ONLY public.bill_catalogue_imports FORCE ROW LEVEL SECURITY;


--
-- Name: bill_catalogue_publications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bill_catalogue_publications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    import_id uuid NOT NULL,
    provider_code character varying(50) NOT NULL,
    catalogue_version integer NOT NULL,
    approval_id uuid NOT NULL,
    approval_payload_hash character(64) NOT NULL,
    published_by uuid NOT NULL,
    idempotency_key character varying(255) NOT NULL,
    product_count integer NOT NULL,
    published_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bill_catalogue_publications_catalogue_version_check CHECK ((catalogue_version > 0)),
    CONSTRAINT bill_catalogue_publications_product_count_check CHECK ((product_count > 0)),
    CONSTRAINT bill_catalogue_publications_provider_code_check CHECK (((provider_code)::text = 'MONNIFY'::text))
);

ALTER TABLE ONLY public.bill_catalogue_publications FORCE ROW LEVEL SECURITY;


--
-- Name: bill_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bill_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(150) NOT NULL,
    category public.bill_category_enum NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bill_customer_validations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bill_customer_validations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    product_id uuid NOT NULL,
    customer_identifier character varying(200) NOT NULL,
    normalized_customer_name character varying(200),
    provider_code character varying(50) NOT NULL,
    provider_reference character varying(200),
    routing_decision_id uuid NOT NULL,
    idempotency_key character varying(255) NOT NULL,
    request_hash character(64) NOT NULL,
    evidence_hash character(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bill_customer_validations_check CHECK ((expires_at > created_at))
);

ALTER TABLE ONLY public.bill_customer_validations FORCE ROW LEVEL SECURITY;


--
-- Name: bill_payment_quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bill_payment_quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    product_id uuid NOT NULL,
    validation_id uuid,
    amount bigint NOT NULL,
    fee_amount bigint NOT NULL,
    tax_amount bigint NOT NULL,
    cashback_amount bigint NOT NULL,
    total_debit bigint NOT NULL,
    currency character(3) NOT NULL,
    catalogue_version integer NOT NULL,
    provider_code character varying(50) NOT NULL,
    routing_decision_id uuid NOT NULL,
    idempotency_key character varying(255) NOT NULL,
    request_hash character(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bill_payment_quotes_amount_check CHECK ((amount > 0)),
    CONSTRAINT bill_payment_quotes_cashback_amount_check CHECK ((cashback_amount >= 0)),
    CONSTRAINT bill_payment_quotes_catalogue_version_check CHECK ((catalogue_version > 0)),
    CONSTRAINT bill_payment_quotes_check CHECK ((total_debit = ((amount + fee_amount) + tax_amount))),
    CONSTRAINT bill_payment_quotes_check1 CHECK ((expires_at > created_at)),
    CONSTRAINT bill_payment_quotes_currency_check CHECK ((currency = 'NGN'::bpchar)),
    CONSTRAINT bill_payment_quotes_fee_amount_check CHECK ((fee_amount >= 0)),
    CONSTRAINT bill_payment_quotes_tax_amount_check CHECK ((tax_amount >= 0))
);

ALTER TABLE ONLY public.bill_payment_quotes FORCE ROW LEVEL SECURITY;


--
-- Name: bill_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bill_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    provider_id uuid NOT NULL,
    product_code character varying(100) NOT NULL,
    product_name character varying(200) NOT NULL,
    description text,
    amount bigint,
    min_amount bigint,
    max_amount bigint,
    currency character(3) DEFAULT 'NGN'::bpchar NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    category_id uuid NOT NULL,
    catalogue_version integer DEFAULT 1 NOT NULL,
    published_at timestamp with time zone,
    effective_from timestamp with time zone DEFAULT now() NOT NULL,
    effective_to timestamp with time zone,
    denomination_type character varying(20) DEFAULT 'VARIABLE'::character varying NOT NULL,
    fee_amount bigint DEFAULT 0 NOT NULL,
    tax_amount bigint DEFAULT 0 NOT NULL,
    cashback_amount bigint DEFAULT 0 NOT NULL,
    CONSTRAINT bill_products_cashback_amount_check CHECK ((cashback_amount >= 0)),
    CONSTRAINT bill_products_catalogue_version_check CHECK ((catalogue_version > 0)),
    CONSTRAINT bill_products_denomination_type_check CHECK (((denomination_type)::text = ANY (ARRAY[('FIXED'::character varying)::text, ('VARIABLE'::character varying)::text]))),
    CONSTRAINT bill_products_fee_amount_check CHECK ((fee_amount >= 0)),
    CONSTRAINT bill_products_tax_amount_check CHECK ((tax_amount >= 0)),
    CONSTRAINT chk_bill_product_amount CHECK (((amount IS NULL) OR ((amount)::numeric >= (0)::numeric))),
    CONSTRAINT chk_bill_product_currency CHECK ((currency ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT chk_bill_product_denomination CHECK (((((denomination_type)::text = 'FIXED'::text) AND (amount IS NOT NULL) AND (min_amount IS NULL) AND (max_amount IS NULL)) OR (((denomination_type)::text = 'VARIABLE'::text) AND (amount IS NULL) AND (min_amount IS NOT NULL) AND (max_amount IS NOT NULL)))),
    CONSTRAINT chk_bill_product_ngn CHECK ((currency = 'NGN'::bpchar)),
    CONSTRAINT chk_bill_product_range CHECK ((((min_amount IS NULL) OR ((min_amount)::numeric >= (0)::numeric)) AND ((max_amount IS NULL) OR (((max_amount)::numeric >= (0)::numeric) AND ((min_amount IS NULL) OR ((max_amount)::numeric >= (min_amount)::numeric))))))
);

ALTER TABLE ONLY public.bill_products FORCE ROW LEVEL SECURITY;


--
-- Name: bill_provider_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bill_provider_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    bill_transaction_id uuid NOT NULL,
    provider_code character varying(50) NOT NULL,
    provider_transaction_id character varying(200) NOT NULL,
    provider_reference character varying(200),
    status character varying(50),
    raw_response jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    evidence_hash character(64),
    raw_evidence_expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL
);

ALTER TABLE ONLY public.bill_provider_transactions FORCE ROW LEVEL SECURITY;


--
-- Name: bill_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bill_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    category_id uuid NOT NULL,
    provider_code character varying(50) NOT NULL,
    provider_name character varying(150) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    configuration jsonb DEFAULT '{}'::jsonb NOT NULL,
    secret_reference character varying(500),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    provider_payable_ledger_account_id uuid,
    revenue_ledger_account_id uuid,
    tax_ledger_account_id uuid,
    cashback_ledger_account_id uuid
);

ALTER TABLE ONLY public.bill_providers FORCE ROW LEVEL SECURITY;


--
-- Name: COLUMN bill_providers.provider_payable_ledger_account_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_providers.provider_payable_ledger_account_id IS 'Opaque account identifier owned and validated by Ledger; never a cross-database foreign key.';


--
-- Name: bill_transaction_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bill_transaction_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    bill_transaction_id uuid NOT NULL,
    attempt_number integer NOT NULL,
    status public.payment_attempt_status_enum DEFAULT 'PENDING'::public.payment_attempt_status_enum NOT NULL,
    provider_reference character varying(200),
    request_payload jsonb,
    response_payload jsonb,
    failure_code character varying(100),
    failure_reason text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    request_hash character(64),
    submission_state character varying(20) DEFAULT 'NOT_SENT'::character varying NOT NULL,
    outcome_class character varying(30) DEFAULT 'NOT_SUBMITTED'::character varying NOT NULL,
    next_inquiry_at timestamp with time zone,
    inquiry_attempts integer DEFAULT 0 NOT NULL,
    inquiry_lease_expires_at timestamp with time zone,
    evidence_hash character(64),
    raw_evidence_expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL,
    CONSTRAINT bill_transaction_attempts_inquiry_attempts_check CHECK ((inquiry_attempts >= 0)),
    CONSTRAINT bill_transaction_attempts_outcome_class_check CHECK (((outcome_class)::text = ANY (ARRAY[('NOT_SUBMITTED'::character varying)::text, ('ACKNOWLEDGED_PENDING'::character varying)::text, ('AMBIGUOUS'::character varying)::text, ('FINAL_SUCCESS'::character varying)::text, ('FINAL_FAILURE'::character varying)::text, ('REVERSED'::character varying)::text]))),
    CONSTRAINT bill_transaction_attempts_submission_state_check CHECK (((submission_state)::text = ANY (ARRAY[('NOT_SENT'::character varying)::text, ('SUBMITTED'::character varying)::text, ('ACKNOWLEDGED'::character varying)::text]))),
    CONSTRAINT chk_bill_attempt_number CHECK ((attempt_number > 0))
);

ALTER TABLE ONLY public.bill_transaction_attempts FORCE ROW LEVEL SECURITY;


--
-- Name: bill_transaction_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bill_transaction_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    bill_transaction_id uuid NOT NULL,
    previous_status public.bill_transaction_status_enum,
    new_status public.bill_transaction_status_enum NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.bill_transaction_status_history FORCE ROW LEVEL SECURITY;


--
-- Name: bill_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bill_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    source_account_id uuid,
    category_id uuid NOT NULL,
    provider_id uuid NOT NULL,
    product_id uuid,
    reference character varying(100) NOT NULL,
    customer_identifier character varying(200) NOT NULL,
    amount bigint NOT NULL,
    fee_amount bigint DEFAULT 0 NOT NULL,
    currency character(3) DEFAULT 'NGN'::bpchar NOT NULL,
    status public.bill_transaction_status_enum DEFAULT 'PENDING'::public.bill_transaction_status_enum NOT NULL,
    channel public.payment_channel_enum NOT NULL,
    provider_reference character varying(200),
    request_payload jsonb,
    response_payload jsonb,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    failure_code character varying(100),
    failure_reason text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    quote_id uuid,
    idempotency_key character varying(255),
    request_hash character(64),
    routing_decision_id uuid,
    provider_selection_version integer,
    ledger_hold_id uuid,
    ledger_transaction_id uuid,
    ledger_reversal_transaction_id uuid,
    source_ledger_account_id uuid,
    provider_payable_ledger_account_id uuid,
    tax_ledger_account_id uuid,
    revenue_ledger_account_id uuid,
    cashback_ledger_account_id uuid,
    tax_amount bigint DEFAULT 0 NOT NULL,
    cashback_amount bigint DEFAULT 0 NOT NULL,
    total_debit bigint,
    outcome_class character varying(30) DEFAULT 'NOT_SUBMITTED'::character varying NOT NULL,
    next_inquiry_at timestamp with time zone,
    financial_record_retain_until timestamp with time zone DEFAULT (now() + '7 years'::interval) NOT NULL,
    CONSTRAINT bill_transactions_cashback_amount_check CHECK ((cashback_amount >= 0)),
    CONSTRAINT bill_transactions_outcome_class_check CHECK (((outcome_class)::text = ANY (ARRAY[('NOT_SUBMITTED'::character varying)::text, ('ACKNOWLEDGED_PENDING'::character varying)::text, ('AMBIGUOUS'::character varying)::text, ('FINAL_SUCCESS'::character varying)::text, ('FINAL_FAILURE'::character varying)::text, ('REVERSED'::character varying)::text]))),
    CONSTRAINT bill_transactions_tax_amount_check CHECK ((tax_amount >= 0)),
    CONSTRAINT chk_bill_total CHECK ((total_debit = ((amount + fee_amount) + tax_amount))),
    CONSTRAINT chk_bill_transaction_amount CHECK (((amount)::numeric > (0)::numeric)),
    CONSTRAINT chk_bill_transaction_currency CHECK ((currency ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT chk_bill_transaction_fee CHECK (((fee_amount)::numeric >= (0)::numeric)),
    CONSTRAINT chk_bill_transaction_ngn CHECK ((currency = 'NGN'::bpchar))
);

ALTER TABLE ONLY public.bill_transactions FORCE ROW LEVEL SECURITY;


--
-- Name: bill_webhooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bill_webhooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    provider_code character varying(50) NOT NULL,
    event_type character varying(100) NOT NULL,
    event_reference character varying(200),
    payload jsonb NOT NULL,
    signature character varying(500),
    status public.webhook_status_enum DEFAULT 'RECEIVED'::public.webhook_status_enum NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone,
    processing_error text,
    payload_hash character(64),
    signature_scheme character varying(50),
    signing_key_version character varying(100),
    raw_evidence_expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL
);

ALTER TABLE ONLY public.bill_webhooks FORCE ROW LEVEL SECURITY;


--
-- Name: financial_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.financial_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    provider_id uuid,
    account_type public.account_type_enum NOT NULL,
    account_number character varying(50),
    account_name character varying(200),
    bank_code character varying(20),
    bank_name character varying(150),
    currency character(3) DEFAULT 'NGN'::bpchar NOT NULL,
    status public.account_status_enum DEFAULT 'PENDING'::public.account_status_enum NOT NULL,
    provider_reference character varying(150),
    is_primary boolean DEFAULT false NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    ledger_account_id uuid,
    CONSTRAINT chk_account_currency CHECK ((currency ~ '^[A-Z]{3}$'::text))
);

ALTER TABLE ONLY public.financial_accounts FORCE ROW LEVEL SECURITY;


--
-- Name: payment_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    payment_id uuid NOT NULL,
    attempt_number integer NOT NULL,
    status public.payment_attempt_status_enum DEFAULT 'PENDING'::public.payment_attempt_status_enum NOT NULL,
    provider_code character varying(50),
    provider_reference character varying(150),
    request_payload jsonb,
    response_payload jsonb,
    failure_code character varying(100),
    failure_reason text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    routing_decision_id uuid,
    request_hash character(64),
    submission_state character varying(20) DEFAULT 'NOT_SENT'::character varying NOT NULL,
    outcome_certainty character varying(20) DEFAULT 'KNOWN'::character varying NOT NULL,
    outcome_class character varying(40) NOT NULL,
    inquiry_attempts integer DEFAULT 0 NOT NULL,
    next_inquiry_at timestamp with time zone,
    inquiry_lease_expires_at timestamp with time zone,
    last_inquiry_at timestamp with time zone,
    external_transfer_id uuid,
    CONSTRAINT chk_payment_attempt_number CHECK ((attempt_number > 0)),
    CONSTRAINT payment_attempts_inquiry_attempts_check CHECK ((inquiry_attempts >= 0)),
    CONSTRAINT payment_attempts_outcome_certainty_check CHECK (((outcome_certainty)::text = ANY (ARRAY[('KNOWN'::character varying)::text, ('AMBIGUOUS'::character varying)::text]))),
    CONSTRAINT payment_attempts_outcome_class_check CHECK (((outcome_class)::text = ANY (ARRAY[('NOT_SENT'::character varying)::text, ('DEFINITE_PRE_SUBMISSION_FAILURE'::character varying)::text, ('ACKNOWLEDGED_PENDING'::character varying)::text, ('AMBIGUOUS'::character varying)::text, ('FINAL_SUCCESS'::character varying)::text, ('FINAL_FAILURE'::character varying)::text, ('REVERSED'::character varying)::text]))),
    CONSTRAINT payment_attempts_submission_state_check CHECK (((submission_state)::text = ANY (ARRAY[('NOT_SENT'::character varying)::text, ('SUBMITTED'::character varying)::text, ('ACKNOWLEDGED'::character varying)::text])))
);

ALTER TABLE ONLY public.payment_attempts FORCE ROW LEVEL SECURITY;


--
-- Name: payment_collection_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_collection_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    collection_id uuid NOT NULL,
    previous_status character varying(30),
    new_status character varying(30) NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.payment_collection_status_history FORCE ROW LEVEL SECURITY;


--
-- Name: payment_collections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_collections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    financial_account_id uuid NOT NULL,
    payment_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    webhook_id uuid,
    provider_code character varying(50) NOT NULL,
    provider_reference character varying(200) NOT NULL,
    amount bigint NOT NULL,
    currency character(3) NOT NULL,
    payload_hash character(64) NOT NULL,
    status character varying(30) DEFAULT 'VERIFIED'::character varying NOT NULL,
    debit_ledger_account_id uuid NOT NULL,
    credit_ledger_account_id uuid NOT NULL,
    ledger_idempotency_key character varying(255) NOT NULL,
    ledger_transaction_id uuid,
    failure_code character varying(100),
    failure_reason text,
    provider_paid_at timestamp with time zone,
    posted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_collection_currency CHECK ((currency ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT payment_collections_amount_check CHECK ((amount > 0)),
    CONSTRAINT payment_collections_status_check CHECK (((status)::text = ANY (ARRAY[('VERIFIED'::character varying)::text, ('POSTING'::character varying)::text, ('POSTED'::character varying)::text, ('FAILED'::character varying)::text, ('MANUAL_REVIEW'::character varying)::text])))
);

ALTER TABLE ONLY public.payment_collections FORCE ROW LEVEL SECURITY;


--
-- Name: payment_disputes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_disputes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    payment_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    reason character varying(255) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'OPEN'::character varying NOT NULL,
    resolution text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    created_by uuid,
    updated_by uuid,
    CONSTRAINT chk_payment_dispute_status CHECK (((status)::text = ANY (ARRAY[('OPEN'::character varying)::text, ('UNDER_REVIEW'::character varying)::text, ('RESOLVED'::character varying)::text, ('REJECTED'::character varying)::text, ('CLOSED'::character varying)::text])))
);

ALTER TABLE ONLY public.payment_disputes FORCE ROW LEVEL SECURITY;


--
-- Name: payment_external_transfer_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_external_transfer_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    transfer_id uuid NOT NULL,
    previous_status character varying(30),
    new_status character varying(30) NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.payment_external_transfer_history FORCE ROW LEVEL SECURITY;


--
-- Name: payment_external_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_external_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    payment_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    source_account_id uuid NOT NULL,
    source_ledger_account_id uuid NOT NULL,
    settlement_ledger_account_id uuid NOT NULL,
    beneficiary_id uuid,
    beneficiary_name character varying(200) NOT NULL,
    destination_account_number character varying(100) NOT NULL,
    destination_bank_code character varying(20) NOT NULL,
    destination_bank_name character varying(150),
    destination_phone_number character varying(30),
    amount bigint NOT NULL,
    currency character(3) NOT NULL,
    narration character varying(100) NOT NULL,
    idempotency_key character varying(255) NOT NULL,
    request_hash character(64) NOT NULL,
    correlation_id uuid NOT NULL,
    status character varying(30) DEFAULT 'CREATED'::character varying NOT NULL,
    ledger_hold_id uuid,
    ledger_transaction_id uuid,
    active_attempt_id uuid,
    failure_code character varying(100),
    failure_reason text,
    reserved_at timestamp with time zone,
    submitted_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_external_currency CHECK ((currency ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT payment_external_transfers_amount_check CHECK ((amount > 0)),
    CONSTRAINT payment_external_transfers_status_check CHECK (((status)::text = ANY (ARRAY[('CREATED'::character varying)::text, ('RESERVED'::character varying)::text, ('SUBMITTING'::character varying)::text, ('PENDING'::character varying)::text, ('SUCCEEDED'::character varying)::text, ('FAILED'::character varying)::text, ('REVERSED'::character varying)::text, ('MANUAL_REVIEW'::character varying)::text])))
);

ALTER TABLE ONLY public.payment_external_transfers FORCE ROW LEVEL SECURITY;


--
-- Name: payment_fees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_fees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    payment_id uuid NOT NULL,
    fee_type public.fee_type_enum NOT NULL,
    amount bigint NOT NULL,
    currency character(3) DEFAULT 'NGN'::bpchar NOT NULL,
    fee_bearer public.fee_bearer_enum,
    description character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_payment_fee_amount CHECK (((amount)::numeric >= (0)::numeric)),
    CONSTRAINT chk_payment_fee_currency CHECK ((currency ~ '^[A-Z]{3}$'::text))
);

ALTER TABLE ONLY public.payment_fees FORCE ROW LEVEL SECURITY;


--
-- Name: payment_idempotency_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_idempotency_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    customer_id uuid,
    idempotency_key character varying(255) NOT NULL,
    request_hash character varying(128) NOT NULL,
    resource_type character varying(100) NOT NULL,
    resource_id uuid,
    response_status integer,
    response_body jsonb,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.payment_idempotency_keys FORCE ROW LEVEL SECURITY;


--
-- Name: payment_inbox_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_inbox_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    event_id uuid NOT NULL,
    source_service character varying(100) NOT NULL,
    event_type character varying(150) NOT NULL,
    event_version integer NOT NULL,
    aggregate_type character varying(100),
    aggregate_id uuid,
    correlation_id uuid,
    causation_id uuid,
    payload jsonb NOT NULL,
    headers jsonb DEFAULT '{}'::jsonb NOT NULL,
    status public.payment_inbox_status_enum DEFAULT 'RECEIVED'::public.payment_inbox_status_enum NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    processing_started_at timestamp with time zone,
    processed_at timestamp with time zone,
    next_attempt_at timestamp with time zone,
    last_error_code character varying(100),
    last_error_message text,
    CONSTRAINT payment_inbox_events_attempt_count_check CHECK ((attempt_count >= 0)),
    CONSTRAINT payment_inbox_events_event_version_check CHECK ((event_version > 0))
);

ALTER TABLE ONLY public.payment_inbox_events FORCE ROW LEVEL SECURITY;


--
-- Name: payment_internal_transfer_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_internal_transfer_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    transfer_id uuid NOT NULL,
    previous_status character varying(30),
    new_status character varying(30) NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.payment_internal_transfer_history FORCE ROW LEVEL SECURITY;


--
-- Name: payment_internal_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_internal_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    payment_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    source_account_id uuid NOT NULL,
    destination_account_id uuid NOT NULL,
    source_ledger_account_id uuid NOT NULL,
    destination_ledger_account_id uuid NOT NULL,
    amount bigint NOT NULL,
    currency character(3) NOT NULL,
    narration character varying(140) NOT NULL,
    idempotency_key character varying(255) NOT NULL,
    request_hash character(64) NOT NULL,
    correlation_id uuid NOT NULL,
    status character varying(30) DEFAULT 'CREATED'::character varying NOT NULL,
    ledger_hold_id uuid,
    ledger_transaction_id uuid,
    failure_code character varying(100),
    failure_reason text,
    reserved_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_internal_transfer_currency CHECK ((currency ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT chk_internal_transfer_distinct_accounts CHECK (((source_account_id <> destination_account_id) AND (source_ledger_account_id <> destination_ledger_account_id))),
    CONSTRAINT payment_internal_transfers_amount_check CHECK ((amount > 0)),
    CONSTRAINT payment_internal_transfers_status_check CHECK (((status)::text = ANY (ARRAY[('CREATED'::character varying)::text, ('RESERVED'::character varying)::text, ('CAPTURING'::character varying)::text, ('SUCCEEDED'::character varying)::text, ('FAILED'::character varying)::text, ('MANUAL_REVIEW'::character varying)::text])))
);

ALTER TABLE ONLY public.payment_internal_transfers FORCE ROW LEVEL SECURITY;


--
-- Name: payment_outbox_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_outbox_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    aggregate_type character varying(100) NOT NULL,
    aggregate_id uuid NOT NULL,
    event_type character varying(150) NOT NULL,
    event_version integer DEFAULT 1 NOT NULL,
    payload jsonb NOT NULL,
    idempotency_key character varying(255),
    correlation_id uuid,
    causation_id uuid,
    status character varying(30) DEFAULT 'PENDING'::character varying NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    available_at timestamp with time zone DEFAULT now() NOT NULL,
    published_at timestamp with time zone,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_outbox_event_version CHECK ((event_version > 0)),
    CONSTRAINT chk_outbox_retry_count CHECK ((retry_count >= 0)),
    CONSTRAINT chk_outbox_status CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('PUBLISHED'::character varying)::text, ('FAILED'::character varying)::text])))
);

ALTER TABLE ONLY public.payment_outbox_events FORCE ROW LEVEL SECURITY;


--
-- Name: payment_parties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_parties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    payment_id uuid NOT NULL,
    party_role character varying(20) NOT NULL,
    customer_id uuid,
    name character varying(200),
    account_number character varying(100),
    bank_code character varying(20),
    bank_name character varying(150),
    phone_number character varying(30),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_payment_party_role CHECK (((party_role)::text = ANY (ARRAY[('SENDER'::character varying)::text, ('RECIPIENT'::character varying)::text, ('PLATFORM'::character varying)::text, ('TENANT'::character varying)::text, ('PROVIDER'::character varying)::text])))
);

ALTER TABLE ONLY public.payment_parties FORCE ROW LEVEL SECURITY;


--
-- Name: payment_provider_routing_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_provider_routing_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    capability character varying(50) NOT NULL,
    currency character(3) NOT NULL,
    provider_code character varying(50) NOT NULL,
    selection_id uuid NOT NULL,
    selection_version integer NOT NULL,
    routing_reason character varying(40) NOT NULL,
    request_hash character(64) NOT NULL,
    correlation_id uuid NOT NULL,
    idempotency_key character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_routing_currency CHECK ((currency ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT payment_provider_routing_decisions_routing_reason_check CHECK (((routing_reason)::text = ANY (ARRAY[('PREFERRED'::character varying)::text, ('CIRCUIT_OPEN'::character varying)::text, ('PRE_SUBMISSION_FAILURE'::character varying)::text]))),
    CONSTRAINT payment_provider_routing_decisions_selection_version_check CHECK ((selection_version > 0))
);

ALTER TABLE ONLY public.payment_provider_routing_decisions FORCE ROW LEVEL SECURITY;


--
-- Name: payment_provider_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_provider_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    payment_id uuid NOT NULL,
    provider_code character varying(50) NOT NULL,
    provider_transaction_id character varying(200) NOT NULL,
    provider_reference character varying(200),
    status character varying(50),
    raw_response jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.payment_provider_transactions FORCE ROW LEVEL SECURITY;


--
-- Name: payment_reconciliation_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_reconciliation_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    payment_id uuid,
    platform_revenue_settlement_id uuid,
    resource_type character varying(100) DEFAULT 'PAYMENT'::character varying NOT NULL,
    resource_id uuid,
    provider_code character varying(50) NOT NULL,
    provider_reference character varying(200),
    provider_amount bigint,
    internal_amount bigint,
    provider_fee_amount bigint,
    expected_net_amount bigint,
    actual_settlement_amount bigint,
    fee_bearer public.fee_bearer_enum,
    currency character(3),
    status public.reconciliation_status_enum NOT NULL,
    difference_amount bigint,
    reconciliation_date date NOT NULL,
    provider_payload jsonb,
    resolution_notes text,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    run_id uuid,
    evidence_hash character(64),
    discrepancy_key character(64),
    financially_consequential boolean DEFAULT true NOT NULL,
    retain_until timestamp with time zone DEFAULT (now() + '7 years'::interval) NOT NULL,
    CONSTRAINT chk_reconciliation_amounts CHECK ((((provider_amount IS NULL) OR ((provider_amount)::numeric >= (0)::numeric)) AND ((internal_amount IS NULL) OR ((internal_amount)::numeric >= (0)::numeric)) AND ((provider_fee_amount IS NULL) OR ((provider_fee_amount)::numeric >= (0)::numeric)) AND ((expected_net_amount IS NULL) OR ((expected_net_amount)::numeric >= (0)::numeric)) AND ((actual_settlement_amount IS NULL) OR ((actual_settlement_amount)::numeric >= (0)::numeric)))),
    CONSTRAINT chk_reconciliation_currency CHECK (((currency IS NULL) OR (currency ~ '^[A-Z]{3}$'::text))),
    CONSTRAINT chk_reconciliation_resource CHECK (((payment_id IS NOT NULL) OR (platform_revenue_settlement_id IS NOT NULL) OR (resource_id IS NOT NULL)))
);

ALTER TABLE ONLY public.payment_reconciliation_records FORCE ROW LEVEL SECURITY;


--
-- Name: payment_reconciliation_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_reconciliation_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    provider_code character varying(50) NOT NULL,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    source_object_reference character varying(500) NOT NULL,
    source_hash character(64) NOT NULL,
    idempotency_key character varying(255) NOT NULL,
    status character varying(30) DEFAULT 'PENDING'::character varying NOT NULL,
    item_count integer DEFAULT 0 NOT NULL,
    matched_count integer DEFAULT 0 NOT NULL,
    exception_count integer DEFAULT 0 NOT NULL,
    worker_id character varying(100),
    lease_expires_at timestamp with time zone,
    retry_count integer DEFAULT 0 NOT NULL,
    last_error text,
    raw_evidence_expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL,
    financial_record_retain_until timestamp with time zone DEFAULT (now() + '7 years'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT chk_reconciliation_period CHECK ((period_end > period_start)),
    CONSTRAINT payment_reconciliation_runs_exception_count_check CHECK ((exception_count >= 0)),
    CONSTRAINT payment_reconciliation_runs_item_count_check CHECK ((item_count >= 0)),
    CONSTRAINT payment_reconciliation_runs_matched_count_check CHECK ((matched_count >= 0)),
    CONSTRAINT payment_reconciliation_runs_retry_count_check CHECK ((retry_count >= 0)),
    CONSTRAINT payment_reconciliation_runs_status_check CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('PROCESSING'::character varying)::text, ('COMPLETED'::character varying)::text, ('FAILED'::character varying)::text, ('DEAD_LETTER'::character varying)::text])))
);

ALTER TABLE ONLY public.payment_reconciliation_runs FORCE ROW LEVEL SECURITY;


--
-- Name: payment_reversal_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_reversal_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    reversal_id uuid NOT NULL,
    previous_status public.reversal_status_enum,
    new_status public.reversal_status_enum NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.payment_reversal_history FORCE ROW LEVEL SECURITY;


--
-- Name: payment_reversals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_reversals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    payment_id uuid NOT NULL,
    amount bigint NOT NULL,
    currency character(3) DEFAULT 'NGN'::bpchar NOT NULL,
    reason text,
    status public.reversal_status_enum DEFAULT 'PENDING'::public.reversal_status_enum NOT NULL,
    provider_reference character varying(200),
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    created_by uuid,
    idempotency_key character varying(255),
    request_hash character(64),
    original_ledger_transaction_id uuid,
    reversal_ledger_transaction_id uuid,
    approval_id uuid,
    automated_rule_id character varying(100),
    failure_code character varying(100),
    failure_reason text,
    CONSTRAINT chk_reversal_amount CHECK (((amount)::numeric > (0)::numeric)),
    CONSTRAINT chk_reversal_authority CHECK (((((approval_id IS NOT NULL))::integer + ((automated_rule_id IS NOT NULL))::integer) = 1)),
    CONSTRAINT chk_reversal_currency CHECK ((currency ~ '^[A-Z]{3}$'::text))
);

ALTER TABLE ONLY public.payment_reversals FORCE ROW LEVEL SECURITY;


--
-- Name: payment_service_payout_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_service_payout_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    payout_id uuid NOT NULL,
    attempt_number integer NOT NULL,
    provider_code character varying(100) NOT NULL,
    provider_reference character varying(255),
    submission_state character varying(30) NOT NULL,
    outcome_certainty character varying(20) NOT NULL,
    request_hash character(64) NOT NULL,
    evidence_hash character(64),
    next_inquiry_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    retention_until date DEFAULT (CURRENT_DATE + 2557) NOT NULL,
    legal_hold boolean DEFAULT false NOT NULL,
    CONSTRAINT payment_service_payout_attempts_attempt_number_check CHECK ((attempt_number > 0)),
    CONSTRAINT payment_service_payout_attempts_outcome_certainty_check CHECK (((outcome_certainty)::text = ANY (ARRAY[('CERTAIN'::character varying)::text, ('AMBIGUOUS'::character varying)::text])))
);

ALTER TABLE ONLY public.payment_service_payout_attempts FORCE ROW LEVEL SECURITY;


--
-- Name: payment_service_payouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_service_payouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    source_service character varying(100) NOT NULL,
    source_resource_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    ledger_transaction_id uuid NOT NULL,
    destination_reference character varying(255) NOT NULL,
    amount bigint NOT NULL,
    currency character(3) NOT NULL,
    narration character varying(140) NOT NULL,
    status character varying(30) DEFAULT 'CREATED'::character varying NOT NULL,
    routing_decision_id uuid,
    active_attempt_id uuid,
    idempotency_key character varying(255) NOT NULL,
    request_hash character(64) NOT NULL,
    correlation_id uuid NOT NULL,
    next_inquiry_at timestamp with time zone,
    failure_code character varying(100),
    failure_reason text,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    retention_until date DEFAULT (CURRENT_DATE + 2557) NOT NULL,
    legal_hold boolean DEFAULT false NOT NULL,
    CONSTRAINT payment_service_payouts_amount_check CHECK ((amount > 0)),
    CONSTRAINT payment_service_payouts_currency_check CHECK ((currency = 'NGN'::bpchar)),
    CONSTRAINT payment_service_payouts_status_check CHECK (((status)::text = ANY (ARRAY[('CREATED'::character varying)::text, ('SUBMITTING'::character varying)::text, ('PENDING'::character varying)::text, ('SUCCEEDED'::character varying)::text, ('FAILED'::character varying)::text, ('REVERSED'::character varying)::text, ('MANUAL_REVIEW'::character varying)::text])))
);

ALTER TABLE ONLY public.payment_service_payouts FORCE ROW LEVEL SECURITY;


--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    customer_id uuid,
    source_account_id uuid,
    beneficiary_id uuid,
    payment_type public.payment_type_enum NOT NULL,
    channel public.payment_channel_enum NOT NULL,
    amount bigint NOT NULL,
    currency character(3) DEFAULT 'NGN'::bpchar NOT NULL,
    status public.payment_status_enum DEFAULT 'PENDING'::public.payment_status_enum NOT NULL,
    reference character varying(100) NOT NULL,
    narration character varying(500),
    idempotency_key character varying(255),
    correlation_id uuid,
    causation_id uuid,
    request_id uuid,
    source_service character varying(100),
    source_resource_type character varying(100),
    source_resource_id uuid,
    source_reference character varying(255),
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone,
    failure_code character varying(100),
    failure_reason text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    CONSTRAINT chk_payment_amount CHECK (((amount)::numeric > (0)::numeric)),
    CONSTRAINT chk_payment_currency CHECK ((currency ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT chk_payment_customer_scope CHECK (((customer_id IS NOT NULL) OR (payment_type = ANY (ARRAY['PAYOUT'::public.payment_type_enum, 'PLATFORM_REVENUE_SETTLEMENT'::public.payment_type_enum, 'PLATFORM_REVENUE_REFUND'::public.payment_type_enum]))))
);

ALTER TABLE ONLY public.payment_transactions FORCE ROW LEVEL SECURITY;


--
-- Name: payment_webhooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_webhooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    provider_code character varying(50) NOT NULL,
    event_type character varying(100) NOT NULL,
    event_reference character varying(200) NOT NULL,
    payload jsonb NOT NULL,
    status public.webhook_status_enum DEFAULT 'RECEIVED'::public.webhook_status_enum NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone,
    processing_error text,
    payload_hash character(64) NOT NULL,
    signature_verified boolean DEFAULT false NOT NULL,
    signature_hash character(64),
    processing_attempts integer DEFAULT 0 NOT NULL,
    processing_started_at timestamp with time zone,
    lease_expires_at timestamp with time zone,
    last_attempt_at timestamp with time zone,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL,
    signature_scheme character varying(50) NOT NULL,
    credential_key_version character varying(100) NOT NULL,
    CONSTRAINT payment_webhooks_processing_attempts_check CHECK ((processing_attempts >= 0))
);

ALTER TABLE ONLY public.payment_webhooks FORCE ROW LEVEL SECURITY;


--
-- Name: platform_revenue_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_revenue_adjustments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    revenue_event_id uuid NOT NULL,
    adjustment_type public.revenue_adjustment_type_enum NOT NULL,
    amount bigint NOT NULL,
    currency character(3) DEFAULT 'NGN'::bpchar NOT NULL,
    reason_code character varying(100),
    reason text NOT NULL,
    ledger_posting_status public.ledger_posting_status_enum DEFAULT 'NOT_REQUESTED'::public.ledger_posting_status_enum NOT NULL,
    ledger_transaction_id uuid,
    idempotency_key character varying(255) NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_platform_revenue_adjustment_amount CHECK (((amount)::numeric > (0)::numeric)),
    CONSTRAINT chk_platform_revenue_adjustment_currency CHECK ((currency ~ '^[A-Z]{3}$'::text))
);

ALTER TABLE ONLY public.platform_revenue_adjustments FORCE ROW LEVEL SECURITY;


--
-- Name: TABLE platform_revenue_adjustments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.platform_revenue_adjustments IS 'Controlled credit/debit/correction/reversal adjustments against platform revenue events.';


--
-- Name: platform_revenue_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_revenue_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    revenue_model public.platform_revenue_model_enum NOT NULL,
    revenue_type public.platform_revenue_type_enum NOT NULL,
    source_service character varying(100) NOT NULL,
    source_event_type character varying(150) NOT NULL,
    source_reference character varying(255) NOT NULL,
    source_transaction_id uuid,
    customer_id uuid,
    loan_id uuid,
    savings_id uuid,
    bill_transaction_id uuid,
    payment_id uuid,
    commercial_agreement_id uuid,
    revenue_share_rule_id uuid,
    calculation_basis character varying(100) NOT NULL,
    basis_amount bigint NOT NULL,
    percentage_rate numeric(12,6),
    fixed_amount bigint,
    gross_revenue_amount bigint NOT NULL,
    fee_amount bigint DEFAULT 0 NOT NULL,
    tax_amount bigint DEFAULT 0 NOT NULL,
    net_revenue_amount bigint NOT NULL,
    currency character(3) DEFAULT 'NGN'::bpchar NOT NULL,
    status public.platform_revenue_status_enum DEFAULT 'CALCULATED'::public.platform_revenue_status_enum NOT NULL,
    settlement_status public.platform_revenue_settlement_status_enum DEFAULT 'UNSETTLED'::public.platform_revenue_settlement_status_enum NOT NULL,
    ledger_posting_status public.ledger_posting_status_enum DEFAULT 'NOT_REQUESTED'::public.ledger_posting_status_enum NOT NULL,
    ledger_transaction_id uuid,
    ledger_transaction_reference character varying(150),
    idempotency_key character varying(255) NOT NULL,
    correlation_id uuid,
    causation_id uuid,
    request_id uuid,
    effective_at timestamp with time zone DEFAULT now() NOT NULL,
    earned_at timestamp with time zone,
    reversal_of_event_id uuid,
    reversed_by_event_id uuid,
    reversed_at timestamp with time zone,
    reversal_reason text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_platform_revenue_amounts CHECK ((((gross_revenue_amount)::numeric >= (0)::numeric) AND ((fee_amount)::numeric >= (0)::numeric) AND ((tax_amount)::numeric >= (0)::numeric) AND ((net_revenue_amount)::numeric >= (0)::numeric) AND ((net_revenue_amount)::numeric = (((gross_revenue_amount)::numeric - (fee_amount)::numeric) - (tax_amount)::numeric)))),
    CONSTRAINT chk_platform_revenue_basis_amount CHECK (((basis_amount)::numeric >= (0)::numeric)),
    CONSTRAINT chk_platform_revenue_currency CHECK ((currency ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT chk_platform_revenue_earned_at CHECK (((status <> 'EARNED'::public.platform_revenue_status_enum) OR (earned_at IS NOT NULL))),
    CONSTRAINT chk_platform_revenue_fixed CHECK (((fixed_amount IS NULL) OR ((fixed_amount)::numeric >= (0)::numeric))),
    CONSTRAINT chk_platform_revenue_percentage CHECK (((percentage_rate IS NULL) OR ((percentage_rate >= (0)::numeric) AND (percentage_rate <= (100)::numeric)))),
    CONSTRAINT chk_platform_revenue_reversal CHECK (((status <> 'REVERSED'::public.platform_revenue_status_enum) OR ((reversed_by_event_id IS NOT NULL) AND (reversed_at IS NOT NULL)))),
    CONSTRAINT chk_platform_revenue_reversal_links CHECK (((reversal_of_event_id IS NULL) OR (reversal_of_event_id <> id)))
);

ALTER TABLE ONLY public.platform_revenue_events FORCE ROW LEVEL SECURITY;


--
-- Name: TABLE platform_revenue_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.platform_revenue_events IS 'Transactional snapshot of Parc revenue earned from tenant activity. Commercial configuration is mastered in parc_tenant_admin; accounting truth is mastered in parc_ledger.';


--
-- Name: COLUMN platform_revenue_events.revenue_share_rule_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.platform_revenue_events.revenue_share_rule_id IS 'Logical reference to the effective tenant_revenue_share_rules row in parc_tenant_admin. No cross-database FK.';


--
-- Name: COLUMN platform_revenue_events.ledger_transaction_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.platform_revenue_events.ledger_transaction_id IS 'Logical reference to authoritative accounting transaction in parc_ledger. No cross-database FK.';


--
-- Name: platform_revenue_settlement_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_revenue_settlement_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    settlement_id uuid NOT NULL,
    revenue_event_id uuid NOT NULL,
    amount bigint NOT NULL,
    currency character(3) DEFAULT 'NGN'::bpchar NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_platform_revenue_settlement_item_amount CHECK (((amount)::numeric > (0)::numeric)),
    CONSTRAINT chk_platform_revenue_settlement_item_currency CHECK ((currency ~ '^[A-Z]{3}$'::text))
);

ALTER TABLE ONLY public.platform_revenue_settlement_items FORCE ROW LEVEL SECURITY;


--
-- Name: TABLE platform_revenue_settlement_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.platform_revenue_settlement_items IS 'Maps earned platform revenue events into a Parc revenue settlement.';


--
-- Name: platform_revenue_settlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_revenue_settlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    settlement_reference character varying(100) NOT NULL,
    currency character(3) DEFAULT 'NGN'::bpchar NOT NULL,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    gross_revenue_amount bigint DEFAULT 0 NOT NULL,
    adjustment_amount bigint DEFAULT 0 NOT NULL,
    settlement_fee_amount bigint DEFAULT 0 NOT NULL,
    tax_amount bigint DEFAULT 0 NOT NULL,
    net_settlement_amount bigint DEFAULT 0 NOT NULL,
    fee_bearer public.fee_bearer_enum DEFAULT 'TENANT'::public.fee_bearer_enum NOT NULL,
    status public.revenue_settlement_status_enum DEFAULT 'PENDING'::public.revenue_settlement_status_enum NOT NULL,
    settlement_configuration_id uuid,
    destination_account_reference character varying(255),
    destination_bank_code character varying(50),
    destination_account_name character varying(200),
    payment_id uuid,
    provider_code character varying(50),
    provider_reference character varying(200),
    ledger_posting_status public.ledger_posting_status_enum DEFAULT 'NOT_REQUESTED'::public.ledger_posting_status_enum NOT NULL,
    ledger_transaction_id uuid,
    ledger_transaction_reference character varying(150),
    idempotency_key character varying(255) NOT NULL,
    correlation_id uuid,
    request_id uuid,
    initiated_at timestamp with time zone,
    processing_at timestamp with time zone,
    completed_at timestamp with time zone,
    failure_code character varying(100),
    failure_reason text,
    retry_count integer DEFAULT 0 NOT NULL,
    next_retry_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    CONSTRAINT chk_platform_revenue_settlement_amounts CHECK ((((gross_revenue_amount)::numeric >= (0)::numeric) AND ((settlement_fee_amount)::numeric >= (0)::numeric) AND ((tax_amount)::numeric >= (0)::numeric) AND ((net_settlement_amount)::numeric >= (0)::numeric) AND ((net_settlement_amount)::numeric = ((((gross_revenue_amount)::numeric + (adjustment_amount)::numeric) - (settlement_fee_amount)::numeric) - (tax_amount)::numeric)))),
    CONSTRAINT chk_platform_revenue_settlement_completion CHECK (((status <> 'SETTLED'::public.revenue_settlement_status_enum) OR ((payment_id IS NOT NULL) AND (completed_at IS NOT NULL)))),
    CONSTRAINT chk_platform_revenue_settlement_currency CHECK ((currency ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT chk_platform_revenue_settlement_period CHECK ((period_end >= period_start)),
    CONSTRAINT chk_platform_revenue_settlement_retry CHECK ((retry_count >= 0))
);

ALTER TABLE ONLY public.platform_revenue_settlements FORCE ROW LEVEL SECURITY;


--
-- Name: TABLE platform_revenue_settlements; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.platform_revenue_settlements IS 'Operational settlement batches that fund Parc. The actual transfer is represented by payment_transactions.';


--
-- Name: COLUMN platform_revenue_settlements.settlement_configuration_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.platform_revenue_settlements.settlement_configuration_id IS 'Logical reference to tenant_revenue_settlement_configurations in parc_tenant_admin. No cross-database FK.';


--
-- Name: COLUMN platform_revenue_settlements.ledger_transaction_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.platform_revenue_settlements.ledger_transaction_id IS 'Logical reference to cash-settlement accounting transaction in parc_ledger. No cross-database FK.';


--
-- Name: platform_revenue_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_revenue_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    revenue_event_id uuid NOT NULL,
    share_basis_amount bigint NOT NULL,
    parc_share_rate numeric(12,6) NOT NULL,
    parc_share_amount bigint NOT NULL,
    tenant_retained_amount bigint,
    provider_share_amount bigint DEFAULT 0 NOT NULL,
    partner_share_amount bigint DEFAULT 0 NOT NULL,
    currency character(3) DEFAULT 'NGN'::bpchar NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_platform_revenue_share_amounts CHECK ((((parc_share_amount)::numeric >= (0)::numeric) AND ((tenant_retained_amount IS NULL) OR ((tenant_retained_amount)::numeric >= (0)::numeric)) AND ((provider_share_amount)::numeric >= (0)::numeric) AND ((partner_share_amount)::numeric >= (0)::numeric))),
    CONSTRAINT chk_platform_revenue_share_basis CHECK (((share_basis_amount)::numeric >= (0)::numeric)),
    CONSTRAINT chk_platform_revenue_share_currency CHECK ((currency ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT chk_platform_revenue_share_rate CHECK (((parc_share_rate >= (0)::numeric) AND (parc_share_rate <= (100)::numeric)))
);

ALTER TABLE ONLY public.platform_revenue_shares FORCE ROW LEVEL SECURITY;


--
-- Name: TABLE platform_revenue_shares; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.platform_revenue_shares IS 'One-to-one revenue-share economics for platform_revenue_events whose revenue_model is REVENUE_SHARE.';


--
-- Name: virtual_account_provisioning_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.virtual_account_provisioning_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    financial_account_id uuid NOT NULL,
    routing_decision_id uuid NOT NULL,
    provider_code character varying(50) NOT NULL,
    currency character(3) NOT NULL,
    idempotency_key character varying(255) NOT NULL,
    request_hash character(64) NOT NULL,
    status character varying(30) DEFAULT 'PENDING'::character varying NOT NULL,
    provider_customer_reference character varying(200),
    provider_account_reference character varying(200),
    failure_code character varying(100),
    failure_reason text,
    submitted_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_va_currency CHECK ((currency ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT virtual_account_provisioning_requests_status_check CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('SUBMITTED'::character varying)::text, ('ACTIVE'::character varying)::text, ('FAILED'::character varying)::text, ('MANUAL_REVIEW'::character varying)::text])))
);

ALTER TABLE ONLY public.virtual_account_provisioning_requests FORCE ROW LEVEL SECURITY;


--
-- Name: account_provider_accounts account_provider_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_provider_accounts
    ADD CONSTRAINT account_provider_accounts_pkey PRIMARY KEY (id);


--
-- Name: account_providers account_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_providers
    ADD CONSTRAINT account_providers_pkey PRIMARY KEY (id);


--
-- Name: account_status_history account_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_status_history
    ADD CONSTRAINT account_status_history_pkey PRIMARY KEY (id);


--
-- Name: beneficiaries beneficiaries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beneficiaries
    ADD CONSTRAINT beneficiaries_pkey PRIMARY KEY (id);


--
-- Name: bill_catalogue_import_items bill_catalogue_import_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_catalogue_import_items
    ADD CONSTRAINT bill_catalogue_import_items_pkey PRIMARY KEY (id);


--
-- Name: bill_catalogue_import_items bill_catalogue_import_items_tenant_id_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_catalogue_import_items
    ADD CONSTRAINT bill_catalogue_import_items_tenant_id_id_key UNIQUE (tenant_id, id);


--
-- Name: bill_catalogue_import_items bill_catalogue_import_items_tenant_id_import_id_product_cod_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_catalogue_import_items
    ADD CONSTRAINT bill_catalogue_import_items_tenant_id_import_id_product_cod_key UNIQUE (tenant_id, import_id, product_code);


--
-- Name: bill_catalogue_imports bill_catalogue_imports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_catalogue_imports
    ADD CONSTRAINT bill_catalogue_imports_pkey PRIMARY KEY (id);


--
-- Name: bill_catalogue_imports bill_catalogue_imports_tenant_id_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_catalogue_imports
    ADD CONSTRAINT bill_catalogue_imports_tenant_id_id_key UNIQUE (tenant_id, id);


--
-- Name: bill_catalogue_imports bill_catalogue_imports_tenant_id_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_catalogue_imports
    ADD CONSTRAINT bill_catalogue_imports_tenant_id_idempotency_key_key UNIQUE (tenant_id, idempotency_key);


--
-- Name: bill_catalogue_publications bill_catalogue_publications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_catalogue_publications
    ADD CONSTRAINT bill_catalogue_publications_pkey PRIMARY KEY (id);


--
-- Name: bill_catalogue_publications bill_catalogue_publications_tenant_id_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_catalogue_publications
    ADD CONSTRAINT bill_catalogue_publications_tenant_id_id_key UNIQUE (tenant_id, id);


--
-- Name: bill_catalogue_publications bill_catalogue_publications_tenant_id_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_catalogue_publications
    ADD CONSTRAINT bill_catalogue_publications_tenant_id_idempotency_key_key UNIQUE (tenant_id, idempotency_key);


--
-- Name: bill_catalogue_publications bill_catalogue_publications_tenant_id_import_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_catalogue_publications
    ADD CONSTRAINT bill_catalogue_publications_tenant_id_import_id_key UNIQUE (tenant_id, import_id);


--
-- Name: bill_catalogue_publications bill_catalogue_publications_tenant_id_provider_code_catalog_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_catalogue_publications
    ADD CONSTRAINT bill_catalogue_publications_tenant_id_provider_code_catalog_key UNIQUE (tenant_id, provider_code, catalogue_version);


--
-- Name: bill_categories bill_categories_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_categories
    ADD CONSTRAINT bill_categories_code_key UNIQUE (code);


--
-- Name: bill_categories bill_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_categories
    ADD CONSTRAINT bill_categories_pkey PRIMARY KEY (id);


--
-- Name: bill_customer_validations bill_customer_validations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_customer_validations
    ADD CONSTRAINT bill_customer_validations_pkey PRIMARY KEY (id);


--
-- Name: bill_customer_validations bill_customer_validations_tenant_id_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_customer_validations
    ADD CONSTRAINT bill_customer_validations_tenant_id_id_key UNIQUE (tenant_id, id);


--
-- Name: bill_customer_validations bill_customer_validations_tenant_id_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_customer_validations
    ADD CONSTRAINT bill_customer_validations_tenant_id_idempotency_key_key UNIQUE (tenant_id, idempotency_key);


--
-- Name: bill_payment_quotes bill_payment_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_payment_quotes
    ADD CONSTRAINT bill_payment_quotes_pkey PRIMARY KEY (id);


--
-- Name: bill_payment_quotes bill_payment_quotes_tenant_id_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_payment_quotes
    ADD CONSTRAINT bill_payment_quotes_tenant_id_id_key UNIQUE (tenant_id, id);


--
-- Name: bill_payment_quotes bill_payment_quotes_tenant_id_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_payment_quotes
    ADD CONSTRAINT bill_payment_quotes_tenant_id_idempotency_key_key UNIQUE (tenant_id, idempotency_key);


--
-- Name: bill_products bill_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_products
    ADD CONSTRAINT bill_products_pkey PRIMARY KEY (id);


--
-- Name: bill_provider_transactions bill_provider_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_provider_transactions
    ADD CONSTRAINT bill_provider_transactions_pkey PRIMARY KEY (id);


--
-- Name: bill_providers bill_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_providers
    ADD CONSTRAINT bill_providers_pkey PRIMARY KEY (id);


--
-- Name: bill_transaction_attempts bill_transaction_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_transaction_attempts
    ADD CONSTRAINT bill_transaction_attempts_pkey PRIMARY KEY (id);


--
-- Name: bill_transaction_status_history bill_transaction_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_transaction_status_history
    ADD CONSTRAINT bill_transaction_status_history_pkey PRIMARY KEY (id);


--
-- Name: bill_transactions bill_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_transactions
    ADD CONSTRAINT bill_transactions_pkey PRIMARY KEY (id);


--
-- Name: bill_webhooks bill_webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_webhooks
    ADD CONSTRAINT bill_webhooks_pkey PRIMARY KEY (id);


--
-- Name: financial_accounts financial_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_accounts
    ADD CONSTRAINT financial_accounts_pkey PRIMARY KEY (id);


--
-- Name: payment_attempts payment_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_attempts
    ADD CONSTRAINT payment_attempts_pkey PRIMARY KEY (id);


--
-- Name: payment_collection_status_history payment_collection_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_collection_status_history
    ADD CONSTRAINT payment_collection_status_history_pkey PRIMARY KEY (id);


--
-- Name: payment_collections payment_collections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_collections
    ADD CONSTRAINT payment_collections_pkey PRIMARY KEY (id);


--
-- Name: payment_disputes payment_disputes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_disputes
    ADD CONSTRAINT payment_disputes_pkey PRIMARY KEY (id);


--
-- Name: payment_external_transfer_history payment_external_transfer_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_external_transfer_history
    ADD CONSTRAINT payment_external_transfer_history_pkey PRIMARY KEY (id);


--
-- Name: payment_external_transfers payment_external_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_external_transfers
    ADD CONSTRAINT payment_external_transfers_pkey PRIMARY KEY (id);


--
-- Name: payment_fees payment_fees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_fees
    ADD CONSTRAINT payment_fees_pkey PRIMARY KEY (id);


--
-- Name: payment_idempotency_keys payment_idempotency_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_idempotency_keys
    ADD CONSTRAINT payment_idempotency_keys_pkey PRIMARY KEY (id);


--
-- Name: payment_inbox_events payment_inbox_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_inbox_events
    ADD CONSTRAINT payment_inbox_events_pkey PRIMARY KEY (id);


--
-- Name: payment_inbox_events payment_inbox_events_source_service_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_inbox_events
    ADD CONSTRAINT payment_inbox_events_source_service_event_id_key UNIQUE (source_service, event_id);


--
-- Name: payment_inbox_events payment_inbox_events_tenant_id_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_inbox_events
    ADD CONSTRAINT payment_inbox_events_tenant_id_id_key UNIQUE (tenant_id, id);


--
-- Name: payment_internal_transfer_history payment_internal_transfer_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_internal_transfer_history
    ADD CONSTRAINT payment_internal_transfer_history_pkey PRIMARY KEY (id);


--
-- Name: payment_internal_transfers payment_internal_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_internal_transfers
    ADD CONSTRAINT payment_internal_transfers_pkey PRIMARY KEY (id);


--
-- Name: payment_outbox_events payment_outbox_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_outbox_events
    ADD CONSTRAINT payment_outbox_events_pkey PRIMARY KEY (id);


--
-- Name: payment_parties payment_parties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_parties
    ADD CONSTRAINT payment_parties_pkey PRIMARY KEY (id);


--
-- Name: payment_provider_routing_decisions payment_provider_routing_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_provider_routing_decisions
    ADD CONSTRAINT payment_provider_routing_decisions_pkey PRIMARY KEY (id);


--
-- Name: payment_provider_transactions payment_provider_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_provider_transactions
    ADD CONSTRAINT payment_provider_transactions_pkey PRIMARY KEY (id);


--
-- Name: payment_reconciliation_records payment_reconciliation_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_reconciliation_records
    ADD CONSTRAINT payment_reconciliation_records_pkey PRIMARY KEY (id);


--
-- Name: payment_reconciliation_runs payment_reconciliation_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_reconciliation_runs
    ADD CONSTRAINT payment_reconciliation_runs_pkey PRIMARY KEY (id);


--
-- Name: payment_reversal_history payment_reversal_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_reversal_history
    ADD CONSTRAINT payment_reversal_history_pkey PRIMARY KEY (id);


--
-- Name: payment_reversals payment_reversals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_reversals
    ADD CONSTRAINT payment_reversals_pkey PRIMARY KEY (id);


--
-- Name: payment_service_payout_attempts payment_service_payout_attemp_tenant_id_payout_id_attempt_n_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_service_payout_attempts
    ADD CONSTRAINT payment_service_payout_attemp_tenant_id_payout_id_attempt_n_key UNIQUE (tenant_id, payout_id, attempt_number);


--
-- Name: payment_service_payout_attempts payment_service_payout_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_service_payout_attempts
    ADD CONSTRAINT payment_service_payout_attempts_pkey PRIMARY KEY (id);


--
-- Name: payment_service_payout_attempts payment_service_payout_attempts_tenant_id_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_service_payout_attempts
    ADD CONSTRAINT payment_service_payout_attempts_tenant_id_id_key UNIQUE (tenant_id, id);


--
-- Name: payment_service_payouts payment_service_payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_service_payouts
    ADD CONSTRAINT payment_service_payouts_pkey PRIMARY KEY (id);


--
-- Name: payment_service_payouts payment_service_payouts_tenant_id_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_service_payouts
    ADD CONSTRAINT payment_service_payouts_tenant_id_id_key UNIQUE (tenant_id, id);


--
-- Name: payment_service_payouts payment_service_payouts_tenant_id_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_service_payouts
    ADD CONSTRAINT payment_service_payouts_tenant_id_idempotency_key_key UNIQUE (tenant_id, idempotency_key);


--
-- Name: payment_service_payouts payment_service_payouts_tenant_id_source_service_source_res_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_service_payouts
    ADD CONSTRAINT payment_service_payouts_tenant_id_source_service_source_res_key UNIQUE (tenant_id, source_service, source_resource_id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: payment_webhooks payment_webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_webhooks
    ADD CONSTRAINT payment_webhooks_pkey PRIMARY KEY (id);


--
-- Name: platform_revenue_adjustments platform_revenue_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue_adjustments
    ADD CONSTRAINT platform_revenue_adjustments_pkey PRIMARY KEY (id);


--
-- Name: platform_revenue_events platform_revenue_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue_events
    ADD CONSTRAINT platform_revenue_events_pkey PRIMARY KEY (id);


--
-- Name: platform_revenue_settlement_items platform_revenue_settlement_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue_settlement_items
    ADD CONSTRAINT platform_revenue_settlement_items_pkey PRIMARY KEY (id);


--
-- Name: platform_revenue_settlements platform_revenue_settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue_settlements
    ADD CONSTRAINT platform_revenue_settlements_pkey PRIMARY KEY (id);


--
-- Name: platform_revenue_shares platform_revenue_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue_shares
    ADD CONSTRAINT platform_revenue_shares_pkey PRIMARY KEY (id);


--
-- Name: account_providers uq_account_provider_tenant_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_providers
    ADD CONSTRAINT uq_account_provider_tenant_code UNIQUE (tenant_id, provider_code);


--
-- Name: account_providers uq_account_provider_tenant_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_providers
    ADD CONSTRAINT uq_account_provider_tenant_id UNIQUE (tenant_id, id);


--
-- Name: beneficiaries uq_beneficiary_tenant_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beneficiaries
    ADD CONSTRAINT uq_beneficiary_tenant_id UNIQUE (tenant_id, id);


--
-- Name: bill_transaction_attempts uq_bill_attempt_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_transaction_attempts
    ADD CONSTRAINT uq_bill_attempt_number UNIQUE (bill_transaction_id, attempt_number);


--
-- Name: bill_products uq_bill_product_tenant_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_products
    ADD CONSTRAINT uq_bill_product_tenant_id UNIQUE (tenant_id, id);


--
-- Name: bill_products uq_bill_product_version; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_products
    ADD CONSTRAINT uq_bill_product_version UNIQUE (tenant_id, provider_id, product_code, catalogue_version);


--
-- Name: bill_providers uq_bill_provider; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_providers
    ADD CONSTRAINT uq_bill_provider UNIQUE (tenant_id, provider_code);


--
-- Name: bill_providers uq_bill_provider_tenant_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_providers
    ADD CONSTRAINT uq_bill_provider_tenant_id UNIQUE (tenant_id, id);


--
-- Name: bill_provider_transactions uq_bill_provider_transaction; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_provider_transactions
    ADD CONSTRAINT uq_bill_provider_transaction UNIQUE (provider_code, provider_transaction_id);


--
-- Name: bill_transactions uq_bill_transaction_idempotency; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_transactions
    ADD CONSTRAINT uq_bill_transaction_idempotency UNIQUE (tenant_id, idempotency_key);


--
-- Name: bill_transactions uq_bill_transaction_reference; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_transactions
    ADD CONSTRAINT uq_bill_transaction_reference UNIQUE (tenant_id, reference);


--
-- Name: bill_transactions uq_bill_transaction_tenant_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_transactions
    ADD CONSTRAINT uq_bill_transaction_tenant_id UNIQUE (tenant_id, id);


--
-- Name: bill_webhooks uq_bill_webhook_event; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_webhooks
    ADD CONSTRAINT uq_bill_webhook_event UNIQUE (provider_code, event_reference);


--
-- Name: payment_collections uq_collection_ledger_idempotency; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_collections
    ADD CONSTRAINT uq_collection_ledger_idempotency UNIQUE (tenant_id, ledger_idempotency_key);


--
-- Name: payment_collections uq_collection_provider_reference; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_collections
    ADD CONSTRAINT uq_collection_provider_reference UNIQUE (provider_code, provider_reference);


--
-- Name: payment_collections uq_collection_tenant_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_collections
    ADD CONSTRAINT uq_collection_tenant_id UNIQUE (tenant_id, id);


--
-- Name: payment_collections uq_collection_webhook; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_collections
    ADD CONSTRAINT uq_collection_webhook UNIQUE (webhook_id);


--
-- Name: payment_external_transfers uq_external_idempotency; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_external_transfers
    ADD CONSTRAINT uq_external_idempotency UNIQUE (tenant_id, idempotency_key);


--
-- Name: payment_external_transfers uq_external_payment; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_external_transfers
    ADD CONSTRAINT uq_external_payment UNIQUE (tenant_id, payment_id);


--
-- Name: payment_external_transfers uq_external_tenant_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_external_transfers
    ADD CONSTRAINT uq_external_tenant_id UNIQUE (tenant_id, id);


--
-- Name: financial_accounts uq_financial_account_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_accounts
    ADD CONSTRAINT uq_financial_account_number UNIQUE (tenant_id, account_number);


--
-- Name: financial_accounts uq_financial_account_provider_reference; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_accounts
    ADD CONSTRAINT uq_financial_account_provider_reference UNIQUE (tenant_id, provider_reference);


--
-- Name: financial_accounts uq_financial_account_tenant_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_accounts
    ADD CONSTRAINT uq_financial_account_tenant_id UNIQUE (tenant_id, id);


--
-- Name: payment_internal_transfers uq_internal_transfer_idempotency; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_internal_transfers
    ADD CONSTRAINT uq_internal_transfer_idempotency UNIQUE (tenant_id, idempotency_key);


--
-- Name: payment_internal_transfers uq_internal_transfer_payment; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_internal_transfers
    ADD CONSTRAINT uq_internal_transfer_payment UNIQUE (tenant_id, payment_id);


--
-- Name: payment_internal_transfers uq_internal_transfer_tenant_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_internal_transfers
    ADD CONSTRAINT uq_internal_transfer_tenant_id UNIQUE (tenant_id, id);


--
-- Name: payment_attempts uq_payment_attempt_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_attempts
    ADD CONSTRAINT uq_payment_attempt_number UNIQUE (payment_id, attempt_number);


--
-- Name: payment_attempts uq_payment_attempt_tenant_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_attempts
    ADD CONSTRAINT uq_payment_attempt_tenant_id UNIQUE (tenant_id, id);


--
-- Name: payment_idempotency_keys uq_payment_idempotency; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_idempotency_keys
    ADD CONSTRAINT uq_payment_idempotency UNIQUE (tenant_id, idempotency_key);


--
-- Name: payment_transactions uq_payment_idempotency_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT uq_payment_idempotency_key UNIQUE (tenant_id, idempotency_key);


--
-- Name: payment_outbox_events uq_payment_outbox_idempotency; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_outbox_events
    ADD CONSTRAINT uq_payment_outbox_idempotency UNIQUE (tenant_id, idempotency_key);


--
-- Name: payment_outbox_events uq_payment_outbox_tenant_idempotency; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_outbox_events
    ADD CONSTRAINT uq_payment_outbox_tenant_idempotency UNIQUE (tenant_id, idempotency_key);


--
-- Name: payment_transactions uq_payment_reference; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT uq_payment_reference UNIQUE (tenant_id, reference);


--
-- Name: payment_reversals uq_payment_reversal_idempotency; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_reversals
    ADD CONSTRAINT uq_payment_reversal_idempotency UNIQUE (tenant_id, idempotency_key);


--
-- Name: payment_reversals uq_payment_reversal_tenant_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_reversals
    ADD CONSTRAINT uq_payment_reversal_tenant_id UNIQUE (tenant_id, id);


--
-- Name: payment_provider_routing_decisions uq_payment_routing_idempotency; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_provider_routing_decisions
    ADD CONSTRAINT uq_payment_routing_idempotency UNIQUE (tenant_id, idempotency_key);


--
-- Name: payment_provider_routing_decisions uq_payment_routing_tenant_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_provider_routing_decisions
    ADD CONSTRAINT uq_payment_routing_tenant_id UNIQUE (tenant_id, id);


--
-- Name: payment_transactions uq_payment_transaction_tenant_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT uq_payment_transaction_tenant_id UNIQUE (tenant_id, id);


--
-- Name: payment_webhooks uq_payment_webhook_event; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_webhooks
    ADD CONSTRAINT uq_payment_webhook_event UNIQUE (provider_code, event_reference);


--
-- Name: platform_revenue_adjustments uq_platform_revenue_adjustment_idempotency; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue_adjustments
    ADD CONSTRAINT uq_platform_revenue_adjustment_idempotency UNIQUE (tenant_id, idempotency_key);


--
-- Name: platform_revenue_adjustments uq_platform_revenue_adjustment_ledger; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue_adjustments
    ADD CONSTRAINT uq_platform_revenue_adjustment_ledger UNIQUE (ledger_transaction_id);


--
-- Name: platform_revenue_events uq_platform_revenue_event_idempotency; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue_events
    ADD CONSTRAINT uq_platform_revenue_event_idempotency UNIQUE (tenant_id, idempotency_key);


--
-- Name: platform_revenue_events uq_platform_revenue_event_ledger_transaction; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue_events
    ADD CONSTRAINT uq_platform_revenue_event_ledger_transaction UNIQUE (ledger_transaction_id);


--
-- Name: platform_revenue_events uq_platform_revenue_event_source; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue_events
    ADD CONSTRAINT uq_platform_revenue_event_source UNIQUE (tenant_id, source_service, source_event_type, source_reference, revenue_type);


--
-- Name: platform_revenue_settlements uq_platform_revenue_settlement_idempotency; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue_settlements
    ADD CONSTRAINT uq_platform_revenue_settlement_idempotency UNIQUE (tenant_id, idempotency_key);


--
-- Name: platform_revenue_settlement_items uq_platform_revenue_settlement_item; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue_settlement_items
    ADD CONSTRAINT uq_platform_revenue_settlement_item UNIQUE (settlement_id, revenue_event_id);


--
-- Name: platform_revenue_settlements uq_platform_revenue_settlement_ledger; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue_settlements
    ADD CONSTRAINT uq_platform_revenue_settlement_ledger UNIQUE (ledger_transaction_id);


--
-- Name: platform_revenue_settlements uq_platform_revenue_settlement_payment; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue_settlements
    ADD CONSTRAINT uq_platform_revenue_settlement_payment UNIQUE (payment_id);


--
-- Name: platform_revenue_settlements uq_platform_revenue_settlement_reference; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue_settlements
    ADD CONSTRAINT uq_platform_revenue_settlement_reference UNIQUE (tenant_id, settlement_reference);


--
-- Name: platform_revenue_shares uq_platform_revenue_share_event; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue_shares
    ADD CONSTRAINT uq_platform_revenue_share_event UNIQUE (revenue_event_id);


--
-- Name: account_provider_accounts uq_provider_account_reference; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_provider_accounts
    ADD CONSTRAINT uq_provider_account_reference UNIQUE (provider_id, provider_account_id);


--
-- Name: payment_provider_transactions uq_provider_payment_tenant_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_provider_transactions
    ADD CONSTRAINT uq_provider_payment_tenant_id UNIQUE (tenant_id, id);


--
-- Name: payment_provider_transactions uq_provider_transaction; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_provider_transactions
    ADD CONSTRAINT uq_provider_transaction UNIQUE (provider_code, provider_transaction_id);


--
-- Name: payment_reconciliation_runs uq_reconciliation_run_idempotency; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_reconciliation_runs
    ADD CONSTRAINT uq_reconciliation_run_idempotency UNIQUE (tenant_id, idempotency_key);


--
-- Name: payment_reconciliation_runs uq_reconciliation_run_tenant_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_reconciliation_runs
    ADD CONSTRAINT uq_reconciliation_run_tenant_id UNIQUE (tenant_id, id);


--
-- Name: payment_reconciliation_runs uq_reconciliation_source; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_reconciliation_runs
    ADD CONSTRAINT uq_reconciliation_source UNIQUE (tenant_id, provider_code, source_hash);


--
-- Name: payment_reversals uq_reversal_original_ledger; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_reversals
    ADD CONSTRAINT uq_reversal_original_ledger UNIQUE (tenant_id, original_ledger_transaction_id);


--
-- Name: virtual_account_provisioning_requests uq_va_idempotency; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.virtual_account_provisioning_requests
    ADD CONSTRAINT uq_va_idempotency UNIQUE (tenant_id, idempotency_key);


--
-- Name: virtual_account_provisioning_requests uq_va_tenant_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.virtual_account_provisioning_requests
    ADD CONSTRAINT uq_va_tenant_id UNIQUE (tenant_id, id);


--
-- Name: virtual_account_provisioning_requests virtual_account_provisioning_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.virtual_account_provisioning_requests
    ADD CONSTRAINT virtual_account_provisioning_requests_pkey PRIMARY KEY (id);


--
-- Name: idx_account_providers_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_providers_active ON public.account_providers USING btree (tenant_id, is_active) WHERE (deleted_at IS NULL);


--
-- Name: idx_account_providers_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_providers_tenant ON public.account_providers USING btree (tenant_id);


--
-- Name: idx_account_status_history_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_status_history_account ON public.account_status_history USING btree (account_id, created_at DESC);


--
-- Name: idx_attempt_inquiry_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attempt_inquiry_due ON public.payment_attempts USING btree (next_inquiry_at) WHERE ((outcome_class)::text = ANY (ARRAY[('ACKNOWLEDGED_PENDING'::character varying)::text, ('AMBIGUOUS'::character varying)::text]));


--
-- Name: idx_beneficiaries_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_beneficiaries_account ON public.beneficiaries USING btree (account_number, bank_code);


--
-- Name: idx_beneficiaries_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_beneficiaries_customer ON public.beneficiaries USING btree (tenant_id, customer_id);


--
-- Name: idx_bill_attempts_provider_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_attempts_provider_reference ON public.bill_transaction_attempts USING btree (provider_reference);


--
-- Name: idx_bill_attempts_transaction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_attempts_transaction ON public.bill_transaction_attempts USING btree (bill_transaction_id);


--
-- Name: idx_bill_catalogue_import_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_catalogue_import_status ON public.bill_catalogue_imports USING btree (tenant_id, status, created_at DESC);


--
-- Name: idx_bill_catalogue_items_import; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_catalogue_items_import ON public.bill_catalogue_import_items USING btree (tenant_id, import_id);


--
-- Name: idx_bill_inquiry_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_inquiry_due ON public.bill_transaction_attempts USING btree (next_inquiry_at, inquiry_lease_expires_at) WHERE ((outcome_class)::text = ANY (ARRAY[('ACKNOWLEDGED_PENDING'::character varying)::text, ('AMBIGUOUS'::character varying)::text]));


--
-- Name: idx_bill_products_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_products_active ON public.bill_products USING btree (tenant_id, is_active);


--
-- Name: idx_bill_products_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_products_provider ON public.bill_products USING btree (provider_id);


--
-- Name: idx_bill_provider_transactions_bill; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_provider_transactions_bill ON public.bill_provider_transactions USING btree (bill_transaction_id);


--
-- Name: idx_bill_provider_transactions_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_provider_transactions_reference ON public.bill_provider_transactions USING btree (provider_reference);


--
-- Name: idx_bill_providers_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_providers_category ON public.bill_providers USING btree (category_id);


--
-- Name: idx_bill_providers_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_providers_tenant ON public.bill_providers USING btree (tenant_id);


--
-- Name: idx_bill_transactions_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_transactions_customer ON public.bill_transactions USING btree (tenant_id, customer_id, created_at DESC);


--
-- Name: idx_bill_transactions_customer_identifier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_transactions_customer_identifier ON public.bill_transactions USING btree (customer_identifier);


--
-- Name: idx_bill_transactions_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_transactions_provider ON public.bill_transactions USING btree (provider_id);


--
-- Name: idx_bill_transactions_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_transactions_reference ON public.bill_transactions USING btree (reference);


--
-- Name: idx_bill_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_transactions_status ON public.bill_transactions USING btree (tenant_id, status);


--
-- Name: idx_bill_webhooks_received; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_webhooks_received ON public.bill_webhooks USING btree (received_at DESC);


--
-- Name: idx_bill_webhooks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_webhooks_status ON public.bill_webhooks USING btree (status);


--
-- Name: idx_collection_posting_recovery; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collection_posting_recovery ON public.payment_collections USING btree (status, created_at) WHERE ((status)::text = ANY (ARRAY[('VERIFIED'::character varying)::text, ('POSTING'::character varying)::text, ('MANUAL_REVIEW'::character varying)::text]));


--
-- Name: idx_external_recovery; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_recovery ON public.payment_external_transfers USING btree (status, updated_at) WHERE ((status)::text = ANY (ARRAY[('RESERVED'::character varying)::text, ('SUBMITTING'::character varying)::text, ('PENDING'::character varying)::text, ('MANUAL_REVIEW'::character varying)::text]));


--
-- Name: idx_financial_accounts_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_financial_accounts_customer ON public.financial_accounts USING btree (tenant_id, customer_id);


--
-- Name: idx_financial_accounts_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_financial_accounts_number ON public.financial_accounts USING btree (account_number);


--
-- Name: idx_financial_accounts_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_financial_accounts_provider ON public.financial_accounts USING btree (provider_id);


--
-- Name: idx_financial_accounts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_financial_accounts_status ON public.financial_accounts USING btree (tenant_id, status);


--
-- Name: idx_financial_accounts_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_financial_accounts_tenant ON public.financial_accounts USING btree (tenant_id);


--
-- Name: idx_internal_transfer_recovery; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internal_transfer_recovery ON public.payment_internal_transfers USING btree (status, updated_at) WHERE ((status)::text = ANY (ARRAY[('RESERVED'::character varying)::text, ('CAPTURING'::character varying)::text, ('MANUAL_REVIEW'::character varying)::text]));


--
-- Name: idx_payment_attempts_payment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_attempts_payment ON public.payment_attempts USING btree (payment_id);


--
-- Name: idx_payment_attempts_provider_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_attempts_provider_reference ON public.payment_attempts USING btree (provider_reference);


--
-- Name: idx_payment_disputes_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_disputes_customer ON public.payment_disputes USING btree (tenant_id, customer_id);


--
-- Name: idx_payment_disputes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_disputes_status ON public.payment_disputes USING btree (tenant_id, status);


--
-- Name: idx_payment_fees_payment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_fees_payment ON public.payment_fees USING btree (payment_id);


--
-- Name: idx_payment_idempotency_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_idempotency_expiry ON public.payment_idempotency_keys USING btree (expires_at);


--
-- Name: idx_payment_idempotency_resource; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_idempotency_resource ON public.payment_idempotency_keys USING btree (tenant_id, resource_type, resource_id);


--
-- Name: idx_payment_inbox_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_inbox_pending ON public.payment_inbox_events USING btree (status, next_attempt_at, received_at) WHERE (status = ANY (ARRAY['RECEIVED'::public.payment_inbox_status_enum, 'FAILED'::public.payment_inbox_status_enum]));


--
-- Name: idx_payment_inbox_tenant_received; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_inbox_tenant_received ON public.payment_inbox_events USING btree (tenant_id, received_at DESC);


--
-- Name: idx_payment_outbox_aggregate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_outbox_aggregate ON public.payment_outbox_events USING btree (tenant_id, aggregate_type, aggregate_id);


--
-- Name: idx_payment_outbox_correlation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_outbox_correlation ON public.payment_outbox_events USING btree (correlation_id) WHERE (correlation_id IS NOT NULL);


--
-- Name: idx_payment_outbox_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_outbox_pending ON public.payment_outbox_events USING btree (available_at) WHERE ((status)::text = 'PENDING'::text);


--
-- Name: idx_payment_parties_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_parties_customer ON public.payment_parties USING btree (customer_id);


--
-- Name: idx_payment_parties_payment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_parties_payment ON public.payment_parties USING btree (payment_id);


--
-- Name: idx_payment_reconciliation_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_reconciliation_date ON public.payment_reconciliation_records USING btree (tenant_id, reconciliation_date);


--
-- Name: idx_payment_reconciliation_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_reconciliation_provider ON public.payment_reconciliation_records USING btree (provider_code, provider_reference);


--
-- Name: idx_payment_reconciliation_revenue_settlement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_reconciliation_revenue_settlement ON public.payment_reconciliation_records USING btree (platform_revenue_settlement_id) WHERE (platform_revenue_settlement_id IS NOT NULL);


--
-- Name: idx_payment_reconciliation_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_reconciliation_status ON public.payment_reconciliation_records USING btree (tenant_id, status);


--
-- Name: idx_payment_reversals_payment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_reversals_payment ON public.payment_reversals USING btree (payment_id);


--
-- Name: idx_payment_reversals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_reversals_status ON public.payment_reversals USING btree (tenant_id, status);


--
-- Name: idx_payment_transactions_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_account ON public.payment_transactions USING btree (source_account_id, created_at DESC);


--
-- Name: idx_payment_transactions_correlation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_correlation ON public.payment_transactions USING btree (correlation_id) WHERE (correlation_id IS NOT NULL);


--
-- Name: idx_payment_transactions_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_customer ON public.payment_transactions USING btree (tenant_id, customer_id, created_at DESC);


--
-- Name: idx_payment_transactions_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_reference ON public.payment_transactions USING btree (reference);


--
-- Name: idx_payment_transactions_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_source ON public.payment_transactions USING btree (tenant_id, source_service, source_resource_type, source_resource_id);


--
-- Name: idx_payment_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_status ON public.payment_transactions USING btree (tenant_id, status);


--
-- Name: idx_payment_transactions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_type ON public.payment_transactions USING btree (tenant_id, payment_type);


--
-- Name: idx_payment_webhooks_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_webhooks_due ON public.payment_webhooks USING btree (status, received_at) WHERE (status = ANY (ARRAY['RECEIVED'::public.webhook_status_enum, 'FAILED'::public.webhook_status_enum]));


--
-- Name: idx_payment_webhooks_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_webhooks_expiry ON public.payment_webhooks USING btree (expires_at);


--
-- Name: idx_payment_webhooks_received; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_webhooks_received ON public.payment_webhooks USING btree (received_at DESC);


--
-- Name: idx_payment_webhooks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_webhooks_status ON public.payment_webhooks USING btree (status);


--
-- Name: idx_platform_revenue_adjustments_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_revenue_adjustments_event ON public.platform_revenue_adjustments USING btree (revenue_event_id, created_at DESC);


--
-- Name: idx_platform_revenue_events_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_revenue_events_customer ON public.platform_revenue_events USING btree (tenant_id, customer_id) WHERE (customer_id IS NOT NULL);


--
-- Name: idx_platform_revenue_events_ledger_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_revenue_events_ledger_status ON public.platform_revenue_events USING btree (tenant_id, ledger_posting_status);


--
-- Name: idx_platform_revenue_events_loan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_revenue_events_loan ON public.platform_revenue_events USING btree (loan_id) WHERE (loan_id IS NOT NULL);


--
-- Name: idx_platform_revenue_events_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_revenue_events_source ON public.platform_revenue_events USING btree (source_service, source_reference);


--
-- Name: idx_platform_revenue_events_tenant_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_revenue_events_tenant_status ON public.platform_revenue_events USING btree (tenant_id, status, created_at DESC);


--
-- Name: idx_platform_revenue_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_revenue_events_type ON public.platform_revenue_events USING btree (tenant_id, revenue_type, effective_at DESC);


--
-- Name: idx_platform_revenue_events_unsettled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_revenue_events_unsettled ON public.platform_revenue_events USING btree (tenant_id, currency, effective_at) WHERE ((status = 'EARNED'::public.platform_revenue_status_enum) AND (settlement_status = ANY (ARRAY['UNSETTLED'::public.platform_revenue_settlement_status_enum, 'PARTIALLY_SETTLED'::public.platform_revenue_settlement_status_enum])));


--
-- Name: idx_platform_revenue_settlement_items_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_revenue_settlement_items_event ON public.platform_revenue_settlement_items USING btree (revenue_event_id);


--
-- Name: idx_platform_revenue_settlement_items_settlement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_revenue_settlement_items_settlement ON public.platform_revenue_settlement_items USING btree (settlement_id);


--
-- Name: idx_platform_revenue_settlements_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_revenue_settlements_period ON public.platform_revenue_settlements USING btree (tenant_id, period_start, period_end);


--
-- Name: idx_platform_revenue_settlements_retry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_revenue_settlements_retry ON public.platform_revenue_settlements USING btree (status, next_retry_at) WHERE (status = ANY (ARRAY['INITIATED'::public.revenue_settlement_status_enum, 'PROCESSING'::public.revenue_settlement_status_enum, 'FAILED'::public.revenue_settlement_status_enum]));


--
-- Name: idx_platform_revenue_settlements_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_revenue_settlements_status ON public.platform_revenue_settlements USING btree (tenant_id, status, created_at DESC);


--
-- Name: idx_platform_revenue_shares_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_revenue_shares_tenant ON public.platform_revenue_shares USING btree (tenant_id);


--
-- Name: idx_provider_accounts_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_provider_accounts_account ON public.account_provider_accounts USING btree (account_id);


--
-- Name: idx_provider_accounts_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_provider_accounts_tenant ON public.account_provider_accounts USING btree (tenant_id);


--
-- Name: idx_provider_payment_payment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_provider_payment_payment ON public.payment_provider_transactions USING btree (payment_id);


--
-- Name: idx_provider_payment_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_provider_payment_reference ON public.payment_provider_transactions USING btree (provider_reference);


--
-- Name: idx_reconciliation_run_claim; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reconciliation_run_claim ON public.payment_reconciliation_runs USING btree (status, lease_expires_at, created_at) WHERE ((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('PROCESSING'::character varying)::text]));


--
-- Name: idx_service_payout_inquiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_payout_inquiry ON public.payment_service_payouts USING btree (status, next_inquiry_at) WHERE ((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('MANUAL_REVIEW'::character varying)::text]));


--
-- Name: idx_va_provisioning_recovery; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_va_provisioning_recovery ON public.virtual_account_provisioning_requests USING btree (status, created_at) WHERE ((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('SUBMITTED'::character varying)::text, ('MANUAL_REVIEW'::character varying)::text]));


--
-- Name: uq_active_customer_currency_account; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_active_customer_currency_account ON public.financial_accounts USING btree (tenant_id, customer_id, currency) WHERE ((account_type = 'VIRTUAL_BANK_ACCOUNT'::public.account_type_enum) AND (deleted_at IS NULL) AND (status = ANY (ARRAY['PENDING'::public.account_status_enum, 'ACTIVE'::public.account_status_enum, 'SUSPENDED'::public.account_status_enum, 'FROZEN'::public.account_status_enum])));


--
-- Name: uq_bill_provider_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_bill_provider_reference ON public.bill_transaction_attempts USING btree (provider_reference) WHERE (provider_reference IS NOT NULL);


--
-- Name: uq_financial_ledger_account; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_financial_ledger_account ON public.financial_accounts USING btree (ledger_account_id) WHERE (ledger_account_id IS NOT NULL);


--
-- Name: uq_provider_attempt_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_provider_attempt_reference ON public.payment_attempts USING btree (provider_code, provider_reference) WHERE (provider_reference IS NOT NULL);


--
-- Name: uq_reconciliation_discrepancy; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_reconciliation_discrepancy ON public.payment_reconciliation_records USING btree (tenant_id, discrepancy_key) WHERE (discrepancy_key IS NOT NULL);


--
-- Name: uq_service_payout_provider_success; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_service_payout_provider_success ON public.payment_service_payout_attempts USING btree (tenant_id, payout_id) WHERE ((submission_state)::text = 'SUCCESS'::text);


--
-- Name: account_provider_accounts trg_account_provider_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_account_provider_accounts_updated_at BEFORE UPDATE ON public.account_provider_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: account_providers trg_account_providers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_account_providers_updated_at BEFORE UPDATE ON public.account_providers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: beneficiaries trg_beneficiaries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_beneficiaries_updated_at BEFORE UPDATE ON public.beneficiaries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: bill_categories trg_bill_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bill_categories_updated_at BEFORE UPDATE ON public.bill_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: bill_products trg_bill_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bill_products_updated_at BEFORE UPDATE ON public.bill_products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: bill_provider_transactions trg_bill_provider_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bill_provider_transactions_updated_at BEFORE UPDATE ON public.bill_provider_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: bill_providers trg_bill_providers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bill_providers_updated_at BEFORE UPDATE ON public.bill_providers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: bill_transactions trg_bill_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bill_transactions_updated_at BEFORE UPDATE ON public.bill_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: payment_collections trg_collection_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_collection_status AFTER INSERT OR UPDATE OF status ON public.payment_collections FOR EACH ROW EXECUTE FUNCTION public.record_collection_status();


--
-- Name: platform_revenue_settlements trg_enforce_new_platform_revenue_settlement_pending; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_new_platform_revenue_settlement_pending BEFORE INSERT ON public.platform_revenue_settlements FOR EACH ROW EXECUTE FUNCTION public.enforce_new_platform_revenue_settlement_pending();


--
-- Name: payment_external_transfers trg_external_transfer_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_external_transfer_status AFTER INSERT OR UPDATE OF status ON public.payment_external_transfers FOR EACH ROW EXECUTE FUNCTION public.record_external_transfer_status();


--
-- Name: financial_accounts trg_financial_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_financial_accounts_updated_at BEFORE UPDATE ON public.financial_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: payment_provider_routing_decisions trg_immutable_payment_routing_decision; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_immutable_payment_routing_decision BEFORE DELETE OR UPDATE ON public.payment_provider_routing_decisions FOR EACH ROW EXECUTE FUNCTION public.prevent_payment_routing_decision_change();


--
-- Name: payment_internal_transfers trg_internal_transfer_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_internal_transfer_status AFTER INSERT OR UPDATE OF status ON public.payment_internal_transfers FOR EACH ROW EXECUTE FUNCTION public.record_internal_transfer_status();


--
-- Name: payment_disputes trg_payment_disputes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_payment_disputes_updated_at BEFORE UPDATE ON public.payment_disputes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: payment_provider_transactions trg_payment_provider_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_payment_provider_transactions_updated_at BEFORE UPDATE ON public.payment_provider_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: payment_reversals trg_payment_reversal_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_payment_reversal_status AFTER INSERT OR UPDATE OF status ON public.payment_reversals FOR EACH ROW EXECUTE FUNCTION public.record_payment_reversal_status();


--
-- Name: payment_transactions trg_payment_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_payment_transactions_updated_at BEFORE UPDATE ON public.payment_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: platform_revenue_events trg_platform_revenue_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_platform_revenue_events_updated_at BEFORE UPDATE ON public.platform_revenue_events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: platform_revenue_settlements trg_platform_revenue_settlements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_platform_revenue_settlements_updated_at BEFORE UPDATE ON public.platform_revenue_settlements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: platform_revenue_settlement_items trg_prevent_platform_revenue_settlement_item_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_prevent_platform_revenue_settlement_item_delete BEFORE DELETE ON public.platform_revenue_settlement_items FOR EACH ROW EXECUTE FUNCTION public.prevent_platform_revenue_settlement_item_delete();


--
-- Name: payment_attempts trg_prevent_unsafe_provider_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_prevent_unsafe_provider_change BEFORE INSERT ON public.payment_attempts FOR EACH ROW EXECUTE FUNCTION public.prevent_unsafe_provider_change();


--
-- Name: bill_catalogue_import_items trg_protect_bill_catalogue_item; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_protect_bill_catalogue_item BEFORE DELETE OR UPDATE ON public.bill_catalogue_import_items FOR EACH ROW EXECUTE FUNCTION public.protect_bill_immutable();


--
-- Name: bill_catalogue_publications trg_protect_bill_catalogue_publication; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_protect_bill_catalogue_publication BEFORE DELETE OR UPDATE ON public.bill_catalogue_publications FOR EACH ROW EXECUTE FUNCTION public.protect_bill_immutable();


--
-- Name: bill_transaction_status_history trg_protect_bill_history; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_protect_bill_history BEFORE DELETE OR UPDATE ON public.bill_transaction_status_history FOR EACH ROW EXECUTE FUNCTION public.protect_bill_immutable();


--
-- Name: bill_payment_quotes trg_protect_bill_quote; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_protect_bill_quote BEFORE DELETE OR UPDATE ON public.bill_payment_quotes FOR EACH ROW EXECUTE FUNCTION public.protect_bill_immutable();


--
-- Name: bill_customer_validations trg_protect_bill_validation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_protect_bill_validation BEFORE DELETE OR UPDATE ON public.bill_customer_validations FOR EACH ROW EXECUTE FUNCTION public.protect_bill_immutable();


--
-- Name: payment_collection_status_history trg_protect_collection_history; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_protect_collection_history BEFORE DELETE OR UPDATE ON public.payment_collection_status_history FOR EACH ROW EXECUTE FUNCTION public.protect_collection_history();


--
-- Name: platform_revenue_events trg_protect_earned_platform_revenue_event; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_protect_earned_platform_revenue_event BEFORE UPDATE ON public.platform_revenue_events FOR EACH ROW EXECUTE FUNCTION public.protect_earned_platform_revenue_event();


--
-- Name: payment_external_transfer_history trg_protect_external_transfer_history; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_protect_external_transfer_history BEFORE DELETE OR UPDATE ON public.payment_external_transfer_history FOR EACH ROW EXECUTE FUNCTION public.protect_external_transfer_history();


--
-- Name: payment_internal_transfer_history trg_protect_internal_transfer_history; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_protect_internal_transfer_history BEFORE DELETE OR UPDATE ON public.payment_internal_transfer_history FOR EACH ROW EXECUTE FUNCTION public.protect_internal_transfer_history();


--
-- Name: payment_reversal_history trg_protect_payment_reversal_history; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_protect_payment_reversal_history BEFORE DELETE OR UPDATE ON public.payment_reversal_history FOR EACH ROW EXECUTE FUNCTION public.protect_payment_reversal_history();


--
-- Name: payment_webhooks trg_protect_payment_webhook_evidence; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_protect_payment_webhook_evidence BEFORE UPDATE ON public.payment_webhooks FOR EACH ROW EXECUTE FUNCTION public.protect_payment_webhook_evidence();


--
-- Name: platform_revenue_shares trg_protect_platform_revenue_share_economics; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_protect_platform_revenue_share_economics BEFORE UPDATE ON public.platform_revenue_shares FOR EACH ROW EXECUTE FUNCTION public.protect_platform_revenue_share_economics();


--
-- Name: bill_products trg_protect_published_bill_product; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_protect_published_bill_product BEFORE DELETE OR UPDATE ON public.bill_products FOR EACH ROW WHEN ((old.published_at IS NOT NULL)) EXECUTE FUNCTION public.protect_published_bill_product_version();


--
-- Name: payment_attempts trg_protect_submitted_payment_attempt; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_protect_submitted_payment_attempt BEFORE INSERT OR UPDATE ON public.payment_attempts FOR EACH ROW EXECUTE FUNCTION public.protect_submitted_payment_attempt();


--
-- Name: bill_transactions trg_record_bill_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_record_bill_status AFTER INSERT OR UPDATE OF status ON public.bill_transactions FOR EACH ROW EXECUTE FUNCTION public.record_bill_status();


--
-- Name: bill_transactions trg_validate_bill_transaction; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_bill_transaction BEFORE UPDATE ON public.bill_transactions FOR EACH ROW EXECUTE FUNCTION public.validate_bill_transaction();


--
-- Name: payment_external_transfers trg_validate_external_transfer; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_external_transfer BEFORE INSERT OR UPDATE ON public.payment_external_transfers FOR EACH ROW EXECUTE FUNCTION public.validate_external_transfer();


--
-- Name: payment_internal_transfers trg_validate_internal_transfer; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_internal_transfer BEFORE INSERT OR UPDATE ON public.payment_internal_transfers FOR EACH ROW EXECUTE FUNCTION public.validate_internal_transfer();


--
-- Name: payment_reversals trg_validate_payment_reversal; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_payment_reversal BEFORE INSERT OR UPDATE ON public.payment_reversals FOR EACH ROW EXECUTE FUNCTION public.validate_payment_reversal();


--
-- Name: platform_revenue_settlements trg_validate_platform_revenue_settlement; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_platform_revenue_settlement BEFORE UPDATE ON public.platform_revenue_settlements FOR EACH ROW EXECUTE FUNCTION public.validate_platform_revenue_settlement();


--
-- Name: platform_revenue_settlement_items trg_validate_platform_revenue_settlement_item; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_platform_revenue_settlement_item BEFORE INSERT OR UPDATE ON public.platform_revenue_settlement_items FOR EACH ROW EXECUTE FUNCTION public.validate_platform_revenue_settlement_item();


--
-- Name: platform_revenue_shares trg_validate_platform_revenue_share; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_platform_revenue_share BEFORE INSERT OR UPDATE ON public.platform_revenue_shares FOR EACH ROW EXECUTE FUNCTION public.validate_platform_revenue_share();


--
-- Name: payment_attempts trg_validate_provider_attempt_outcome; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_provider_attempt_outcome BEFORE INSERT OR UPDATE ON public.payment_attempts FOR EACH ROW EXECUTE FUNCTION public.validate_provider_attempt_outcome();


--
-- Name: bill_customer_validations bill_customer_validations_tenant_id_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_customer_validations
    ADD CONSTRAINT bill_customer_validations_tenant_id_product_id_fkey FOREIGN KEY (tenant_id, product_id) REFERENCES public.bill_products(tenant_id, id);


--
-- Name: bill_customer_validations bill_customer_validations_tenant_id_routing_decision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_customer_validations
    ADD CONSTRAINT bill_customer_validations_tenant_id_routing_decision_id_fkey FOREIGN KEY (tenant_id, routing_decision_id) REFERENCES public.payment_provider_routing_decisions(tenant_id, id);


--
-- Name: bill_payment_quotes bill_payment_quotes_tenant_id_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_payment_quotes
    ADD CONSTRAINT bill_payment_quotes_tenant_id_product_id_fkey FOREIGN KEY (tenant_id, product_id) REFERENCES public.bill_products(tenant_id, id);


--
-- Name: bill_payment_quotes bill_payment_quotes_tenant_id_routing_decision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_payment_quotes
    ADD CONSTRAINT bill_payment_quotes_tenant_id_routing_decision_id_fkey FOREIGN KEY (tenant_id, routing_decision_id) REFERENCES public.payment_provider_routing_decisions(tenant_id, id);


--
-- Name: bill_payment_quotes bill_payment_quotes_tenant_id_validation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_payment_quotes
    ADD CONSTRAINT bill_payment_quotes_tenant_id_validation_id_fkey FOREIGN KEY (tenant_id, validation_id) REFERENCES public.bill_customer_validations(tenant_id, id);


--
-- Name: bill_transaction_status_history bill_transaction_status_histo_tenant_id_bill_transaction_i_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_transaction_status_history
    ADD CONSTRAINT bill_transaction_status_histo_tenant_id_bill_transaction_i_fkey FOREIGN KEY (tenant_id, bill_transaction_id) REFERENCES public.bill_transactions(tenant_id, id);


--
-- Name: financial_accounts fk_account_provider_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_accounts
    ADD CONSTRAINT fk_account_provider_tenant FOREIGN KEY (tenant_id, provider_id) REFERENCES public.account_providers(tenant_id, id) ON DELETE RESTRICT;


--
-- Name: account_status_history fk_account_status_history_account_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_status_history
    ADD CONSTRAINT fk_account_status_history_account_tenant FOREIGN KEY (tenant_id, account_id) REFERENCES public.financial_accounts(tenant_id, id) ON DELETE RESTRICT;


--
-- Name: payment_attempts fk_attempt_external_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_attempts
    ADD CONSTRAINT fk_attempt_external_tenant FOREIGN KEY (tenant_id, external_transfer_id) REFERENCES public.payment_external_transfers(tenant_id, id);


--
-- Name: bill_transaction_attempts fk_bill_attempt_transaction_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_transaction_attempts
    ADD CONSTRAINT fk_bill_attempt_transaction_tenant FOREIGN KEY (tenant_id, bill_transaction_id) REFERENCES public.bill_transactions(tenant_id, id);


--
-- Name: bill_catalogue_import_items fk_bill_catalogue_item_import; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_catalogue_import_items
    ADD CONSTRAINT fk_bill_catalogue_item_import FOREIGN KEY (tenant_id, import_id) REFERENCES public.bill_catalogue_imports(tenant_id, id);


--
-- Name: bill_catalogue_publications fk_bill_catalogue_publication_import; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_catalogue_publications
    ADD CONSTRAINT fk_bill_catalogue_publication_import FOREIGN KEY (tenant_id, import_id) REFERENCES public.bill_catalogue_imports(tenant_id, id);


--
-- Name: bill_products fk_bill_product_category; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_products
    ADD CONSTRAINT fk_bill_product_category FOREIGN KEY (category_id) REFERENCES public.bill_categories(id);


--
-- Name: bill_products fk_bill_product_provider; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_products
    ADD CONSTRAINT fk_bill_product_provider FOREIGN KEY (provider_id) REFERENCES public.bill_providers(id) ON DELETE RESTRICT;


--
-- Name: bill_products fk_bill_product_provider_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_products
    ADD CONSTRAINT fk_bill_product_provider_tenant FOREIGN KEY (tenant_id, provider_id) REFERENCES public.bill_providers(tenant_id, id);


--
-- Name: bill_providers fk_bill_provider_category; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_providers
    ADD CONSTRAINT fk_bill_provider_category FOREIGN KEY (category_id) REFERENCES public.bill_categories(id) ON DELETE RESTRICT;


--
-- Name: bill_provider_transactions fk_bill_provider_transaction_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_provider_transactions
    ADD CONSTRAINT fk_bill_provider_transaction_tenant FOREIGN KEY (tenant_id, bill_transaction_id) REFERENCES public.bill_transactions(tenant_id, id);


--
-- Name: bill_transactions fk_bill_transaction_category; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_transactions
    ADD CONSTRAINT fk_bill_transaction_category FOREIGN KEY (category_id) REFERENCES public.bill_categories(id) ON DELETE RESTRICT;


--
-- Name: bill_transactions fk_bill_transaction_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_transactions
    ADD CONSTRAINT fk_bill_transaction_product FOREIGN KEY (product_id) REFERENCES public.bill_products(id) ON DELETE RESTRICT;


--
-- Name: bill_transactions fk_bill_transaction_product_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_transactions
    ADD CONSTRAINT fk_bill_transaction_product_tenant FOREIGN KEY (tenant_id, product_id) REFERENCES public.bill_products(tenant_id, id);


--
-- Name: bill_transactions fk_bill_transaction_provider; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_transactions
    ADD CONSTRAINT fk_bill_transaction_provider FOREIGN KEY (provider_id) REFERENCES public.bill_providers(id) ON DELETE RESTRICT;


--
-- Name: bill_transactions fk_bill_transaction_provider_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_transactions
    ADD CONSTRAINT fk_bill_transaction_provider_tenant FOREIGN KEY (tenant_id, provider_id) REFERENCES public.bill_providers(tenant_id, id);


--
-- Name: bill_transactions fk_bill_transaction_quote_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_transactions
    ADD CONSTRAINT fk_bill_transaction_quote_tenant FOREIGN KEY (tenant_id, quote_id) REFERENCES public.bill_payment_quotes(tenant_id, id);


--
-- Name: bill_transactions fk_bill_transaction_routing_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_transactions
    ADD CONSTRAINT fk_bill_transaction_routing_tenant FOREIGN KEY (tenant_id, routing_decision_id) REFERENCES public.payment_provider_routing_decisions(tenant_id, id);


--
-- Name: bill_transactions fk_bill_transaction_source_account; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_transactions
    ADD CONSTRAINT fk_bill_transaction_source_account FOREIGN KEY (source_account_id) REFERENCES public.financial_accounts(id) ON DELETE RESTRICT;


--
-- Name: bill_transactions fk_bill_transaction_source_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_transactions
    ADD CONSTRAINT fk_bill_transaction_source_tenant FOREIGN KEY (tenant_id, source_account_id) REFERENCES public.financial_accounts(tenant_id, id);


--
-- Name: payment_collections fk_collection_account_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_collections
    ADD CONSTRAINT fk_collection_account_tenant FOREIGN KEY (tenant_id, financial_account_id) REFERENCES public.financial_accounts(tenant_id, id);


--
-- Name: payment_collections fk_collection_payment_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_collections
    ADD CONSTRAINT fk_collection_payment_tenant FOREIGN KEY (tenant_id, payment_id) REFERENCES public.payment_transactions(tenant_id, id);


--
-- Name: payment_collections fk_collection_webhook; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_collections
    ADD CONSTRAINT fk_collection_webhook FOREIGN KEY (webhook_id) REFERENCES public.payment_webhooks(id);


--
-- Name: payment_external_transfers fk_external_active_attempt_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_external_transfers
    ADD CONSTRAINT fk_external_active_attempt_tenant FOREIGN KEY (tenant_id, active_attempt_id) REFERENCES public.payment_attempts(tenant_id, id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: payment_external_transfers fk_external_beneficiary_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_external_transfers
    ADD CONSTRAINT fk_external_beneficiary_tenant FOREIGN KEY (tenant_id, beneficiary_id) REFERENCES public.beneficiaries(tenant_id, id);


--
-- Name: payment_external_transfers fk_external_payment_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_external_transfers
    ADD CONSTRAINT fk_external_payment_tenant FOREIGN KEY (tenant_id, payment_id) REFERENCES public.payment_transactions(tenant_id, id);


--
-- Name: payment_external_transfers fk_external_source_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_external_transfers
    ADD CONSTRAINT fk_external_source_tenant FOREIGN KEY (tenant_id, source_account_id) REFERENCES public.financial_accounts(tenant_id, id);


--
-- Name: payment_internal_transfers fk_internal_destination_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_internal_transfers
    ADD CONSTRAINT fk_internal_destination_tenant FOREIGN KEY (tenant_id, destination_account_id) REFERENCES public.financial_accounts(tenant_id, id);


--
-- Name: payment_internal_transfers fk_internal_payment_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_internal_transfers
    ADD CONSTRAINT fk_internal_payment_tenant FOREIGN KEY (tenant_id, payment_id) REFERENCES public.payment_transactions(tenant_id, id);


--
-- Name: payment_internal_transfers fk_internal_source_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_internal_transfers
    ADD CONSTRAINT fk_internal_source_tenant FOREIGN KEY (tenant_id, source_account_id) REFERENCES public.financial_accounts(tenant_id, id);


--
-- Name: payment_attempts fk_payment_attempt_payment_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_attempts
    ADD CONSTRAINT fk_payment_attempt_payment_tenant FOREIGN KEY (tenant_id, payment_id) REFERENCES public.payment_transactions(tenant_id, id);


--
-- Name: payment_attempts fk_payment_attempt_routing_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_attempts
    ADD CONSTRAINT fk_payment_attempt_routing_tenant FOREIGN KEY (tenant_id, routing_decision_id) REFERENCES public.payment_provider_routing_decisions(tenant_id, id);


--
-- Name: payment_transactions fk_payment_beneficiary_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT fk_payment_beneficiary_tenant FOREIGN KEY (tenant_id, beneficiary_id) REFERENCES public.beneficiaries(tenant_id, id) ON DELETE RESTRICT;


--
-- Name: payment_disputes fk_payment_dispute; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_disputes
    ADD CONSTRAINT fk_payment_dispute FOREIGN KEY (payment_id) REFERENCES public.payment_transactions(id) ON DELETE RESTRICT;


--
-- Name: payment_fees fk_payment_fee_payment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_fees
    ADD CONSTRAINT fk_payment_fee_payment FOREIGN KEY (payment_id) REFERENCES public.payment_transactions(id) ON DELETE RESTRICT;


--
-- Name: payment_parties fk_payment_party_payment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_parties
    ADD CONSTRAINT fk_payment_party_payment FOREIGN KEY (payment_id) REFERENCES public.payment_transactions(id) ON DELETE RESTRICT;


--
-- Name: payment_reversals fk_payment_reversal_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_reversals
    ADD CONSTRAINT fk_payment_reversal_tenant FOREIGN KEY (tenant_id, payment_id) REFERENCES public.payment_transactions(tenant_id, id) ON DELETE RESTRICT;


--
-- Name: payment_transactions fk_payment_source_account_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT fk_payment_source_account_tenant FOREIGN KEY (tenant_id, source_account_id) REFERENCES public.financial_accounts(tenant_id, id) ON DELETE RESTRICT;


--
-- Name: platform_revenue_adjustments fk_platform_revenue_adjustment_event; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue_adjustments
    ADD CONSTRAINT fk_platform_revenue_adjustment_event FOREIGN KEY (revenue_event_id) REFERENCES public.platform_revenue_events(id) ON DELETE RESTRICT;


--
-- Name: platform_revenue_events fk_platform_revenue_event_bill; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue_events
    ADD CONSTRAINT fk_platform_revenue_event_bill FOREIGN KEY (bill_transaction_id) REFERENCES public.bill_transactions(id) ON DELETE RESTRICT;


--
-- Name: platform_revenue_events fk_platform_revenue_event_payment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue_events
    ADD CONSTRAINT fk_platform_revenue_event_payment FOREIGN KEY (payment_id) REFERENCES public.payment_transactions(id) ON DELETE RESTRICT;


--
-- Name: platform_revenue_events fk_platform_revenue_event_reversal_of; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue_events
    ADD CONSTRAINT fk_platform_revenue_event_reversal_of FOREIGN KEY (reversal_of_event_id) REFERENCES public.platform_revenue_events(id) ON DELETE RESTRICT;


--
-- Name: platform_revenue_events fk_platform_revenue_event_reversed_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue_events
    ADD CONSTRAINT fk_platform_revenue_event_reversed_by FOREIGN KEY (reversed_by_event_id) REFERENCES public.platform_revenue_events(id) ON DELETE RESTRICT;


--
-- Name: platform_revenue_settlement_items fk_platform_revenue_settlement_item_event; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue_settlement_items
    ADD CONSTRAINT fk_platform_revenue_settlement_item_event FOREIGN KEY (revenue_event_id) REFERENCES public.platform_revenue_events(id) ON DELETE RESTRICT;


--
-- Name: platform_revenue_settlement_items fk_platform_revenue_settlement_item_settlement; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue_settlement_items
    ADD CONSTRAINT fk_platform_revenue_settlement_item_settlement FOREIGN KEY (settlement_id) REFERENCES public.platform_revenue_settlements(id) ON DELETE RESTRICT;


--
-- Name: platform_revenue_settlements fk_platform_revenue_settlement_payment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue_settlements
    ADD CONSTRAINT fk_platform_revenue_settlement_payment FOREIGN KEY (payment_id) REFERENCES public.payment_transactions(id) ON DELETE RESTRICT;


--
-- Name: platform_revenue_shares fk_platform_revenue_share_event; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue_shares
    ADD CONSTRAINT fk_platform_revenue_share_event FOREIGN KEY (revenue_event_id) REFERENCES public.platform_revenue_events(id) ON DELETE RESTRICT;


--
-- Name: account_provider_accounts fk_provider_account_provider_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_provider_accounts
    ADD CONSTRAINT fk_provider_account_provider_tenant FOREIGN KEY (tenant_id, provider_id) REFERENCES public.account_providers(tenant_id, id) ON DELETE RESTRICT;


--
-- Name: account_provider_accounts fk_provider_account_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_provider_accounts
    ADD CONSTRAINT fk_provider_account_tenant FOREIGN KEY (tenant_id, account_id) REFERENCES public.financial_accounts(tenant_id, id) ON DELETE RESTRICT;


--
-- Name: payment_provider_transactions fk_provider_payment_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_provider_transactions
    ADD CONSTRAINT fk_provider_payment_tenant FOREIGN KEY (tenant_id, payment_id) REFERENCES public.payment_transactions(tenant_id, id) ON DELETE RESTRICT;


--
-- Name: payment_reconciliation_records fk_reconciliation_payment_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_reconciliation_records
    ADD CONSTRAINT fk_reconciliation_payment_tenant FOREIGN KEY (tenant_id, payment_id) REFERENCES public.payment_transactions(tenant_id, id) ON DELETE RESTRICT;


--
-- Name: payment_reconciliation_records fk_reconciliation_revenue_settlement; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_reconciliation_records
    ADD CONSTRAINT fk_reconciliation_revenue_settlement FOREIGN KEY (platform_revenue_settlement_id) REFERENCES public.platform_revenue_settlements(id) ON DELETE RESTRICT;


--
-- Name: payment_reconciliation_records fk_reconciliation_run_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_reconciliation_records
    ADD CONSTRAINT fk_reconciliation_run_tenant FOREIGN KEY (tenant_id, run_id) REFERENCES public.payment_reconciliation_runs(tenant_id, id);


--
-- Name: virtual_account_provisioning_requests fk_va_account_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.virtual_account_provisioning_requests
    ADD CONSTRAINT fk_va_account_tenant FOREIGN KEY (tenant_id, financial_account_id) REFERENCES public.financial_accounts(tenant_id, id);


--
-- Name: virtual_account_provisioning_requests fk_va_routing_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.virtual_account_provisioning_requests
    ADD CONSTRAINT fk_va_routing_tenant FOREIGN KEY (tenant_id, routing_decision_id) REFERENCES public.payment_provider_routing_decisions(tenant_id, id);


--
-- Name: payment_collection_status_history payment_collection_status_history_tenant_id_collection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_collection_status_history
    ADD CONSTRAINT payment_collection_status_history_tenant_id_collection_id_fkey FOREIGN KEY (tenant_id, collection_id) REFERENCES public.payment_collections(tenant_id, id);


--
-- Name: payment_external_transfer_history payment_external_transfer_history_tenant_id_transfer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_external_transfer_history
    ADD CONSTRAINT payment_external_transfer_history_tenant_id_transfer_id_fkey FOREIGN KEY (tenant_id, transfer_id) REFERENCES public.payment_external_transfers(tenant_id, id);


--
-- Name: payment_internal_transfer_history payment_internal_transfer_history_tenant_id_transfer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_internal_transfer_history
    ADD CONSTRAINT payment_internal_transfer_history_tenant_id_transfer_id_fkey FOREIGN KEY (tenant_id, transfer_id) REFERENCES public.payment_internal_transfers(tenant_id, id);


--
-- Name: payment_reversal_history payment_reversal_history_tenant_id_reversal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_reversal_history
    ADD CONSTRAINT payment_reversal_history_tenant_id_reversal_id_fkey FOREIGN KEY (tenant_id, reversal_id) REFERENCES public.payment_reversals(tenant_id, id);


--
-- Name: payment_service_payout_attempts payment_service_payout_attempts_tenant_id_payout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_service_payout_attempts
    ADD CONSTRAINT payment_service_payout_attempts_tenant_id_payout_id_fkey FOREIGN KEY (tenant_id, payout_id) REFERENCES public.payment_service_payouts(tenant_id, id);


--
-- Name: account_provider_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.account_provider_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: account_provider_accounts account_provider_accounts_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY account_provider_accounts_tenant_policy ON public.account_provider_accounts USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: account_providers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.account_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: account_providers account_providers_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY account_providers_tenant_policy ON public.account_providers USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: account_status_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.account_status_history ENABLE ROW LEVEL SECURITY;

--
-- Name: account_status_history account_status_history_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY account_status_history_tenant_policy ON public.account_status_history USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: beneficiaries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;

--
-- Name: beneficiaries beneficiaries_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY beneficiaries_tenant_policy ON public.beneficiaries USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: bill_catalogue_import_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bill_catalogue_import_items ENABLE ROW LEVEL SECURITY;

--
-- Name: bill_catalogue_imports bill_catalogue_import_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bill_catalogue_import_tenant_policy ON public.bill_catalogue_imports USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: bill_catalogue_imports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bill_catalogue_imports ENABLE ROW LEVEL SECURITY;

--
-- Name: bill_catalogue_import_items bill_catalogue_item_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bill_catalogue_item_tenant_policy ON public.bill_catalogue_import_items USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: bill_catalogue_publications bill_catalogue_publication_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bill_catalogue_publication_tenant_policy ON public.bill_catalogue_publications USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: bill_catalogue_publications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bill_catalogue_publications ENABLE ROW LEVEL SECURITY;

--
-- Name: bill_customer_validations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bill_customer_validations ENABLE ROW LEVEL SECURITY;

--
-- Name: bill_payment_quotes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bill_payment_quotes ENABLE ROW LEVEL SECURITY;

--
-- Name: bill_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bill_products ENABLE ROW LEVEL SECURITY;

--
-- Name: bill_products bill_products_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bill_products_tenant_policy ON public.bill_products USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: bill_provider_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bill_provider_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: bill_provider_transactions bill_provider_transactions_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bill_provider_transactions_tenant_policy ON public.bill_provider_transactions USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: bill_providers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bill_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: bill_providers bill_providers_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bill_providers_tenant_policy ON public.bill_providers USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: bill_payment_quotes bill_quote_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bill_quote_tenant_policy ON public.bill_payment_quotes USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: bill_transaction_status_history bill_status_history_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bill_status_history_tenant_policy ON public.bill_transaction_status_history USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: bill_transaction_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bill_transaction_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: bill_transaction_attempts bill_transaction_attempts_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bill_transaction_attempts_tenant_policy ON public.bill_transaction_attempts USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: bill_transaction_status_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bill_transaction_status_history ENABLE ROW LEVEL SECURITY;

--
-- Name: bill_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bill_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: bill_transactions bill_transactions_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bill_transactions_tenant_policy ON public.bill_transactions USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: bill_customer_validations bill_validation_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bill_validation_tenant_policy ON public.bill_customer_validations USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: bill_webhooks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bill_webhooks ENABLE ROW LEVEL SECURITY;

--
-- Name: bill_webhooks bill_webhooks_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bill_webhooks_tenant_policy ON public.bill_webhooks USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: payment_collection_status_history collection_history_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY collection_history_tenant_policy ON public.payment_collection_status_history USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: payment_collections collections_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY collections_tenant_policy ON public.payment_collections USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: payment_external_transfer_history external_transfer_history_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY external_transfer_history_tenant_policy ON public.payment_external_transfer_history USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: payment_external_transfers external_transfer_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY external_transfer_tenant_policy ON public.payment_external_transfers USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: financial_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: financial_accounts financial_accounts_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY financial_accounts_tenant_policy ON public.financial_accounts USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: payment_internal_transfer_history internal_transfer_history_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY internal_transfer_history_tenant_policy ON public.payment_internal_transfer_history USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: payment_internal_transfers internal_transfer_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY internal_transfer_tenant_policy ON public.payment_internal_transfers USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: payment_outbox_events outbox_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY outbox_tenant_policy ON public.payment_outbox_events USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: payment_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_attempts payment_attempts_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_attempts_tenant_policy ON public.payment_attempts USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: payment_collection_status_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_collection_status_history ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_collections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_collections ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_disputes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_disputes ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_disputes payment_disputes_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_disputes_tenant_policy ON public.payment_disputes USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: payment_external_transfer_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_external_transfer_history ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_external_transfers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_external_transfers ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_fees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_fees ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_fees payment_fees_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_fees_tenant_policy ON public.payment_fees USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: payment_idempotency_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_idempotency_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_idempotency_keys payment_idempotency_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_idempotency_tenant_policy ON public.payment_idempotency_keys USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: payment_inbox_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_inbox_events ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_inbox_events payment_inbox_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_inbox_tenant_policy ON public.payment_inbox_events USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: payment_internal_transfer_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_internal_transfer_history ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_internal_transfers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_internal_transfers ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_outbox_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_outbox_events ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_parties; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_parties ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_parties payment_parties_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_parties_tenant_policy ON public.payment_parties USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: payment_provider_routing_decisions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_provider_routing_decisions ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_provider_routing_decisions payment_provider_routing_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_provider_routing_tenant_policy ON public.payment_provider_routing_decisions USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: payment_provider_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_provider_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_provider_transactions payment_provider_transactions_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_provider_transactions_tenant_policy ON public.payment_provider_transactions USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: payment_reconciliation_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_reconciliation_records ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_reconciliation_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_reconciliation_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_reversal_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_reversal_history ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_reversals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_reversals ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_reversals payment_reversals_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_reversals_tenant_policy ON public.payment_reversals USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: payment_service_payout_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_service_payout_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_service_payouts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_service_payouts ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_transactions payment_transactions_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_transactions_tenant_policy ON public.payment_transactions USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: payment_webhooks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_webhooks ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_webhooks payment_webhooks_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_webhooks_tenant_policy ON public.payment_webhooks USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: platform_revenue_adjustments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_revenue_adjustments ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_revenue_adjustments platform_revenue_adjustments_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY platform_revenue_adjustments_tenant_policy ON public.platform_revenue_adjustments USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: platform_revenue_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_revenue_events ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_revenue_events platform_revenue_events_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY platform_revenue_events_tenant_policy ON public.platform_revenue_events USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: platform_revenue_settlement_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_revenue_settlement_items ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_revenue_settlement_items platform_revenue_settlement_items_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY platform_revenue_settlement_items_tenant_policy ON public.platform_revenue_settlement_items USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: platform_revenue_settlements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_revenue_settlements ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_revenue_settlements platform_revenue_settlements_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY platform_revenue_settlements_tenant_policy ON public.platform_revenue_settlements USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: platform_revenue_shares; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_revenue_shares ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_revenue_shares platform_revenue_shares_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY platform_revenue_shares_tenant_policy ON public.platform_revenue_shares USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: payment_reconciliation_runs reconciliation_run_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reconciliation_run_tenant_policy ON public.payment_reconciliation_runs USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: payment_reconciliation_records reconciliation_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reconciliation_tenant_policy ON public.payment_reconciliation_records USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: payment_reversal_history reversal_history_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reversal_history_tenant_policy ON public.payment_reversal_history USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: payment_service_payout_attempts service_payout_attempt_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_payout_attempt_tenant_policy ON public.payment_service_payout_attempts USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: payment_service_payouts service_payout_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_payout_tenant_policy ON public.payment_service_payouts USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: virtual_account_provisioning_requests va_provisioning_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY va_provisioning_tenant_policy ON public.virtual_account_provisioning_requests USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: virtual_account_provisioning_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.virtual_account_provisioning_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO parc_payment_runtime;
GRANT USAGE ON SCHEMA public TO parc_payment_worker;
GRANT USAGE ON SCHEMA public TO parc_payment_readonly;


--
-- Name: FUNCTION claim_due_bill_inquiries(p_worker_id text, p_limit integer, p_lease_seconds integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.claim_due_bill_inquiries(p_worker_id text, p_limit integer, p_lease_seconds integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_due_bill_inquiries(p_worker_id text, p_limit integer, p_lease_seconds integer) TO parc_payment_worker;


--
-- Name: TABLE account_provider_accounts; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.account_provider_accounts TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.account_provider_accounts TO parc_payment_worker;
GRANT SELECT ON TABLE public.account_provider_accounts TO parc_payment_readonly;


--
-- Name: TABLE account_providers; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.account_providers TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.account_providers TO parc_payment_worker;
GRANT SELECT ON TABLE public.account_providers TO parc_payment_readonly;


--
-- Name: TABLE account_status_history; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.account_status_history TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.account_status_history TO parc_payment_worker;
GRANT SELECT ON TABLE public.account_status_history TO parc_payment_readonly;


--
-- Name: TABLE beneficiaries; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.beneficiaries TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.beneficiaries TO parc_payment_worker;
GRANT SELECT ON TABLE public.beneficiaries TO parc_payment_readonly;


--
-- Name: TABLE bill_catalogue_import_items; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.bill_catalogue_import_items TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.bill_catalogue_import_items TO parc_payment_worker;
GRANT SELECT ON TABLE public.bill_catalogue_import_items TO parc_payment_readonly;


--
-- Name: TABLE bill_catalogue_imports; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.bill_catalogue_imports TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.bill_catalogue_imports TO parc_payment_worker;
GRANT SELECT ON TABLE public.bill_catalogue_imports TO parc_payment_readonly;


--
-- Name: TABLE bill_catalogue_publications; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.bill_catalogue_publications TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.bill_catalogue_publications TO parc_payment_worker;
GRANT SELECT ON TABLE public.bill_catalogue_publications TO parc_payment_readonly;


--
-- Name: TABLE bill_categories; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.bill_categories TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.bill_categories TO parc_payment_worker;
GRANT SELECT ON TABLE public.bill_categories TO parc_payment_readonly;


--
-- Name: TABLE bill_customer_validations; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.bill_customer_validations TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.bill_customer_validations TO parc_payment_worker;
GRANT SELECT ON TABLE public.bill_customer_validations TO parc_payment_readonly;


--
-- Name: TABLE bill_payment_quotes; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.bill_payment_quotes TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.bill_payment_quotes TO parc_payment_worker;
GRANT SELECT ON TABLE public.bill_payment_quotes TO parc_payment_readonly;


--
-- Name: TABLE bill_products; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.bill_products TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.bill_products TO parc_payment_worker;
GRANT SELECT ON TABLE public.bill_products TO parc_payment_readonly;


--
-- Name: TABLE bill_provider_transactions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.bill_provider_transactions TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.bill_provider_transactions TO parc_payment_worker;
GRANT SELECT ON TABLE public.bill_provider_transactions TO parc_payment_readonly;


--
-- Name: TABLE bill_providers; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.bill_providers TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.bill_providers TO parc_payment_worker;
GRANT SELECT ON TABLE public.bill_providers TO parc_payment_readonly;


--
-- Name: TABLE bill_transaction_attempts; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.bill_transaction_attempts TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.bill_transaction_attempts TO parc_payment_worker;
GRANT SELECT ON TABLE public.bill_transaction_attempts TO parc_payment_readonly;


--
-- Name: TABLE bill_transaction_status_history; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.bill_transaction_status_history TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.bill_transaction_status_history TO parc_payment_worker;
GRANT SELECT ON TABLE public.bill_transaction_status_history TO parc_payment_readonly;


--
-- Name: TABLE bill_transactions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.bill_transactions TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.bill_transactions TO parc_payment_worker;
GRANT SELECT ON TABLE public.bill_transactions TO parc_payment_readonly;


--
-- Name: TABLE bill_webhooks; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.bill_webhooks TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.bill_webhooks TO parc_payment_worker;
GRANT SELECT ON TABLE public.bill_webhooks TO parc_payment_readonly;


--
-- Name: TABLE financial_accounts; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.financial_accounts TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.financial_accounts TO parc_payment_worker;
GRANT SELECT ON TABLE public.financial_accounts TO parc_payment_readonly;


--
-- Name: TABLE payment_attempts; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_attempts TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_attempts TO parc_payment_worker;
GRANT SELECT ON TABLE public.payment_attempts TO parc_payment_readonly;


--
-- Name: TABLE payment_collection_status_history; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_collection_status_history TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_collection_status_history TO parc_payment_worker;
GRANT SELECT ON TABLE public.payment_collection_status_history TO parc_payment_readonly;


--
-- Name: TABLE payment_collections; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_collections TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_collections TO parc_payment_worker;
GRANT SELECT ON TABLE public.payment_collections TO parc_payment_readonly;


--
-- Name: TABLE payment_disputes; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_disputes TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_disputes TO parc_payment_worker;
GRANT SELECT ON TABLE public.payment_disputes TO parc_payment_readonly;


--
-- Name: TABLE payment_external_transfer_history; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_external_transfer_history TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_external_transfer_history TO parc_payment_worker;
GRANT SELECT ON TABLE public.payment_external_transfer_history TO parc_payment_readonly;


--
-- Name: TABLE payment_external_transfers; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_external_transfers TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_external_transfers TO parc_payment_worker;
GRANT SELECT ON TABLE public.payment_external_transfers TO parc_payment_readonly;


--
-- Name: TABLE payment_fees; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_fees TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_fees TO parc_payment_worker;
GRANT SELECT ON TABLE public.payment_fees TO parc_payment_readonly;


--
-- Name: TABLE payment_idempotency_keys; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_idempotency_keys TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_idempotency_keys TO parc_payment_worker;
GRANT SELECT ON TABLE public.payment_idempotency_keys TO parc_payment_readonly;


--
-- Name: TABLE payment_inbox_events; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_inbox_events TO parc_payment_worker;
GRANT SELECT ON TABLE public.payment_inbox_events TO parc_payment_readonly;


--
-- Name: TABLE payment_internal_transfer_history; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_internal_transfer_history TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_internal_transfer_history TO parc_payment_worker;
GRANT SELECT ON TABLE public.payment_internal_transfer_history TO parc_payment_readonly;


--
-- Name: TABLE payment_internal_transfers; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_internal_transfers TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_internal_transfers TO parc_payment_worker;
GRANT SELECT ON TABLE public.payment_internal_transfers TO parc_payment_readonly;


--
-- Name: TABLE payment_outbox_events; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_outbox_events TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_outbox_events TO parc_payment_worker;
GRANT SELECT ON TABLE public.payment_outbox_events TO parc_payment_readonly;


--
-- Name: TABLE payment_parties; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_parties TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_parties TO parc_payment_worker;
GRANT SELECT ON TABLE public.payment_parties TO parc_payment_readonly;


--
-- Name: TABLE payment_provider_routing_decisions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_provider_routing_decisions TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_provider_routing_decisions TO parc_payment_worker;
GRANT SELECT ON TABLE public.payment_provider_routing_decisions TO parc_payment_readonly;


--
-- Name: TABLE payment_provider_transactions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_provider_transactions TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_provider_transactions TO parc_payment_worker;
GRANT SELECT ON TABLE public.payment_provider_transactions TO parc_payment_readonly;


--
-- Name: TABLE payment_reconciliation_records; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_reconciliation_records TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_reconciliation_records TO parc_payment_worker;
GRANT SELECT ON TABLE public.payment_reconciliation_records TO parc_payment_readonly;


--
-- Name: TABLE payment_reconciliation_runs; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_reconciliation_runs TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_reconciliation_runs TO parc_payment_worker;
GRANT SELECT ON TABLE public.payment_reconciliation_runs TO parc_payment_readonly;


--
-- Name: TABLE payment_reversal_history; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_reversal_history TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_reversal_history TO parc_payment_worker;
GRANT SELECT ON TABLE public.payment_reversal_history TO parc_payment_readonly;


--
-- Name: TABLE payment_reversals; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_reversals TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_reversals TO parc_payment_worker;
GRANT SELECT ON TABLE public.payment_reversals TO parc_payment_readonly;


--
-- Name: TABLE payment_service_payout_attempts; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_service_payout_attempts TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_service_payout_attempts TO parc_payment_worker;
GRANT SELECT ON TABLE public.payment_service_payout_attempts TO parc_payment_readonly;


--
-- Name: TABLE payment_service_payouts; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_service_payouts TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_service_payouts TO parc_payment_worker;
GRANT SELECT ON TABLE public.payment_service_payouts TO parc_payment_readonly;


--
-- Name: TABLE payment_transactions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_transactions TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_transactions TO parc_payment_worker;
GRANT SELECT ON TABLE public.payment_transactions TO parc_payment_readonly;


--
-- Name: TABLE payment_webhooks; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_webhooks TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.payment_webhooks TO parc_payment_worker;
GRANT SELECT ON TABLE public.payment_webhooks TO parc_payment_readonly;


--
-- Name: TABLE platform_revenue_adjustments; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.platform_revenue_adjustments TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.platform_revenue_adjustments TO parc_payment_worker;
GRANT SELECT ON TABLE public.platform_revenue_adjustments TO parc_payment_readonly;


--
-- Name: TABLE platform_revenue_events; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.platform_revenue_events TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.platform_revenue_events TO parc_payment_worker;
GRANT SELECT ON TABLE public.platform_revenue_events TO parc_payment_readonly;


--
-- Name: TABLE platform_revenue_settlement_items; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.platform_revenue_settlement_items TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.platform_revenue_settlement_items TO parc_payment_worker;
GRANT SELECT ON TABLE public.platform_revenue_settlement_items TO parc_payment_readonly;


--
-- Name: TABLE platform_revenue_settlements; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.platform_revenue_settlements TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.platform_revenue_settlements TO parc_payment_worker;
GRANT SELECT ON TABLE public.platform_revenue_settlements TO parc_payment_readonly;


--
-- Name: TABLE platform_revenue_shares; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.platform_revenue_shares TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.platform_revenue_shares TO parc_payment_worker;
GRANT SELECT ON TABLE public.platform_revenue_shares TO parc_payment_readonly;


--
-- Name: TABLE virtual_account_provisioning_requests; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.virtual_account_provisioning_requests TO parc_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.virtual_account_provisioning_requests TO parc_payment_worker;
GRANT SELECT ON TABLE public.virtual_account_provisioning_requests TO parc_payment_readonly;


--
-- PostgreSQL database dump complete
--

