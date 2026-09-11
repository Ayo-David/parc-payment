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
    'PLATFORM_REVENUE_REFUND'
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
    'IGNORED'
);


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
-- Name: bill_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bill_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    provider_id uuid NOT NULL,
    product_code character varying(100) NOT NULL,
    product_name character varying(200) NOT NULL,
    description text,
    amount numeric(20,2),
    min_amount numeric(20,2),
    max_amount numeric(20,2),
    currency character(3) DEFAULT 'NGN'::bpchar NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT chk_bill_product_amount CHECK (((amount IS NULL) OR (amount >= (0)::numeric))),
    CONSTRAINT chk_bill_product_currency CHECK ((currency ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT chk_bill_product_range CHECK ((((min_amount IS NULL) OR (min_amount >= (0)::numeric)) AND ((max_amount IS NULL) OR ((max_amount >= (0)::numeric) AND ((min_amount IS NULL) OR (max_amount >= min_amount))))))
);


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
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


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
    deleted_at timestamp with time zone
);


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
    CONSTRAINT chk_bill_attempt_number CHECK ((attempt_number > 0))
);


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
    amount numeric(20,2) NOT NULL,
    fee_amount numeric(20,2) DEFAULT 0 NOT NULL,
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
    CONSTRAINT chk_bill_transaction_amount CHECK ((amount > (0)::numeric)),
    CONSTRAINT chk_bill_transaction_currency CHECK ((currency ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT chk_bill_transaction_fee CHECK ((fee_amount >= (0)::numeric))
);


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
    processing_error text
);


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
    CONSTRAINT chk_account_currency CHECK ((currency ~ '^[A-Z]{3}$'::text))
);


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
    CONSTRAINT chk_payment_attempt_number CHECK ((attempt_number > 0))
);


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
    CONSTRAINT chk_payment_dispute_status CHECK (((status)::text = ANY ((ARRAY['OPEN'::character varying, 'UNDER_REVIEW'::character varying, 'RESOLVED'::character varying, 'REJECTED'::character varying, 'CLOSED'::character varying])::text[])))
);


--
-- Name: payment_fees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_fees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    payment_id uuid NOT NULL,
    fee_type public.fee_type_enum NOT NULL,
    amount numeric(20,2) NOT NULL,
    currency character(3) DEFAULT 'NGN'::bpchar NOT NULL,
    fee_bearer public.fee_bearer_enum,
    description character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_payment_fee_amount CHECK ((amount >= (0)::numeric)),
    CONSTRAINT chk_payment_fee_currency CHECK ((currency ~ '^[A-Z]{3}$'::text))
);


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
    CONSTRAINT chk_outbox_status CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'PUBLISHED'::character varying, 'FAILED'::character varying])::text[])))
);


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
    CONSTRAINT chk_payment_party_role CHECK (((party_role)::text = ANY ((ARRAY['SENDER'::character varying, 'RECIPIENT'::character varying, 'PLATFORM'::character varying, 'TENANT'::character varying, 'PROVIDER'::character varying])::text[])))
);


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
    provider_amount numeric(20,2),
    internal_amount numeric(20,2),
    provider_fee_amount numeric(20,2),
    expected_net_amount numeric(20,2),
    actual_settlement_amount numeric(20,2),
    fee_bearer public.fee_bearer_enum,
    currency character(3),
    status public.reconciliation_status_enum NOT NULL,
    difference_amount numeric(20,2),
    reconciliation_date date NOT NULL,
    provider_payload jsonb,
    resolution_notes text,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_reconciliation_amounts CHECK ((((provider_amount IS NULL) OR (provider_amount >= (0)::numeric)) AND ((internal_amount IS NULL) OR (internal_amount >= (0)::numeric)) AND ((provider_fee_amount IS NULL) OR (provider_fee_amount >= (0)::numeric)) AND ((expected_net_amount IS NULL) OR (expected_net_amount >= (0)::numeric)) AND ((actual_settlement_amount IS NULL) OR (actual_settlement_amount >= (0)::numeric)))),
    CONSTRAINT chk_reconciliation_currency CHECK (((currency IS NULL) OR (currency ~ '^[A-Z]{3}$'::text))),
    CONSTRAINT chk_reconciliation_difference CHECK (((difference_amount IS NULL) OR (difference_amount >= (0)::numeric))),
    CONSTRAINT chk_reconciliation_resource CHECK (((payment_id IS NOT NULL) OR (platform_revenue_settlement_id IS NOT NULL) OR (resource_id IS NOT NULL)))
);


--
-- Name: payment_reversals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_reversals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    payment_id uuid NOT NULL,
    amount numeric(20,2) NOT NULL,
    currency character(3) DEFAULT 'NGN'::bpchar NOT NULL,
    reason text,
    status public.reversal_status_enum DEFAULT 'PENDING'::public.reversal_status_enum NOT NULL,
    provider_reference character varying(200),
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    created_by uuid,
    CONSTRAINT chk_reversal_amount CHECK ((amount > (0)::numeric)),
    CONSTRAINT chk_reversal_currency CHECK ((currency ~ '^[A-Z]{3}$'::text))
);


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
    amount numeric(20,2) NOT NULL,
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
    CONSTRAINT chk_payment_amount CHECK ((amount > (0)::numeric)),
    CONSTRAINT chk_payment_currency CHECK ((currency ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT chk_payment_customer_scope CHECK (((customer_id IS NOT NULL) OR (payment_type = ANY (ARRAY['PAYOUT'::public.payment_type_enum, 'PLATFORM_REVENUE_SETTLEMENT'::public.payment_type_enum, 'PLATFORM_REVENUE_REFUND'::public.payment_type_enum]))))
);


--
-- Name: payment_webhooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_webhooks (
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
    processing_error text
);


--
-- Name: platform_revenue_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_revenue_adjustments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    revenue_event_id uuid NOT NULL,
    adjustment_type public.revenue_adjustment_type_enum NOT NULL,
    amount numeric(20,2) NOT NULL,
    currency character(3) DEFAULT 'NGN'::bpchar NOT NULL,
    reason_code character varying(100),
    reason text NOT NULL,
    ledger_posting_status public.ledger_posting_status_enum DEFAULT 'NOT_REQUESTED'::public.ledger_posting_status_enum NOT NULL,
    ledger_transaction_id uuid,
    idempotency_key character varying(255) NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_platform_revenue_adjustment_amount CHECK ((amount > (0)::numeric)),
    CONSTRAINT chk_platform_revenue_adjustment_currency CHECK ((currency ~ '^[A-Z]{3}$'::text))
);


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
    basis_amount numeric(20,2) NOT NULL,
    percentage_rate numeric(12,6),
    fixed_amount numeric(20,2),
    gross_revenue_amount numeric(20,2) NOT NULL,
    fee_amount numeric(20,2) DEFAULT 0 NOT NULL,
    tax_amount numeric(20,2) DEFAULT 0 NOT NULL,
    net_revenue_amount numeric(20,2) NOT NULL,
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
    CONSTRAINT chk_platform_revenue_amounts CHECK (((gross_revenue_amount >= (0)::numeric) AND (fee_amount >= (0)::numeric) AND (tax_amount >= (0)::numeric) AND (net_revenue_amount >= (0)::numeric) AND (net_revenue_amount = ((gross_revenue_amount - fee_amount) - tax_amount)))),
    CONSTRAINT chk_platform_revenue_basis_amount CHECK ((basis_amount >= (0)::numeric)),
    CONSTRAINT chk_platform_revenue_currency CHECK ((currency ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT chk_platform_revenue_earned_at CHECK (((status <> 'EARNED'::public.platform_revenue_status_enum) OR (earned_at IS NOT NULL))),
    CONSTRAINT chk_platform_revenue_fixed CHECK (((fixed_amount IS NULL) OR (fixed_amount >= (0)::numeric))),
    CONSTRAINT chk_platform_revenue_percentage CHECK (((percentage_rate IS NULL) OR ((percentage_rate >= (0)::numeric) AND (percentage_rate <= (100)::numeric)))),
    CONSTRAINT chk_platform_revenue_reversal CHECK (((status <> 'REVERSED'::public.platform_revenue_status_enum) OR ((reversed_by_event_id IS NOT NULL) AND (reversed_at IS NOT NULL)))),
    CONSTRAINT chk_platform_revenue_reversal_links CHECK (((reversal_of_event_id IS NULL) OR (reversal_of_event_id <> id)))
);


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
    amount numeric(20,2) NOT NULL,
    currency character(3) DEFAULT 'NGN'::bpchar NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_platform_revenue_settlement_item_amount CHECK ((amount > (0)::numeric)),
    CONSTRAINT chk_platform_revenue_settlement_item_currency CHECK ((currency ~ '^[A-Z]{3}$'::text))
);


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
    gross_revenue_amount numeric(20,2) DEFAULT 0 NOT NULL,
    adjustment_amount numeric(20,2) DEFAULT 0 NOT NULL,
    settlement_fee_amount numeric(20,2) DEFAULT 0 NOT NULL,
    tax_amount numeric(20,2) DEFAULT 0 NOT NULL,
    net_settlement_amount numeric(20,2) DEFAULT 0 NOT NULL,
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
    CONSTRAINT chk_platform_revenue_settlement_amounts CHECK (((gross_revenue_amount >= (0)::numeric) AND (settlement_fee_amount >= (0)::numeric) AND (tax_amount >= (0)::numeric) AND (net_settlement_amount >= (0)::numeric) AND (net_settlement_amount = (((gross_revenue_amount + adjustment_amount) - settlement_fee_amount) - tax_amount)))),
    CONSTRAINT chk_platform_revenue_settlement_completion CHECK (((status <> 'SETTLED'::public.revenue_settlement_status_enum) OR ((payment_id IS NOT NULL) AND (completed_at IS NOT NULL)))),
    CONSTRAINT chk_platform_revenue_settlement_currency CHECK ((currency ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT chk_platform_revenue_settlement_period CHECK ((period_end >= period_start)),
    CONSTRAINT chk_platform_revenue_settlement_retry CHECK ((retry_count >= 0))
);


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
    share_basis_amount numeric(20,2) NOT NULL,
    parc_share_rate numeric(12,6) NOT NULL,
    parc_share_amount numeric(20,2) NOT NULL,
    tenant_retained_amount numeric(20,2),
    provider_share_amount numeric(20,2) DEFAULT 0 NOT NULL,
    partner_share_amount numeric(20,2) DEFAULT 0 NOT NULL,
    currency character(3) DEFAULT 'NGN'::bpchar NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_platform_revenue_share_amounts CHECK (((parc_share_amount >= (0)::numeric) AND ((tenant_retained_amount IS NULL) OR (tenant_retained_amount >= (0)::numeric)) AND (provider_share_amount >= (0)::numeric) AND (partner_share_amount >= (0)::numeric))),
    CONSTRAINT chk_platform_revenue_share_basis CHECK ((share_basis_amount >= (0)::numeric)),
    CONSTRAINT chk_platform_revenue_share_currency CHECK ((currency ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT chk_platform_revenue_share_rate CHECK (((parc_share_rate >= (0)::numeric) AND (parc_share_rate <= (100)::numeric)))
);


--
-- Name: TABLE platform_revenue_shares; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.platform_revenue_shares IS 'One-to-one revenue-share economics for platform_revenue_events whose revenue_model is REVENUE_SHARE.';


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
-- Name: payment_disputes payment_disputes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_disputes
    ADD CONSTRAINT payment_disputes_pkey PRIMARY KEY (id);


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
-- Name: payment_reversals payment_reversals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_reversals
    ADD CONSTRAINT payment_reversals_pkey PRIMARY KEY (id);


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
-- Name: bill_transaction_attempts uq_bill_attempt_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_transaction_attempts
    ADD CONSTRAINT uq_bill_attempt_number UNIQUE (bill_transaction_id, attempt_number);


--
-- Name: bill_products uq_bill_product; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_products
    ADD CONSTRAINT uq_bill_product UNIQUE (provider_id, product_code);


--
-- Name: bill_providers uq_bill_provider; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_providers
    ADD CONSTRAINT uq_bill_provider UNIQUE (tenant_id, provider_code);


--
-- Name: bill_provider_transactions uq_bill_provider_transaction; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_provider_transactions
    ADD CONSTRAINT uq_bill_provider_transaction UNIQUE (provider_code, provider_transaction_id);


--
-- Name: bill_transactions uq_bill_transaction_reference; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_transactions
    ADD CONSTRAINT uq_bill_transaction_reference UNIQUE (tenant_id, reference);


--
-- Name: bill_webhooks uq_bill_webhook_event; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_webhooks
    ADD CONSTRAINT uq_bill_webhook_event UNIQUE (provider_code, event_reference);


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
-- Name: payment_attempts uq_payment_attempt_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_attempts
    ADD CONSTRAINT uq_payment_attempt_number UNIQUE (payment_id, attempt_number);


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
-- Name: payment_transactions uq_payment_reference; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT uq_payment_reference UNIQUE (tenant_id, reference);


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
-- Name: payment_provider_transactions uq_provider_transaction; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_provider_transactions
    ADD CONSTRAINT uq_provider_transaction UNIQUE (provider_code, provider_transaction_id);


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
-- Name: platform_revenue_settlements trg_enforce_new_platform_revenue_settlement_pending; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_new_platform_revenue_settlement_pending BEFORE INSERT ON public.platform_revenue_settlements FOR EACH ROW EXECUTE FUNCTION public.enforce_new_platform_revenue_settlement_pending();


--
-- Name: financial_accounts trg_financial_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_financial_accounts_updated_at BEFORE UPDATE ON public.financial_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: payment_disputes trg_payment_disputes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_payment_disputes_updated_at BEFORE UPDATE ON public.payment_disputes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: payment_provider_transactions trg_payment_provider_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_payment_provider_transactions_updated_at BEFORE UPDATE ON public.payment_provider_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


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
-- Name: platform_revenue_events trg_protect_earned_platform_revenue_event; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_protect_earned_platform_revenue_event BEFORE UPDATE ON public.platform_revenue_events FOR EACH ROW EXECUTE FUNCTION public.protect_earned_platform_revenue_event();


--
-- Name: platform_revenue_shares trg_protect_platform_revenue_share_economics; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_protect_platform_revenue_share_economics BEFORE UPDATE ON public.platform_revenue_shares FOR EACH ROW EXECUTE FUNCTION public.protect_platform_revenue_share_economics();


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
-- Name: financial_accounts fk_account_provider; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_accounts
    ADD CONSTRAINT fk_account_provider FOREIGN KEY (provider_id) REFERENCES public.account_providers(id) ON DELETE RESTRICT;


--
-- Name: account_status_history fk_account_status_history_account; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_status_history
    ADD CONSTRAINT fk_account_status_history_account FOREIGN KEY (account_id) REFERENCES public.financial_accounts(id) ON DELETE RESTRICT;


--
-- Name: bill_transaction_attempts fk_bill_attempt_transaction; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_transaction_attempts
    ADD CONSTRAINT fk_bill_attempt_transaction FOREIGN KEY (bill_transaction_id) REFERENCES public.bill_transactions(id) ON DELETE RESTRICT;


--
-- Name: bill_products fk_bill_product_provider; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_products
    ADD CONSTRAINT fk_bill_product_provider FOREIGN KEY (provider_id) REFERENCES public.bill_providers(id) ON DELETE RESTRICT;


--
-- Name: bill_providers fk_bill_provider_category; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_providers
    ADD CONSTRAINT fk_bill_provider_category FOREIGN KEY (category_id) REFERENCES public.bill_categories(id) ON DELETE RESTRICT;


--
-- Name: bill_provider_transactions fk_bill_provider_transaction; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_provider_transactions
    ADD CONSTRAINT fk_bill_provider_transaction FOREIGN KEY (bill_transaction_id) REFERENCES public.bill_transactions(id) ON DELETE RESTRICT;


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
-- Name: bill_transactions fk_bill_transaction_provider; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_transactions
    ADD CONSTRAINT fk_bill_transaction_provider FOREIGN KEY (provider_id) REFERENCES public.bill_providers(id) ON DELETE RESTRICT;


--
-- Name: bill_transactions fk_bill_transaction_source_account; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_transactions
    ADD CONSTRAINT fk_bill_transaction_source_account FOREIGN KEY (source_account_id) REFERENCES public.financial_accounts(id) ON DELETE RESTRICT;


--
-- Name: payment_attempts fk_payment_attempt_payment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_attempts
    ADD CONSTRAINT fk_payment_attempt_payment FOREIGN KEY (payment_id) REFERENCES public.payment_transactions(id) ON DELETE RESTRICT;


--
-- Name: payment_transactions fk_payment_beneficiary; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT fk_payment_beneficiary FOREIGN KEY (beneficiary_id) REFERENCES public.beneficiaries(id) ON DELETE RESTRICT;


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
-- Name: payment_reversals fk_payment_reversal; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_reversals
    ADD CONSTRAINT fk_payment_reversal FOREIGN KEY (payment_id) REFERENCES public.payment_transactions(id) ON DELETE RESTRICT;


--
-- Name: payment_transactions fk_payment_source_account; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT fk_payment_source_account FOREIGN KEY (source_account_id) REFERENCES public.financial_accounts(id) ON DELETE RESTRICT;


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
-- Name: account_provider_accounts fk_provider_account; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_provider_accounts
    ADD CONSTRAINT fk_provider_account FOREIGN KEY (account_id) REFERENCES public.financial_accounts(id) ON DELETE RESTRICT;


--
-- Name: account_provider_accounts fk_provider_account_provider; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_provider_accounts
    ADD CONSTRAINT fk_provider_account_provider FOREIGN KEY (provider_id) REFERENCES public.account_providers(id) ON DELETE RESTRICT;


--
-- Name: payment_provider_transactions fk_provider_payment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_provider_transactions
    ADD CONSTRAINT fk_provider_payment FOREIGN KEY (payment_id) REFERENCES public.payment_transactions(id) ON DELETE RESTRICT;


--
-- Name: payment_reconciliation_records fk_reconciliation_payment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_reconciliation_records
    ADD CONSTRAINT fk_reconciliation_payment FOREIGN KEY (payment_id) REFERENCES public.payment_transactions(id) ON DELETE RESTRICT;


--
-- Name: payment_reconciliation_records fk_reconciliation_revenue_settlement; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_reconciliation_records
    ADD CONSTRAINT fk_reconciliation_revenue_settlement FOREIGN KEY (platform_revenue_settlement_id) REFERENCES public.platform_revenue_settlements(id) ON DELETE RESTRICT;


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
-- Name: bill_transaction_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bill_transaction_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: bill_transaction_attempts bill_transaction_attempts_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bill_transaction_attempts_tenant_policy ON public.bill_transaction_attempts USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: bill_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bill_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: bill_transactions bill_transactions_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bill_transactions_tenant_policy ON public.bill_transactions USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: bill_webhooks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bill_webhooks ENABLE ROW LEVEL SECURITY;

--
-- Name: bill_webhooks bill_webhooks_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bill_webhooks_tenant_policy ON public.bill_webhooks USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- Name: financial_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: financial_accounts financial_accounts_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY financial_accounts_tenant_policy ON public.financial_accounts USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


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
-- Name: payment_disputes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_disputes ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_disputes payment_disputes_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_disputes_tenant_policy ON public.payment_disputes USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


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
-- Name: payment_reversals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_reversals ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_reversals payment_reversals_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_reversals_tenant_policy ON public.payment_reversals USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


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
-- Name: payment_reconciliation_records reconciliation_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reconciliation_tenant_policy ON public.payment_reconciliation_records USING ((tenant_id = public.current_tenant_id())) WITH CHECK ((tenant_id = public.current_tenant_id()));


--
-- PostgreSQL database dump complete
--

