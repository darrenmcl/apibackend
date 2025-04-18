--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4 (Ubuntu 17.4-1.pgdg24.04+2)
-- Dumped by pg_dump version 17.4 (Ubuntu 17.4-1.pgdg24.04+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: claim_reason_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.claim_reason_enum AS ENUM (
    'missing_item',
    'wrong_item',
    'production_failure',
    'other'
);


ALTER TYPE public.claim_reason_enum OWNER TO postgres;

--
-- Name: order_claim_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.order_claim_type_enum AS ENUM (
    'refund',
    'replace'
);


ALTER TYPE public.order_claim_type_enum OWNER TO postgres;

--
-- Name: order_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.order_status_enum AS ENUM (
    'pending',
    'completed',
    'draft',
    'archived',
    'canceled',
    'requires_action',
    'paid'
);


ALTER TYPE public.order_status_enum OWNER TO postgres;

--
-- Name: return_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.return_status_enum AS ENUM (
    'open',
    'requested',
    'received',
    'partially_received',
    'canceled'
);


ALTER TYPE public.return_status_enum OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_holder; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account_holder (
    id text NOT NULL,
    provider_id text NOT NULL,
    external_id text NOT NULL,
    email text,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.account_holder OWNER TO postgres;

--
-- Name: api_key; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.api_key (
    id text NOT NULL,
    token text NOT NULL,
    salt text NOT NULL,
    redacted text NOT NULL,
    title text NOT NULL,
    type text NOT NULL,
    last_used_at timestamp with time zone,
    created_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_by text,
    revoked_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT api_key_type_check CHECK ((type = ANY (ARRAY['publishable'::text, 'secret'::text])))
);


ALTER TABLE public.api_key OWNER TO postgres;

--
-- Name: application_method_buy_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.application_method_buy_rules (
    application_method_id text NOT NULL,
    promotion_rule_id text NOT NULL
);


ALTER TABLE public.application_method_buy_rules OWNER TO postgres;

--
-- Name: application_method_target_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.application_method_target_rules (
    application_method_id text NOT NULL,
    promotion_rule_id text NOT NULL
);


ALTER TABLE public.application_method_target_rules OWNER TO postgres;

--
-- Name: auth_identity; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auth_identity (
    id text NOT NULL,
    app_metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.auth_identity OWNER TO postgres;

--
-- Name: blog_posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blog_posts (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    authorid integer NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    published boolean DEFAULT false,
    slug character varying(255),
    image character varying(512)
);


ALTER TABLE public.blog_posts OWNER TO postgres;

--
-- Name: blog_posts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.blog_posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.blog_posts_id_seq OWNER TO postgres;

--
-- Name: blog_posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.blog_posts_id_seq OWNED BY public.blog_posts.id;


--
-- Name: capture; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.capture (
    id text NOT NULL,
    amount numeric NOT NULL,
    raw_amount jsonb NOT NULL,
    payment_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by text,
    metadata jsonb
);


ALTER TABLE public.capture OWNER TO postgres;

--
-- Name: cart; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cart (
    id text NOT NULL,
    region_id text,
    customer_id text,
    sales_channel_id text,
    email text,
    currency_code text NOT NULL,
    shipping_address_id text,
    billing_address_id text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    completed_at timestamp with time zone
);


ALTER TABLE public.cart OWNER TO postgres;

--
-- Name: cart_address; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cart_address (
    id text NOT NULL,
    customer_id text,
    company text,
    first_name text,
    last_name text,
    address_1 text,
    address_2 text,
    city text,
    country_code text,
    province text,
    postal_code text,
    phone text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.cart_address OWNER TO postgres;

--
-- Name: cart_line_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cart_line_item (
    id text NOT NULL,
    cart_id text NOT NULL,
    title text NOT NULL,
    subtitle text,
    thumbnail text,
    quantity integer NOT NULL,
    variant_id text,
    product_id text,
    product_title text,
    product_description text,
    product_subtitle text,
    product_type text,
    product_collection text,
    product_handle text,
    variant_sku text,
    variant_barcode text,
    variant_title text,
    variant_option_values jsonb,
    requires_shipping boolean DEFAULT true NOT NULL,
    is_discountable boolean DEFAULT true NOT NULL,
    is_tax_inclusive boolean DEFAULT false NOT NULL,
    compare_at_unit_price numeric,
    raw_compare_at_unit_price jsonb,
    unit_price numeric NOT NULL,
    raw_unit_price jsonb NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    product_type_id text,
    is_custom_price boolean DEFAULT false NOT NULL,
    CONSTRAINT cart_line_item_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


ALTER TABLE public.cart_line_item OWNER TO postgres;

--
-- Name: cart_line_item_adjustment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cart_line_item_adjustment (
    id text NOT NULL,
    description text,
    promotion_id text,
    code text,
    amount numeric NOT NULL,
    raw_amount jsonb NOT NULL,
    provider_id text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    item_id text,
    CONSTRAINT cart_line_item_adjustment_check CHECK ((amount >= (0)::numeric))
);


ALTER TABLE public.cart_line_item_adjustment OWNER TO postgres;

--
-- Name: cart_line_item_tax_line; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cart_line_item_tax_line (
    id text NOT NULL,
    description text,
    tax_rate_id text,
    code text NOT NULL,
    rate real NOT NULL,
    provider_id text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    item_id text
);


ALTER TABLE public.cart_line_item_tax_line OWNER TO postgres;

--
-- Name: cart_payment_collection; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cart_payment_collection (
    cart_id character varying(255) NOT NULL,
    payment_collection_id character varying(255) NOT NULL,
    id character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.cart_payment_collection OWNER TO postgres;

--
-- Name: cart_promotion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cart_promotion (
    cart_id character varying(255) NOT NULL,
    promotion_id character varying(255) NOT NULL,
    id character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.cart_promotion OWNER TO postgres;

--
-- Name: cart_shipping_method; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cart_shipping_method (
    id text NOT NULL,
    cart_id text NOT NULL,
    name text NOT NULL,
    description jsonb,
    amount numeric NOT NULL,
    raw_amount jsonb NOT NULL,
    is_tax_inclusive boolean DEFAULT false NOT NULL,
    shipping_option_id text,
    data jsonb,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT cart_shipping_method_check CHECK ((amount >= (0)::numeric))
);


ALTER TABLE public.cart_shipping_method OWNER TO postgres;

--
-- Name: cart_shipping_method_adjustment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cart_shipping_method_adjustment (
    id text NOT NULL,
    description text,
    promotion_id text,
    code text,
    amount numeric NOT NULL,
    raw_amount jsonb NOT NULL,
    provider_id text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    shipping_method_id text
);


ALTER TABLE public.cart_shipping_method_adjustment OWNER TO postgres;

--
-- Name: cart_shipping_method_tax_line; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cart_shipping_method_tax_line (
    id text NOT NULL,
    description text,
    tax_rate_id text,
    code text NOT NULL,
    rate real NOT NULL,
    provider_id text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    shipping_method_id text
);


ALTER TABLE public.cart_shipping_method_tax_line OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: currency; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.currency (
    code text NOT NULL,
    symbol text NOT NULL,
    symbol_native text NOT NULL,
    decimal_digits integer DEFAULT 0 NOT NULL,
    rounding numeric DEFAULT 0 NOT NULL,
    raw_rounding jsonb NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.currency OWNER TO postgres;

--
-- Name: customer; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer (
    id text NOT NULL,
    company_name text,
    first_name text,
    last_name text,
    email text,
    phone text,
    has_account boolean DEFAULT false NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by text
);


ALTER TABLE public.customer OWNER TO postgres;

--
-- Name: customer_account_holder; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_account_holder (
    customer_id character varying(255) NOT NULL,
    account_holder_id character varying(255) NOT NULL,
    id character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.customer_account_holder OWNER TO postgres;

--
-- Name: customer_address; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_address (
    id text NOT NULL,
    customer_id text NOT NULL,
    address_name text,
    is_default_shipping boolean DEFAULT false NOT NULL,
    is_default_billing boolean DEFAULT false NOT NULL,
    company text,
    first_name text,
    last_name text,
    address_1 text,
    address_2 text,
    city text,
    country_code text,
    province text,
    postal_code text,
    phone text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.customer_address OWNER TO postgres;

--
-- Name: customer_group; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_group (
    id text NOT NULL,
    name text NOT NULL,
    metadata jsonb,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.customer_group OWNER TO postgres;

--
-- Name: customer_group_customer; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_group_customer (
    id text NOT NULL,
    customer_id text NOT NULL,
    customer_group_id text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by text,
    deleted_at timestamp with time zone
);


ALTER TABLE public.customer_group_customer OWNER TO postgres;

--
-- Name: fulfillment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fulfillment (
    id text NOT NULL,
    location_id text NOT NULL,
    packed_at timestamp with time zone,
    shipped_at timestamp with time zone,
    delivered_at timestamp with time zone,
    canceled_at timestamp with time zone,
    data jsonb,
    provider_id text,
    shipping_option_id text,
    metadata jsonb,
    delivery_address_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    marked_shipped_by text,
    created_by text,
    requires_shipping boolean DEFAULT true NOT NULL
);


ALTER TABLE public.fulfillment OWNER TO postgres;

--
-- Name: fulfillment_address; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fulfillment_address (
    id text NOT NULL,
    company text,
    first_name text,
    last_name text,
    address_1 text,
    address_2 text,
    city text,
    country_code text,
    province text,
    postal_code text,
    phone text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.fulfillment_address OWNER TO postgres;

--
-- Name: fulfillment_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fulfillment_item (
    id text NOT NULL,
    title text NOT NULL,
    sku text NOT NULL,
    barcode text NOT NULL,
    quantity numeric NOT NULL,
    raw_quantity jsonb NOT NULL,
    line_item_id text,
    inventory_item_id text,
    fulfillment_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.fulfillment_item OWNER TO postgres;

--
-- Name: fulfillment_label; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fulfillment_label (
    id text NOT NULL,
    tracking_number text NOT NULL,
    tracking_url text NOT NULL,
    label_url text NOT NULL,
    fulfillment_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.fulfillment_label OWNER TO postgres;

--
-- Name: fulfillment_provider; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fulfillment_provider (
    id text NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.fulfillment_provider OWNER TO postgres;

--
-- Name: fulfillment_set; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fulfillment_set (
    id text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.fulfillment_set OWNER TO postgres;

--
-- Name: geo_zone; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.geo_zone (
    id text NOT NULL,
    type text DEFAULT 'country'::text NOT NULL,
    country_code text NOT NULL,
    province_code text,
    city text,
    service_zone_id text NOT NULL,
    postal_expression jsonb,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT geo_zone_type_check CHECK ((type = ANY (ARRAY['country'::text, 'province'::text, 'city'::text, 'zip'::text])))
);


ALTER TABLE public.geo_zone OWNER TO postgres;

--
-- Name: image; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.image (
    id text NOT NULL,
    url text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    rank integer DEFAULT 0 NOT NULL,
    product_id text NOT NULL
);


ALTER TABLE public.image OWNER TO postgres;

--
-- Name: inventory_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_item (
    id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    sku text,
    origin_country text,
    hs_code text,
    mid_code text,
    material text,
    weight integer,
    length integer,
    height integer,
    width integer,
    requires_shipping boolean DEFAULT true NOT NULL,
    description text,
    title text,
    thumbnail text,
    metadata jsonb
);


ALTER TABLE public.inventory_item OWNER TO postgres;

--
-- Name: inventory_level; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_level (
    id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    inventory_item_id text NOT NULL,
    location_id text NOT NULL,
    stocked_quantity numeric DEFAULT 0 NOT NULL,
    reserved_quantity numeric DEFAULT 0 NOT NULL,
    incoming_quantity numeric DEFAULT 0 NOT NULL,
    metadata jsonb,
    raw_stocked_quantity jsonb,
    raw_reserved_quantity jsonb,
    raw_incoming_quantity jsonb
);


ALTER TABLE public.inventory_level OWNER TO postgres;

--
-- Name: invite; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invite (
    id text NOT NULL,
    email text NOT NULL,
    accepted boolean DEFAULT false NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.invite OWNER TO postgres;

--
-- Name: link_module_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.link_module_migrations (
    id integer NOT NULL,
    table_name character varying(255) NOT NULL,
    link_descriptor jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.link_module_migrations OWNER TO postgres;

--
-- Name: link_module_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.link_module_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.link_module_migrations_id_seq OWNER TO postgres;

--
-- Name: link_module_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.link_module_migrations_id_seq OWNED BY public.link_module_migrations.id;


--
-- Name: location_fulfillment_provider; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.location_fulfillment_provider (
    stock_location_id character varying(255) NOT NULL,
    fulfillment_provider_id character varying(255) NOT NULL,
    id character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.location_fulfillment_provider OWNER TO postgres;

--
-- Name: location_fulfillment_set; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.location_fulfillment_set (
    stock_location_id character varying(255) NOT NULL,
    fulfillment_set_id character varying(255) NOT NULL,
    id character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.location_fulfillment_set OWNER TO postgres;

--
-- Name: mikro_orm_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mikro_orm_migrations (
    id integer NOT NULL,
    name character varying(255),
    executed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.mikro_orm_migrations OWNER TO postgres;

--
-- Name: mikro_orm_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mikro_orm_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mikro_orm_migrations_id_seq OWNER TO postgres;

--
-- Name: mikro_orm_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mikro_orm_migrations_id_seq OWNED BY public.mikro_orm_migrations.id;


--
-- Name: notification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification (
    id text NOT NULL,
    "to" text NOT NULL,
    channel text NOT NULL,
    template text NOT NULL,
    data jsonb,
    trigger_type text,
    resource_id text,
    resource_type text,
    receiver_id text,
    original_notification_id text,
    idempotency_key text,
    external_id text,
    provider_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    status text DEFAULT 'pending'::text NOT NULL,
    CONSTRAINT notification_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'success'::text, 'failure'::text])))
);


ALTER TABLE public.notification OWNER TO postgres;

--
-- Name: notification_provider; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_provider (
    id text NOT NULL,
    handle text NOT NULL,
    name text NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    channels text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.notification_provider OWNER TO postgres;

--
-- Name: order; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."order" (
    id text NOT NULL,
    region_id text,
    display_id integer,
    customer_id text,
    version integer DEFAULT 1 NOT NULL,
    sales_channel_id text,
    status public.order_status_enum DEFAULT 'pending'::public.order_status_enum NOT NULL,
    is_draft_order boolean DEFAULT false NOT NULL,
    email text,
    currency_code text NOT NULL,
    shipping_address_id text,
    billing_address_id text,
    no_notification boolean,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    canceled_at timestamp with time zone,
    payment_intent_id text,
    paid_at timestamp without time zone
);


ALTER TABLE public."order" OWNER TO postgres;

--
-- Name: COLUMN "order".payment_intent_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."order".payment_intent_id IS 'Stripe payment intent ID for successful payments';


--
-- Name: COLUMN "order".paid_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."order".paid_at IS 'Timestamp when the order was marked as paid';


--
-- Name: order_address; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_address (
    id text NOT NULL,
    customer_id text,
    company text,
    first_name text,
    last_name text,
    address_1 text,
    address_2 text,
    city text,
    country_code text,
    province text,
    postal_code text,
    phone text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.order_address OWNER TO postgres;

--
-- Name: order_cart; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_cart (
    order_id character varying(255) NOT NULL,
    cart_id character varying(255) NOT NULL,
    id character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.order_cart OWNER TO postgres;

--
-- Name: order_change; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_change (
    id text NOT NULL,
    order_id text NOT NULL,
    version integer NOT NULL,
    description text,
    status text DEFAULT 'pending'::text NOT NULL,
    internal_note text,
    created_by text,
    requested_by text,
    requested_at timestamp with time zone,
    confirmed_by text,
    confirmed_at timestamp with time zone,
    declined_by text,
    declined_reason text,
    metadata jsonb,
    declined_at timestamp with time zone,
    canceled_by text,
    canceled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    change_type text,
    deleted_at timestamp with time zone,
    return_id text,
    claim_id text,
    exchange_id text,
    CONSTRAINT order_change_status_check CHECK ((status = ANY (ARRAY['confirmed'::text, 'declined'::text, 'requested'::text, 'pending'::text, 'canceled'::text])))
);


ALTER TABLE public.order_change OWNER TO postgres;

--
-- Name: order_change_action; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_change_action (
    id text NOT NULL,
    order_id text,
    version integer,
    ordering bigint NOT NULL,
    order_change_id text,
    reference text,
    reference_id text,
    action text NOT NULL,
    details jsonb,
    amount numeric,
    raw_amount jsonb,
    internal_note text,
    applied boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    return_id text,
    claim_id text,
    exchange_id text
);


ALTER TABLE public.order_change_action OWNER TO postgres;

--
-- Name: order_change_action_ordering_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_change_action_ordering_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_change_action_ordering_seq OWNER TO postgres;

--
-- Name: order_change_action_ordering_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_change_action_ordering_seq OWNED BY public.order_change_action.ordering;


--
-- Name: order_claim; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_claim (
    id text NOT NULL,
    order_id text NOT NULL,
    return_id text,
    order_version integer NOT NULL,
    display_id integer NOT NULL,
    type public.order_claim_type_enum NOT NULL,
    no_notification boolean,
    refund_amount numeric,
    raw_refund_amount jsonb,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    canceled_at timestamp with time zone,
    created_by text
);


ALTER TABLE public.order_claim OWNER TO postgres;

--
-- Name: order_claim_display_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_claim_display_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_claim_display_id_seq OWNER TO postgres;

--
-- Name: order_claim_display_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_claim_display_id_seq OWNED BY public.order_claim.display_id;


--
-- Name: order_claim_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_claim_item (
    id text NOT NULL,
    claim_id text NOT NULL,
    item_id text NOT NULL,
    is_additional_item boolean DEFAULT false NOT NULL,
    reason public.claim_reason_enum,
    quantity numeric NOT NULL,
    raw_quantity jsonb NOT NULL,
    note text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.order_claim_item OWNER TO postgres;

--
-- Name: order_claim_item_image; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_claim_item_image (
    id text NOT NULL,
    claim_item_id text NOT NULL,
    url text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.order_claim_item_image OWNER TO postgres;

--
-- Name: order_credit_line; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_credit_line (
    id text NOT NULL,
    order_id text NOT NULL,
    reference text,
    reference_id text,
    amount numeric NOT NULL,
    raw_amount jsonb NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.order_credit_line OWNER TO postgres;

--
-- Name: order_display_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_display_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_display_id_seq OWNER TO postgres;

--
-- Name: order_display_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_display_id_seq OWNED BY public."order".display_id;


--
-- Name: order_exchange; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_exchange (
    id text NOT NULL,
    order_id text NOT NULL,
    return_id text,
    order_version integer NOT NULL,
    display_id integer NOT NULL,
    no_notification boolean,
    allow_backorder boolean DEFAULT false NOT NULL,
    difference_due numeric,
    raw_difference_due jsonb,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    canceled_at timestamp with time zone,
    created_by text
);


ALTER TABLE public.order_exchange OWNER TO postgres;

--
-- Name: order_exchange_display_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_exchange_display_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_exchange_display_id_seq OWNER TO postgres;

--
-- Name: order_exchange_display_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_exchange_display_id_seq OWNED BY public.order_exchange.display_id;


--
-- Name: order_exchange_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_exchange_item (
    id text NOT NULL,
    exchange_id text NOT NULL,
    item_id text NOT NULL,
    quantity numeric NOT NULL,
    raw_quantity jsonb NOT NULL,
    note text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.order_exchange_item OWNER TO postgres;

--
-- Name: order_fulfillment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_fulfillment (
    order_id character varying(255) NOT NULL,
    fulfillment_id character varying(255) NOT NULL,
    id character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.order_fulfillment OWNER TO postgres;

--
-- Name: order_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_item (
    id text NOT NULL,
    order_id text NOT NULL,
    version integer NOT NULL,
    item_id text NOT NULL,
    quantity numeric NOT NULL,
    raw_quantity jsonb NOT NULL,
    fulfilled_quantity numeric NOT NULL,
    raw_fulfilled_quantity jsonb NOT NULL,
    shipped_quantity numeric NOT NULL,
    raw_shipped_quantity jsonb NOT NULL,
    return_requested_quantity numeric NOT NULL,
    raw_return_requested_quantity jsonb NOT NULL,
    return_received_quantity numeric NOT NULL,
    raw_return_received_quantity jsonb NOT NULL,
    return_dismissed_quantity numeric NOT NULL,
    raw_return_dismissed_quantity jsonb NOT NULL,
    written_off_quantity numeric NOT NULL,
    raw_written_off_quantity jsonb NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    delivered_quantity numeric DEFAULT 0 NOT NULL,
    raw_delivered_quantity jsonb NOT NULL,
    unit_price numeric,
    raw_unit_price jsonb,
    compare_at_unit_price numeric,
    raw_compare_at_unit_price jsonb
);


ALTER TABLE public.order_item OWNER TO postgres;

--
-- Name: order_line_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_line_item (
    id text NOT NULL,
    totals_id text,
    title text NOT NULL,
    subtitle text,
    thumbnail text,
    variant_id text,
    product_id text,
    product_title text,
    product_description text,
    product_subtitle text,
    product_type text,
    product_collection text,
    product_handle text,
    variant_sku text,
    variant_barcode text,
    variant_title text,
    variant_option_values jsonb,
    requires_shipping boolean DEFAULT true NOT NULL,
    is_discountable boolean DEFAULT true NOT NULL,
    is_tax_inclusive boolean DEFAULT false NOT NULL,
    compare_at_unit_price numeric,
    raw_compare_at_unit_price jsonb,
    unit_price numeric NOT NULL,
    raw_unit_price jsonb NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    is_custom_price boolean DEFAULT false NOT NULL,
    product_type_id text
);


ALTER TABLE public.order_line_item OWNER TO postgres;

--
-- Name: order_line_item_adjustment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_line_item_adjustment (
    id text NOT NULL,
    description text,
    promotion_id text,
    code text,
    amount numeric NOT NULL,
    raw_amount jsonb NOT NULL,
    provider_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    item_id text NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.order_line_item_adjustment OWNER TO postgres;

--
-- Name: order_line_item_tax_line; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_line_item_tax_line (
    id text NOT NULL,
    description text,
    tax_rate_id text,
    code text NOT NULL,
    rate numeric NOT NULL,
    raw_rate jsonb NOT NULL,
    provider_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    item_id text NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.order_line_item_tax_line OWNER TO postgres;

--
-- Name: order_payment_collection; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_payment_collection (
    order_id character varying(255) NOT NULL,
    payment_collection_id character varying(255) NOT NULL,
    id character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.order_payment_collection OWNER TO postgres;

--
-- Name: order_promotion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_promotion (
    order_id character varying(255) NOT NULL,
    promotion_id character varying(255) NOT NULL,
    id character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.order_promotion OWNER TO postgres;

--
-- Name: order_shipping; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_shipping (
    id text NOT NULL,
    order_id text NOT NULL,
    version integer NOT NULL,
    shipping_method_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    return_id text,
    claim_id text,
    exchange_id text
);


ALTER TABLE public.order_shipping OWNER TO postgres;

--
-- Name: order_shipping_method; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_shipping_method (
    id text NOT NULL,
    name text NOT NULL,
    description jsonb,
    amount numeric NOT NULL,
    raw_amount jsonb NOT NULL,
    is_tax_inclusive boolean DEFAULT false NOT NULL,
    shipping_option_id text,
    data jsonb,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    is_custom_amount boolean DEFAULT false NOT NULL
);


ALTER TABLE public.order_shipping_method OWNER TO postgres;

--
-- Name: order_shipping_method_adjustment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_shipping_method_adjustment (
    id text NOT NULL,
    description text,
    promotion_id text,
    code text,
    amount numeric NOT NULL,
    raw_amount jsonb NOT NULL,
    provider_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    shipping_method_id text NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.order_shipping_method_adjustment OWNER TO postgres;

--
-- Name: order_shipping_method_tax_line; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_shipping_method_tax_line (
    id text NOT NULL,
    description text,
    tax_rate_id text,
    code text NOT NULL,
    rate numeric NOT NULL,
    raw_rate jsonb NOT NULL,
    provider_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    shipping_method_id text NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.order_shipping_method_tax_line OWNER TO postgres;

--
-- Name: order_summary; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_summary (
    id text NOT NULL,
    order_id text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    totals jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.order_summary OWNER TO postgres;

--
-- Name: order_transaction; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_transaction (
    id text NOT NULL,
    order_id text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    amount numeric NOT NULL,
    raw_amount jsonb NOT NULL,
    currency_code text NOT NULL,
    reference text,
    reference_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    return_id text,
    claim_id text,
    exchange_id text
);


ALTER TABLE public.order_transaction OWNER TO postgres;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    user_id integer,
    total numeric NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: payment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment (
    id text NOT NULL,
    amount numeric NOT NULL,
    raw_amount jsonb NOT NULL,
    currency_code text NOT NULL,
    provider_id text NOT NULL,
    data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    captured_at timestamp with time zone,
    canceled_at timestamp with time zone,
    payment_collection_id text NOT NULL,
    payment_session_id text NOT NULL,
    metadata jsonb
);


ALTER TABLE public.payment OWNER TO postgres;

--
-- Name: payment_collection; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_collection (
    id text NOT NULL,
    currency_code text NOT NULL,
    amount numeric NOT NULL,
    raw_amount jsonb NOT NULL,
    authorized_amount numeric,
    raw_authorized_amount jsonb,
    captured_amount numeric,
    raw_captured_amount jsonb,
    refunded_amount numeric,
    raw_refunded_amount jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    completed_at timestamp with time zone,
    status text DEFAULT 'not_paid'::text NOT NULL,
    metadata jsonb,
    CONSTRAINT payment_collection_status_check CHECK ((status = ANY (ARRAY['not_paid'::text, 'awaiting'::text, 'authorized'::text, 'partially_authorized'::text, 'canceled'::text, 'failed'::text, 'completed'::text])))
);


ALTER TABLE public.payment_collection OWNER TO postgres;

--
-- Name: payment_collection_payment_providers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_collection_payment_providers (
    payment_collection_id text NOT NULL,
    payment_provider_id text NOT NULL
);


ALTER TABLE public.payment_collection_payment_providers OWNER TO postgres;

--
-- Name: payment_provider; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_provider (
    id text NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.payment_provider OWNER TO postgres;

--
-- Name: payment_session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_session (
    id text NOT NULL,
    currency_code text NOT NULL,
    amount numeric NOT NULL,
    raw_amount jsonb NOT NULL,
    provider_id text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    context jsonb,
    status text DEFAULT 'pending'::text NOT NULL,
    authorized_at timestamp with time zone,
    payment_collection_id text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT payment_session_status_check CHECK ((status = ANY (ARRAY['authorized'::text, 'captured'::text, 'pending'::text, 'requires_more'::text, 'error'::text, 'canceled'::text])))
);


ALTER TABLE public.payment_session OWNER TO postgres;

--
-- Name: price; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.price (
    id text NOT NULL,
    title text,
    price_set_id text NOT NULL,
    currency_code text NOT NULL,
    raw_amount jsonb NOT NULL,
    rules_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    price_list_id text,
    amount numeric NOT NULL,
    min_quantity integer,
    max_quantity integer
);


ALTER TABLE public.price OWNER TO postgres;

--
-- Name: price_list; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.price_list (
    id text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    rules_count integer DEFAULT 0,
    title text NOT NULL,
    description text NOT NULL,
    type text DEFAULT 'sale'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT price_list_status_check CHECK ((status = ANY (ARRAY['active'::text, 'draft'::text]))),
    CONSTRAINT price_list_type_check CHECK ((type = ANY (ARRAY['sale'::text, 'override'::text])))
);


ALTER TABLE public.price_list OWNER TO postgres;

--
-- Name: price_list_rule; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.price_list_rule (
    id text NOT NULL,
    price_list_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    value jsonb,
    attribute text DEFAULT ''::text NOT NULL
);


ALTER TABLE public.price_list_rule OWNER TO postgres;

--
-- Name: price_preference; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.price_preference (
    id text NOT NULL,
    attribute text NOT NULL,
    value text,
    is_tax_inclusive boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.price_preference OWNER TO postgres;

--
-- Name: price_rule; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.price_rule (
    id text NOT NULL,
    value text NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    price_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    attribute text DEFAULT ''::text NOT NULL,
    operator text DEFAULT 'eq'::text NOT NULL,
    CONSTRAINT price_rule_operator_check CHECK ((operator = ANY (ARRAY['gte'::text, 'lte'::text, 'gt'::text, 'lt'::text, 'eq'::text])))
);


ALTER TABLE public.price_rule OWNER TO postgres;

--
-- Name: price_set; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.price_set (
    id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.price_set OWNER TO postgres;

--
-- Name: product; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product (
    id text NOT NULL,
    title text NOT NULL,
    handle text NOT NULL,
    subtitle text,
    description text,
    is_giftcard boolean DEFAULT false NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    thumbnail text,
    weight text,
    length text,
    height text,
    width text,
    origin_country text,
    hs_code text,
    mid_code text,
    material text,
    collection_id text,
    type_id text,
    discountable boolean DEFAULT true NOT NULL,
    external_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    metadata jsonb,
    CONSTRAINT product_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'proposed'::text, 'published'::text, 'rejected'::text])))
);


ALTER TABLE public.product OWNER TO postgres;

--
-- Name: product_category; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_category (
    id text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    handle text NOT NULL,
    mpath text NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    is_internal boolean DEFAULT false NOT NULL,
    rank integer DEFAULT 0 NOT NULL,
    parent_category_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    metadata jsonb
);


ALTER TABLE public.product_category OWNER TO postgres;

--
-- Name: product_category_product; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_category_product (
    product_id text NOT NULL,
    product_category_id text NOT NULL
);


ALTER TABLE public.product_category_product OWNER TO postgres;

--
-- Name: product_collection; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_collection (
    id text NOT NULL,
    title text NOT NULL,
    handle text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.product_collection OWNER TO postgres;

--
-- Name: product_option; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_option (
    id text NOT NULL,
    title text NOT NULL,
    product_id text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.product_option OWNER TO postgres;

--
-- Name: product_option_value; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_option_value (
    id text NOT NULL,
    value text NOT NULL,
    option_id text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.product_option_value OWNER TO postgres;

--
-- Name: product_sales_channel; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_sales_channel (
    product_id character varying(255) NOT NULL,
    sales_channel_id character varying(255) NOT NULL,
    id character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.product_sales_channel OWNER TO postgres;

--
-- Name: product_shipping_profile; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_shipping_profile (
    product_id character varying(255) NOT NULL,
    shipping_profile_id character varying(255) NOT NULL,
    id character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.product_shipping_profile OWNER TO postgres;

--
-- Name: product_tag; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_tag (
    id text NOT NULL,
    value text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.product_tag OWNER TO postgres;

--
-- Name: product_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_tags (
    product_id text NOT NULL,
    product_tag_id text NOT NULL
);


ALTER TABLE public.product_tags OWNER TO postgres;

--
-- Name: product_type; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_type (
    id text NOT NULL,
    value text NOT NULL,
    metadata json,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.product_type OWNER TO postgres;

--
-- Name: product_variant; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_variant (
    id text NOT NULL,
    title text NOT NULL,
    sku text,
    barcode text,
    ean text,
    upc text,
    allow_backorder boolean DEFAULT false NOT NULL,
    manage_inventory boolean DEFAULT true NOT NULL,
    hs_code text,
    origin_country text,
    mid_code text,
    material text,
    weight integer,
    length integer,
    height integer,
    width integer,
    metadata jsonb,
    variant_rank integer DEFAULT 0,
    product_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.product_variant OWNER TO postgres;

--
-- Name: product_variant_inventory_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_variant_inventory_item (
    variant_id character varying(255) NOT NULL,
    inventory_item_id character varying(255) NOT NULL,
    id character varying(255) NOT NULL,
    required_quantity integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.product_variant_inventory_item OWNER TO postgres;

--
-- Name: product_variant_option; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_variant_option (
    variant_id text NOT NULL,
    option_value_id text NOT NULL
);


ALTER TABLE public.product_variant_option OWNER TO postgres;

--
-- Name: product_variant_price_set; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_variant_price_set (
    variant_id character varying(255) NOT NULL,
    price_set_id character varying(255) NOT NULL,
    id character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.product_variant_price_set OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    price numeric NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    image character varying(512) DEFAULT NULL::character varying,
    featured boolean DEFAULT false,
    updated_at timestamp with time zone,
    slug character varying(255),
    category_id integer,
    is_digital boolean DEFAULT false,
    s3_file_key character varying(1024),
    requires_llm_generation boolean DEFAULT false
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: promotion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.promotion (
    id text NOT NULL,
    code text NOT NULL,
    campaign_id text,
    is_automatic boolean DEFAULT false NOT NULL,
    type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    status text DEFAULT 'draft'::text NOT NULL,
    CONSTRAINT promotion_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'inactive'::text]))),
    CONSTRAINT promotion_type_check CHECK ((type = ANY (ARRAY['standard'::text, 'buyget'::text])))
);


ALTER TABLE public.promotion OWNER TO postgres;

--
-- Name: promotion_application_method; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.promotion_application_method (
    id text NOT NULL,
    value numeric,
    raw_value jsonb,
    max_quantity integer,
    apply_to_quantity integer,
    buy_rules_min_quantity integer,
    type text NOT NULL,
    target_type text NOT NULL,
    allocation text,
    promotion_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    currency_code text,
    CONSTRAINT promotion_application_method_allocation_check CHECK ((allocation = ANY (ARRAY['each'::text, 'across'::text]))),
    CONSTRAINT promotion_application_method_target_type_check CHECK ((target_type = ANY (ARRAY['order'::text, 'shipping_methods'::text, 'items'::text]))),
    CONSTRAINT promotion_application_method_type_check CHECK ((type = ANY (ARRAY['fixed'::text, 'percentage'::text])))
);


ALTER TABLE public.promotion_application_method OWNER TO postgres;

--
-- Name: promotion_campaign; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.promotion_campaign (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    campaign_identifier text NOT NULL,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.promotion_campaign OWNER TO postgres;

--
-- Name: promotion_campaign_budget; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.promotion_campaign_budget (
    id text NOT NULL,
    type text NOT NULL,
    campaign_id text NOT NULL,
    "limit" numeric,
    raw_limit jsonb,
    used numeric DEFAULT 0 NOT NULL,
    raw_used jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    currency_code text,
    CONSTRAINT promotion_campaign_budget_type_check CHECK ((type = ANY (ARRAY['spend'::text, 'usage'::text])))
);


ALTER TABLE public.promotion_campaign_budget OWNER TO postgres;

--
-- Name: promotion_promotion_rule; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.promotion_promotion_rule (
    promotion_id text NOT NULL,
    promotion_rule_id text NOT NULL
);


ALTER TABLE public.promotion_promotion_rule OWNER TO postgres;

--
-- Name: promotion_rule; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.promotion_rule (
    id text NOT NULL,
    description text,
    attribute text NOT NULL,
    operator text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT promotion_rule_operator_check CHECK ((operator = ANY (ARRAY['gte'::text, 'lte'::text, 'gt'::text, 'lt'::text, 'eq'::text, 'ne'::text, 'in'::text])))
);


ALTER TABLE public.promotion_rule OWNER TO postgres;

--
-- Name: promotion_rule_value; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.promotion_rule_value (
    id text NOT NULL,
    promotion_rule_id text NOT NULL,
    value text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.promotion_rule_value OWNER TO postgres;

--
-- Name: provider_identity; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.provider_identity (
    id text NOT NULL,
    entity_id text NOT NULL,
    provider text NOT NULL,
    auth_identity_id text NOT NULL,
    user_metadata jsonb,
    provider_metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.provider_identity OWNER TO postgres;

--
-- Name: publishable_api_key_sales_channel; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.publishable_api_key_sales_channel (
    publishable_key_id character varying(255) NOT NULL,
    sales_channel_id character varying(255) NOT NULL,
    id character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.publishable_api_key_sales_channel OWNER TO postgres;

--
-- Name: refund; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refund (
    id text NOT NULL,
    amount numeric NOT NULL,
    raw_amount jsonb NOT NULL,
    payment_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by text,
    metadata jsonb,
    refund_reason_id text,
    note text
);


ALTER TABLE public.refund OWNER TO postgres;

--
-- Name: refund_reason; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refund_reason (
    id text NOT NULL,
    label text NOT NULL,
    description text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.refund_reason OWNER TO postgres;

--
-- Name: region; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.region (
    id text NOT NULL,
    name text NOT NULL,
    currency_code text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    automatic_taxes boolean DEFAULT true NOT NULL
);


ALTER TABLE public.region OWNER TO postgres;

--
-- Name: region_country; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.region_country (
    iso_2 text NOT NULL,
    iso_3 text NOT NULL,
    num_code text NOT NULL,
    name text NOT NULL,
    display_name text NOT NULL,
    region_id text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.region_country OWNER TO postgres;

--
-- Name: region_payment_provider; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.region_payment_provider (
    region_id character varying(255) NOT NULL,
    payment_provider_id character varying(255) NOT NULL,
    id character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.region_payment_provider OWNER TO postgres;

--
-- Name: reservation_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reservation_item (
    id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    line_item_id text,
    location_id text NOT NULL,
    quantity numeric NOT NULL,
    external_id text,
    description text,
    created_by text,
    metadata jsonb,
    inventory_item_id text NOT NULL,
    allow_backorder boolean DEFAULT false,
    raw_quantity jsonb
);


ALTER TABLE public.reservation_item OWNER TO postgres;

--
-- Name: return; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.return (
    id text NOT NULL,
    order_id text NOT NULL,
    claim_id text,
    exchange_id text,
    order_version integer NOT NULL,
    display_id integer NOT NULL,
    status public.return_status_enum DEFAULT 'open'::public.return_status_enum NOT NULL,
    no_notification boolean,
    refund_amount numeric,
    raw_refund_amount jsonb,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    received_at timestamp with time zone,
    canceled_at timestamp with time zone,
    location_id text,
    requested_at timestamp with time zone,
    created_by text
);


ALTER TABLE public.return OWNER TO postgres;

--
-- Name: return_display_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.return_display_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.return_display_id_seq OWNER TO postgres;

--
-- Name: return_display_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.return_display_id_seq OWNED BY public.return.display_id;


--
-- Name: return_fulfillment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.return_fulfillment (
    return_id character varying(255) NOT NULL,
    fulfillment_id character varying(255) NOT NULL,
    id character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.return_fulfillment OWNER TO postgres;

--
-- Name: return_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.return_item (
    id text NOT NULL,
    return_id text NOT NULL,
    reason_id text,
    item_id text NOT NULL,
    quantity numeric NOT NULL,
    raw_quantity jsonb NOT NULL,
    received_quantity numeric DEFAULT 0 NOT NULL,
    raw_received_quantity jsonb NOT NULL,
    note text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    damaged_quantity numeric DEFAULT 0 NOT NULL,
    raw_damaged_quantity jsonb NOT NULL
);


ALTER TABLE public.return_item OWNER TO postgres;

--
-- Name: return_reason; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.return_reason (
    id character varying NOT NULL,
    value character varying NOT NULL,
    label character varying NOT NULL,
    description character varying,
    metadata jsonb,
    parent_return_reason_id character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.return_reason OWNER TO postgres;

--
-- Name: sales_channel; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_channel (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    is_disabled boolean DEFAULT false NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.sales_channel OWNER TO postgres;

--
-- Name: sales_channel_stock_location; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_channel_stock_location (
    sales_channel_id character varying(255) NOT NULL,
    stock_location_id character varying(255) NOT NULL,
    id character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.sales_channel_stock_location OWNER TO postgres;

--
-- Name: service_zone; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_zone (
    id text NOT NULL,
    name text NOT NULL,
    metadata jsonb,
    fulfillment_set_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.service_zone OWNER TO postgres;

--
-- Name: shipping_option; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shipping_option (
    id text NOT NULL,
    name text NOT NULL,
    price_type text DEFAULT 'flat'::text NOT NULL,
    service_zone_id text NOT NULL,
    shipping_profile_id text,
    provider_id text,
    data jsonb,
    metadata jsonb,
    shipping_option_type_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT shipping_option_price_type_check CHECK ((price_type = ANY (ARRAY['calculated'::text, 'flat'::text])))
);


ALTER TABLE public.shipping_option OWNER TO postgres;

--
-- Name: shipping_option_price_set; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shipping_option_price_set (
    shipping_option_id character varying(255) NOT NULL,
    price_set_id character varying(255) NOT NULL,
    id character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.shipping_option_price_set OWNER TO postgres;

--
-- Name: shipping_option_rule; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shipping_option_rule (
    id text NOT NULL,
    attribute text NOT NULL,
    operator text NOT NULL,
    value jsonb,
    shipping_option_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT shipping_option_rule_operator_check CHECK ((operator = ANY (ARRAY['in'::text, 'eq'::text, 'ne'::text, 'gt'::text, 'gte'::text, 'lt'::text, 'lte'::text, 'nin'::text])))
);


ALTER TABLE public.shipping_option_rule OWNER TO postgres;

--
-- Name: shipping_option_type; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shipping_option_type (
    id text NOT NULL,
    label text NOT NULL,
    description text,
    code text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.shipping_option_type OWNER TO postgres;

--
-- Name: shipping_profile; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shipping_profile (
    id text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.shipping_profile OWNER TO postgres;

--
-- Name: stock_location; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_location (
    id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name text NOT NULL,
    address_id text,
    metadata jsonb
);


ALTER TABLE public.stock_location OWNER TO postgres;

--
-- Name: stock_location_address; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_location_address (
    id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    address_1 text NOT NULL,
    address_2 text,
    company text,
    city text,
    country_code text NOT NULL,
    phone text,
    province text,
    postal_code text,
    metadata jsonb
);


ALTER TABLE public.stock_location_address OWNER TO postgres;

--
-- Name: store; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.store (
    id text NOT NULL,
    name text DEFAULT 'Medusa Store'::text NOT NULL,
    default_sales_channel_id text,
    default_region_id text,
    default_location_id text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.store OWNER TO postgres;

--
-- Name: store_currency; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.store_currency (
    id text NOT NULL,
    currency_code text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    store_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.store_currency OWNER TO postgres;

--
-- Name: tax_provider; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tax_provider (
    id text NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.tax_provider OWNER TO postgres;

--
-- Name: tax_rate; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tax_rate (
    id text NOT NULL,
    rate real,
    code text NOT NULL,
    name text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    is_combinable boolean DEFAULT false NOT NULL,
    tax_region_id text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by text,
    deleted_at timestamp with time zone
);


ALTER TABLE public.tax_rate OWNER TO postgres;

--
-- Name: tax_rate_rule; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tax_rate_rule (
    id text NOT NULL,
    tax_rate_id text NOT NULL,
    reference_id text NOT NULL,
    reference text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by text,
    deleted_at timestamp with time zone
);


ALTER TABLE public.tax_rate_rule OWNER TO postgres;

--
-- Name: tax_region; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tax_region (
    id text NOT NULL,
    provider_id text,
    country_code text NOT NULL,
    province_code text,
    parent_id text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by text,
    deleted_at timestamp with time zone,
    CONSTRAINT "CK_tax_region_country_top_level" CHECK (((parent_id IS NULL) OR (province_code IS NOT NULL))),
    CONSTRAINT "CK_tax_region_provider_top_level" CHECK (((parent_id IS NULL) OR (provider_id IS NULL)))
);


ALTER TABLE public.tax_region OWNER TO postgres;

--
-- Name: user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."user" (
    id text NOT NULL,
    first_name text,
    last_name text,
    email text NOT NULL,
    avatar_url text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public."user" OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    role character varying(50) DEFAULT 'user'::character varying NOT NULL,
    name character varying(255)
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: workflow_execution; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflow_execution (
    id character varying NOT NULL,
    workflow_id character varying NOT NULL,
    transaction_id character varying NOT NULL,
    execution jsonb,
    context jsonb,
    state character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone,
    retention_time integer
);


ALTER TABLE public.workflow_execution OWNER TO postgres;

--
-- Name: blog_posts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_posts ALTER COLUMN id SET DEFAULT nextval('public.blog_posts_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: link_module_migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.link_module_migrations ALTER COLUMN id SET DEFAULT nextval('public.link_module_migrations_id_seq'::regclass);


--
-- Name: mikro_orm_migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mikro_orm_migrations ALTER COLUMN id SET DEFAULT nextval('public.mikro_orm_migrations_id_seq'::regclass);


--
-- Name: order display_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."order" ALTER COLUMN display_id SET DEFAULT nextval('public.order_display_id_seq'::regclass);


--
-- Name: order_change_action ordering; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_change_action ALTER COLUMN ordering SET DEFAULT nextval('public.order_change_action_ordering_seq'::regclass);


--
-- Name: order_claim display_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_claim ALTER COLUMN display_id SET DEFAULT nextval('public.order_claim_display_id_seq'::regclass);


--
-- Name: order_exchange display_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_exchange ALTER COLUMN display_id SET DEFAULT nextval('public.order_exchange_display_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: return display_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return ALTER COLUMN display_id SET DEFAULT nextval('public.return_display_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: account_holder; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.account_holder (id, provider_id, external_id, email, data, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: api_key; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.api_key (id, token, salt, redacted, title, type, last_used_at, created_by, created_at, revoked_by, revoked_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: application_method_buy_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.application_method_buy_rules (application_method_id, promotion_rule_id) FROM stdin;
\.


--
-- Data for Name: application_method_target_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.application_method_target_rules (application_method_id, promotion_rule_id) FROM stdin;
\.


--
-- Data for Name: auth_identity; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auth_identity (id, app_metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: blog_posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.blog_posts (id, title, content, authorid, "createdAt", "updatedAt", published, slug, image) FROM stdin;
8	How Small Businesses Are Winning Big with Renewable Energy	<p><strong>How Small Businesses Are Winning Big with Renewable Energy</strong><br>\n<em>And how your company can ride the wave of green growth</em></p>\n\n<p><strong>Did you know?</strong><br>\nSmall businesses are driving more than 60% of job growth in the renewable energy sector. From solar upgrades to sustainable packaging, entrepreneurs across the country are building cleaner, leaner operations—and gaining loyal customers in the process.</p>\n\n<p>Take Sarah, a bakery owner who installed solar panels and switched to compostable packaging. The result? She cut her utility costs by 40% and saw new customers coming in specifically for her eco-friendly focus.</p>\n\n<p>What made the difference? Having the right data and insight to take action confidently.</p>\n\n<hr>\n\n<p><strong>Why This Report Matters</strong></p>\n\n<ul>\n  <li><strong>Lower energy and operating costs</strong> with sustainable upgrades</li>\n  <li><strong>Attract eco-conscious customers</strong> who value responsible business practices</li>\n  <li><strong>Access government grants and incentives</strong> for renewable energy investments</li>\n  <li><strong>Boost your brand reputation</strong> by aligning with growing environmental awareness</li>\n</ul>\n\n<p>Sustainability isn’t out of reach—it’s your opportunity to grow.</p>\n\n<hr>\n\n<p><strong>What You’ll Discover Inside the Report</strong></p>\n\n<ul>\n  <li>Emerging green markets like sustainable packaging, energy audits, and water-saving solutions</li>\n  <li>Proven ways to market green services to your local community and online</li>\n  <li>Insights on trends, competitors, and fast-moving developments in clean energy</li>\n  <li>Tools to help you spot and apply for funding opportunities</li>\n</ul>\n\n<p>Whether you run a service, product-based, or hybrid business, this report gives you a roadmap to smarter decisions and better results.</p>\n\n<hr>\n\n<p><strong>Take the Next Step Toward a Greener Business Future</strong></p>\n\n<p><strong>Download the Renewable Energy and Sustainability Report today</strong> and get inspired by the momentum of real small businesses making big moves.</p>\n\n<p><a href="https://www.performancecorporate.com/products/reports/renewable-energy-and-sustainability-us-market-research-report-for-small-businesses-2025-2026" target="_blank" style="display:inline-block;padding:10px 20px;background:#28a745;color:#fff;text-decoration:none;border-radius:5px;">👉 Explore the Report Now</a></p>\n\n<hr>\n\n<p><strong>What Others Are Saying</strong></p>\n\n<blockquote>\n  “This report gave me the clarity I needed to move forward with a green upgrade in my café. The grant links alone were worth the price.”<br>\n  <em>— Jason L., Café Owner</em>\n</blockquote>\n\n<blockquote>\n  “Well-researched, clear, and packed with action steps. Highly recommended for small business owners.”<br>\n  <em>— Leah M., Independent Retailer</em>\n</blockquote>\n\n<hr>\n\n<p><strong>Don’t Wait for the Future—Build It</strong></p>\n\n<p>Sustainability is no longer optional. It's your edge. With the right insights, your small business can be part of a movement that saves money, earns loyalty, and makes a difference.</p>\n	4	2025-04-14 22:46:00.7326+00	2025-04-14 22:50:53.948055+00	t	how-small-businesses-are-winning-big-with-renewable-energy	uploads/1744360586626-Calculator.jpeg
\.


--
-- Data for Name: capture; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.capture (id, amount, raw_amount, payment_id, created_at, updated_at, deleted_at, created_by, metadata) FROM stdin;
\.


--
-- Data for Name: cart; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cart (id, region_id, customer_id, sales_channel_id, email, currency_code, shipping_address_id, billing_address_id, metadata, created_at, updated_at, deleted_at, completed_at) FROM stdin;
\.


--
-- Data for Name: cart_address; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cart_address (id, customer_id, company, first_name, last_name, address_1, address_2, city, country_code, province, postal_code, phone, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: cart_line_item; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cart_line_item (id, cart_id, title, subtitle, thumbnail, quantity, variant_id, product_id, product_title, product_description, product_subtitle, product_type, product_collection, product_handle, variant_sku, variant_barcode, variant_title, variant_option_values, requires_shipping, is_discountable, is_tax_inclusive, compare_at_unit_price, raw_compare_at_unit_price, unit_price, raw_unit_price, metadata, created_at, updated_at, deleted_at, product_type_id, is_custom_price) FROM stdin;
\.


--
-- Data for Name: cart_line_item_adjustment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cart_line_item_adjustment (id, description, promotion_id, code, amount, raw_amount, provider_id, metadata, created_at, updated_at, deleted_at, item_id) FROM stdin;
\.


--
-- Data for Name: cart_line_item_tax_line; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cart_line_item_tax_line (id, description, tax_rate_id, code, rate, provider_id, metadata, created_at, updated_at, deleted_at, item_id) FROM stdin;
\.


--
-- Data for Name: cart_payment_collection; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cart_payment_collection (cart_id, payment_collection_id, id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: cart_promotion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cart_promotion (cart_id, promotion_id, id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: cart_shipping_method; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cart_shipping_method (id, cart_id, name, description, amount, raw_amount, is_tax_inclusive, shipping_option_id, data, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: cart_shipping_method_adjustment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cart_shipping_method_adjustment (id, description, promotion_id, code, amount, raw_amount, provider_id, metadata, created_at, updated_at, deleted_at, shipping_method_id) FROM stdin;
\.


--
-- Data for Name: cart_shipping_method_tax_line; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cart_shipping_method_tax_line (id, description, tax_rate_id, code, rate, provider_id, metadata, created_at, updated_at, deleted_at, shipping_method_id) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name, slug, description, created_at) FROM stdin;
1	Reports	reports	Collection of report products	2025-04-05 09:09:41.098566
5	Market Reports	market-reports	Get up-to-date information on crucial markets. Stay ahead of your peers with decisive data.	2025-04-10 07:45:07.090733
4	Consulting	consulting	Consulting reports. New and improved	2025-04-08 09:29:41.858448
6	Trending Products	trending-products	Get the latest trending products - updated live. Get yours now.	2025-04-10 08:38:08.438873
7	Wealth Building	wealth-building	Get a personalized report to help your grow your finances. Grow your riches today. You can do it.S	2025-04-10 09:40:43.499336
\.


--
-- Data for Name: currency; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.currency (code, symbol, symbol_native, decimal_digits, rounding, raw_rounding, name, created_at, updated_at, deleted_at) FROM stdin;
usd	$	$	2	0	{"value": "0", "precision": 20}	US Dollar	2025-02-21 14:44:16.637+00	2025-02-21 14:44:16.637+00	\N
cad	CA$	$	2	0	{"value": "0", "precision": 20}	Canadian Dollar	2025-02-21 14:44:16.638+00	2025-02-21 14:44:16.638+00	\N
eur	€	€	2	0	{"value": "0", "precision": 20}	Euro	2025-02-21 14:44:16.638+00	2025-02-21 14:44:16.638+00	\N
aed	AED	د.إ.‏	2	0	{"value": "0", "precision": 20}	United Arab Emirates Dirham	2025-02-21 14:44:16.638+00	2025-02-21 14:44:16.638+00	\N
afn	Af	؋	0	0	{"value": "0", "precision": 20}	Afghan Afghani	2025-02-21 14:44:16.638+00	2025-02-21 14:44:16.638+00	\N
all	ALL	Lek	0	0	{"value": "0", "precision": 20}	Albanian Lek	2025-02-21 14:44:16.638+00	2025-02-21 14:44:16.638+00	\N
amd	AMD	դր.	0	0	{"value": "0", "precision": 20}	Armenian Dram	2025-02-21 14:44:16.638+00	2025-02-21 14:44:16.638+00	\N
ars	AR$	$	2	0	{"value": "0", "precision": 20}	Argentine Peso	2025-02-21 14:44:16.638+00	2025-02-21 14:44:16.638+00	\N
aud	AU$	$	2	0	{"value": "0", "precision": 20}	Australian Dollar	2025-02-21 14:44:16.638+00	2025-02-21 14:44:16.638+00	\N
azn	man.	ман.	2	0	{"value": "0", "precision": 20}	Azerbaijani Manat	2025-02-21 14:44:16.638+00	2025-02-21 14:44:16.638+00	\N
bam	KM	KM	2	0	{"value": "0", "precision": 20}	Bosnia-Herzegovina Convertible Mark	2025-02-21 14:44:16.638+00	2025-02-21 14:44:16.638+00	\N
bdt	Tk	৳	2	0	{"value": "0", "precision": 20}	Bangladeshi Taka	2025-02-21 14:44:16.638+00	2025-02-21 14:44:16.638+00	\N
bgn	BGN	лв.	2	0	{"value": "0", "precision": 20}	Bulgarian Lev	2025-02-21 14:44:16.638+00	2025-02-21 14:44:16.638+00	\N
bhd	BD	د.ب.‏	3	0	{"value": "0", "precision": 20}	Bahraini Dinar	2025-02-21 14:44:16.638+00	2025-02-21 14:44:16.638+00	\N
bif	FBu	FBu	0	0	{"value": "0", "precision": 20}	Burundian Franc	2025-02-21 14:44:16.638+00	2025-02-21 14:44:16.638+00	\N
bnd	BN$	$	2	0	{"value": "0", "precision": 20}	Brunei Dollar	2025-02-21 14:44:16.639+00	2025-02-21 14:44:16.639+00	\N
bob	Bs	Bs	2	0	{"value": "0", "precision": 20}	Bolivian Boliviano	2025-02-21 14:44:16.639+00	2025-02-21 14:44:16.639+00	\N
brl	R$	R$	2	0	{"value": "0", "precision": 20}	Brazilian Real	2025-02-21 14:44:16.639+00	2025-02-21 14:44:16.639+00	\N
bwp	BWP	P	2	0	{"value": "0", "precision": 20}	Botswanan Pula	2025-02-21 14:44:16.639+00	2025-02-21 14:44:16.639+00	\N
byn	Br	руб.	2	0	{"value": "0", "precision": 20}	Belarusian Ruble	2025-02-21 14:44:16.639+00	2025-02-21 14:44:16.639+00	\N
bzd	BZ$	$	2	0	{"value": "0", "precision": 20}	Belize Dollar	2025-02-21 14:44:16.639+00	2025-02-21 14:44:16.639+00	\N
cdf	CDF	FrCD	2	0	{"value": "0", "precision": 20}	Congolese Franc	2025-02-21 14:44:16.639+00	2025-02-21 14:44:16.639+00	\N
chf	CHF	CHF	2	0.05	{"value": "0.05", "precision": 20}	Swiss Franc	2025-02-21 14:44:16.639+00	2025-02-21 14:44:16.639+00	\N
clp	CL$	$	0	0	{"value": "0", "precision": 20}	Chilean Peso	2025-02-21 14:44:16.639+00	2025-02-21 14:44:16.639+00	\N
cny	CN¥	CN¥	2	0	{"value": "0", "precision": 20}	Chinese Yuan	2025-02-21 14:44:16.639+00	2025-02-21 14:44:16.639+00	\N
cop	CO$	$	0	0	{"value": "0", "precision": 20}	Colombian Peso	2025-02-21 14:44:16.639+00	2025-02-21 14:44:16.639+00	\N
crc	₡	₡	0	0	{"value": "0", "precision": 20}	Costa Rican Colón	2025-02-21 14:44:16.639+00	2025-02-21 14:44:16.639+00	\N
cve	CV$	CV$	2	0	{"value": "0", "precision": 20}	Cape Verdean Escudo	2025-02-21 14:44:16.639+00	2025-02-21 14:44:16.639+00	\N
czk	Kč	Kč	2	0	{"value": "0", "precision": 20}	Czech Republic Koruna	2025-02-21 14:44:16.639+00	2025-02-21 14:44:16.639+00	\N
djf	Fdj	Fdj	0	0	{"value": "0", "precision": 20}	Djiboutian Franc	2025-02-21 14:44:16.639+00	2025-02-21 14:44:16.639+00	\N
dkk	Dkr	kr	2	0	{"value": "0", "precision": 20}	Danish Krone	2025-02-21 14:44:16.639+00	2025-02-21 14:44:16.639+00	\N
dop	RD$	RD$	2	0	{"value": "0", "precision": 20}	Dominican Peso	2025-02-21 14:44:16.639+00	2025-02-21 14:44:16.639+00	\N
dzd	DA	د.ج.‏	2	0	{"value": "0", "precision": 20}	Algerian Dinar	2025-02-21 14:44:16.639+00	2025-02-21 14:44:16.639+00	\N
eek	Ekr	kr	2	0	{"value": "0", "precision": 20}	Estonian Kroon	2025-02-21 14:44:16.639+00	2025-02-21 14:44:16.639+00	\N
egp	EGP	ج.م.‏	2	0	{"value": "0", "precision": 20}	Egyptian Pound	2025-02-21 14:44:16.639+00	2025-02-21 14:44:16.639+00	\N
ern	Nfk	Nfk	2	0	{"value": "0", "precision": 20}	Eritrean Nakfa	2025-02-21 14:44:16.639+00	2025-02-21 14:44:16.639+00	\N
etb	Br	Br	2	0	{"value": "0", "precision": 20}	Ethiopian Birr	2025-02-21 14:44:16.639+00	2025-02-21 14:44:16.639+00	\N
gbp	£	£	2	0	{"value": "0", "precision": 20}	British Pound Sterling	2025-02-21 14:44:16.64+00	2025-02-21 14:44:16.64+00	\N
gel	GEL	GEL	2	0	{"value": "0", "precision": 20}	Georgian Lari	2025-02-21 14:44:16.64+00	2025-02-21 14:44:16.64+00	\N
ghs	GH₵	GH₵	2	0	{"value": "0", "precision": 20}	Ghanaian Cedi	2025-02-21 14:44:16.64+00	2025-02-21 14:44:16.64+00	\N
gnf	FG	FG	0	0	{"value": "0", "precision": 20}	Guinean Franc	2025-02-21 14:44:16.64+00	2025-02-21 14:44:16.64+00	\N
gtq	GTQ	Q	2	0	{"value": "0", "precision": 20}	Guatemalan Quetzal	2025-02-21 14:44:16.64+00	2025-02-21 14:44:16.64+00	\N
hkd	HK$	$	2	0	{"value": "0", "precision": 20}	Hong Kong Dollar	2025-02-21 14:44:16.64+00	2025-02-21 14:44:16.64+00	\N
hnl	HNL	L	2	0	{"value": "0", "precision": 20}	Honduran Lempira	2025-02-21 14:44:16.64+00	2025-02-21 14:44:16.64+00	\N
hrk	kn	kn	2	0	{"value": "0", "precision": 20}	Croatian Kuna	2025-02-21 14:44:16.64+00	2025-02-21 14:44:16.64+00	\N
huf	Ft	Ft	0	0	{"value": "0", "precision": 20}	Hungarian Forint	2025-02-21 14:44:16.64+00	2025-02-21 14:44:16.64+00	\N
idr	Rp	Rp	0	0	{"value": "0", "precision": 20}	Indonesian Rupiah	2025-02-21 14:44:16.64+00	2025-02-21 14:44:16.64+00	\N
ils	₪	₪	2	0	{"value": "0", "precision": 20}	Israeli New Sheqel	2025-02-21 14:44:16.64+00	2025-02-21 14:44:16.64+00	\N
inr	Rs	₹	2	0	{"value": "0", "precision": 20}	Indian Rupee	2025-02-21 14:44:16.64+00	2025-02-21 14:44:16.64+00	\N
iqd	IQD	د.ع.‏	0	0	{"value": "0", "precision": 20}	Iraqi Dinar	2025-02-21 14:44:16.64+00	2025-02-21 14:44:16.64+00	\N
irr	IRR	﷼	0	0	{"value": "0", "precision": 20}	Iranian Rial	2025-02-21 14:44:16.64+00	2025-02-21 14:44:16.64+00	\N
isk	Ikr	kr	0	0	{"value": "0", "precision": 20}	Icelandic Króna	2025-02-21 14:44:16.64+00	2025-02-21 14:44:16.64+00	\N
jmd	J$	$	2	0	{"value": "0", "precision": 20}	Jamaican Dollar	2025-02-21 14:44:16.64+00	2025-02-21 14:44:16.64+00	\N
jod	JD	د.أ.‏	3	0	{"value": "0", "precision": 20}	Jordanian Dinar	2025-02-21 14:44:16.64+00	2025-02-21 14:44:16.64+00	\N
jpy	¥	￥	0	0	{"value": "0", "precision": 20}	Japanese Yen	2025-02-21 14:44:16.641+00	2025-02-21 14:44:16.641+00	\N
kes	Ksh	Ksh	2	0	{"value": "0", "precision": 20}	Kenyan Shilling	2025-02-21 14:44:16.641+00	2025-02-21 14:44:16.641+00	\N
khr	KHR	៛	2	0	{"value": "0", "precision": 20}	Cambodian Riel	2025-02-21 14:44:16.641+00	2025-02-21 14:44:16.641+00	\N
kmf	CF	FC	0	0	{"value": "0", "precision": 20}	Comorian Franc	2025-02-21 14:44:16.641+00	2025-02-21 14:44:16.641+00	\N
krw	₩	₩	0	0	{"value": "0", "precision": 20}	South Korean Won	2025-02-21 14:44:16.641+00	2025-02-21 14:44:16.641+00	\N
kwd	KD	د.ك.‏	3	0	{"value": "0", "precision": 20}	Kuwaiti Dinar	2025-02-21 14:44:16.641+00	2025-02-21 14:44:16.641+00	\N
kzt	KZT	тңг.	2	0	{"value": "0", "precision": 20}	Kazakhstani Tenge	2025-02-21 14:44:16.641+00	2025-02-21 14:44:16.641+00	\N
lbp	LB£	ل.ل.‏	0	0	{"value": "0", "precision": 20}	Lebanese Pound	2025-02-21 14:44:16.641+00	2025-02-21 14:44:16.641+00	\N
lkr	SLRs	SL Re	2	0	{"value": "0", "precision": 20}	Sri Lankan Rupee	2025-02-21 14:44:16.641+00	2025-02-21 14:44:16.641+00	\N
ltl	Lt	Lt	2	0	{"value": "0", "precision": 20}	Lithuanian Litas	2025-02-21 14:44:16.641+00	2025-02-21 14:44:16.641+00	\N
lvl	Ls	Ls	2	0	{"value": "0", "precision": 20}	Latvian Lats	2025-02-21 14:44:16.641+00	2025-02-21 14:44:16.641+00	\N
lyd	LD	د.ل.‏	3	0	{"value": "0", "precision": 20}	Libyan Dinar	2025-02-21 14:44:16.641+00	2025-02-21 14:44:16.641+00	\N
mad	MAD	د.م.‏	2	0	{"value": "0", "precision": 20}	Moroccan Dirham	2025-02-21 14:44:16.641+00	2025-02-21 14:44:16.641+00	\N
mdl	MDL	MDL	2	0	{"value": "0", "precision": 20}	Moldovan Leu	2025-02-21 14:44:16.641+00	2025-02-21 14:44:16.641+00	\N
mga	MGA	MGA	0	0	{"value": "0", "precision": 20}	Malagasy Ariary	2025-02-21 14:44:16.641+00	2025-02-21 14:44:16.641+00	\N
mkd	MKD	MKD	2	0	{"value": "0", "precision": 20}	Macedonian Denar	2025-02-21 14:44:16.641+00	2025-02-21 14:44:16.641+00	\N
mmk	MMK	K	0	0	{"value": "0", "precision": 20}	Myanma Kyat	2025-02-21 14:44:16.641+00	2025-02-21 14:44:16.641+00	\N
mnt	MNT	₮	0	0	{"value": "0", "precision": 20}	Mongolian Tugrig	2025-02-21 14:44:16.641+00	2025-02-21 14:44:16.641+00	\N
mop	MOP$	MOP$	2	0	{"value": "0", "precision": 20}	Macanese Pataca	2025-02-21 14:44:16.641+00	2025-02-21 14:44:16.641+00	\N
mur	MURs	MURs	0	0	{"value": "0", "precision": 20}	Mauritian Rupee	2025-02-21 14:44:16.641+00	2025-02-21 14:44:16.641+00	\N
mxn	MX$	$	2	0	{"value": "0", "precision": 20}	Mexican Peso	2025-02-21 14:44:16.642+00	2025-02-21 14:44:16.642+00	\N
myr	RM	RM	2	0	{"value": "0", "precision": 20}	Malaysian Ringgit	2025-02-21 14:44:16.642+00	2025-02-21 14:44:16.642+00	\N
mzn	MTn	MTn	2	0	{"value": "0", "precision": 20}	Mozambican Metical	2025-02-21 14:44:16.642+00	2025-02-21 14:44:16.642+00	\N
nad	N$	N$	2	0	{"value": "0", "precision": 20}	Namibian Dollar	2025-02-21 14:44:16.642+00	2025-02-21 14:44:16.642+00	\N
ngn	₦	₦	2	0	{"value": "0", "precision": 20}	Nigerian Naira	2025-02-21 14:44:16.642+00	2025-02-21 14:44:16.642+00	\N
nio	C$	C$	2	0	{"value": "0", "precision": 20}	Nicaraguan Córdoba	2025-02-21 14:44:16.642+00	2025-02-21 14:44:16.642+00	\N
nok	Nkr	kr	2	0	{"value": "0", "precision": 20}	Norwegian Krone	2025-02-21 14:44:16.642+00	2025-02-21 14:44:16.642+00	\N
npr	NPRs	नेरू	2	0	{"value": "0", "precision": 20}	Nepalese Rupee	2025-02-21 14:44:16.642+00	2025-02-21 14:44:16.642+00	\N
nzd	NZ$	$	2	0	{"value": "0", "precision": 20}	New Zealand Dollar	2025-02-21 14:44:16.642+00	2025-02-21 14:44:16.642+00	\N
omr	OMR	ر.ع.‏	3	0	{"value": "0", "precision": 20}	Omani Rial	2025-02-21 14:44:16.642+00	2025-02-21 14:44:16.642+00	\N
pab	B/.	B/.	2	0	{"value": "0", "precision": 20}	Panamanian Balboa	2025-02-21 14:44:16.642+00	2025-02-21 14:44:16.642+00	\N
pen	S/.	S/.	2	0	{"value": "0", "precision": 20}	Peruvian Nuevo Sol	2025-02-21 14:44:16.642+00	2025-02-21 14:44:16.642+00	\N
php	₱	₱	2	0	{"value": "0", "precision": 20}	Philippine Peso	2025-02-21 14:44:16.642+00	2025-02-21 14:44:16.642+00	\N
pkr	PKRs	₨	0	0	{"value": "0", "precision": 20}	Pakistani Rupee	2025-02-21 14:44:16.642+00	2025-02-21 14:44:16.642+00	\N
pln	zł	zł	2	0	{"value": "0", "precision": 20}	Polish Zloty	2025-02-21 14:44:16.642+00	2025-02-21 14:44:16.642+00	\N
pyg	₲	₲	0	0	{"value": "0", "precision": 20}	Paraguayan Guarani	2025-02-21 14:44:16.642+00	2025-02-21 14:44:16.642+00	\N
qar	QR	ر.ق.‏	2	0	{"value": "0", "precision": 20}	Qatari Rial	2025-02-21 14:44:16.644+00	2025-02-21 14:44:16.644+00	\N
ron	RON	RON	2	0	{"value": "0", "precision": 20}	Romanian Leu	2025-02-21 14:44:16.644+00	2025-02-21 14:44:16.644+00	\N
rsd	din.	дин.	0	0	{"value": "0", "precision": 20}	Serbian Dinar	2025-02-21 14:44:16.644+00	2025-02-21 14:44:16.644+00	\N
rub	RUB	₽.	2	0	{"value": "0", "precision": 20}	Russian Ruble	2025-02-21 14:44:16.644+00	2025-02-21 14:44:16.644+00	\N
rwf	RWF	FR	0	0	{"value": "0", "precision": 20}	Rwandan Franc	2025-02-21 14:44:16.644+00	2025-02-21 14:44:16.644+00	\N
sar	SR	ر.س.‏	2	0	{"value": "0", "precision": 20}	Saudi Riyal	2025-02-21 14:44:16.644+00	2025-02-21 14:44:16.644+00	\N
sdg	SDG	SDG	2	0	{"value": "0", "precision": 20}	Sudanese Pound	2025-02-21 14:44:16.644+00	2025-02-21 14:44:16.644+00	\N
sek	Skr	kr	2	0	{"value": "0", "precision": 20}	Swedish Krona	2025-02-21 14:44:16.644+00	2025-02-21 14:44:16.644+00	\N
sgd	S$	$	2	0	{"value": "0", "precision": 20}	Singapore Dollar	2025-02-21 14:44:16.645+00	2025-02-21 14:44:16.645+00	\N
sos	Ssh	Ssh	0	0	{"value": "0", "precision": 20}	Somali Shilling	2025-02-21 14:44:16.645+00	2025-02-21 14:44:16.645+00	\N
syp	SY£	ل.س.‏	0	0	{"value": "0", "precision": 20}	Syrian Pound	2025-02-21 14:44:16.645+00	2025-02-21 14:44:16.645+00	\N
thb	฿	฿	2	0	{"value": "0", "precision": 20}	Thai Baht	2025-02-21 14:44:16.645+00	2025-02-21 14:44:16.645+00	\N
tnd	DT	د.ت.‏	3	0	{"value": "0", "precision": 20}	Tunisian Dinar	2025-02-21 14:44:16.645+00	2025-02-21 14:44:16.645+00	\N
top	T$	T$	2	0	{"value": "0", "precision": 20}	Tongan Paʻanga	2025-02-21 14:44:16.645+00	2025-02-21 14:44:16.645+00	\N
try	₺	₺	2	0	{"value": "0", "precision": 20}	Turkish Lira	2025-02-21 14:44:16.645+00	2025-02-21 14:44:16.645+00	\N
ttd	TT$	$	2	0	{"value": "0", "precision": 20}	Trinidad and Tobago Dollar	2025-02-21 14:44:16.645+00	2025-02-21 14:44:16.645+00	\N
twd	NT$	NT$	2	0	{"value": "0", "precision": 20}	New Taiwan Dollar	2025-02-21 14:44:16.645+00	2025-02-21 14:44:16.645+00	\N
tzs	TSh	TSh	0	0	{"value": "0", "precision": 20}	Tanzanian Shilling	2025-02-21 14:44:16.645+00	2025-02-21 14:44:16.645+00	\N
uah	₴	₴	2	0	{"value": "0", "precision": 20}	Ukrainian Hryvnia	2025-02-21 14:44:16.645+00	2025-02-21 14:44:16.645+00	\N
ugx	USh	USh	0	0	{"value": "0", "precision": 20}	Ugandan Shilling	2025-02-21 14:44:16.645+00	2025-02-21 14:44:16.645+00	\N
uyu	$U	$	2	0	{"value": "0", "precision": 20}	Uruguayan Peso	2025-02-21 14:44:16.645+00	2025-02-21 14:44:16.645+00	\N
uzs	UZS	UZS	0	0	{"value": "0", "precision": 20}	Uzbekistan Som	2025-02-21 14:44:16.645+00	2025-02-21 14:44:16.645+00	\N
vef	Bs.F.	Bs.F.	2	0	{"value": "0", "precision": 20}	Venezuelan Bolívar	2025-02-21 14:44:16.645+00	2025-02-21 14:44:16.645+00	\N
vnd	₫	₫	0	0	{"value": "0", "precision": 20}	Vietnamese Dong	2025-02-21 14:44:16.645+00	2025-02-21 14:44:16.645+00	\N
xaf	FCFA	FCFA	0	0	{"value": "0", "precision": 20}	CFA Franc BEAC	2025-02-21 14:44:16.645+00	2025-02-21 14:44:16.645+00	\N
xof	CFA	CFA	0	0	{"value": "0", "precision": 20}	CFA Franc BCEAO	2025-02-21 14:44:16.645+00	2025-02-21 14:44:16.645+00	\N
yer	YR	ر.ي.‏	0	0	{"value": "0", "precision": 20}	Yemeni Rial	2025-02-21 14:44:16.645+00	2025-02-21 14:44:16.645+00	\N
zar	R	R	2	0	{"value": "0", "precision": 20}	South African Rand	2025-02-21 14:44:16.645+00	2025-02-21 14:44:16.645+00	\N
zmk	ZK	ZK	0	0	{"value": "0", "precision": 20}	Zambian Kwacha	2025-02-21 14:44:16.646+00	2025-02-21 14:44:16.646+00	\N
zwl	ZWL$	ZWL$	0	0	{"value": "0", "precision": 20}	Zimbabwean Dollar	2025-02-21 14:44:16.646+00	2025-02-21 14:44:16.646+00	\N
\.


--
-- Data for Name: customer; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customer (id, company_name, first_name, last_name, email, phone, has_account, metadata, created_at, updated_at, deleted_at, created_by) FROM stdin;
cus_358749629e3641a3a809b1973d9d8a15	\N	Dudley	Doright	dudley@citep.com	\N	t	\N	2025-04-01 19:19:12.11993+00	2025-04-01 19:19:12.11993+00	\N	\N
cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	\N	Mick	McGurk	micky@citep.com	\N	t	\N	2025-04-02 15:11:55.031506+00	2025-04-02 15:11:55.031506+00	\N	\N
cus_7a50abef-2dd6-40dc-a2bb-c97660463218	\N	Gardy	Bro	gardy@citep.com	\N	t	\N	2025-04-02 17:10:25.686882+00	2025-04-02 17:10:25.686882+00	\N	\N
cus_ccbb0989-04aa-49e9-9944-040894bd96b1	\N	John	Henry Mellenheart	johnhenry@citep.com	\N	t	\N	2025-04-02 17:40:35.732368+00	2025-04-02 17:40:35.732368+00	\N	\N
cus_1d0366bc-f5bb-4e6c-ab53-787c2069ee1b	\N	Mickey	McMahon	mcmahon@citep.com	\N	t	\N	2025-04-03 18:27:15.502245+00	2025-04-03 18:27:15.502245+00	\N	\N
cus_434f88e3-227a-42d7-b0a1-1c82006e60fd	\N	Silky	Nobbins	silky@citep.com	\N	t	\N	2025-04-03 20:34:01.455833+00	2025-04-03 20:34:01.455833+00	\N	\N
cus_a6a5e8ed-8a5f-430b-a49d-ca441a291a99	\N	Heather		heather714@gmail.com	\N	t	\N	2025-04-04 08:13:15.340194+00	2025-04-04 08:13:15.340194+00	\N	\N
cus_95555360-877f-4474-8e6c-326ed3cf05e1	\N	Terrence	Michael	bigterry@citep.com	\N	t	\N	2025-04-09 08:47:52.421746+00	2025-04-09 08:47:52.421746+00	\N	\N
bab2d5fe-fe95-4c25-8ea0-59bcc033f360	\N	\N	\N	brady23@citep.com	\N	t	\N	2025-04-13 14:38:17.829626+00	2025-04-13 14:38:17.829626+00	\N	\N
57be5a93-3a0d-45c1-a127-500a4d1e7c49	\N	\N	\N	brady233@citep.com	\N	t	\N	2025-04-13 14:39:32.058856+00	2025-04-13 14:39:32.058856+00	\N	\N
6241ca42-1cd4-4268-ad0f-f90cf2ab5680	\N	\N	\N	brady1233@citep.com	\N	t	\N	2025-04-13 14:39:49.4669+00	2025-04-13 14:39:49.4669+00	\N	\N
72118d63-0d8b-4f08-ba60-d8559ae96b38	\N	\N	\N	nicd@citep.com	\N	t	\N	2025-04-13 16:28:19.271921+00	2025-04-13 16:28:19.271921+00	\N	\N
e68f9a0a-318b-489a-9686-7e2019f65241	\N	\N	\N	trodd@citep.com	\N	t	\N	2025-04-13 16:36:38.267239+00	2025-04-13 16:36:38.267239+00	\N	\N
1afced61-8c3d-4016-8dec-3a38c98a1f4e	\N	\N	\N	nicd22@citep.com	\N	t	\N	2025-04-13 16:40:21.97037+00	2025-04-13 16:40:21.97037+00	\N	\N
005835c5-585c-4f46-a0d2-53c33d79bb31	\N	\N	\N	nicold22@citep.com	\N	t	\N	2025-04-13 16:42:50.493408+00	2025-04-13 16:42:50.493408+00	\N	\N
26cdabf1-860b-4f53-93dc-8501a09b5941	\N	\N	\N	ednicold22@citep.com	\N	t	\N	2025-04-13 16:47:35.026854+00	2025-04-13 16:47:35.026854+00	\N	\N
fb132ad0-68e4-4c05-9608-70f6652f1dba	\N	\N	\N	heather714@citep.com	\N	t	\N	2025-04-13 16:58:51.895013+00	2025-04-13 16:58:51.895013+00	\N	\N
\.


--
-- Data for Name: customer_account_holder; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customer_account_holder (customer_id, account_holder_id, id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: customer_address; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customer_address (id, customer_id, address_name, is_default_shipping, is_default_billing, company, first_name, last_name, address_1, address_2, city, country_code, province, postal_code, phone, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: customer_group; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customer_group (id, name, metadata, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: customer_group_customer; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customer_group_customer (id, customer_id, customer_group_id, metadata, created_at, updated_at, created_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: fulfillment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fulfillment (id, location_id, packed_at, shipped_at, delivered_at, canceled_at, data, provider_id, shipping_option_id, metadata, delivery_address_id, created_at, updated_at, deleted_at, marked_shipped_by, created_by, requires_shipping) FROM stdin;
\.


--
-- Data for Name: fulfillment_address; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fulfillment_address (id, company, first_name, last_name, address_1, address_2, city, country_code, province, postal_code, phone, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: fulfillment_item; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fulfillment_item (id, title, sku, barcode, quantity, raw_quantity, line_item_id, inventory_item_id, fulfillment_id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: fulfillment_label; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fulfillment_label (id, tracking_number, tracking_url, label_url, fulfillment_id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: fulfillment_provider; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fulfillment_provider (id, is_enabled, created_at, updated_at, deleted_at) FROM stdin;
manual_manual	t	2025-02-21 14:44:17.24+00	2025-02-21 14:44:17.24+00	\N
\.


--
-- Data for Name: fulfillment_set; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fulfillment_set (id, name, type, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: geo_zone; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.geo_zone (id, type, country_code, province_code, city, service_zone_id, postal_expression, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: image; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.image (id, url, metadata, created_at, updated_at, deleted_at, rank, product_id) FROM stdin;
\.


--
-- Data for Name: inventory_item; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_item (id, created_at, updated_at, deleted_at, sku, origin_country, hs_code, mid_code, material, weight, length, height, width, requires_shipping, description, title, thumbnail, metadata) FROM stdin;
\.


--
-- Data for Name: inventory_level; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_level (id, created_at, updated_at, deleted_at, inventory_item_id, location_id, stocked_quantity, reserved_quantity, incoming_quantity, metadata, raw_stocked_quantity, raw_reserved_quantity, raw_incoming_quantity) FROM stdin;
\.


--
-- Data for Name: invite; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invite (id, email, accepted, token, expires_at, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: link_module_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.link_module_migrations (id, table_name, link_descriptor, created_at) FROM stdin;
1	cart_payment_collection	{"toModel": "payment_collection", "toModule": "payment", "fromModel": "cart", "fromModule": "cart"}	2025-02-21 14:44:13.302318
2	location_fulfillment_provider	{"toModel": "fulfillment_provider", "toModule": "fulfillment", "fromModel": "location", "fromModule": "stock_location"}	2025-02-21 14:44:13.327764
3	cart_promotion	{"toModel": "promotions", "toModule": "promotion", "fromModel": "cart", "fromModule": "cart"}	2025-02-21 14:44:13.332878
4	location_fulfillment_set	{"toModel": "fulfillment_set", "toModule": "fulfillment", "fromModel": "location", "fromModule": "stock_location"}	2025-02-21 14:44:13.33566
5	order_cart	{"toModel": "cart", "toModule": "cart", "fromModel": "order", "fromModule": "order"}	2025-02-21 14:44:13.337447
6	order_payment_collection	{"toModel": "payment_collection", "toModule": "payment", "fromModel": "order", "fromModule": "order"}	2025-02-21 14:44:13.339664
7	order_promotion	{"toModel": "promotion", "toModule": "promotion", "fromModel": "order", "fromModule": "order"}	2025-02-21 14:44:13.34129
8	order_fulfillment	{"toModel": "fulfillments", "toModule": "fulfillment", "fromModel": "order", "fromModule": "order"}	2025-02-21 14:44:13.338494
9	publishable_api_key_sales_channel	{"toModel": "sales_channel", "toModule": "sales_channel", "fromModel": "api_key", "fromModule": "api_key"}	2025-02-21 14:44:13.356943
10	product_variant_price_set	{"toModel": "price_set", "toModule": "pricing", "fromModel": "variant", "fromModule": "product"}	2025-02-21 14:44:13.358907
11	return_fulfillment	{"toModel": "fulfillments", "toModule": "fulfillment", "fromModel": "return", "fromModule": "order"}	2025-02-21 14:44:13.359132
12	product_variant_inventory_item	{"toModel": "inventory", "toModule": "inventory", "fromModel": "variant", "fromModule": "product"}	2025-02-21 14:44:13.359992
13	product_sales_channel	{"toModel": "sales_channel", "toModule": "sales_channel", "fromModel": "product", "fromModule": "product"}	2025-02-21 14:44:13.360311
14	region_payment_provider	{"toModel": "payment_provider", "toModule": "payment", "fromModel": "region", "fromModule": "region"}	2025-02-21 14:44:13.37206
15	sales_channel_stock_location	{"toModel": "location", "toModule": "stock_location", "fromModel": "sales_channel", "fromModule": "sales_channel"}	2025-02-21 14:44:13.376424
16	shipping_option_price_set	{"toModel": "price_set", "toModule": "pricing", "fromModel": "shipping_option", "fromModule": "fulfillment"}	2025-02-21 14:44:13.377572
17	product_shipping_profile	{"toModel": "shipping_profile", "toModule": "fulfillment", "fromModel": "product", "fromModule": "product"}	2025-02-21 14:44:13.383598
18	customer_account_holder	{"toModel": "account_holder", "toModule": "payment", "fromModel": "customer", "fromModule": "customer"}	2025-02-21 14:44:13.388654
\.


--
-- Data for Name: location_fulfillment_provider; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.location_fulfillment_provider (stock_location_id, fulfillment_provider_id, id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: location_fulfillment_set; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.location_fulfillment_set (stock_location_id, fulfillment_set_id, id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: mikro_orm_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mikro_orm_migrations (id, name, executed_at) FROM stdin;
1	Migration20231228143900	2025-02-21 14:44:08.156761+00
2	Migration20241206101446	2025-02-21 14:44:08.156761+00
3	Migration20250128174331	2025-02-21 14:44:08.156761+00
4	Migration20240307161216	2025-02-21 14:44:08.372481+00
5	Migration20241210073813	2025-02-21 14:44:08.372481+00
6	Migration20250106142624	2025-02-21 14:44:08.372481+00
7	Migration20250120110820	2025-02-21 14:44:08.372481+00
8	Migration20240307132720	2025-02-21 14:44:08.53931+00
9	Migration20240719123015	2025-02-21 14:44:08.53931+00
10	Migration20241213063611	2025-02-21 14:44:08.53931+00
11	InitialSetup20240401153642	2025-02-21 14:44:08.762335+00
12	Migration20240601111544	2025-02-21 14:44:08.762335+00
13	Migration202408271511	2025-02-21 14:44:08.762335+00
14	Migration20241122120331	2025-02-21 14:44:08.762335+00
15	Migration20241125090957	2025-02-21 14:44:08.762335+00
16	Migration20230929122253	2025-02-21 14:44:09.369325+00
17	Migration20240322094407	2025-02-21 14:44:09.369325+00
18	Migration20240322113359	2025-02-21 14:44:09.369325+00
19	Migration20240322120125	2025-02-21 14:44:09.369325+00
20	Migration20240626133555	2025-02-21 14:44:09.369325+00
21	Migration20240704094505	2025-02-21 14:44:09.369325+00
22	Migration20241127114534	2025-02-21 14:44:09.369325+00
23	Migration20241127223829	2025-02-21 14:44:09.369325+00
24	Migration20241128055359	2025-02-21 14:44:09.369325+00
25	Migration20241212190401	2025-02-21 14:44:09.369325+00
26	Migration20240227120221	2025-02-21 14:44:09.83219+00
27	Migration20240617102917	2025-02-21 14:44:09.83219+00
28	Migration20240624153824	2025-02-21 14:44:09.83219+00
29	Migration20241211061114	2025-02-21 14:44:09.83219+00
30	Migration20250113094144	2025-02-21 14:44:09.83219+00
31	Migration20250120110700	2025-02-21 14:44:09.83219+00
32	Migration20240124154000	2025-02-21 14:44:10.134676+00
33	Migration20240524123112	2025-02-21 14:44:10.134676+00
34	Migration20240602110946	2025-02-21 14:44:10.134676+00
35	Migration20241211074630	2025-02-21 14:44:10.134676+00
36	Migration20240115152146	2025-02-21 14:44:10.264043+00
37	Migration20240222170223	2025-02-21 14:44:10.321283+00
38	Migration20240831125857	2025-02-21 14:44:10.321283+00
39	Migration20241106085918	2025-02-21 14:44:10.321283+00
40	Migration20241205095237	2025-02-21 14:44:10.321283+00
41	Migration20241216183049	2025-02-21 14:44:10.321283+00
42	Migration20241218091938	2025-02-21 14:44:10.321283+00
43	Migration20250120115059	2025-02-21 14:44:10.321283+00
44	Migration20240205173216	2025-02-21 14:44:10.487839+00
45	Migration20240624200006	2025-02-21 14:44:10.487839+00
46	Migration20250120110744	2025-02-21 14:44:10.487839+00
47	InitialSetup20240221144943	2025-02-21 14:44:10.641456+00
48	Migration20240604080145	2025-02-21 14:44:10.641456+00
49	Migration20241205122700	2025-02-21 14:44:10.641456+00
50	InitialSetup20240227075933	2025-02-21 14:44:10.708112+00
51	Migration20240621145944	2025-02-21 14:44:10.708112+00
52	Migration20241206083313	2025-02-21 14:44:10.708112+00
53	Migration20240227090331	2025-02-21 14:44:10.774398+00
54	Migration20240710135844	2025-02-21 14:44:10.774398+00
55	Migration20240924114005	2025-02-21 14:44:10.774398+00
56	Migration20241212052837	2025-02-21 14:44:10.774398+00
57	InitialSetup20240228133303	2025-02-21 14:44:10.873942+00
58	Migration20240624082354	2025-02-21 14:44:10.873942+00
59	Migration20240225134525	2025-02-21 14:44:10.930221+00
60	Migration20240806072619	2025-02-21 14:44:10.930221+00
61	Migration20241211151053	2025-02-21 14:44:10.930221+00
62	Migration20250115160517	2025-02-21 14:44:10.930221+00
63	Migration20250120110552	2025-02-21 14:44:10.930221+00
64	Migration20250123122334	2025-02-21 14:44:10.930221+00
65	Migration20250206105639	2025-02-21 14:44:10.930221+00
66	Migration20250207132723	2025-02-21 14:44:10.930221+00
67	Migration20240219102530	2025-02-21 14:44:11.166316+00
68	Migration20240604100512	2025-02-21 14:44:11.166316+00
69	Migration20240715102100	2025-02-21 14:44:11.166316+00
70	Migration20240715174100	2025-02-21 14:44:11.166316+00
71	Migration20240716081800	2025-02-21 14:44:11.166316+00
72	Migration20240801085921	2025-02-21 14:44:11.166316+00
73	Migration20240821164505	2025-02-21 14:44:11.166316+00
74	Migration20240821170920	2025-02-21 14:44:11.166316+00
75	Migration20240827133639	2025-02-21 14:44:11.166316+00
76	Migration20240902195921	2025-02-21 14:44:11.166316+00
77	Migration20240913092514	2025-02-21 14:44:11.166316+00
78	Migration20240930122627	2025-02-21 14:44:11.166316+00
79	Migration20241014142943	2025-02-21 14:44:11.166316+00
80	Migration20241106085223	2025-02-21 14:44:11.166316+00
81	Migration20241129124827	2025-02-21 14:44:11.166316+00
82	Migration20241217162224	2025-02-21 14:44:11.166316+00
83	Migration20240205025928	2025-02-21 14:44:11.508714+00
84	Migration20240529080336	2025-02-21 14:44:11.508714+00
85	Migration20241202100304	2025-02-21 14:44:11.508714+00
86	Migration20240214033943	2025-02-21 14:44:11.680866+00
87	Migration20240703095850	2025-02-21 14:44:11.680866+00
88	Migration20241202103352	2025-02-21 14:44:11.680866+00
89	Migration20240311145700_InitialSetupMigration	2025-02-21 14:44:11.921647+00
90	Migration20240821170957	2025-02-21 14:44:11.921647+00
91	Migration20240917161003	2025-02-21 14:44:11.921647+00
92	Migration20241217110416	2025-02-21 14:44:11.921647+00
93	Migration20250113122235	2025-02-21 14:44:11.921647+00
94	Migration20250120115002	2025-02-21 14:44:11.921647+00
95	Migration20240509083918_InitialSetupMigration	2025-02-21 14:44:12.244545+00
96	Migration20240628075401	2025-02-21 14:44:12.244545+00
97	Migration20240830094712	2025-02-21 14:44:12.244545+00
98	Migration20250120110514	2025-02-21 14:44:12.244545+00
\.


--
-- Data for Name: notification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification (id, "to", channel, template, data, trigger_type, resource_id, resource_type, receiver_id, original_notification_id, idempotency_key, external_id, provider_id, created_at, updated_at, deleted_at, status) FROM stdin;
\.


--
-- Data for Name: notification_provider; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification_provider (id, handle, name, is_enabled, channels, created_at, updated_at, deleted_at) FROM stdin;
local	local	local	t	{feed}	2025-02-21 14:44:17.306+00	2025-02-21 14:44:17.306+00	\N
\.


--
-- Data for Name: order; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."order" (id, region_id, display_id, customer_id, version, sales_channel_id, status, is_draft_order, email, currency_code, shipping_address_id, billing_address_id, no_notification, metadata, created_at, updated_at, deleted_at, canceled_at, payment_intent_id, paid_at) FROM stdin;
order_dc35e236-40e6-4cf3-b0be-46807342176f	reg_default	12	cus_358749629e3641a3a809b1973d9d8a15	1	\N	pending	f	dudley@citep.com	usd	\N	\N	\N	\N	2025-04-02 12:43:29.877819+00	2025-04-02 12:43:29.877819+00	\N	\N	\N	\N
order_65a7822b-ae68-480d-af57-725b0a69171a	reg_default	13	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-02 15:50:58.1936+00	2025-04-02 15:50:58.1936+00	\N	\N	\N	\N
order_e7958b96-ba46-4f0f-844e-06037f4216cb	reg_default	14	cus_ccbb0989-04aa-49e9-9944-040894bd96b1	1	\N	pending	f	johnhenry@citep.com	usd	\N	\N	\N	\N	2025-04-02 17:53:42.851755+00	2025-04-02 17:53:42.851755+00	\N	\N	\N	\N
order_81122277-263d-47fa-83e9-7cbd6ce69cfb	reg_default	15	cus_358749629e3641a3a809b1973d9d8a15	1	\N	pending	f	dudley@citep.com	usd	\N	\N	\N	\N	2025-04-02 17:59:14.433391+00	2025-04-02 17:59:14.433391+00	\N	\N	\N	\N
order_3a5665a8-4cd9-4aae-a004-11f5720bd9fc	reg_default	16	cus_ccbb0989-04aa-49e9-9944-040894bd96b1	1	\N	pending	f	johnhenry@citep.com	usd	\N	\N	\N	\N	2025-04-03 18:21:23.198054+00	2025-04-03 18:21:23.198054+00	\N	\N	\N	\N
order_f9d38d10-e19e-4b85-9743-a50e82fac12a	reg_default	17	cus_1d0366bc-f5bb-4e6c-ab53-787c2069ee1b	1	\N	pending	f	mcmahon@citep.com	usd	\N	\N	\N	\N	2025-04-03 18:27:52.164512+00	2025-04-03 18:27:52.164512+00	\N	\N	\N	\N
order_acf359ca-7ca8-4ce6-b359-c341cb201d81	reg_default	18	cus_ccbb0989-04aa-49e9-9944-040894bd96b1	1	\N	pending	f	johnhenry@citep.com	usd	\N	\N	\N	\N	2025-04-03 18:30:24.378887+00	2025-04-03 18:30:24.378887+00	\N	\N	\N	\N
order_a1aa12ba-3cc3-4553-82f2-abc91677ec4d	reg_default	19	cus_1d0366bc-f5bb-4e6c-ab53-787c2069ee1b	1	\N	pending	f	mcmahon@citep.com	usd	\N	\N	\N	\N	2025-04-03 18:34:07.017131+00	2025-04-03 18:34:07.017131+00	\N	\N	\N	\N
order_b81221e0-de4f-4cab-a315-93f04d0ad1e8	reg_default	20	cus_ccbb0989-04aa-49e9-9944-040894bd96b1	1	\N	pending	f	johnhenry@citep.com	usd	\N	\N	\N	\N	2025-04-03 18:35:06.412725+00	2025-04-03 18:35:06.412725+00	\N	\N	\N	\N
order_3ecc9284-f8ef-4d8d-9d68-891be404e398	reg_default	21	cus_ccbb0989-04aa-49e9-9944-040894bd96b1	1	\N	pending	f	johnhenry@citep.com	usd	\N	\N	\N	\N	2025-04-03 18:53:47.074786+00	2025-04-03 18:53:47.074786+00	\N	\N	\N	\N
order_320485af-d7d6-4a43-87f7-8c4608949c3e	reg_default	22	cus_ccbb0989-04aa-49e9-9944-040894bd96b1	1	\N	pending	f	johnhenry@citep.com	usd	\N	\N	\N	\N	2025-04-03 19:03:40.643338+00	2025-04-03 19:03:40.643338+00	\N	\N	\N	\N
order_cd8c2f8f-8bfe-40a2-9649-336ba6a9362c	reg_default	23	cus_ccbb0989-04aa-49e9-9944-040894bd96b1	1	\N	pending	f	johnhenry@citep.com	usd	\N	\N	\N	\N	2025-04-03 19:12:51.27313+00	2025-04-03 19:12:51.27313+00	\N	\N	\N	\N
order_5f00a3cc-9511-4678-b0f1-f047026f62c9	reg_default	24	cus_ccbb0989-04aa-49e9-9944-040894bd96b1	1	\N	pending	f	johnhenry@citep.com	usd	\N	\N	\N	\N	2025-04-03 20:05:35.503265+00	2025-04-03 20:05:35.503265+00	\N	\N	\N	\N
order_e1d9837e-0122-48da-ad7d-634db357a462	reg_default	25	cus_ccbb0989-04aa-49e9-9944-040894bd96b1	1	\N	pending	f	johnhenry@citep.com	usd	\N	\N	\N	\N	2025-04-03 20:15:58.825944+00	2025-04-03 20:15:58.825944+00	\N	\N	\N	\N
order_005bc87b-c6a4-4a67-9ead-cff4a0e511be	reg_default	26	cus_ccbb0989-04aa-49e9-9944-040894bd96b1	1	\N	pending	f	johnhenry@citep.com	usd	\N	\N	\N	\N	2025-04-03 20:19:45.732254+00	2025-04-03 20:19:45.732254+00	\N	\N	\N	\N
order_6a23007a-135d-4d24-911d-ffe87e8e8bfb	reg_default	27	cus_434f88e3-227a-42d7-b0a1-1c82006e60fd	1	\N	pending	f	silky@citep.com	usd	\N	\N	\N	\N	2025-04-03 20:38:14.042117+00	2025-04-03 20:38:14.042117+00	\N	\N	\N	\N
order_11479b10-c9e8-40cb-892e-582067a8ccf7	reg_default	28	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-12 08:12:11.767797+00	2025-04-12 08:12:11.767797+00	\N	\N	\N	\N
order_a13f4802-0eba-4572-a0a4-48aef816ce5a	reg_default	29	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-12 08:52:31.362985+00	2025-04-12 08:52:31.362985+00	\N	\N	\N	\N
order_ac68dd32-d603-4c0f-9f63-c3c2235ac23a	reg_default	30	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-12 08:56:08.688199+00	2025-04-12 08:56:08.688199+00	\N	\N	\N	\N
order_785628d3-2c59-4cf3-b8da-e49cb6eb18a1	reg_default	31	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-12 09:04:42.546181+00	2025-04-12 09:04:42.546181+00	\N	\N	\N	\N
order_b0ac6c82-884e-48ab-bd8a-0acf871e2e55	reg_default	32	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-12 09:14:07.167431+00	2025-04-12 09:14:07.167431+00	\N	\N	\N	\N
order_5b092e1d-51d2-4af3-bf1a-e495e4884340	reg_default	33	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-12 09:23:48.487104+00	2025-04-12 09:23:48.487104+00	\N	\N	\N	\N
order_187956f8-73ca-46f7-8b81-da9a23cba039	reg_default	34	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-12 09:38:30.164764+00	2025-04-12 09:38:30.164764+00	\N	\N	\N	\N
order_02999d0c-ded5-4055-a078-1edefe05d43c	reg_default	35	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-12 09:44:22.575581+00	2025-04-12 09:44:22.575581+00	\N	\N	\N	\N
order_a594f772-60bd-4361-b2c7-fa45772f378f	reg_default	36	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-12 10:43:26.515463+00	2025-04-12 10:43:26.515463+00	\N	\N	\N	\N
order_0bff6765-1625-4850-bce4-d0f4d41166ce	reg_default	37	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-12 10:44:41.370207+00	2025-04-12 10:44:41.370207+00	\N	\N	\N	\N
order_79f672eb-9f98-44f3-a022-e2bb43628508	reg_default	38	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-12 10:59:18.652446+00	2025-04-12 10:59:36.096606+00	\N	\N	pi_3RD1mMRHHyohYRSW1Wa0zWzP	2025-04-12 10:59:36.096606
order_d3b2fedb-d49a-45de-a063-689456dc893b	reg_default	45	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-12 13:56:52.272465+00	2025-04-12 13:56:52.272465+00	\N	\N	\N	\N
order_5a014deb-3830-405b-8424-6b4687f119e0	reg_default	46	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-12 15:27:58.767282+00	2025-04-12 15:27:58.767282+00	\N	\N	\N	\N
order_26c00061-17b0-409c-ace0-1b7758f74a84	reg_default	47	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-12 15:43:57.133775+00	2025-04-12 15:43:57.133775+00	\N	\N	\N	\N
order_eea78e0b-bde8-4a8c-aded-631fc0a304a3	reg_default	48	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-12 15:55:17.068648+00	2025-04-12 15:55:17.068648+00	\N	\N	\N	\N
order_69b017b7-6ad3-40fe-8c94-3b4b72bed72c	reg_default	49	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-12 16:04:00.292997+00	2025-04-12 16:04:00.292997+00	\N	\N	\N	\N
order_4f329ae6-2b81-453e-816d-504c2114a20a	reg_default	50	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-12 16:09:56.901411+00	2025-04-12 16:10:14.877985+00	\N	\N	pi_3RD6czRHHyohYRSW1zed0N1H	2025-04-12 16:10:14.867
order_dcd95432-46c0-48ad-bb0e-529076e21bf2	reg_default	51	fb132ad0-68e4-4c05-9608-70f6652f1dba	1	\N	pending	f	heather714@citep.com	usd	\N	\N	\N	\N	2025-04-13 16:59:24.796936+00	2025-04-13 16:59:24.796936+00	\N	\N	\N	\N
order_f2c4a0a5-1a43-4975-bcc3-9be771f68ee7	reg_default	52	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-13 17:06:56.938608+00	2025-04-13 17:06:56.938608+00	\N	\N	\N	\N
order_c03566a0-bb2c-4ecc-88d5-ae3a83f503e1	reg_default	53	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-13 17:26:13.520506+00	2025-04-13 17:26:13.520506+00	\N	\N	\N	\N
order_1be2c5b6-7c5d-4284-beb8-b8282602e639	reg_default	54	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-13 17:34:10.711397+00	2025-04-13 17:34:10.711397+00	\N	\N	\N	\N
order_9775c92a-b062-472d-bf38-befd9c6f1b3d	reg_default	55	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-13 17:35:53.346703+00	2025-04-13 17:35:53.346703+00	\N	\N	\N	\N
order_f66ae12e-aadf-402e-a00e-cd9947ded159	reg_default	56	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-13 17:39:53.244811+00	2025-04-13 17:40:15.956505+00	\N	\N	pi_3RDUVZRHHyohYRSW1DrFrvhe	2025-04-13 17:40:15.956505
order_89759d58-fa00-472c-b7fa-a6e061c4059a	reg_default	57	fb132ad0-68e4-4c05-9608-70f6652f1dba	1	\N	paid	f	heather714@citep.com	usd	\N	\N	\N	\N	2025-04-13 17:41:17.70636+00	2025-04-13 17:41:42.942381+00	\N	\N	pi_3RDUWwRHHyohYRSW1w1GT4RX	2025-04-13 17:41:42.942381
order_c5d6cd37-4219-4fc1-87b4-60ebdb0e37ed	reg_default	58	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-15 07:34:09.143569+00	2025-04-15 07:34:26.550905+00	\N	\N	pi_3RE40TRHHyohYRSW0huaIxCN	2025-04-15 07:34:26.550905
order_8bf51895-8837-49b7-8cf2-7247e9fa3c44	reg_default	59	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-15 09:18:07.21001+00	2025-04-15 09:18:07.21001+00	\N	\N	\N	\N
order_6748c8a0-d1dd-441f-8040-7edce38a36a9	reg_default	60	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-15 09:25:29.242164+00	2025-04-15 09:25:29.242164+00	\N	\N	\N	\N
order_ed4c2ec8-5b7b-4873-a65d-a666066041e3	reg_default	61	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-15 09:25:54.046768+00	2025-04-15 09:25:54.046768+00	\N	\N	\N	\N
order_b577d659-03c7-4c5e-8005-93a12237fd22	reg_default	62	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-15 09:45:49.920068+00	2025-04-15 09:45:49.920068+00	\N	\N	\N	\N
order_a0af6386-f4b5-40e6-87ac-6449c3e042ea	reg_default	63	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-15 09:50:45.576725+00	2025-04-15 09:50:45.576725+00	\N	\N	\N	\N
order_846dd55d-cfd4-452d-8433-1860b802c8f5	reg_default	64	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-15 09:53:41.846887+00	2025-04-15 09:53:41.846887+00	\N	\N	\N	\N
order_2264e8af-f2bd-43dc-bdc2-5890b3f35e11	reg_default	65	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-15 10:07:52.225885+00	2025-04-15 10:07:52.225885+00	\N	\N	\N	\N
order_a4ae8786-aa06-47d9-99db-dd173dd0be24	reg_default	66	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-15 10:10:14.410948+00	2025-04-15 10:10:14.410948+00	\N	\N	\N	\N
order_8a57c5e2-41c6-4b8e-8130-a956884e673c	reg_default	67	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-15 10:11:33.552545+00	2025-04-15 10:11:33.552545+00	\N	\N	\N	\N
order_95792d26-8832-41bf-b8ae-b7489d89436e	reg_default	68	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-15 11:20:38.97994+00	2025-04-15 11:20:59.747667+00	\N	\N	pi_3RE7XfRHHyohYRSW1h1cxmZ4	2025-04-15 11:20:59.747667
order_6cd921e7-64e8-451a-9aad-80ada716476b	reg_default	69	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-15 11:23:52.003851+00	2025-04-15 11:23:52.003851+00	\N	\N	\N	\N
order_c06029ad-9af7-4ba9-b637-5406001fdbe3	reg_default	70	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-15 11:23:54.557165+00	2025-04-15 11:23:54.557165+00	\N	\N	\N	\N
order_8721c5ed-e95f-406c-b2c2-ae6664186eff	reg_default	71	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-15 11:24:26.325939+00	2025-04-15 11:24:45.137355+00	\N	\N	pi_3RE7bKRHHyohYRSW19F6oudL	2025-04-15 11:24:45.137355
order_22a8cd77-2f45-451f-944e-cd65eb9043a7	reg_default	72	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-15 12:18:16.311693+00	2025-04-15 12:18:16.311693+00	\N	\N	\N	\N
order_69602fed-dfaa-4861-8b80-649fc975c770	reg_default	73	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-15 12:18:19.566879+00	2025-04-15 12:18:19.566879+00	\N	\N	\N	\N
order_84c4a75f-d395-4389-8494-607a49716546	reg_default	74	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-15 12:18:20.516706+00	2025-04-15 12:18:20.516706+00	\N	\N	\N	\N
order_91c56fc5-6d8d-41df-be9b-a156618911bf	reg_default	75	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-15 12:18:38.996135+00	2025-04-15 12:19:00.200385+00	\N	\N	pi_3RE8RnRHHyohYRSW13RGGv8b	2025-04-15 12:19:00.200385
order_08eb78fb-5631-43ab-ae21-f99cb6bb941f	reg_default	76	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-15 13:22:33.629826+00	2025-04-15 13:22:50.99768+00	\N	\N	pi_3RE9RdRHHyohYRSW1zjcUKfB	2025-04-15 13:22:50.99768
order_37499a5e-8800-461a-81de-bcd5271c6b44	reg_default	77	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-15 13:44:44.646748+00	2025-04-15 13:44:44.646748+00	\N	\N	\N	\N
order_efc3878d-56c9-4e11-a06a-e388db2867df	reg_default	78	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-15 13:44:54.31865+00	2025-04-15 13:45:11.099343+00	\N	\N	pi_3RE9nGRHHyohYRSW1jSk8Xgy	2025-04-15 13:45:11.099343
order_e281e3ed-4de1-49bf-acfb-a8529c56a23e	reg_default	79	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-15 16:15:02.683828+00	2025-04-15 16:15:21.624853+00	\N	\N	pi_3REC8ZRHHyohYRSW00dUZAOF	2025-04-15 16:15:21.624853
order_caaa814d-1a90-4454-9c36-6d38d4ef2cbb	reg_default	80	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-15 17:30:49.998655+00	2025-04-15 17:30:49.998655+00	\N	\N	\N	\N
order_a3449813-a533-4014-8267-18ad7ffe5073	reg_default	81	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-15 17:30:52.268275+00	2025-04-15 17:30:52.268275+00	\N	\N	\N	\N
order_650c4929-3c4a-477e-8ce0-6ce2fa088579	reg_default	82	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-15 17:31:43.448987+00	2025-04-15 17:32:44.479364+00	\N	\N	pi_3REDKpRHHyohYRSW0xP9CJWB	2025-04-15 17:32:44.479364
order_7a3106ab-671b-4755-8577-f36ae81a3758	reg_default	83	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-16 10:54:10.711726+00	2025-04-16 10:54:10.711726+00	\N	\N	\N	\N
order_de2966d2-c568-4e71-844c-6b6d1fd35b5c	reg_default	84	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-16 10:54:13.392703+00	2025-04-16 10:54:13.392703+00	\N	\N	\N	\N
order_b06f22e0-4b5c-41df-a9d4-ff5646a0bd0b	reg_default	85	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-16 10:55:05.598904+00	2025-04-16 10:55:05.598904+00	\N	\N	\N	\N
order_aaefe4ba-f5ef-4327-adfb-d93badd0198d	reg_default	86	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-16 10:56:10.129123+00	2025-04-16 10:56:27.249506+00	\N	\N	pi_3RETdWRHHyohYRSW0vy9M3Z9	2025-04-16 10:56:27.249506
order_eb085a0a-62c9-42e8-bbca-6e3543daa5b7	reg_default	87	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-16 12:58:16.214494+00	2025-04-16 12:58:44.237891+00	\N	\N	pi_3REVXgRHHyohYRSW0tHFA5Wd	2025-04-16 12:58:44.237891
order_759b6e36-bbc6-4308-83f3-5f3d9b7e99d0	reg_default	88	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-16 18:19:49.506966+00	2025-04-16 18:19:49.506966+00	\N	\N	\N	\N
order_d0520193-66a2-4f4d-9c37-e75a37fabc41	reg_default	89	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	pending	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-16 18:19:57.018806+00	2025-04-16 18:19:57.018806+00	\N	\N	\N	\N
order_a5903d38-bb5d-4149-b4e0-fae75b448238	reg_default	90	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-16 18:24:19.137422+00	2025-04-16 18:24:46.520289+00	\N	\N	pi_3REadDRHHyohYRSW1ykGQrFP	2025-04-16 18:24:46.520289
order_4e77621a-bb78-4a5c-9464-fff1ac3638c5	reg_default	91	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-16 18:43:47.948975+00	2025-04-16 18:44:11.739532+00	\N	\N	pi_3REaw4RHHyohYRSW0Eg2GPwA	2025-04-16 18:44:11.739532
order_cb61ecde-4c34-4c99-a34a-a7f5e465208a	reg_default	92	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-16 18:51:28.074086+00	2025-04-16 18:51:48.509034+00	\N	\N	pi_3REb3URHHyohYRSW0J3V4SrG	2025-04-16 18:51:48.509034
order_d95fe14b-250e-4223-af81-35b8e58cb99a	reg_default	93	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-16 19:01:55.239957+00	2025-04-16 19:02:12.778303+00	\N	\N	pi_3REbDbRHHyohYRSW0BmF1bbY	2025-04-16 19:02:12.778303
order_a5960299-ece2-48bb-95d5-ae0c5da06541	reg_default	94	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-16 19:16:28.224106+00	2025-04-16 19:16:52.145959+00	\N	\N	pi_3REbRgRHHyohYRSW0krqZEkF	2025-04-16 19:16:52.145959
order_4455f963-b724-464a-a42b-86a858200b5e	reg_default	95	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-16 19:28:45.627632+00	2025-04-16 19:29:04.582243+00	\N	\N	pi_3REbdZRHHyohYRSW1HMulmDG	2025-04-16 19:29:04.582243
order_908c6ca3-bcd6-4251-a686-44c6a10d15de	reg_default	96	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-16 19:53:33.016785+00	2025-04-16 19:53:54.261686+00	\N	\N	pi_3REc1ZRHHyohYRSW0bsfKFzg	2025-04-16 19:53:54.261686
order_c1ac2fa8-b866-4864-a718-de655c06709d	reg_default	97	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-17 18:34:31.447111+00	2025-04-17 18:34:51.208397+00	\N	\N	pi_3RExGdRHHyohYRSW1DrfKUNH	2025-04-17 18:34:51.208397
order_0417cf95-c870-4332-98ca-4f07699963a1	reg_default	98	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-17 18:38:21.749847+00	2025-04-17 18:38:41.085883+00	\N	\N	pi_3RExKMRHHyohYRSW0Vw5lxe5	2025-04-17 18:38:41.085883
order_9b442e6f-125c-43ca-bca9-61ff61022558	reg_default	99	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-17 19:02:13.598304+00	2025-04-17 19:02:43.106211+00	\N	\N	pi_3RExhSRHHyohYRSW16VGEulk	2025-04-17 19:02:43.106211
order_accf46df-0856-4580-9774-1b4ddd7b679c	reg_default	100	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-17 19:21:09.31188+00	2025-04-17 19:21:30.966343+00	\N	\N	pi_3RExzlRHHyohYRSW1lUQZPHg	2025-04-17 19:21:30.966343
order_764cacde-b389-4ed4-bbaf-b5e27188abc3	reg_default	101	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-17 20:41:45.812893+00	2025-04-17 20:42:06.827511+00	\N	\N	pi_3REzFmRHHyohYRSW0GG7EJXO	2025-04-17 20:42:06.827511
order_6f58e806-337f-4c10-9897-d66caf6f6550	reg_default	102	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-17 21:14:29.752023+00	2025-04-17 21:14:49.814325+00	\N	\N	pi_3REzlSRHHyohYRSW0OTLILer	2025-04-17 21:14:49.814325
order_b22f2fe4-462e-4358-8fa0-7936bc6689d6	reg_default	103	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-17 21:22:33.988313+00	2025-04-17 21:22:54.013083+00	\N	\N	pi_3REztGRHHyohYRSW1EH7LW50	2025-04-17 21:22:54.013083
order_6bf82354-abbe-4abc-899b-4dd3dbd0c3c5	reg_default	104	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-17 21:34:31.94057+00	2025-04-17 21:34:52.139363+00	\N	\N	pi_3RF04qRHHyohYRSW0zqn1N3b	2025-04-17 21:34:52.139363
order_e41c8208-4493-4480-97af-04e221134a76	reg_default	105	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-17 21:36:34.705022+00	2025-04-17 21:36:56.225304+00	\N	\N	pi_3RF06oRHHyohYRSW03TySaT3	2025-04-17 21:36:56.225304
order_d4fed92b-d06c-43ea-8463-d74f8249cedc	reg_default	106	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-17 21:55:21.032576+00	2025-04-17 21:55:40.585425+00	\N	\N	pi_3RF0OzRHHyohYRSW0kfpYtPh	2025-04-17 21:55:40.585425
order_2b503de5-d887-4cb5-bda1-3cc7d05b2cac	reg_default	107	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-17 22:07:15.530368+00	2025-04-17 22:07:41.852038+00	\N	\N	pi_3RF0aVRHHyohYRSW0qgw8NDP	2025-04-17 22:07:41.852038
order_2da80b8a-b103-42c8-8382-d53a7c5f1250	reg_default	108	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-17 22:12:27.64845+00	2025-04-17 22:13:08.921093+00	\N	\N	pi_3RF0fYRHHyohYRSW0vekd7Mx	2025-04-17 22:13:08.921093
order_63742bc9-1dbb-4a8c-a2b1-d31fe8187170	reg_default	109	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-17 22:16:06.18895+00	2025-04-17 22:16:34.210378+00	\N	\N	pi_3RF0j4RHHyohYRSW1i3EKj17	2025-04-17 22:16:34.210378
order_07923dd4-7b00-4c1e-beb6-980833c30346	reg_default	110	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-18 08:54:36.194586+00	2025-04-18 08:54:59.646624+00	\N	\N	pi_3RFAgyRHHyohYRSW1grayUxY	2025-04-18 08:54:59.646624
order_65eb2ac1-195f-41f5-8be2-cb4a5624420f	reg_default	111	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-18 09:21:47.415273+00	2025-04-18 09:22:06.862711+00	\N	\N	pi_3RFB7HRHHyohYRSW11t8Dhbz	2025-04-18 09:22:06.862711
order_6c985458-1036-4858-98e6-6ccfb50c48f9	reg_default	112	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-18 09:26:03.968279+00	2025-04-18 09:26:24.419916+00	\N	\N	pi_3RFBBQRHHyohYRSW1CufmWpf	2025-04-18 09:26:24.419916
order_67165e18-8d99-4d8b-a7bf-e91933030668	reg_default	113	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-18 09:36:00.90065+00	2025-04-18 09:36:15.70411+00	\N	\N	pi_3RFBL3RHHyohYRSW1fH8wL2n	2025-04-18 09:36:15.70411
order_5d9d8fdd-26ef-4a84-848a-531873578164	reg_default	114	cus_70b59c9c-c0bb-4dc3-839d-864573e292d5	1	\N	paid	f	micky@citep.com	usd	\N	\N	\N	\N	2025-04-18 09:42:43.616639+00	2025-04-18 09:42:56.813004+00	\N	\N	pi_3RFBRYRHHyohYRSW0Gb9iT8m	2025-04-18 09:42:56.813004
\.


--
-- Data for Name: order_address; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_address (id, customer_id, company, first_name, last_name, address_1, address_2, city, country_code, province, postal_code, phone, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: order_cart; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_cart (order_id, cart_id, id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: order_change; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_change (id, order_id, version, description, status, internal_note, created_by, requested_by, requested_at, confirmed_by, confirmed_at, declined_by, declined_reason, metadata, declined_at, canceled_by, canceled_at, created_at, updated_at, change_type, deleted_at, return_id, claim_id, exchange_id) FROM stdin;
\.


--
-- Data for Name: order_change_action; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_change_action (id, order_id, version, ordering, order_change_id, reference, reference_id, action, details, amount, raw_amount, internal_note, applied, created_at, updated_at, deleted_at, return_id, claim_id, exchange_id) FROM stdin;
\.


--
-- Data for Name: order_claim; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_claim (id, order_id, return_id, order_version, display_id, type, no_notification, refund_amount, raw_refund_amount, metadata, created_at, updated_at, deleted_at, canceled_at, created_by) FROM stdin;
\.


--
-- Data for Name: order_claim_item; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_claim_item (id, claim_id, item_id, is_additional_item, reason, quantity, raw_quantity, note, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: order_claim_item_image; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_claim_item_image (id, claim_item_id, url, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: order_credit_line; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_credit_line (id, order_id, reference, reference_id, amount, raw_amount, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: order_exchange; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_exchange (id, order_id, return_id, order_version, display_id, no_notification, allow_backorder, difference_due, raw_difference_due, metadata, created_at, updated_at, deleted_at, canceled_at, created_by) FROM stdin;
\.


--
-- Data for Name: order_exchange_item; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_exchange_item (id, exchange_id, item_id, quantity, raw_quantity, note, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: order_fulfillment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_fulfillment (order_id, fulfillment_id, id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: order_item; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_item (id, order_id, version, item_id, quantity, raw_quantity, fulfilled_quantity, raw_fulfilled_quantity, shipped_quantity, raw_shipped_quantity, return_requested_quantity, raw_return_requested_quantity, return_received_quantity, raw_return_received_quantity, return_dismissed_quantity, raw_return_dismissed_quantity, written_off_quantity, raw_written_off_quantity, metadata, created_at, updated_at, deleted_at, delivered_quantity, raw_delivered_quantity, unit_price, raw_unit_price, compare_at_unit_price, raw_compare_at_unit_price) FROM stdin;
item_35ef5759-df6f-4d02-ab12-705ea29823dd	order_dc35e236-40e6-4cf3-b0be-46807342176f	1	li_eb2bcfac-5fb9-4faf-9e18-84e9a415c0dc	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-02 12:43:29.877+00	2025-04-02 12:43:29.877+00	\N	0	{}	19.99	{"amount": 19.99, "currency": "usd"}	\N	\N
item_cc895888-7451-4683-aec3-0f01634e54c9	order_dc35e236-40e6-4cf3-b0be-46807342176f	1	li_0e2229a3-f138-4532-b8bc-37050c4d0436	2	{"quantity": 2}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-02 12:43:29.877+00	2025-04-02 12:43:29.877+00	\N	0	{}	4999.99	{"amount": 4999.99, "currency": "usd"}	\N	\N
item_0560520a-6fe1-462c-9d7a-ee2594141a61	order_65a7822b-ae68-480d-af57-725b0a69171a	1	li_341ace9a-0be9-4616-8584-0e3b24a547b7	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-02 15:50:58.193+00	2025-04-02 15:50:58.193+00	\N	0	{}	14.99	{"amount": 14.99, "currency": "usd"}	\N	\N
item_40e09a9a-c071-4a57-b479-2e2168b700f2	order_e7958b96-ba46-4f0f-844e-06037f4216cb	1	li_ce6ce29b-34c2-4123-8b6a-254e4e14c3f6	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-02 17:53:42.851+00	2025-04-02 17:53:42.851+00	\N	0	{}	1599.99	{"amount": 1599.99, "currency": "usd"}	\N	\N
item_eca8836d-d04f-4f6b-84a3-3442f1d524d0	order_81122277-263d-47fa-83e9-7cbd6ce69cfb	1	li_7f8a943d-4644-4d6e-8f0f-ed6b6c570fe9	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-02 17:59:14.433+00	2025-04-02 17:59:14.433+00	\N	0	{}	19.99	{"amount": 19.99, "currency": "usd"}	\N	\N
item_4602a7b4-6451-4c82-9acf-6c149c0b583c	order_81122277-263d-47fa-83e9-7cbd6ce69cfb	1	li_56d40656-a1f6-4a34-9fb9-5eb08ce841c2	2	{"quantity": 2}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-02 17:59:14.433+00	2025-04-02 17:59:14.433+00	\N	0	{}	4999.99	{"amount": 4999.99, "currency": "usd"}	\N	\N
item_5bf2380f-f7e8-429a-9e43-2cf9ed0e6fe1	order_3a5665a8-4cd9-4aae-a004-11f5720bd9fc	1	li_9f8be9a7-5cb2-4bcb-bbb6-c7f5961c8b12	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-03 18:21:23.198+00	2025-04-03 18:21:23.198+00	\N	0	{}	14.99	{"amount": 14.99, "currency": "usd"}	\N	\N
item_db5c667c-9c36-41d5-8f1f-14a1c2576780	order_f9d38d10-e19e-4b85-9743-a50e82fac12a	1	li_b0bc1fb9-efb6-4a97-975b-ffcc7ef6ab80	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-03 18:27:52.164+00	2025-04-03 18:27:52.164+00	\N	0	{}	1599.99	{"amount": 1599.99, "currency": "usd"}	\N	\N
item_cd32f670-b21f-4a47-b873-fb758a505a6a	order_acf359ca-7ca8-4ce6-b359-c341cb201d81	1	li_693b1bae-0068-4d63-8c88-1fea800c21c9	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-03 18:30:24.378+00	2025-04-03 18:30:24.378+00	\N	0	{}	14.99	{"amount": 14.99, "currency": "usd"}	\N	\N
item_20f376c1-3ad6-4a67-8d7f-bc9a7265e420	order_a1aa12ba-3cc3-4553-82f2-abc91677ec4d	1	li_40a6f1dc-7c2a-45cd-94fc-305c111bdddb	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-03 18:34:07.017+00	2025-04-03 18:34:07.017+00	\N	0	{}	1599.99	{"amount": 1599.99, "currency": "usd"}	\N	\N
item_7538bd33-e9a2-4910-b8ad-f918b1ca5455	order_b81221e0-de4f-4cab-a315-93f04d0ad1e8	1	li_90b39639-bb8a-41a3-9dab-dd84eef66da8	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-03 18:35:06.412+00	2025-04-03 18:35:06.412+00	\N	0	{}	14.99	{"amount": 14.99, "currency": "usd"}	\N	\N
item_49e1b907-d7ae-4cbb-8d59-8dd035a4f853	order_3ecc9284-f8ef-4d8d-9d68-891be404e398	1	li_b6e79aa0-5101-45bf-b199-8b9c0f73fcf6	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-03 18:53:47.074+00	2025-04-03 18:53:47.074+00	\N	0	{}	14.99	{"amount": 14.99, "currency": "usd"}	\N	\N
item_103605b9-0c9e-4469-8237-c42856fec723	order_320485af-d7d6-4a43-87f7-8c4608949c3e	1	li_d4920a6b-b95a-441b-b884-eb0fc3259645	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-03 19:03:40.643+00	2025-04-03 19:03:40.643+00	\N	0	{}	14.99	{"amount": 14.99, "currency": "usd"}	\N	\N
item_c1f8e1a6-9c8c-47ee-b3c0-fd8ff515c94c	order_cd8c2f8f-8bfe-40a2-9649-336ba6a9362c	1	li_534774c4-fe71-4767-a395-b536137b37fe	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-03 19:12:51.273+00	2025-04-03 19:12:51.273+00	\N	0	{}	14.99	{"amount": 14.99, "currency": "usd"}	\N	\N
item_71619808-1a5f-438f-8e6e-9be5278aeb71	order_5f00a3cc-9511-4678-b0f1-f047026f62c9	1	li_e757942e-c41e-42ab-a4af-09ca0ef0031c	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-03 20:05:35.503+00	2025-04-03 20:05:35.503+00	\N	0	{}	899.99	{"amount": 899.99, "currency": "usd"}	\N	\N
item_33e795de-9db0-4ef4-9c5a-653de87c3ade	order_e1d9837e-0122-48da-ad7d-634db357a462	1	li_3b35ebf8-478b-489f-9aff-5ce57fb83424	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-03 20:15:58.825+00	2025-04-03 20:15:58.825+00	\N	0	{}	899.99	{"amount": 899.99, "currency": "usd"}	\N	\N
item_66435031-51e4-4c39-9de0-de054bc10895	order_005bc87b-c6a4-4a67-9ead-cff4a0e511be	1	li_d25d4e82-aef2-4e80-a5d6-4f499ba3248a	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-03 20:19:45.732+00	2025-04-03 20:19:45.732+00	\N	0	{}	899.99	{"amount": 899.99, "currency": "usd"}	\N	\N
item_e32359cb-d09b-4ac4-9fcd-f4aa8c57cfb0	order_6a23007a-135d-4d24-911d-ffe87e8e8bfb	1	li_6074281c-f775-4106-bca4-c9e482ae5f54	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-03 20:38:14.042+00	2025-04-03 20:38:14.042+00	\N	0	{}	1599.99	{"amount": 1599.99, "currency": "usd"}	\N	\N
item_616c92ee-670f-413f-9429-4b48f07c54d9	order_11479b10-c9e8-40cb-892e-582067a8ccf7	1	li_f282e1b7-750b-4850-880c-f07540f62bae	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-12 08:12:11.767+00	2025-04-12 08:12:11.767+00	\N	0	{}	129	{"amount": 129, "currency": "usd"}	\N	\N
item_3a910647-18df-4210-88d5-c4141b9a2e60	order_a13f4802-0eba-4572-a0a4-48aef816ce5a	1	li_be618802-8099-4d44-83b9-d4ffb5ebab5e	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-12 08:52:31.362+00	2025-04-12 08:52:31.362+00	\N	0	{}	129	{"amount": 129, "currency": "usd"}	\N	\N
item_80dca4bb-e601-4a45-a4da-e2ef171c89ee	order_ac68dd32-d603-4c0f-9f63-c3c2235ac23a	1	li_1d6e51e9-9075-4cae-ae91-d03d6ac242ec	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-12 08:56:08.688+00	2025-04-12 08:56:08.688+00	\N	0	{}	129	{"amount": 129, "currency": "usd"}	\N	\N
item_30f794c6-47cc-475e-a2db-1c9e57001ba2	order_785628d3-2c59-4cf3-b8da-e49cb6eb18a1	1	li_2a210c4f-d2c4-4ee8-9559-8e6182c58769	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-12 09:04:42.546+00	2025-04-12 09:04:42.546+00	\N	0	{}	129	{"amount": 129, "currency": "usd"}	\N	\N
item_c88e5969-6fb0-48df-8836-90bea1ea2c87	order_b0ac6c82-884e-48ab-bd8a-0acf871e2e55	1	li_6c136dd6-a6e9-4a66-a63a-824aa7240d1d	2	{"quantity": 2}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-12 09:14:07.167+00	2025-04-12 09:14:07.167+00	\N	0	{}	129	{"amount": 129, "currency": "usd"}	\N	\N
item_b7105b57-eabf-4ef5-bd4d-69fa897cf5aa	order_5b092e1d-51d2-4af3-bf1a-e495e4884340	1	li_9a794d4e-d2a1-4864-95ec-a98979396596	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-12 09:23:48.487+00	2025-04-12 09:23:48.487+00	\N	0	{}	129	{"amount": 129, "currency": "usd"}	\N	\N
item_fc5706c7-079c-4a17-9734-41a6a08b1d62	order_187956f8-73ca-46f7-8b81-da9a23cba039	1	li_e4ad0376-9e8c-44f0-9266-3269a539e18a	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-12 09:38:30.164+00	2025-04-12 09:38:30.164+00	\N	0	{}	129	{"amount": 129, "currency": "usd"}	\N	\N
item_9396ba18-5ba0-41fe-b2bf-16f3750f2102	order_02999d0c-ded5-4055-a078-1edefe05d43c	1	li_0b87ce2e-ea9c-46c9-8436-d2c16c8e282c	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-12 09:44:22.575+00	2025-04-12 09:44:22.575+00	\N	0	{}	129	{"amount": 129, "currency": "usd"}	\N	\N
item_256d4fde-868b-4a4e-a26c-c5709936abe1	order_a594f772-60bd-4361-b2c7-fa45772f378f	1	li_9e3ee5ae-810e-4073-9172-a0be578b7ebe	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-12 10:43:26.515+00	2025-04-12 10:43:26.515+00	\N	0	{}	129	{"amount": 129, "currency": "usd"}	\N	\N
item_d618c80c-6c94-48f2-b47d-51d3019fdfac	order_0bff6765-1625-4850-bce4-d0f4d41166ce	1	li_03cde557-0561-4002-8163-8049b505386a	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-12 10:44:41.37+00	2025-04-12 10:44:41.37+00	\N	0	{}	129	{"amount": 129, "currency": "usd"}	\N	\N
item_6fb7164d-1ec9-4d49-9a16-9f535c386832	order_79f672eb-9f98-44f3-a022-e2bb43628508	1	li_42282a00-1fc6-405d-ae8a-873a1f332c57	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-12 10:59:18.652+00	2025-04-12 10:59:18.652+00	\N	0	{}	129	{"amount": 129, "currency": "usd"}	\N	\N
item_56504a29-cc9b-44cd-b890-be689ffc6e04	order_d3b2fedb-d49a-45de-a063-689456dc893b	1	li_6b9d5149-45bb-40c0-a664-94b71a29a26e	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-12 13:56:52.272+00	2025-04-12 13:56:52.272+00	\N	0	{}	129	{"amount": 12900, "currency_code": "usd"}	\N	\N
item_524ab7e6-c563-4947-a485-ac1cffe5649c	order_5a014deb-3830-405b-8424-6b4687f119e0	1	li_f13d79ec-4ec0-452b-b35d-99c18a40ba78	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-12 15:27:58.767+00	2025-04-12 15:27:58.767+00	\N	0	{}	129	{"amount": 12900, "currency_code": "usd"}	\N	\N
item_a04dd633-ac60-43d7-a4b5-4c0d0aa326bd	order_26c00061-17b0-409c-ace0-1b7758f74a84	1	li_f7cf2588-bc0f-4a6b-b881-c6b6077556c9	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-12 15:43:57.133+00	2025-04-12 15:43:57.133+00	\N	0	{}	129	{"amount": 12900, "currency_code": "usd"}	\N	\N
item_5995cf3a-7a52-4de3-a1df-8a5c9b03c11b	order_eea78e0b-bde8-4a8c-aded-631fc0a304a3	1	li_a4fb3c2d-50b3-4f35-b283-ad97571c9681	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-12 15:55:17.068+00	2025-04-12 15:55:17.068+00	\N	0	{}	129	{"amount": 12900, "currency_code": "usd"}	\N	\N
item_ddf5a475-760a-477e-b49d-e349f820301c	order_69b017b7-6ad3-40fe-8c94-3b4b72bed72c	1	li_3f96b68e-78d5-4762-88f7-cb22ea419cdf	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-12 16:04:00.292+00	2025-04-12 16:04:00.292+00	\N	0	{}	129	{"amount": 12900, "currency_code": "usd"}	\N	\N
item_d21037c4-dba0-4c80-b7d5-7bbecc8832df	order_4f329ae6-2b81-453e-816d-504c2114a20a	1	li_f2966ec9-bf05-49ca-a7d2-0cfc3cb199f7	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-12 16:09:56.901+00	2025-04-12 16:09:56.901+00	\N	0	{}	129	{"amount": 12900, "currency_code": "usd"}	\N	\N
item_aec86b10-8390-4cb3-98f3-7da2537120a3	order_dcd95432-46c0-48ad-bb0e-529076e21bf2	1	li_2fa058cd-81e3-4f14-ac31-fddb4289fbfe	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-13 16:59:24.796+00	2025-04-13 16:59:24.796+00	\N	0	{}	129	{"amount": 12900, "currency_code": "usd"}	\N	\N
item_3b710d4c-9f87-4257-9664-551192e7989a	order_f2c4a0a5-1a43-4975-bcc3-9be771f68ee7	1	li_f40fee02-967e-4984-bcff-be08f48076c3	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-13 17:06:56.938+00	2025-04-13 17:06:56.938+00	\N	0	{}	129	{"amount": 12900, "currency_code": "usd"}	\N	\N
item_9a809a24-e3f4-44d3-873e-797d4aa583e0	order_c03566a0-bb2c-4ecc-88d5-ae3a83f503e1	1	li_f7254689-7ed4-4667-b379-2cf075c78d72	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-13 17:26:13.52+00	2025-04-13 17:26:13.52+00	\N	0	{}	129	{"amount": 12900, "currency_code": "usd"}	\N	\N
item_e3efac07-0ea4-429f-809b-a6ec8b3d35f2	order_1be2c5b6-7c5d-4284-beb8-b8282602e639	1	li_48d6dd76-39c4-4348-8f46-ded9904346c5	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-13 17:34:10.711+00	2025-04-13 17:34:10.711+00	\N	0	{}	129	{"amount": 12900, "currency_code": "usd"}	\N	\N
item_2264aab7-fdad-437e-882f-e7b7e6d0b4ba	order_9775c92a-b062-472d-bf38-befd9c6f1b3d	1	li_6b411ab1-8c8d-4b92-a2f9-060c987c7391	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-13 17:35:53.346+00	2025-04-13 17:35:53.346+00	\N	0	{}	129	{"amount": 12900, "currency_code": "usd"}	\N	\N
item_1ea5c146-8d42-43f9-b2fc-fcb793820269	order_f66ae12e-aadf-402e-a00e-cd9947ded159	1	li_70036ab2-11db-4e30-a5e3-d21f5ee6e344	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-13 17:39:53.244+00	2025-04-13 17:39:53.244+00	\N	0	{}	129	{"amount": 12900, "currency_code": "usd"}	\N	\N
item_4a2bcadd-d06e-4ed0-b7be-7e17609be550	order_89759d58-fa00-472c-b7fa-a6e061c4059a	1	li_8b9f8154-d880-4444-bba9-62496d3528fa	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-13 17:41:17.706+00	2025-04-13 17:41:17.706+00	\N	0	{}	129	{"amount": 12900, "currency_code": "usd"}	\N	\N
item_ab4ee86f-2090-45f9-a1ae-bd8ef62d84dc	order_c5d6cd37-4219-4fc1-87b4-60ebdb0e37ed	1	li_87b14cc9-364e-4199-8229-1db9d3f2f3b1	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-15 07:34:09.143+00	2025-04-15 07:34:09.143+00	\N	0	{}	129	{"amount": 12900, "currency_code": "usd"}	\N	\N
item_6b2e0538-ac9d-44bf-ba2a-1504a67007dd	order_8bf51895-8837-49b7-8cf2-7247e9fa3c44	1	li_0ce6c2a8-643c-4dd5-8a56-833f2c1ba78a	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-15 09:18:07.21+00	2025-04-15 09:18:07.21+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_26691d38-36cf-4457-9890-b4651cb138f1	order_6748c8a0-d1dd-441f-8040-7edce38a36a9	1	li_125e18ed-6a9f-491b-8442-1ee85bfc795b	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-15 09:25:29.242+00	2025-04-15 09:25:29.242+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_d292dff2-746f-4920-b50e-c9f5c6bef809	order_ed4c2ec8-5b7b-4873-a65d-a666066041e3	1	li_c4dc6ec0-ed4b-4125-9e4a-5309d9650fc9	2	{"quantity": 2}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-15 09:25:54.046+00	2025-04-15 09:25:54.046+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_242c50b2-d01b-4ecd-8b00-1f8ecf325aa8	order_b577d659-03c7-4c5e-8005-93a12237fd22	1	li_13712791-9e65-4270-b257-528233475397	2	{"quantity": 2}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-15 09:45:49.92+00	2025-04-15 09:45:49.92+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_cceb67dd-1937-419b-837c-1e86cfed50fe	order_a0af6386-f4b5-40e6-87ac-6449c3e042ea	1	li_3f1cbd24-30d4-4870-a32e-ec2fe43a72b1	2	{"quantity": 2}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-15 09:50:45.576+00	2025-04-15 09:50:45.576+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_4a5f2505-bd7c-441a-873b-5525e376ce49	order_846dd55d-cfd4-452d-8433-1860b802c8f5	1	li_10e3cbba-b73c-4b21-859b-1df1ef19d253	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-15 09:53:41.846+00	2025-04-15 09:53:41.846+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_17e5adcd-8814-48d1-9800-5d9bb05d9798	order_2264e8af-f2bd-43dc-bdc2-5890b3f35e11	1	li_8379022a-9e73-46f6-bca7-511f80f6e045	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-15 10:07:52.225+00	2025-04-15 10:07:52.225+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_b9c61307-0b8d-4fdc-bed5-f08adf523ef5	order_a4ae8786-aa06-47d9-99db-dd173dd0be24	1	li_63ac3177-ce68-4e73-b484-d04f73be5b51	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-15 10:10:14.41+00	2025-04-15 10:10:14.41+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_58e8178e-d034-4ca0-bc24-e8113c5495a4	order_8a57c5e2-41c6-4b8e-8130-a956884e673c	1	li_e2f8e55b-4562-48bb-826a-7af6e8fe96ab	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-15 10:11:33.552+00	2025-04-15 10:11:33.552+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_02e20c31-a8c9-48e8-a246-804c44d130d4	order_95792d26-8832-41bf-b8ae-b7489d89436e	1	li_66cb4edf-c891-4a28-a9b8-d2e31c906067	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-15 11:20:38.979+00	2025-04-15 11:20:38.979+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_870ca64f-544d-42a3-82fd-ba3f9ab2d5fa	order_6cd921e7-64e8-451a-9aad-80ada716476b	1	li_b6b951a2-289a-4746-a7d3-49813cb4e311	2	{"quantity": 2}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-15 11:23:52.003+00	2025-04-15 11:23:52.003+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_4e1fda17-26ef-441d-96cc-159aca6b22a5	order_c06029ad-9af7-4ba9-b637-5406001fdbe3	1	li_0ea33b4f-e178-4043-82fc-f5abda5e7ebd	2	{"quantity": 2}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-15 11:23:54.557+00	2025-04-15 11:23:54.557+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_1f11ff18-7c6c-43ff-987f-dfeb5b3585aa	order_8721c5ed-e95f-406c-b2c2-ae6664186eff	1	li_79fd0a62-0688-4be0-ad54-65f8b8824bc4	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-15 11:24:26.325+00	2025-04-15 11:24:26.325+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_288b35c3-1094-4a9b-9491-2bc28f6992e1	order_22a8cd77-2f45-451f-944e-cd65eb9043a7	1	li_8cceca80-49fc-47f3-bdba-29769452747b	3	{"quantity": 3}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-15 12:18:16.311+00	2025-04-15 12:18:16.311+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_6ff07cf6-3ce3-4684-9094-c7e1a1978b00	order_69602fed-dfaa-4861-8b80-649fc975c770	1	li_2e8e1797-d20e-4eae-8299-0ce53ad6baf4	3	{"quantity": 3}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-15 12:18:19.566+00	2025-04-15 12:18:19.566+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_0a83ad25-7f0c-4fba-b4fe-cdaf22ecfe23	order_84c4a75f-d395-4389-8494-607a49716546	1	li_5d256cc9-b4d8-418d-99f8-891ada4c4b1f	3	{"quantity": 3}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-15 12:18:20.516+00	2025-04-15 12:18:20.516+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_a5ad32cf-17a3-4e6d-9ad2-efbb19f44e65	order_91c56fc5-6d8d-41df-be9b-a156618911bf	1	li_70748747-1827-427a-8d41-ad79d4a6b8c8	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-15 12:18:38.996+00	2025-04-15 12:18:38.996+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_12882f15-2cdb-4bb3-ad95-1b3d8bb6d47f	order_08eb78fb-5631-43ab-ae21-f99cb6bb941f	1	li_2f97672f-fae1-4ce0-9643-e0d2231ff038	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-15 13:22:33.629+00	2025-04-15 13:22:33.629+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_8a8a8f44-e722-46b1-bfb2-6089b5f29be1	order_37499a5e-8800-461a-81de-bcd5271c6b44	1	li_e6fc3e1c-bd5f-4ebf-99ec-1b4a942f3a4a	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-15 13:44:44.646+00	2025-04-15 13:44:44.646+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_b4b583a8-a503-47a6-ad72-588d618879de	order_efc3878d-56c9-4e11-a06a-e388db2867df	1	li_2f82f1ca-1e5e-4559-b30a-84399f311e70	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-15 13:44:54.318+00	2025-04-15 13:44:54.318+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_4711ecf0-310d-4e67-bf22-f62bfe3d5254	order_e281e3ed-4de1-49bf-acfb-a8529c56a23e	1	li_6963a805-d0c9-410d-8c1a-a3441c1b2ddb	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-15 16:15:02.683+00	2025-04-15 16:15:02.683+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_55fbcd56-f98f-45e8-af8e-d65e036444ac	order_caaa814d-1a90-4454-9c36-6d38d4ef2cbb	1	li_fa3be012-cf81-40a0-add8-c10478309e14	3	{"quantity": 3}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-15 17:30:49.998+00	2025-04-15 17:30:49.998+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_de70389e-fe1e-48ee-90e5-1378878656d4	order_a3449813-a533-4014-8267-18ad7ffe5073	1	li_a7989517-f32e-41f8-b48a-c7ff407f6750	3	{"quantity": 3}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-15 17:30:52.268+00	2025-04-15 17:30:52.268+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_867e021c-9a43-4e79-a9ce-a403e4b37c89	order_650c4929-3c4a-477e-8ce0-6ce2fa088579	1	li_d573dea8-adc5-4d6f-9908-72975774dd21	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-15 17:31:43.448+00	2025-04-15 17:31:43.448+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_1d94217f-eb65-4774-ab40-0b08b5073234	order_7a3106ab-671b-4755-8577-f36ae81a3758	1	li_a8d89e4e-10c8-4e67-895f-9e64688557fb	3	{"quantity": 3}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-16 10:54:10.711+00	2025-04-16 10:54:10.711+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_2ffce33d-6b37-4db3-9ace-7827993d9a5d	order_de2966d2-c568-4e71-844c-6b6d1fd35b5c	1	li_aa0428f1-95d7-40ce-bebc-9d1a5255daab	3	{"quantity": 3}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-16 10:54:13.392+00	2025-04-16 10:54:13.392+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_18a7130e-a794-4252-9442-1b99e379becd	order_b06f22e0-4b5c-41df-a9d4-ff5646a0bd0b	1	li_da7479ab-a3be-4f58-9240-1f7883738746	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-16 10:55:05.598+00	2025-04-16 10:55:05.598+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_5326d37b-e115-41c9-8627-95658d4a3dd0	order_aaefe4ba-f5ef-4327-adfb-d93badd0198d	1	li_337fd60f-f278-4001-a2cb-1a1ad7341d4a	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-16 10:56:10.129+00	2025-04-16 10:56:10.129+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_4e613048-7b79-4a33-9be1-ffdb10a160b2	order_eb085a0a-62c9-42e8-bbca-6e3543daa5b7	1	li_8ac7bdc3-c732-46e3-9a5e-b219bcead22f	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-16 12:58:16.214+00	2025-04-16 12:58:16.214+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_41ef051d-1582-4c62-a536-08cf35c693ca	order_759b6e36-bbc6-4308-83f3-5f3d9b7e99d0	1	li_4b3ab840-0f1a-4d29-8e65-f1c64ab47e24	3	{"quantity": 3}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-16 18:19:49.506+00	2025-04-16 18:19:49.506+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_b6f00fc2-efe3-4a97-b64a-b53d0cf19421	order_d0520193-66a2-4f4d-9c37-e75a37fabc41	1	li_eab15f25-8fba-43ca-b458-c16a4acd8593	3	{"quantity": 3}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-16 18:19:57.018+00	2025-04-16 18:19:57.018+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_a67ba8db-e27e-455f-9491-a27391ab10af	order_a5903d38-bb5d-4149-b4e0-fae75b448238	1	li_a6f13d04-f5f7-4cb1-86ac-d967ee9e7cdf	3	{"quantity": 3}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-16 18:24:19.137+00	2025-04-16 18:24:19.137+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_a78610b7-7bf3-4f34-b12f-902af84ac9e9	order_4e77621a-bb78-4a5c-9464-fff1ac3638c5	1	li_1c235cc1-4eca-4331-a132-966bdcf08e49	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-16 18:43:47.948+00	2025-04-16 18:43:47.948+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_ccbb8f23-ac38-4d16-8bda-c5aed527c258	order_cb61ecde-4c34-4c99-a34a-a7f5e465208a	1	li_9d44169a-bb88-4373-a2cc-bae7ee20bbb3	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-16 18:51:28.074+00	2025-04-16 18:51:28.074+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_9ac8618e-d5b5-4828-a8d1-8d2b760abdc1	order_d95fe14b-250e-4223-af81-35b8e58cb99a	1	li_307c0c33-e4db-4591-8c67-3b3d067b6b91	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-16 19:01:55.239+00	2025-04-16 19:01:55.239+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_a0f80959-af32-4a36-91b3-ef672b05a722	order_a5960299-ece2-48bb-95d5-ae0c5da06541	1	li_1de9c132-12c4-4344-8324-df48421589e0	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-16 19:16:28.224+00	2025-04-16 19:16:28.224+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_0bd030d9-c9da-4200-a1d0-3bc17bdebe44	order_4455f963-b724-464a-a42b-86a858200b5e	1	li_81dfa814-4028-48cc-b069-2b0fce3b4287	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-16 19:28:45.627+00	2025-04-16 19:28:45.627+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_a015dfb5-6c94-4e13-8003-7abd554676bd	order_908c6ca3-bcd6-4251-a686-44c6a10d15de	1	li_cfe6d044-d05d-492e-9eb0-8d9846029e8e	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-16 19:53:33.016+00	2025-04-16 19:53:33.016+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_9df98030-8120-4dad-be67-7e4a802e2b0a	order_c1ac2fa8-b866-4864-a718-de655c06709d	1	li_7fc4d41b-336f-40cd-a3e4-1207f0089ede	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-17 18:34:31.447+00	2025-04-17 18:34:31.447+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_a948139e-65ca-4c9f-8b2c-a9b2c4c0aed1	order_0417cf95-c870-4332-98ca-4f07699963a1	1	li_8cd22957-14e4-4466-981e-435e1a2ad6b9	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-17 18:38:21.749+00	2025-04-17 18:38:21.749+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_d8ee8460-60f3-4e8d-aa3c-ddf879de3fdb	order_9b442e6f-125c-43ca-bca9-61ff61022558	1	li_8f0d2fb6-8d6f-4120-b685-c685f24c838b	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-17 19:02:13.598+00	2025-04-17 19:02:13.598+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_6335781c-5048-4245-b221-f46611d0c418	order_accf46df-0856-4580-9774-1b4ddd7b679c	1	li_61972420-b91d-4f03-9d65-d1ff45f56d3b	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-17 19:21:09.311+00	2025-04-17 19:21:09.311+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_340acbb8-d2ab-494f-a38b-f07803e650dd	order_764cacde-b389-4ed4-bbaf-b5e27188abc3	1	li_cb3a8e23-73a7-4f78-bba2-56baebdaed2f	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-17 20:41:45.812+00	2025-04-17 20:41:45.812+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_bdc24df9-3fd5-40be-be35-6b5cd814fb24	order_6f58e806-337f-4c10-9897-d66caf6f6550	1	li_3599820b-3aa5-4fdd-a9f6-fba6e7816097	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-17 21:14:29.752+00	2025-04-17 21:14:29.752+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_6fc83c95-21ef-46cb-9a3c-62e9a45bae97	order_b22f2fe4-462e-4358-8fa0-7936bc6689d6	1	li_e5123d76-dea2-44a9-b70f-64e9a2acac08	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-17 21:22:33.988+00	2025-04-17 21:22:33.988+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_3ae6b002-c8e1-4751-9654-bfe7981ed6a6	order_6bf82354-abbe-4abc-899b-4dd3dbd0c3c5	1	li_d9d9ef58-4698-4933-9789-31e07e6d3306	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-17 21:34:31.94+00	2025-04-17 21:34:31.94+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_bfd502c9-8bc3-4b0d-a4b2-8cd6e7934702	order_e41c8208-4493-4480-97af-04e221134a76	1	li_f3e2b302-7678-4be8-920e-8eede97a5f5d	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-17 21:36:34.705+00	2025-04-17 21:36:34.705+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_180bb3a8-6b35-4dbb-b6b5-d05596b4e22c	order_d4fed92b-d06c-43ea-8463-d74f8249cedc	1	li_42b91a16-a961-4520-a60a-1f6317d199b5	2	{"quantity": 2}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-17 21:55:21.032+00	2025-04-17 21:55:21.032+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_98168485-c422-480a-8ad4-185c1f8f37e7	order_2b503de5-d887-4cb5-bda1-3cc7d05b2cac	1	li_0d312c81-e30b-4289-b60a-b974025b2f2c	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-17 22:07:15.53+00	2025-04-17 22:07:15.53+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_6d1f02fa-8aaa-4b37-979e-fabc4af62bf0	order_2da80b8a-b103-42c8-8382-d53a7c5f1250	1	li_fe793c3e-dc7f-4820-8d9a-49c263d5ce28	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-17 22:12:27.648+00	2025-04-17 22:12:27.648+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_d475c777-2ffe-4580-8583-bc7198042d40	order_63742bc9-1dbb-4a8c-a2b1-d31fe8187170	1	li_7cbba01f-36a4-4c3f-ad03-6140a02ee74b	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-17 22:16:06.188+00	2025-04-17 22:16:06.188+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_05a66f34-bec1-4647-af13-7b6d4580693b	order_07923dd4-7b00-4c1e-beb6-980833c30346	1	li_26699fe9-6cd3-4bf8-8b55-fd36b7b81d16	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-18 08:54:36.194+00	2025-04-18 08:54:36.194+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_7515adbf-9627-49ed-9488-2cc4f71c195b	order_65eb2ac1-195f-41f5-8be2-cb4a5624420f	1	li_75c94662-b693-4ac3-8928-5aea1871cb04	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-18 09:21:47.415+00	2025-04-18 09:21:47.415+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_bf9d9e41-86e6-4616-b0f2-48bc187295c4	order_6c985458-1036-4858-98e6-6ccfb50c48f9	1	li_6f929244-3bff-478b-9b80-92701f49b6cc	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-18 09:26:03.968+00	2025-04-18 09:26:03.968+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_6c3f0345-6bc6-4a4c-8994-241b2f22729f	order_67165e18-8d99-4d8b-a7bf-e91933030668	1	li_f324efde-ef86-4136-9394-bc860a1cc5a4	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-18 09:36:00.9+00	2025-04-18 09:36:00.9+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
item_060d8385-7981-44a7-b7b2-a7b8d055cec6	order_5d9d8fdd-26ef-4a84-848a-531873578164	1	li_77a4d69d-a3a7-43c2-ab64-fd1cfd4bb2f7	1	{"quantity": 1}	0	{}	0	{}	0	{}	0	{}	0	{}	0	{}	\N	2025-04-18 09:42:43.616+00	2025-04-18 09:42:43.616+00	\N	0	{}	19.99	{"amount": 1999, "currency_code": "usd"}	\N	\N
\.


--
-- Data for Name: order_line_item; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_line_item (id, totals_id, title, subtitle, thumbnail, variant_id, product_id, product_title, product_description, product_subtitle, product_type, product_collection, product_handle, variant_sku, variant_barcode, variant_title, variant_option_values, requires_shipping, is_discountable, is_tax_inclusive, compare_at_unit_price, raw_compare_at_unit_price, unit_price, raw_unit_price, metadata, created_at, updated_at, deleted_at, is_custom_price, product_type_id) FROM stdin;
li_eb2bcfac-5fb9-4faf-9e18-84e9a415c0dc	\N	Sample Product	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 19.99, "currency": "usd"}	\N	2025-04-02 12:43:29.877+00	2025-04-02 12:43:29.877+00	\N	f	\N
li_0e2229a3-f138-4532-b8bc-37050c4d0436	\N	Performance Corporate Training Package	\N	uploads/1743272922617-MasterClass.jpg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	4999.99	{"amount": 4999.99, "currency": "usd"}	\N	2025-04-02 12:43:29.877+00	2025-04-02 12:43:29.877+00	\N	f	\N
li_341ace9a-0be9-4616-8584-0e3b24a547b7	\N	My Amazing Product	\N	uploads/1743273630638-Path1.jpeg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	14.99	{"amount": 14.99, "currency": "usd"}	\N	2025-04-02 15:50:58.193+00	2025-04-02 15:50:58.193+00	\N	f	\N
li_ce6ce29b-34c2-4123-8b6a-254e4e14c3f6	\N	Sales Performance Masterclass	\N	uploads/1743272323594-Man.jpeg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	1599.99	{"amount": 1599.99, "currency": "usd"}	\N	2025-04-02 17:53:42.851+00	2025-04-02 17:53:42.851+00	\N	f	\N
li_7f8a943d-4644-4d6e-8f0f-ed6b6c570fe9	\N	Sample Product	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 19.99, "currency": "usd"}	\N	2025-04-02 17:59:14.433+00	2025-04-02 17:59:14.433+00	\N	f	\N
li_56d40656-a1f6-4a34-9fb9-5eb08ce841c2	\N	Performance Corporate Training Package	\N	uploads/1743272922617-MasterClass.jpg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	4999.99	{"amount": 4999.99, "currency": "usd"}	\N	2025-04-02 17:59:14.433+00	2025-04-02 17:59:14.433+00	\N	f	\N
li_9f8be9a7-5cb2-4bcb-bbb6-c7f5961c8b12	\N	My Amazing Product	\N	uploads/1743273630638-Path1.jpeg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	14.99	{"amount": 14.99, "currency": "usd"}	\N	2025-04-03 18:21:23.198+00	2025-04-03 18:21:23.198+00	\N	f	\N
li_b0bc1fb9-efb6-4a97-975b-ffcc7ef6ab80	\N	Sales Performance Masterclass	\N	uploads/1743272323594-Man.jpeg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	1599.99	{"amount": 1599.99, "currency": "usd"}	\N	2025-04-03 18:27:52.164+00	2025-04-03 18:27:52.164+00	\N	f	\N
li_693b1bae-0068-4d63-8c88-1fea800c21c9	\N	My Amazing Product	\N	uploads/1743273630638-Path1.jpeg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	14.99	{"amount": 14.99, "currency": "usd"}	\N	2025-04-03 18:30:24.378+00	2025-04-03 18:30:24.378+00	\N	f	\N
li_40a6f1dc-7c2a-45cd-94fc-305c111bdddb	\N	Sales Performance Masterclass	\N	uploads/1743272323594-Man.jpeg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	1599.99	{"amount": 1599.99, "currency": "usd"}	\N	2025-04-03 18:34:07.017+00	2025-04-03 18:34:07.017+00	\N	f	\N
li_90b39639-bb8a-41a3-9dab-dd84eef66da8	\N	My Amazing Product	\N	uploads/1743273630638-Path1.jpeg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	14.99	{"amount": 14.99, "currency": "usd"}	\N	2025-04-03 18:35:06.412+00	2025-04-03 18:35:06.412+00	\N	f	\N
li_b6e79aa0-5101-45bf-b199-8b9c0f73fcf6	\N	My Amazing Product	\N	uploads/1743273630638-Path1.jpeg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	14.99	{"amount": 14.99, "currency": "usd"}	\N	2025-04-03 18:53:47.074+00	2025-04-03 18:53:47.074+00	\N	f	\N
li_d4920a6b-b95a-441b-b884-eb0fc3259645	\N	My Amazing Product	\N	uploads/1743273630638-Path1.jpeg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	14.99	{"amount": 14.99, "currency": "usd"}	\N	2025-04-03 19:03:40.643+00	2025-04-03 19:03:40.643+00	\N	f	\N
li_534774c4-fe71-4767-a395-b536137b37fe	\N	My Amazing Product	\N	uploads/1743273630638-Path1.jpeg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	14.99	{"amount": 14.99, "currency": "usd"}	\N	2025-04-03 19:12:51.273+00	2025-04-03 19:12:51.273+00	\N	f	\N
li_e757942e-c41e-42ab-a4af-09ca0ef0031c	\N	Professional Communication Workshop	\N	uploads/1743272323594-Man.jpeg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	899.99	{"amount": 899.99, "currency": "usd"}	\N	2025-04-03 20:05:35.503+00	2025-04-03 20:05:35.503+00	\N	f	\N
li_3b35ebf8-478b-489f-9aff-5ce57fb83424	\N	Professional Communication Workshop	\N	uploads/1743272323594-Man.jpeg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	899.99	{"amount": 899.99, "currency": "usd"}	\N	2025-04-03 20:15:58.825+00	2025-04-03 20:15:58.825+00	\N	f	\N
li_d25d4e82-aef2-4e80-a5d6-4f499ba3248a	\N	Professional Communication Workshop	\N	uploads/1743272323594-Man.jpeg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	899.99	{"amount": 899.99, "currency": "usd"}	\N	2025-04-03 20:19:45.732+00	2025-04-03 20:19:45.732+00	\N	f	\N
li_6074281c-f775-4106-bca4-c9e482ae5f54	\N	Sales Performance Masterclass	\N	uploads/1743272323594-Man.jpeg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	1599.99	{"amount": 1599.99, "currency": "usd"}	\N	2025-04-03 20:38:14.042+00	2025-04-03 20:38:14.042+00	\N	f	\N
li_f282e1b7-750b-4850-880c-f07540f62bae	\N	Renewable Energy and Sustainability: U.S. Market Research Report for Small Businesses (2025–2026)	\N	uploads/1743777029697-Renewable-Energy-Marketing-Report.jpg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	129	{"amount": 129, "currency": "usd"}	\N	2025-04-12 08:12:11.767+00	2025-04-12 08:12:11.767+00	\N	f	\N
li_be618802-8099-4d44-83b9-d4ffb5ebab5e	\N	Renewable Energy and Sustainability: U.S. Market Research Report for Small Businesses (2025–2026)	\N	uploads/1743777029697-Renewable-Energy-Marketing-Report.jpg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	129	{"amount": 129, "currency": "usd"}	\N	2025-04-12 08:52:31.362+00	2025-04-12 08:52:31.362+00	\N	f	\N
li_1d6e51e9-9075-4cae-ae91-d03d6ac242ec	\N	Renewable Energy and Sustainability: U.S. Market Research Report for Small Businesses (2025–2026)	\N	uploads/1743777029697-Renewable-Energy-Marketing-Report.jpg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	129	{"amount": 129, "currency": "usd"}	\N	2025-04-12 08:56:08.688+00	2025-04-12 08:56:08.688+00	\N	f	\N
li_2a210c4f-d2c4-4ee8-9559-8e6182c58769	\N	Renewable Energy and Sustainability: U.S. Market Research Report for Small Businesses (2025–2026)	\N	uploads/1743777029697-Renewable-Energy-Marketing-Report.jpg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	129	{"amount": 129, "currency": "usd"}	\N	2025-04-12 09:04:42.546+00	2025-04-12 09:04:42.546+00	\N	f	\N
li_6c136dd6-a6e9-4a66-a63a-824aa7240d1d	\N	Renewable Energy and Sustainability: U.S. Market Research Report for Small Businesses (2025–2026)	\N	uploads/1743777029697-Renewable-Energy-Marketing-Report.jpg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	129	{"amount": 129, "currency": "usd"}	\N	2025-04-12 09:14:07.167+00	2025-04-12 09:14:07.167+00	\N	f	\N
li_9a794d4e-d2a1-4864-95ec-a98979396596	\N	Renewable Energy and Sustainability: U.S. Market Research Report for Small Businesses (2025–2026)	\N	uploads/1743777029697-Renewable-Energy-Marketing-Report.jpg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	129	{"amount": 129, "currency": "usd"}	\N	2025-04-12 09:23:48.487+00	2025-04-12 09:23:48.487+00	\N	f	\N
li_e4ad0376-9e8c-44f0-9266-3269a539e18a	\N	Renewable Energy and Sustainability: U.S. Market Research Report for Small Businesses (2025–2026)	\N	uploads/1743777029697-Renewable-Energy-Marketing-Report.jpg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	129	{"amount": 129, "currency": "usd"}	\N	2025-04-12 09:38:30.164+00	2025-04-12 09:38:30.164+00	\N	f	\N
li_0b87ce2e-ea9c-46c9-8436-d2c16c8e282c	\N	Renewable Energy and Sustainability: U.S. Market Research Report for Small Businesses (2025–2026)	\N	uploads/1743777029697-Renewable-Energy-Marketing-Report.jpg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	129	{"amount": 129, "currency": "usd"}	\N	2025-04-12 09:44:22.575+00	2025-04-12 09:44:22.575+00	\N	f	\N
li_9e3ee5ae-810e-4073-9172-a0be578b7ebe	\N	Renewable Energy and Sustainability: U.S. Market Research Report for Small Businesses (2025–2026)	\N	uploads/1743777029697-Renewable-Energy-Marketing-Report.jpg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	129	{"amount": 129, "currency": "usd"}	\N	2025-04-12 10:43:26.515+00	2025-04-12 10:43:26.515+00	\N	f	\N
li_03cde557-0561-4002-8163-8049b505386a	\N	Renewable Energy and Sustainability: U.S. Market Research Report for Small Businesses (2025–2026)	\N	uploads/1743777029697-Renewable-Energy-Marketing-Report.jpg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	129	{"amount": 129, "currency": "usd"}	\N	2025-04-12 10:44:41.37+00	2025-04-12 10:44:41.37+00	\N	f	\N
li_42282a00-1fc6-405d-ae8a-873a1f332c57	\N	Renewable Energy and Sustainability: U.S. Market Research Report for Small Businesses (2025–2026)	\N	uploads/1743777029697-Renewable-Energy-Marketing-Report.jpg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	129	{"amount": 129, "currency": "usd"}	\N	2025-04-12 10:59:18.652+00	2025-04-12 10:59:18.652+00	\N	f	\N
li_6b9d5149-45bb-40c0-a664-94b71a29a26e	\N	Renewable Energy and Sustainability: U.S. Market Research Report for Small Businesses (2025–2026)	\N	uploads/1743777029697-Renewable-Energy-Marketing-Report.jpg	\N	9	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	129	{"amount": 12900, "currency_code": "usd"}	\N	2025-04-12 13:56:52.272+00	2025-04-12 13:56:52.272+00	\N	f	\N
li_f13d79ec-4ec0-452b-b35d-99c18a40ba78	\N	Renewable Energy and Sustainability: U.S. Market Research Report for Small Businesses (2025–2026)	\N	uploads/1743777029697-Renewable-Energy-Marketing-Report.jpg	\N	9	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	129	{"amount": 12900, "currency_code": "usd"}	\N	2025-04-12 15:27:58.767+00	2025-04-12 15:27:58.767+00	\N	f	\N
li_f7cf2588-bc0f-4a6b-b881-c6b6077556c9	\N	Renewable Energy and Sustainability: U.S. Market Research Report for Small Businesses (2025–2026)	\N	uploads/1743777029697-Renewable-Energy-Marketing-Report.jpg	\N	9	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	129	{"amount": 12900, "currency_code": "usd"}	\N	2025-04-12 15:43:57.133+00	2025-04-12 15:43:57.133+00	\N	f	\N
li_a4fb3c2d-50b3-4f35-b283-ad97571c9681	\N	Renewable Energy and Sustainability: U.S. Market Research Report for Small Businesses (2025–2026)	\N	uploads/1743777029697-Renewable-Energy-Marketing-Report.jpg	\N	9	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	129	{"amount": 12900, "currency_code": "usd"}	\N	2025-04-12 15:55:17.068+00	2025-04-12 15:55:17.068+00	\N	f	\N
li_3f96b68e-78d5-4762-88f7-cb22ea419cdf	\N	Renewable Energy and Sustainability: U.S. Market Research Report for Small Businesses (2025–2026)	\N	uploads/1743777029697-Renewable-Energy-Marketing-Report.jpg	\N	9	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	129	{"amount": 12900, "currency_code": "usd"}	\N	2025-04-12 16:04:00.292+00	2025-04-12 16:04:00.292+00	\N	f	\N
li_f2966ec9-bf05-49ca-a7d2-0cfc3cb199f7	\N	Renewable Energy and Sustainability: U.S. Market Research Report for Small Businesses (2025–2026)	\N	uploads/1743777029697-Renewable-Energy-Marketing-Report.jpg	\N	9	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	129	{"amount": 12900, "currency_code": "usd"}	\N	2025-04-12 16:09:56.901+00	2025-04-12 16:09:56.901+00	\N	f	\N
li_2fa058cd-81e3-4f14-ac31-fddb4289fbfe	\N	Renewable Energy and Sustainability: U.S. Market Research Report for Small Businesses (2025–2026)	\N	uploads/1743777029697-Renewable-Energy-Marketing-Report.jpg	\N	9	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	129	{"amount": 12900, "currency_code": "usd"}	\N	2025-04-13 16:59:24.796+00	2025-04-13 16:59:24.796+00	\N	f	\N
li_f40fee02-967e-4984-bcff-be08f48076c3	\N	Renewable Energy and Sustainability: U.S. Market Research Report for Small Businesses (2025–2026)	\N	uploads/1743777029697-Renewable-Energy-Marketing-Report.jpg	\N	9	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	129	{"amount": 12900, "currency_code": "usd"}	\N	2025-04-13 17:06:56.938+00	2025-04-13 17:06:56.938+00	\N	f	\N
li_f7254689-7ed4-4667-b379-2cf075c78d72	\N	Renewable Energy and Sustainability: U.S. Market Research Report for Small Businesses (2025–2026)	\N	uploads/1743777029697-Renewable-Energy-Marketing-Report.jpg	\N	9	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	129	{"amount": 12900, "currency_code": "usd"}	\N	2025-04-13 17:26:13.52+00	2025-04-13 17:26:13.52+00	\N	f	\N
li_48d6dd76-39c4-4348-8f46-ded9904346c5	\N	Renewable Energy and Sustainability: U.S. Market Research Report for Small Businesses (2025–2026)	\N	uploads/1743777029697-Renewable-Energy-Marketing-Report.jpg	\N	9	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	129	{"amount": 12900, "currency_code": "usd"}	\N	2025-04-13 17:34:10.711+00	2025-04-13 17:34:10.711+00	\N	f	\N
li_6b411ab1-8c8d-4b92-a2f9-060c987c7391	\N	Renewable Energy and Sustainability: U.S. Market Research Report for Small Businesses (2025–2026)	\N	uploads/1743777029697-Renewable-Energy-Marketing-Report.jpg	\N	9	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	129	{"amount": 12900, "currency_code": "usd"}	\N	2025-04-13 17:35:53.346+00	2025-04-13 17:35:53.346+00	\N	f	\N
li_70036ab2-11db-4e30-a5e3-d21f5ee6e344	\N	Renewable Energy and Sustainability: U.S. Market Research Report for Small Businesses (2025–2026)	\N	uploads/1743777029697-Renewable-Energy-Marketing-Report.jpg	\N	9	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	129	{"amount": 12900, "currency_code": "usd"}	\N	2025-04-13 17:39:53.244+00	2025-04-13 17:39:53.244+00	\N	f	\N
li_8b9f8154-d880-4444-bba9-62496d3528fa	\N	HealthShift 2025: Strategic Insights for Small Businesses in Healthcare and Telehealth	\N	uploads/1743786691218-HealthShift2025-Report.jpg	\N	5	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	129	{"amount": 12900, "currency_code": "usd"}	\N	2025-04-13 17:41:17.706+00	2025-04-13 17:41:17.706+00	\N	f	\N
li_87b14cc9-364e-4199-8229-1db9d3f2f3b1	\N	Renewable Energy and Sustainability: U.S. Market Research Report for Small Businesses (2025–2026)	\N	uploads/1743777029697-Renewable-Energy-Marketing-Report.jpg	\N	9	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	129	{"amount": 12900, "currency_code": "usd"}	\N	2025-04-15 07:34:09.143+00	2025-04-15 07:34:09.143+00	\N	f	\N
li_0ce6c2a8-643c-4dd5-8a56-833f2c1ba78a	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-15 09:18:07.21+00	2025-04-15 09:18:07.21+00	\N	f	\N
li_125e18ed-6a9f-491b-8442-1ee85bfc795b	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-15 09:25:29.242+00	2025-04-15 09:25:29.242+00	\N	f	\N
li_c4dc6ec0-ed4b-4125-9e4a-5309d9650fc9	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-15 09:25:54.046+00	2025-04-15 09:25:54.046+00	\N	f	\N
li_13712791-9e65-4270-b257-528233475397	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-15 09:45:49.92+00	2025-04-15 09:45:49.92+00	\N	f	\N
li_3f1cbd24-30d4-4870-a32e-ec2fe43a72b1	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-15 09:50:45.576+00	2025-04-15 09:50:45.576+00	\N	f	\N
li_10e3cbba-b73c-4b21-859b-1df1ef19d253	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-15 09:53:41.846+00	2025-04-15 09:53:41.846+00	\N	f	\N
li_8379022a-9e73-46f6-bca7-511f80f6e045	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-15 10:07:52.225+00	2025-04-15 10:07:52.225+00	\N	f	\N
li_63ac3177-ce68-4e73-b484-d04f73be5b51	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-15 10:10:14.41+00	2025-04-15 10:10:14.41+00	\N	f	\N
li_e2f8e55b-4562-48bb-826a-7af6e8fe96ab	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-15 10:11:33.552+00	2025-04-15 10:11:33.552+00	\N	f	\N
li_66cb4edf-c891-4a28-a9b8-d2e31c906067	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-15 11:20:38.979+00	2025-04-15 11:20:38.979+00	\N	f	\N
li_b6b951a2-289a-4746-a7d3-49813cb4e311	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-15 11:23:52.003+00	2025-04-15 11:23:52.003+00	\N	f	\N
li_0ea33b4f-e178-4043-82fc-f5abda5e7ebd	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-15 11:23:54.557+00	2025-04-15 11:23:54.557+00	\N	f	\N
li_79fd0a62-0688-4be0-ad54-65f8b8824bc4	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-15 11:24:26.325+00	2025-04-15 11:24:26.325+00	\N	f	\N
li_8cceca80-49fc-47f3-bdba-29769452747b	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-15 12:18:16.311+00	2025-04-15 12:18:16.311+00	\N	f	\N
li_2e8e1797-d20e-4eae-8299-0ce53ad6baf4	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-15 12:18:19.566+00	2025-04-15 12:18:19.566+00	\N	f	\N
li_5d256cc9-b4d8-418d-99f8-891ada4c4b1f	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-15 12:18:20.516+00	2025-04-15 12:18:20.516+00	\N	f	\N
li_70748747-1827-427a-8d41-ad79d4a6b8c8	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-15 12:18:38.996+00	2025-04-15 12:18:38.996+00	\N	f	\N
li_2f97672f-fae1-4ce0-9643-e0d2231ff038	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-15 13:22:33.629+00	2025-04-15 13:22:33.629+00	\N	f	\N
li_e6fc3e1c-bd5f-4ebf-99ec-1b4a942f3a4a	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-15 13:44:44.646+00	2025-04-15 13:44:44.646+00	\N	f	\N
li_2f82f1ca-1e5e-4559-b30a-84399f311e70	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-15 13:44:54.318+00	2025-04-15 13:44:54.318+00	\N	f	\N
li_6963a805-d0c9-410d-8c1a-a3441c1b2ddb	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-15 16:15:02.683+00	2025-04-15 16:15:02.683+00	\N	f	\N
li_fa3be012-cf81-40a0-add8-c10478309e14	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-15 17:30:49.998+00	2025-04-15 17:30:49.998+00	\N	f	\N
li_a7989517-f32e-41f8-b48a-c7ff407f6750	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-15 17:30:52.268+00	2025-04-15 17:30:52.268+00	\N	f	\N
li_d573dea8-adc5-4d6f-9908-72975774dd21	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-15 17:31:43.448+00	2025-04-15 17:31:43.448+00	\N	f	\N
li_a8d89e4e-10c8-4e67-895f-9e64688557fb	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-16 10:54:10.711+00	2025-04-16 10:54:10.711+00	\N	f	\N
li_aa0428f1-95d7-40ce-bebc-9d1a5255daab	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-16 10:54:13.392+00	2025-04-16 10:54:13.392+00	\N	f	\N
li_da7479ab-a3be-4f58-9240-1f7883738746	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-16 10:55:05.598+00	2025-04-16 10:55:05.598+00	\N	f	\N
li_337fd60f-f278-4001-a2cb-1a1ad7341d4a	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-16 10:56:10.129+00	2025-04-16 10:56:10.129+00	\N	f	\N
li_8ac7bdc3-c732-46e3-9a5e-b219bcead22f	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-16 12:58:16.214+00	2025-04-16 12:58:16.214+00	\N	f	\N
li_4b3ab840-0f1a-4d29-8e65-f1c64ab47e24	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-16 18:19:49.506+00	2025-04-16 18:19:49.506+00	\N	f	\N
li_eab15f25-8fba-43ca-b458-c16a4acd8593	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-16 18:19:57.018+00	2025-04-16 18:19:57.018+00	\N	f	\N
li_a6f13d04-f5f7-4cb1-86ac-d967ee9e7cdf	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-16 18:24:19.137+00	2025-04-16 18:24:19.137+00	\N	f	\N
li_1c235cc1-4eca-4331-a132-966bdcf08e49	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-16 18:43:47.948+00	2025-04-16 18:43:47.948+00	\N	f	\N
li_9d44169a-bb88-4373-a2cc-bae7ee20bbb3	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-16 18:51:28.074+00	2025-04-16 18:51:28.074+00	\N	f	\N
li_307c0c33-e4db-4591-8c67-3b3d067b6b91	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-16 19:01:55.239+00	2025-04-16 19:01:55.239+00	\N	f	\N
li_1de9c132-12c4-4344-8324-df48421589e0	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-16 19:16:28.224+00	2025-04-16 19:16:28.224+00	\N	f	\N
li_81dfa814-4028-48cc-b069-2b0fce3b4287	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-16 19:28:45.627+00	2025-04-16 19:28:45.627+00	\N	f	\N
li_cfe6d044-d05d-492e-9eb0-8d9846029e8e	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-16 19:53:33.016+00	2025-04-16 19:53:33.016+00	\N	f	\N
li_7fc4d41b-336f-40cd-a3e4-1207f0089ede	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-17 18:34:31.447+00	2025-04-17 18:34:31.447+00	\N	f	\N
li_8cd22957-14e4-4466-981e-435e1a2ad6b9	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-17 18:38:21.749+00	2025-04-17 18:38:21.749+00	\N	f	\N
li_8f0d2fb6-8d6f-4120-b685-c685f24c838b	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-17 19:02:13.598+00	2025-04-17 19:02:13.598+00	\N	f	\N
li_61972420-b91d-4f03-9d65-d1ff45f56d3b	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-17 19:21:09.311+00	2025-04-17 19:21:09.311+00	\N	f	\N
li_cb3a8e23-73a7-4f78-bba2-56baebdaed2f	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-17 20:41:45.812+00	2025-04-17 20:41:45.812+00	\N	f	\N
li_3599820b-3aa5-4fdd-a9f6-fba6e7816097	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-17 21:14:29.752+00	2025-04-17 21:14:29.752+00	\N	f	\N
li_e5123d76-dea2-44a9-b70f-64e9a2acac08	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-17 21:22:33.988+00	2025-04-17 21:22:33.988+00	\N	f	\N
li_d9d9ef58-4698-4933-9789-31e07e6d3306	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-17 21:34:31.94+00	2025-04-17 21:34:31.94+00	\N	f	\N
li_f3e2b302-7678-4be8-920e-8eede97a5f5d	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-17 21:36:34.705+00	2025-04-17 21:36:34.705+00	\N	f	\N
li_42b91a16-a961-4520-a60a-1f6317d199b5	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-17 21:55:21.032+00	2025-04-17 21:55:21.032+00	\N	f	\N
li_0d312c81-e30b-4289-b60a-b974025b2f2c	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-17 22:07:15.53+00	2025-04-17 22:07:15.53+00	\N	f	\N
li_fe793c3e-dc7f-4820-8d9a-49c263d5ce28	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-17 22:12:27.648+00	2025-04-17 22:12:27.648+00	\N	f	\N
li_7cbba01f-36a4-4c3f-ad03-6140a02ee74b	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-17 22:16:06.188+00	2025-04-17 22:16:06.188+00	\N	f	\N
li_26699fe9-6cd3-4bf8-8b55-fd36b7b81d16	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-18 08:54:36.194+00	2025-04-18 08:54:36.194+00	\N	f	\N
li_75c94662-b693-4ac3-8928-5aea1871cb04	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-18 09:21:47.415+00	2025-04-18 09:21:47.415+00	\N	f	\N
li_6f929244-3bff-478b-9b80-92701f49b6cc	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-18 09:26:03.968+00	2025-04-18 09:26:03.968+00	\N	f	\N
li_f324efde-ef86-4136-9394-bc860a1cc5a4	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-18 09:36:00.9+00	2025-04-18 09:36:00.9+00	\N	f	\N
li_77a4d69d-a3a7-43c2-ab64-fd1cfd4bb2f7	\N	Q3 Market Report	\N	uploads/1744360586626-Calculator.jpeg	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	\N	\N	19.99	{"amount": 1999, "currency_code": "usd"}	\N	2025-04-18 09:42:43.616+00	2025-04-18 09:42:43.616+00	\N	f	\N
\.


--
-- Data for Name: order_line_item_adjustment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_line_item_adjustment (id, description, promotion_id, code, amount, raw_amount, provider_id, created_at, updated_at, item_id, deleted_at) FROM stdin;
\.


--
-- Data for Name: order_line_item_tax_line; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_line_item_tax_line (id, description, tax_rate_id, code, rate, raw_rate, provider_id, created_at, updated_at, item_id, deleted_at) FROM stdin;
\.


--
-- Data for Name: order_payment_collection; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_payment_collection (order_id, payment_collection_id, id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: order_promotion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_promotion (order_id, promotion_id, id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: order_shipping; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_shipping (id, order_id, version, shipping_method_id, created_at, updated_at, deleted_at, return_id, claim_id, exchange_id) FROM stdin;
\.


--
-- Data for Name: order_shipping_method; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_shipping_method (id, name, description, amount, raw_amount, is_tax_inclusive, shipping_option_id, data, metadata, created_at, updated_at, deleted_at, is_custom_amount) FROM stdin;
\.


--
-- Data for Name: order_shipping_method_adjustment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_shipping_method_adjustment (id, description, promotion_id, code, amount, raw_amount, provider_id, created_at, updated_at, shipping_method_id, deleted_at) FROM stdin;
\.


--
-- Data for Name: order_shipping_method_tax_line; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_shipping_method_tax_line (id, description, tax_rate_id, code, rate, raw_rate, provider_id, created_at, updated_at, shipping_method_id, deleted_at) FROM stdin;
\.


--
-- Data for Name: order_summary; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_summary (id, order_id, version, totals, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: order_transaction; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_transaction (id, order_id, version, amount, raw_amount, currency_code, reference, reference_id, created_at, updated_at, deleted_at, return_id, claim_id, exchange_id) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, user_id, total, status, created_at, updated_at) FROM stdin;
5	3	49.95	pending	2025-03-04 21:41:05.400421	2025-03-04 21:41:05.400421+00
6	\N	7499.98	completed	2025-03-26 07:47:15.134787	2025-03-26 07:47:15.134787+00
7	\N	9999.99	processing	2025-03-26 07:47:40.967306	2025-03-26 07:47:40.967306+00
8	\N	3199.98	shipped	2025-03-26 07:48:07.84932	2025-03-26 07:48:07.84932+00
9	\N	899.99	cancelled	2025-03-26 07:48:51.667254	2025-03-26 07:48:51.667254+00
\.


--
-- Data for Name: payment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment (id, amount, raw_amount, currency_code, provider_id, data, created_at, updated_at, deleted_at, captured_at, canceled_at, payment_collection_id, payment_session_id, metadata) FROM stdin;
\.


--
-- Data for Name: payment_collection; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_collection (id, currency_code, amount, raw_amount, authorized_amount, raw_authorized_amount, captured_amount, raw_captured_amount, refunded_amount, raw_refunded_amount, created_at, updated_at, deleted_at, completed_at, status, metadata) FROM stdin;
\.


--
-- Data for Name: payment_collection_payment_providers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_collection_payment_providers (payment_collection_id, payment_provider_id) FROM stdin;
\.


--
-- Data for Name: payment_provider; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_provider (id, is_enabled, created_at, updated_at, deleted_at) FROM stdin;
pp_system_default	t	2025-02-21 14:44:16.788+00	2025-02-21 14:44:16.788+00	\N
\.


--
-- Data for Name: payment_session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_session (id, currency_code, amount, raw_amount, provider_id, data, context, status, authorized_at, payment_collection_id, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: price; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.price (id, title, price_set_id, currency_code, raw_amount, rules_count, created_at, updated_at, deleted_at, price_list_id, amount, min_quantity, max_quantity) FROM stdin;
\.


--
-- Data for Name: price_list; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.price_list (id, status, starts_at, ends_at, rules_count, title, description, type, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: price_list_rule; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.price_list_rule (id, price_list_id, created_at, updated_at, deleted_at, value, attribute) FROM stdin;
\.


--
-- Data for Name: price_preference; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.price_preference (id, attribute, value, is_tax_inclusive, created_at, updated_at, deleted_at) FROM stdin;
prpref_01JMMFSDWHD41YJQ1TZNKWK6FC	currency_code	eur	f	2025-02-21 14:50:05.585+00	2025-02-21 14:50:05.585+00	\N
\.


--
-- Data for Name: price_rule; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.price_rule (id, value, priority, price_id, created_at, updated_at, deleted_at, attribute, operator) FROM stdin;
\.


--
-- Data for Name: price_set; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.price_set (id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: product; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product (id, title, handle, subtitle, description, is_giftcard, status, thumbnail, weight, length, height, width, origin_country, hs_code, mid_code, material, collection_id, type_id, discountable, external_id, created_at, updated_at, deleted_at, metadata) FROM stdin;
\.


--
-- Data for Name: product_category; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_category (id, name, description, handle, mpath, is_active, is_internal, rank, parent_category_id, created_at, updated_at, deleted_at, metadata) FROM stdin;
\.


--
-- Data for Name: product_category_product; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_category_product (product_id, product_category_id) FROM stdin;
\.


--
-- Data for Name: product_collection; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_collection (id, title, handle, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: product_option; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_option (id, title, product_id, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: product_option_value; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_option_value (id, value, option_id, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: product_sales_channel; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_sales_channel (product_id, sales_channel_id, id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: product_shipping_profile; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_shipping_profile (product_id, shipping_profile_id, id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: product_tag; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_tag (id, value, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: product_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_tags (product_id, product_tag_id) FROM stdin;
\.


--
-- Data for Name: product_type; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_type (id, value, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: product_variant; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_variant (id, title, sku, barcode, ean, upc, allow_backorder, manage_inventory, hs_code, origin_country, mid_code, material, weight, length, height, width, metadata, variant_rank, product_id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: product_variant_inventory_item; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_variant_inventory_item (variant_id, inventory_item_id, id, required_quantity, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: product_variant_option; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_variant_option (variant_id, option_value_id) FROM stdin;
\.


--
-- Data for Name: product_variant_price_set; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_variant_price_set (variant_id, price_set_id, id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, name, description, price, created_at, image, featured, updated_at, slug, category_id, is_digital, s3_file_key, requires_llm_generation) FROM stdin;
9	Renewable Energy and Sustainability: U.S. Market Research Report for Small Businesses (2025–2026)	      <p style="color: #666; margin-bottom: 1.5rem;">\n        Power your next move with research-driven insights on one of the fastest-growing industries in the U.S.\n      </p>\n\n      <hr style="margin: 2rem 0;" />\n\n      <h2 style="color: #2e7d32;">📈 Why This Report Matters</h2>\n      <p>\n        The renewable energy market isn’t the future—it’s <strong>happening now</strong>. From solar rooftops to wind farms, and from EV charging stations to sustainable packaging, small businesses are fueling a green revolution.\n      </p>\n      <p>\n        This report is your roadmap to making informed decisions in this booming sector. It’s built specifically for small business owners, startups, and entrepreneurs looking to grow with purpose and precision.\n      </p>\n\n      <h2 style="color: #2e7d32;">🔍 What's Inside</h2>\n      <ul>\n        <li>Growth forecasts and investment trends</li>\n        <li>Regional demand breakdowns across the U.S.</li>\n        <li>Customer pain points and marketing tips</li>\n        <li>Actionable ideas for products and services</li>\n        <li>Insights tailored for small business decision-makers</li>\n      </ul>\n\n      <h2 style="color: #2e7d32;">🎯 Who It’s For</h2>\n      <ul>\n        <li>Eco-conscious entrepreneurs and startups</li>\n        <li>Solar installers, EV charging station providers</li>\n        <li>Green product makers and consultants</li>\n        <li>Local businesses exploring sustainability</li>\n      </ul>\n\n      <h2 style="color: #2e7d32;">🎁 Bonus Resources</h2>\n      <ul>\n        <li>Customer persona worksheet</li>\n        <li>Marketing message cheat sheet</li>\n        <li>6 months of industry updates</li>\n      </ul>\n\n      <h2 style="color: #2e7d32;">💵 Price: <span style="color: #000;">$129</span></h2>\n      <p>Secure checkout. Instant download. 7-day money-back guarantee if you're not satisfied.</p>\n\n	129	2025-03-25 15:12:30.275197	uploads/1743777029697-Renewable-Energy-Marketing-Report.jpg	t	2025-04-06 09:56:25.491795+00	renewable-energy-and-sustainability-us-market-research-report-for-small-businesses-2025-2026	1	t	digital-products/product1.pdf	f
5	HealthShift 2025: Strategic Insights for Small Businesses in Healthcare and Telehealth	      <h2 style="color: #1976d2;">💡 Why This Report Matters</h2>\n      <p>\n        The healthcare industry is evolving fast. From virtual care to in-home services, new business models are emerging—and small businesses are leading the way.  \n        With aging populations, labor shortages, and digital tools going mainstream, there’s never been a better time to explore healthcare and telehealth innovation.\n      </p>\n      <p>\n        This report gives you a strategic overview, helping you understand demand trends, regulatory dynamics, and market-ready opportunities tailored for small and independent providers.\n      </p>\n\n      <h2 style="color: #1976d2;">🔍 What’s Inside</h2>\n      <ul>\n        <li>Growth forecasts for telehealth, home care, and mental health services</li>\n        <li>Regional differences in healthcare demand and provider laws</li>\n        <li>Top customer pain points (tech, access, affordability)</li>\n        <li>Marketing strategies that build trust and drive engagement</li>\n        <li>Business ideas aligned with population trends and gaps</li>\n      </ul>\n\n      <h2 style="color: #1976d2;">👥 Who This Report Helps</h2>\n      <ul>\n        <li>Healthcare entrepreneurs and consultants</li>\n        <li>Telehealth and remote care service providers</li>\n        <li>Mental health and wellness professionals</li>\n        <li>Health tech startups and innovators</li>\n        <li>Marketers and agency owners targeting this sector</li>\n      </ul>\n\n      <h2 style="color: #1976d2;">🎁 Bonus Resources</h2>\n      <ul>\n        <li>HIPAA-aware marketing checklist</li>\n        <li>Patient persona worksheet</li>\n        <li>Newsletter & blog content starter kit</li>\n      </ul>\n\n      <h2 style="color: #1976d2;">💵 Price: <span style="color: #000;">$129</span></h2>\n      <p>Instant download. Built for small business decision-makers. Money-back guarantee if you’re not satisfied within 7 days.</p>\n\n      <a href="/checkout?product=healthcare-telehealth-report" \n         style="display: inline-block; background: #1976d2; color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 1rem;">\n        📥 Buy the Report Now\n      </a>\n\n    </main>\n\n	129	2025-03-25 15:10:28.877095	uploads/1743786691218-HealthShift2025-Report.jpg	t	2025-04-06 13:11:25.605979+00	healthshift-2025-strategic-insights-for-small-businesses-in-healthcare-and-telehealth	1	t	digital-products/product1.pdf	f
14	Q3 Market Report	Your comprehensive report.	19.99	2025-04-15 09:13:04.088039	uploads/1744360586626-Calculator.jpeg	t	2025-04-15 09:17:49.749915+00	q3-market-report	5	t	\N	t
\.


--
-- Data for Name: promotion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.promotion (id, code, campaign_id, is_automatic, type, created_at, updated_at, deleted_at, status) FROM stdin;
\.


--
-- Data for Name: promotion_application_method; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.promotion_application_method (id, value, raw_value, max_quantity, apply_to_quantity, buy_rules_min_quantity, type, target_type, allocation, promotion_id, created_at, updated_at, deleted_at, currency_code) FROM stdin;
\.


--
-- Data for Name: promotion_campaign; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.promotion_campaign (id, name, description, campaign_identifier, starts_at, ends_at, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: promotion_campaign_budget; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.promotion_campaign_budget (id, type, campaign_id, "limit", raw_limit, used, raw_used, created_at, updated_at, deleted_at, currency_code) FROM stdin;
\.


--
-- Data for Name: promotion_promotion_rule; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.promotion_promotion_rule (promotion_id, promotion_rule_id) FROM stdin;
\.


--
-- Data for Name: promotion_rule; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.promotion_rule (id, description, attribute, operator, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: promotion_rule_value; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.promotion_rule_value (id, promotion_rule_id, value, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: provider_identity; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.provider_identity (id, entity_id, provider, auth_identity_id, user_metadata, provider_metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: publishable_api_key_sales_channel; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.publishable_api_key_sales_channel (publishable_key_id, sales_channel_id, id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: refund; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.refund (id, amount, raw_amount, payment_id, created_at, updated_at, deleted_at, created_by, metadata, refund_reason_id, note) FROM stdin;
\.


--
-- Data for Name: refund_reason; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.refund_reason (id, label, description, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: region; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.region (id, name, currency_code, metadata, created_at, updated_at, deleted_at, automatic_taxes) FROM stdin;
\.


--
-- Data for Name: region_country; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.region_country (iso_2, iso_3, num_code, name, display_name, region_id, metadata, created_at, updated_at, deleted_at) FROM stdin;
af	afg	004	AFGHANISTAN	Afghanistan	\N	\N	2025-02-21 14:44:16.464+00	2025-02-21 14:44:16.464+00	\N
al	alb	008	ALBANIA	Albania	\N	\N	2025-02-21 14:44:16.465+00	2025-02-21 14:44:16.465+00	\N
dz	dza	012	ALGERIA	Algeria	\N	\N	2025-02-21 14:44:16.465+00	2025-02-21 14:44:16.465+00	\N
as	asm	016	AMERICAN SAMOA	American Samoa	\N	\N	2025-02-21 14:44:16.465+00	2025-02-21 14:44:16.465+00	\N
ad	and	020	ANDORRA	Andorra	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
ao	ago	024	ANGOLA	Angola	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
ai	aia	660	ANGUILLA	Anguilla	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
aq	ata	010	ANTARCTICA	Antarctica	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
ag	atg	028	ANTIGUA AND BARBUDA	Antigua and Barbuda	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
ar	arg	032	ARGENTINA	Argentina	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
am	arm	051	ARMENIA	Armenia	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
aw	abw	533	ARUBA	Aruba	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
au	aus	036	AUSTRALIA	Australia	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
at	aut	040	AUSTRIA	Austria	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
az	aze	031	AZERBAIJAN	Azerbaijan	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
bs	bhs	044	BAHAMAS	Bahamas	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
bh	bhr	048	BAHRAIN	Bahrain	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
bd	bgd	050	BANGLADESH	Bangladesh	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
bb	brb	052	BARBADOS	Barbados	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
by	blr	112	BELARUS	Belarus	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
be	bel	056	BELGIUM	Belgium	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
bz	blz	084	BELIZE	Belize	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
bj	ben	204	BENIN	Benin	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
bm	bmu	060	BERMUDA	Bermuda	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
bt	btn	064	BHUTAN	Bhutan	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
bo	bol	068	BOLIVIA	Bolivia	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
bq	bes	535	BONAIRE, SINT EUSTATIUS AND SABA	Bonaire, Sint Eustatius and Saba	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
ba	bih	070	BOSNIA AND HERZEGOVINA	Bosnia and Herzegovina	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
bw	bwa	072	BOTSWANA	Botswana	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
bv	bvd	074	BOUVET ISLAND	Bouvet Island	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
br	bra	076	BRAZIL	Brazil	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
io	iot	086	BRITISH INDIAN OCEAN TERRITORY	British Indian Ocean Territory	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
bn	brn	096	BRUNEI DARUSSALAM	Brunei Darussalam	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
bg	bgr	100	BULGARIA	Bulgaria	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
bf	bfa	854	BURKINA FASO	Burkina Faso	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
bi	bdi	108	BURUNDI	Burundi	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
kh	khm	116	CAMBODIA	Cambodia	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
cm	cmr	120	CAMEROON	Cameroon	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
ca	can	124	CANADA	Canada	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
cv	cpv	132	CAPE VERDE	Cape Verde	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
ky	cym	136	CAYMAN ISLANDS	Cayman Islands	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
cf	caf	140	CENTRAL AFRICAN REPUBLIC	Central African Republic	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
td	tcd	148	CHAD	Chad	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
cl	chl	152	CHILE	Chile	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
cn	chn	156	CHINA	China	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
cx	cxr	162	CHRISTMAS ISLAND	Christmas Island	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
cc	cck	166	COCOS (KEELING) ISLANDS	Cocos (Keeling) Islands	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
co	col	170	COLOMBIA	Colombia	\N	\N	2025-02-21 14:44:16.466+00	2025-02-21 14:44:16.466+00	\N
km	com	174	COMOROS	Comoros	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
cg	cog	178	CONGO	Congo	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
cd	cod	180	CONGO, THE DEMOCRATIC REPUBLIC OF THE	Congo, the Democratic Republic of the	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
ck	cok	184	COOK ISLANDS	Cook Islands	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
cr	cri	188	COSTA RICA	Costa Rica	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
ci	civ	384	COTE D'IVOIRE	Cote D'Ivoire	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
hr	hrv	191	CROATIA	Croatia	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
cu	cub	192	CUBA	Cuba	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
cw	cuw	531	CURAÇAO	Curaçao	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
cy	cyp	196	CYPRUS	Cyprus	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
cz	cze	203	CZECH REPUBLIC	Czech Republic	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
dk	dnk	208	DENMARK	Denmark	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
dj	dji	262	DJIBOUTI	Djibouti	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
dm	dma	212	DOMINICA	Dominica	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
do	dom	214	DOMINICAN REPUBLIC	Dominican Republic	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
ec	ecu	218	ECUADOR	Ecuador	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
eg	egy	818	EGYPT	Egypt	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
sv	slv	222	EL SALVADOR	El Salvador	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
gq	gnq	226	EQUATORIAL GUINEA	Equatorial Guinea	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
er	eri	232	ERITREA	Eritrea	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
ee	est	233	ESTONIA	Estonia	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
et	eth	231	ETHIOPIA	Ethiopia	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
fk	flk	238	FALKLAND ISLANDS (MALVINAS)	Falkland Islands (Malvinas)	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
fo	fro	234	FAROE ISLANDS	Faroe Islands	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
fj	fji	242	FIJI	Fiji	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
fi	fin	246	FINLAND	Finland	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
fr	fra	250	FRANCE	France	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
gf	guf	254	FRENCH GUIANA	French Guiana	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
pf	pyf	258	FRENCH POLYNESIA	French Polynesia	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
tf	atf	260	FRENCH SOUTHERN TERRITORIES	French Southern Territories	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
ga	gab	266	GABON	Gabon	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
gm	gmb	270	GAMBIA	Gambia	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
ge	geo	268	GEORGIA	Georgia	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
de	deu	276	GERMANY	Germany	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
gh	gha	288	GHANA	Ghana	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
gi	gib	292	GIBRALTAR	Gibraltar	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
gr	grc	300	GREECE	Greece	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
gl	grl	304	GREENLAND	Greenland	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
gd	grd	308	GRENADA	Grenada	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
gp	glp	312	GUADELOUPE	Guadeloupe	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
gu	gum	316	GUAM	Guam	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
gt	gtm	320	GUATEMALA	Guatemala	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
gg	ggy	831	GUERNSEY	Guernsey	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
gn	gin	324	GUINEA	Guinea	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
gw	gnb	624	GUINEA-BISSAU	Guinea-Bissau	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
gy	guy	328	GUYANA	Guyana	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
ht	hti	332	HAITI	Haiti	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
hm	hmd	334	HEARD ISLAND AND MCDONALD ISLANDS	Heard Island And Mcdonald Islands	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
va	vat	336	HOLY SEE (VATICAN CITY STATE)	Holy See (Vatican City State)	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
hn	hnd	340	HONDURAS	Honduras	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
hk	hkg	344	HONG KONG	Hong Kong	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
hu	hun	348	HUNGARY	Hungary	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
is	isl	352	ICELAND	Iceland	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
in	ind	356	INDIA	India	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
id	idn	360	INDONESIA	Indonesia	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
ir	irn	364	IRAN, ISLAMIC REPUBLIC OF	Iran, Islamic Republic of	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
iq	irq	368	IRAQ	Iraq	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
ie	irl	372	IRELAND	Ireland	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
im	imn	833	ISLE OF MAN	Isle Of Man	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
il	isr	376	ISRAEL	Israel	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
it	ita	380	ITALY	Italy	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
jm	jam	388	JAMAICA	Jamaica	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
jp	jpn	392	JAPAN	Japan	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
je	jey	832	JERSEY	Jersey	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
jo	jor	400	JORDAN	Jordan	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
kz	kaz	398	KAZAKHSTAN	Kazakhstan	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
ke	ken	404	KENYA	Kenya	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
ki	kir	296	KIRIBATI	Kiribati	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
kp	prk	408	KOREA, DEMOCRATIC PEOPLE'S REPUBLIC OF	Korea, Democratic People's Republic of	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
kr	kor	410	KOREA, REPUBLIC OF	Korea, Republic of	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
xk	xkx	900	KOSOVO	Kosovo	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
kw	kwt	414	KUWAIT	Kuwait	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
kg	kgz	417	KYRGYZSTAN	Kyrgyzstan	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
la	lao	418	LAO PEOPLE'S DEMOCRATIC REPUBLIC	Lao People's Democratic Republic	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
lv	lva	428	LATVIA	Latvia	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
lb	lbn	422	LEBANON	Lebanon	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
ls	lso	426	LESOTHO	Lesotho	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
lr	lbr	430	LIBERIA	Liberia	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
ly	lby	434	LIBYA	Libya	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
li	lie	438	LIECHTENSTEIN	Liechtenstein	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
lt	ltu	440	LITHUANIA	Lithuania	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
lu	lux	442	LUXEMBOURG	Luxembourg	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
mo	mac	446	MACAO	Macao	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
mk	mkd	807	MACEDONIA, THE FORMER YUGOSLAV REPUBLIC OF	Macedonia, the Former Yugoslav Republic of	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
mg	mdg	450	MADAGASCAR	Madagascar	\N	\N	2025-02-21 14:44:16.467+00	2025-02-21 14:44:16.467+00	\N
mw	mwi	454	MALAWI	Malawi	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
my	mys	458	MALAYSIA	Malaysia	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
mv	mdv	462	MALDIVES	Maldives	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
ml	mli	466	MALI	Mali	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
mt	mlt	470	MALTA	Malta	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
mh	mhl	584	MARSHALL ISLANDS	Marshall Islands	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
mq	mtq	474	MARTINIQUE	Martinique	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
mr	mrt	478	MAURITANIA	Mauritania	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
mu	mus	480	MAURITIUS	Mauritius	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
yt	myt	175	MAYOTTE	Mayotte	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
mx	mex	484	MEXICO	Mexico	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
fm	fsm	583	MICRONESIA, FEDERATED STATES OF	Micronesia, Federated States of	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
md	mda	498	MOLDOVA, REPUBLIC OF	Moldova, Republic of	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
mc	mco	492	MONACO	Monaco	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
mn	mng	496	MONGOLIA	Mongolia	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
me	mne	499	MONTENEGRO	Montenegro	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
ms	msr	500	MONTSERRAT	Montserrat	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
ma	mar	504	MOROCCO	Morocco	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
mz	moz	508	MOZAMBIQUE	Mozambique	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
mm	mmr	104	MYANMAR	Myanmar	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
na	nam	516	NAMIBIA	Namibia	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
nr	nru	520	NAURU	Nauru	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
np	npl	524	NEPAL	Nepal	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
nl	nld	528	NETHERLANDS	Netherlands	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
nc	ncl	540	NEW CALEDONIA	New Caledonia	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
nz	nzl	554	NEW ZEALAND	New Zealand	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
ni	nic	558	NICARAGUA	Nicaragua	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
ne	ner	562	NIGER	Niger	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
ng	nga	566	NIGERIA	Nigeria	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
nu	niu	570	NIUE	Niue	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
nf	nfk	574	NORFOLK ISLAND	Norfolk Island	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
mp	mnp	580	NORTHERN MARIANA ISLANDS	Northern Mariana Islands	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
no	nor	578	NORWAY	Norway	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
om	omn	512	OMAN	Oman	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
pk	pak	586	PAKISTAN	Pakistan	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
pw	plw	585	PALAU	Palau	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
ps	pse	275	PALESTINIAN TERRITORY, OCCUPIED	Palestinian Territory, Occupied	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
pa	pan	591	PANAMA	Panama	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
pg	png	598	PAPUA NEW GUINEA	Papua New Guinea	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
py	pry	600	PARAGUAY	Paraguay	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
pe	per	604	PERU	Peru	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
ph	phl	608	PHILIPPINES	Philippines	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
pn	pcn	612	PITCAIRN	Pitcairn	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
pl	pol	616	POLAND	Poland	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
pt	prt	620	PORTUGAL	Portugal	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
pr	pri	630	PUERTO RICO	Puerto Rico	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
qa	qat	634	QATAR	Qatar	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
re	reu	638	REUNION	Reunion	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
ro	rom	642	ROMANIA	Romania	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
ru	rus	643	RUSSIAN FEDERATION	Russian Federation	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
rw	rwa	646	RWANDA	Rwanda	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
bl	blm	652	SAINT BARTHÉLEMY	Saint Barthélemy	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
sh	shn	654	SAINT HELENA	Saint Helena	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
kn	kna	659	SAINT KITTS AND NEVIS	Saint Kitts and Nevis	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
lc	lca	662	SAINT LUCIA	Saint Lucia	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
mf	maf	663	SAINT MARTIN (FRENCH PART)	Saint Martin (French part)	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
pm	spm	666	SAINT PIERRE AND MIQUELON	Saint Pierre and Miquelon	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
vc	vct	670	SAINT VINCENT AND THE GRENADINES	Saint Vincent and the Grenadines	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
ws	wsm	882	SAMOA	Samoa	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
sm	smr	674	SAN MARINO	San Marino	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
st	stp	678	SAO TOME AND PRINCIPE	Sao Tome and Principe	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
sa	sau	682	SAUDI ARABIA	Saudi Arabia	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
sn	sen	686	SENEGAL	Senegal	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
rs	srb	688	SERBIA	Serbia	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
sc	syc	690	SEYCHELLES	Seychelles	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
sl	sle	694	SIERRA LEONE	Sierra Leone	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
sg	sgp	702	SINGAPORE	Singapore	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
sx	sxm	534	SINT MAARTEN	Sint Maarten	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
sk	svk	703	SLOVAKIA	Slovakia	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
si	svn	705	SLOVENIA	Slovenia	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
sb	slb	090	SOLOMON ISLANDS	Solomon Islands	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
so	som	706	SOMALIA	Somalia	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
za	zaf	710	SOUTH AFRICA	South Africa	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
gs	sgs	239	SOUTH GEORGIA AND THE SOUTH SANDWICH ISLANDS	South Georgia and the South Sandwich Islands	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
ss	ssd	728	SOUTH SUDAN	South Sudan	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
es	esp	724	SPAIN	Spain	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
lk	lka	144	SRI LANKA	Sri Lanka	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
sd	sdn	729	SUDAN	Sudan	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
sr	sur	740	SURINAME	Suriname	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
sj	sjm	744	SVALBARD AND JAN MAYEN	Svalbard and Jan Mayen	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
sz	swz	748	SWAZILAND	Swaziland	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
se	swe	752	SWEDEN	Sweden	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
ch	che	756	SWITZERLAND	Switzerland	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
sy	syr	760	SYRIAN ARAB REPUBLIC	Syrian Arab Republic	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
tw	twn	158	TAIWAN, PROVINCE OF CHINA	Taiwan, Province of China	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
tj	tjk	762	TAJIKISTAN	Tajikistan	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
tz	tza	834	TANZANIA, UNITED REPUBLIC OF	Tanzania, United Republic of	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
th	tha	764	THAILAND	Thailand	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
tl	tls	626	TIMOR LESTE	Timor Leste	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
tg	tgo	768	TOGO	Togo	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
tk	tkl	772	TOKELAU	Tokelau	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
to	ton	776	TONGA	Tonga	\N	\N	2025-02-21 14:44:16.468+00	2025-02-21 14:44:16.468+00	\N
tt	tto	780	TRINIDAD AND TOBAGO	Trinidad and Tobago	\N	\N	2025-02-21 14:44:16.469+00	2025-02-21 14:44:16.469+00	\N
tn	tun	788	TUNISIA	Tunisia	\N	\N	2025-02-21 14:44:16.469+00	2025-02-21 14:44:16.469+00	\N
tr	tur	792	TURKEY	Turkey	\N	\N	2025-02-21 14:44:16.469+00	2025-02-21 14:44:16.469+00	\N
tm	tkm	795	TURKMENISTAN	Turkmenistan	\N	\N	2025-02-21 14:44:16.469+00	2025-02-21 14:44:16.469+00	\N
tc	tca	796	TURKS AND CAICOS ISLANDS	Turks and Caicos Islands	\N	\N	2025-02-21 14:44:16.469+00	2025-02-21 14:44:16.469+00	\N
tv	tuv	798	TUVALU	Tuvalu	\N	\N	2025-02-21 14:44:16.469+00	2025-02-21 14:44:16.469+00	\N
ug	uga	800	UGANDA	Uganda	\N	\N	2025-02-21 14:44:16.469+00	2025-02-21 14:44:16.469+00	\N
ua	ukr	804	UKRAINE	Ukraine	\N	\N	2025-02-21 14:44:16.469+00	2025-02-21 14:44:16.469+00	\N
ae	are	784	UNITED ARAB EMIRATES	United Arab Emirates	\N	\N	2025-02-21 14:44:16.469+00	2025-02-21 14:44:16.469+00	\N
gb	gbr	826	UNITED KINGDOM	United Kingdom	\N	\N	2025-02-21 14:44:16.469+00	2025-02-21 14:44:16.469+00	\N
us	usa	840	UNITED STATES	United States	\N	\N	2025-02-21 14:44:16.469+00	2025-02-21 14:44:16.469+00	\N
um	umi	581	UNITED STATES MINOR OUTLYING ISLANDS	United States Minor Outlying Islands	\N	\N	2025-02-21 14:44:16.469+00	2025-02-21 14:44:16.469+00	\N
uy	ury	858	URUGUAY	Uruguay	\N	\N	2025-02-21 14:44:16.469+00	2025-02-21 14:44:16.469+00	\N
uz	uzb	860	UZBEKISTAN	Uzbekistan	\N	\N	2025-02-21 14:44:16.469+00	2025-02-21 14:44:16.469+00	\N
vu	vut	548	VANUATU	Vanuatu	\N	\N	2025-02-21 14:44:16.469+00	2025-02-21 14:44:16.469+00	\N
ve	ven	862	VENEZUELA	Venezuela	\N	\N	2025-02-21 14:44:16.469+00	2025-02-21 14:44:16.469+00	\N
vn	vnm	704	VIET NAM	Viet Nam	\N	\N	2025-02-21 14:44:16.469+00	2025-02-21 14:44:16.469+00	\N
vg	vgb	092	VIRGIN ISLANDS, BRITISH	Virgin Islands, British	\N	\N	2025-02-21 14:44:16.469+00	2025-02-21 14:44:16.469+00	\N
vi	vir	850	VIRGIN ISLANDS, U.S.	Virgin Islands, U.S.	\N	\N	2025-02-21 14:44:16.469+00	2025-02-21 14:44:16.469+00	\N
wf	wlf	876	WALLIS AND FUTUNA	Wallis and Futuna	\N	\N	2025-02-21 14:44:16.469+00	2025-02-21 14:44:16.469+00	\N
eh	esh	732	WESTERN SAHARA	Western Sahara	\N	\N	2025-02-21 14:44:16.469+00	2025-02-21 14:44:16.469+00	\N
ye	yem	887	YEMEN	Yemen	\N	\N	2025-02-21 14:44:16.469+00	2025-02-21 14:44:16.469+00	\N
zm	zmb	894	ZAMBIA	Zambia	\N	\N	2025-02-21 14:44:16.469+00	2025-02-21 14:44:16.469+00	\N
zw	zwe	716	ZIMBABWE	Zimbabwe	\N	\N	2025-02-21 14:44:16.469+00	2025-02-21 14:44:16.469+00	\N
ax	ala	248	ÅLAND ISLANDS	Åland Islands	\N	\N	2025-02-21 14:44:16.469+00	2025-02-21 14:44:16.469+00	\N
\.


--
-- Data for Name: region_payment_provider; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.region_payment_provider (region_id, payment_provider_id, id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: reservation_item; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reservation_item (id, created_at, updated_at, deleted_at, line_item_id, location_id, quantity, external_id, description, created_by, metadata, inventory_item_id, allow_backorder, raw_quantity) FROM stdin;
\.


--
-- Data for Name: return; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.return (id, order_id, claim_id, exchange_id, order_version, display_id, status, no_notification, refund_amount, raw_refund_amount, metadata, created_at, updated_at, deleted_at, received_at, canceled_at, location_id, requested_at, created_by) FROM stdin;
\.


--
-- Data for Name: return_fulfillment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.return_fulfillment (return_id, fulfillment_id, id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: return_item; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.return_item (id, return_id, reason_id, item_id, quantity, raw_quantity, received_quantity, raw_received_quantity, note, metadata, created_at, updated_at, deleted_at, damaged_quantity, raw_damaged_quantity) FROM stdin;
\.


--
-- Data for Name: return_reason; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.return_reason (id, value, label, description, metadata, parent_return_reason_id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: sales_channel; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales_channel (id, name, description, is_disabled, metadata, created_at, updated_at, deleted_at) FROM stdin;
sc_01JMMFSDR2SECNYKB771PKFZMG	Default Sales Channel	Created by Medusa	f	\N	2025-02-21 14:50:05.445+00	2025-02-21 14:50:05.445+00	\N
\.


--
-- Data for Name: sales_channel_stock_location; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales_channel_stock_location (sales_channel_id, stock_location_id, id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: service_zone; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.service_zone (id, name, metadata, fulfillment_set_id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: shipping_option; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shipping_option (id, name, price_type, service_zone_id, shipping_profile_id, provider_id, data, metadata, shipping_option_type_id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: shipping_option_price_set; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shipping_option_price_set (shipping_option_id, price_set_id, id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: shipping_option_rule; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shipping_option_rule (id, attribute, operator, value, shipping_option_id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: shipping_option_type; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shipping_option_type (id, label, description, code, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: shipping_profile; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shipping_profile (id, name, type, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: stock_location; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_location (id, created_at, updated_at, deleted_at, name, address_id, metadata) FROM stdin;
\.


--
-- Data for Name: stock_location_address; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_location_address (id, created_at, updated_at, deleted_at, address_1, address_2, company, city, country_code, phone, province, postal_code, metadata) FROM stdin;
\.


--
-- Data for Name: store; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.store (id, name, default_sales_channel_id, default_region_id, default_location_id, metadata, created_at, updated_at, deleted_at) FROM stdin;
store_01JMMFSDTGYXP31SYB3NFJYRD0	Medusa Store	sc_01JMMFSDR2SECNYKB771PKFZMG	\N	\N	\N	2025-02-21 14:50:05.51608+00	2025-02-21 14:50:05.51608+00	\N
\.


--
-- Data for Name: store_currency; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.store_currency (id, currency_code, is_default, store_id, created_at, updated_at, deleted_at) FROM stdin;
stocur_01JMMFSDTZ3PTVTZSAZZ3Q4VWC	eur	t	store_01JMMFSDTGYXP31SYB3NFJYRD0	2025-02-21 14:50:05.51608+00	2025-02-21 14:50:05.51608+00	\N
\.


--
-- Data for Name: tax_provider; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tax_provider (id, is_enabled, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: tax_rate; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tax_rate (id, rate, code, name, is_default, is_combinable, tax_region_id, metadata, created_at, updated_at, created_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: tax_rate_rule; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tax_rate_rule (id, tax_rate_id, reference_id, reference, metadata, created_at, updated_at, created_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: tax_region; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tax_region (id, provider_id, country_code, province_code, parent_id, metadata, created_at, updated_at, created_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."user" (id, first_name, last_name, email, avatar_url, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password, created_at, role, name) FROM stdin;
3	candy@citep.com	$2b$10$vIeOFtse/9dvEMm17Tbv6OUzfQ9fr9Rfu0lQfKSS.qEHnifbnfu7G	2025-03-04 21:34:21.939641	user	\N
1	worker@citep.com	$2b$10$q6oglVt4i0Fan8YItmw4X.5QKExlgQe8LZSsimaY/HK0CMITnMmE2	2025-02-22 13:21:59.429222	admin	\N
2	cindy@citep.com	$2b$10$5pk4sKGrlNj1IPyH8HZd9.2gMHqG5FonBN0u1I40RpRtUD.UdAKxa	2025-02-22 14:08:42.533623	admin	\N
4	dudley@citep.com	$2b$10$FqNhKjjPlL5wC.kIYhac3O8V51iSTCvXgYBr6tVmxSmK3/SL.OYeO	2025-03-31 18:18:12.323519	admin	Johnson Dudley
5	heart@citep.com	$2b$10$wdLOGCbun8jUmD0RObayhOLxYys4HTuDr7YdS1uDKsvB9DXYOUqXu	2025-03-31 18:45:17.240933	user	Nancy Wilson
6	micky@citep.com	$2b$10$YWNTnkfQRvXTMcbJNFMrt.TOWVHlyRuBYn/f5ic/WCd6r3HF.qx1e	2025-04-02 15:11:55.031506	user	Mick McGurk
7	gardy@citep.com	$2b$10$ZUrHfgb.Hv1TP5EhLrN6oOVuCGtvqGRdlZPQNE4bLVC/Yfu2xOHFq	2025-04-02 17:10:25.686882	user	Gardy Bro
8	johnhenry@citep.com	$2b$10$xEKfYOsLCZwO81HugU64z.3ESxvU1AZmApcHG6x5Vjal2JVyT4iZq	2025-04-02 17:40:35.732368	user	John Henry Mellenheart
9	mcmahon@citep.com	$2b$10$/CxXsEXmXxWo96SWSgrWxeF41s2ucmkVuXHJGraqyw4.t9dBaG1eO	2025-04-03 18:27:15.502245	user	Mickey McMahon
10	silky@citep.com	$2b$10$Zcz61UkoRwqeUTv9N6qkU.5DFwOxBHkbKVhGXzI6jfwxFeQajpy0i	2025-04-03 20:34:01.455833	user	Silky Nobbins
11	heather714@gmail.com	$2b$10$KgXAtiGKKUV2CX8WuJo.W...K23H543M3z5Dlkbt3nZXgGV2591RG	2025-04-04 08:13:15.340194	admin	Heather
12	bigterry@citep.com	$2b$10$t8PvgbSGbFwAlitHI2keo.PmhFR1kAyAOwSuTfhU7HyGiiqmaMrO2	2025-04-09 08:47:52.421746	user	Terrence Michael
13	brad@citep.com	$2b$10$Z3rjyFSFb6rLNfAbJ9CZ/.PSE7pwQY6d6/USa.cwZ4DV.FP7dyWVO	2025-04-13 14:27:32.917197	user	Brad Bigman
14	brady@citep.com	$2b$10$tr9MVCtdSQ7GixcTqqMngeIigtj7JdyqNKTowMBwqXXWPnHaZ66v.	2025-04-13 14:28:12.445632	user	Brady Boog
15	brady2@citep.com	$2b$10$6ZSbJB3wxx/Cf1tNPMPqouFWhBaBCoGpmCGJJ8DPEH35JlyZ1fZXi	2025-04-13 14:32:12.267502	user	Brady Boog
16	brady23@citep.com	$2b$10$F.X/mV3fOlJZ/pBHV/u54O6wa0s3hNbe96vPrsFgAH36aUASyX0Xu	2025-04-13 14:38:17.818712	user	Brady Boog
17	brady233@citep.com	$2b$10$b/ArmiYl3tQOwloi22RCC.2l3GvXBKeGV6pCfQfSAL1bvQZUQ5D06	2025-04-13 14:39:32.035567	user	Brady Boog
18	brady1233@citep.com	$2b$10$67Ru8ysmHmeUKoYQCzjPaehH6XgDkuCVKn.EcgGeZYCTDGxchtPbO	2025-04-13 14:39:49.458829	user	Brady Boog
19	nicd@citep.com	$2b$10$y/7uEwg9S1meaLWHZ2sDdefv5DfgClJWrw4MMX83MdhBGDEURSItS	2025-04-13 16:28:19.261916	user	Nicolas Doubert
20	trodd@citep.com	$2b$10$GrYgirOacRkdK/ng.UpSw.WXic.NjbLBTvI1sC2aTqyvDNCf4nEam	2025-04-13 16:36:38.258647	user	Thomas Rodd
21	nicd22@citep.com	$2b$10$zfBDatql/N4eljnWEKhveuO8Agy0qddNzUUVj5oB/DEqL9o4MFSHK	2025-04-13 16:40:21.946528	user	Nicolas Doubert
22	nicold22@citep.com	$2b$10$q2pAXiwMgZisWKBjceiUl.lmg2gwh0J0KNwtfKRXXIi/KRCPivxsa	2025-04-13 16:42:50.485992	user	Nicolas Doubert
23	ednicold22@citep.com	$2b$10$z1EgxH/h3iGGaFu4.l38aegRWPUSe/HwPZUE42t1qANLx89XU9lT6	2025-04-13 16:47:35.018091	user	Nicolas Doubert
24	heather714@citep.com	$2b$10$zkyRGyoixaAc14LUBrokS.oQJsT/X90RD5i9rU6jw7Eb05I5Jscy2	2025-04-13 16:58:51.882088	user	Heather McLaughlin
\.


--
-- Data for Name: workflow_execution; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workflow_execution (id, workflow_id, transaction_id, execution, context, state, created_at, updated_at, deleted_at, retention_time) FROM stdin;
\.


--
-- Name: blog_posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.blog_posts_id_seq', 8, true);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categories_id_seq', 9, true);


--
-- Name: link_module_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.link_module_migrations_id_seq', 18, true);


--
-- Name: mikro_orm_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mikro_orm_migrations_id_seq', 98, true);


--
-- Name: order_change_action_ordering_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_change_action_ordering_seq', 1, false);


--
-- Name: order_claim_display_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_claim_display_id_seq', 1, false);


--
-- Name: order_display_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_display_id_seq', 114, true);


--
-- Name: order_exchange_display_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_exchange_display_id_seq', 1, false);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_id_seq', 9, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 14, true);


--
-- Name: return_display_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.return_display_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 24, true);


--
-- Name: promotion IDX_promotion_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion
    ADD CONSTRAINT "IDX_promotion_code_unique" UNIQUE (code);


--
-- Name: workflow_execution PK_workflow_execution_workflow_id_transaction_id; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_execution
    ADD CONSTRAINT "PK_workflow_execution_workflow_id_transaction_id" PRIMARY KEY (workflow_id, transaction_id);


--
-- Name: account_holder account_holder_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_holder
    ADD CONSTRAINT account_holder_pkey PRIMARY KEY (id);


--
-- Name: api_key api_key_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_key
    ADD CONSTRAINT api_key_pkey PRIMARY KEY (id);


--
-- Name: application_method_buy_rules application_method_buy_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_method_buy_rules
    ADD CONSTRAINT application_method_buy_rules_pkey PRIMARY KEY (application_method_id, promotion_rule_id);


--
-- Name: application_method_target_rules application_method_target_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_method_target_rules
    ADD CONSTRAINT application_method_target_rules_pkey PRIMARY KEY (application_method_id, promotion_rule_id);


--
-- Name: auth_identity auth_identity_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_identity
    ADD CONSTRAINT auth_identity_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_slug_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_slug_unique UNIQUE (slug);


--
-- Name: capture capture_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.capture
    ADD CONSTRAINT capture_pkey PRIMARY KEY (id);


--
-- Name: cart_address cart_address_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_address
    ADD CONSTRAINT cart_address_pkey PRIMARY KEY (id);


--
-- Name: cart_line_item_adjustment cart_line_item_adjustment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_line_item_adjustment
    ADD CONSTRAINT cart_line_item_adjustment_pkey PRIMARY KEY (id);


--
-- Name: cart_line_item cart_line_item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_line_item
    ADD CONSTRAINT cart_line_item_pkey PRIMARY KEY (id);


--
-- Name: cart_line_item_tax_line cart_line_item_tax_line_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_line_item_tax_line
    ADD CONSTRAINT cart_line_item_tax_line_pkey PRIMARY KEY (id);


--
-- Name: cart_payment_collection cart_payment_collection_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_payment_collection
    ADD CONSTRAINT cart_payment_collection_pkey PRIMARY KEY (cart_id, payment_collection_id);


--
-- Name: cart cart_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_pkey PRIMARY KEY (id);


--
-- Name: cart_promotion cart_promotion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_promotion
    ADD CONSTRAINT cart_promotion_pkey PRIMARY KEY (cart_id, promotion_id);


--
-- Name: cart_shipping_method_adjustment cart_shipping_method_adjustment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_shipping_method_adjustment
    ADD CONSTRAINT cart_shipping_method_adjustment_pkey PRIMARY KEY (id);


--
-- Name: cart_shipping_method cart_shipping_method_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_shipping_method
    ADD CONSTRAINT cart_shipping_method_pkey PRIMARY KEY (id);


--
-- Name: cart_shipping_method_tax_line cart_shipping_method_tax_line_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_shipping_method_tax_line
    ADD CONSTRAINT cart_shipping_method_tax_line_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: currency currency_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.currency
    ADD CONSTRAINT currency_pkey PRIMARY KEY (code);


--
-- Name: customer_account_holder customer_account_holder_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_account_holder
    ADD CONSTRAINT customer_account_holder_pkey PRIMARY KEY (customer_id, account_holder_id);


--
-- Name: customer_address customer_address_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_address
    ADD CONSTRAINT customer_address_pkey PRIMARY KEY (id);


--
-- Name: customer_group_customer customer_group_customer_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_group_customer
    ADD CONSTRAINT customer_group_customer_pkey PRIMARY KEY (id);


--
-- Name: customer_group customer_group_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_group
    ADD CONSTRAINT customer_group_pkey PRIMARY KEY (id);


--
-- Name: customer customer_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer
    ADD CONSTRAINT customer_pkey PRIMARY KEY (id);


--
-- Name: fulfillment_address fulfillment_address_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fulfillment_address
    ADD CONSTRAINT fulfillment_address_pkey PRIMARY KEY (id);


--
-- Name: fulfillment_item fulfillment_item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fulfillment_item
    ADD CONSTRAINT fulfillment_item_pkey PRIMARY KEY (id);


--
-- Name: fulfillment_label fulfillment_label_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fulfillment_label
    ADD CONSTRAINT fulfillment_label_pkey PRIMARY KEY (id);


--
-- Name: fulfillment fulfillment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fulfillment
    ADD CONSTRAINT fulfillment_pkey PRIMARY KEY (id);


--
-- Name: fulfillment_provider fulfillment_provider_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fulfillment_provider
    ADD CONSTRAINT fulfillment_provider_pkey PRIMARY KEY (id);


--
-- Name: fulfillment_set fulfillment_set_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fulfillment_set
    ADD CONSTRAINT fulfillment_set_pkey PRIMARY KEY (id);


--
-- Name: geo_zone geo_zone_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.geo_zone
    ADD CONSTRAINT geo_zone_pkey PRIMARY KEY (id);


--
-- Name: image image_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image
    ADD CONSTRAINT image_pkey PRIMARY KEY (id);


--
-- Name: inventory_item inventory_item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_item
    ADD CONSTRAINT inventory_item_pkey PRIMARY KEY (id);


--
-- Name: inventory_level inventory_level_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_level
    ADD CONSTRAINT inventory_level_pkey PRIMARY KEY (id);


--
-- Name: invite invite_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invite
    ADD CONSTRAINT invite_pkey PRIMARY KEY (id);


--
-- Name: link_module_migrations link_module_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.link_module_migrations
    ADD CONSTRAINT link_module_migrations_pkey PRIMARY KEY (id);


--
-- Name: link_module_migrations link_module_migrations_table_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.link_module_migrations
    ADD CONSTRAINT link_module_migrations_table_name_key UNIQUE (table_name);


--
-- Name: location_fulfillment_provider location_fulfillment_provider_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_fulfillment_provider
    ADD CONSTRAINT location_fulfillment_provider_pkey PRIMARY KEY (stock_location_id, fulfillment_provider_id);


--
-- Name: location_fulfillment_set location_fulfillment_set_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_fulfillment_set
    ADD CONSTRAINT location_fulfillment_set_pkey PRIMARY KEY (stock_location_id, fulfillment_set_id);


--
-- Name: mikro_orm_migrations mikro_orm_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mikro_orm_migrations
    ADD CONSTRAINT mikro_orm_migrations_pkey PRIMARY KEY (id);


--
-- Name: notification notification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_pkey PRIMARY KEY (id);


--
-- Name: notification_provider notification_provider_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_provider
    ADD CONSTRAINT notification_provider_pkey PRIMARY KEY (id);


--
-- Name: order_address order_address_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_address
    ADD CONSTRAINT order_address_pkey PRIMARY KEY (id);


--
-- Name: order_cart order_cart_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_cart
    ADD CONSTRAINT order_cart_pkey PRIMARY KEY (order_id, cart_id);


--
-- Name: order_change_action order_change_action_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_change_action
    ADD CONSTRAINT order_change_action_pkey PRIMARY KEY (id);


--
-- Name: order_change order_change_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_change
    ADD CONSTRAINT order_change_pkey PRIMARY KEY (id);


--
-- Name: order_claim_item_image order_claim_item_image_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_claim_item_image
    ADD CONSTRAINT order_claim_item_image_pkey PRIMARY KEY (id);


--
-- Name: order_claim_item order_claim_item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_claim_item
    ADD CONSTRAINT order_claim_item_pkey PRIMARY KEY (id);


--
-- Name: order_claim order_claim_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_claim
    ADD CONSTRAINT order_claim_pkey PRIMARY KEY (id);


--
-- Name: order_credit_line order_credit_line_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_credit_line
    ADD CONSTRAINT order_credit_line_pkey PRIMARY KEY (id);


--
-- Name: order_exchange_item order_exchange_item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_exchange_item
    ADD CONSTRAINT order_exchange_item_pkey PRIMARY KEY (id);


--
-- Name: order_exchange order_exchange_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_exchange
    ADD CONSTRAINT order_exchange_pkey PRIMARY KEY (id);


--
-- Name: order_fulfillment order_fulfillment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_fulfillment
    ADD CONSTRAINT order_fulfillment_pkey PRIMARY KEY (order_id, fulfillment_id);


--
-- Name: order_item order_item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_item
    ADD CONSTRAINT order_item_pkey PRIMARY KEY (id);


--
-- Name: order_line_item_adjustment order_line_item_adjustment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_line_item_adjustment
    ADD CONSTRAINT order_line_item_adjustment_pkey PRIMARY KEY (id);


--
-- Name: order_line_item order_line_item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_line_item
    ADD CONSTRAINT order_line_item_pkey PRIMARY KEY (id);


--
-- Name: order_line_item_tax_line order_line_item_tax_line_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_line_item_tax_line
    ADD CONSTRAINT order_line_item_tax_line_pkey PRIMARY KEY (id);


--
-- Name: order_payment_collection order_payment_collection_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_payment_collection
    ADD CONSTRAINT order_payment_collection_pkey PRIMARY KEY (order_id, payment_collection_id);


--
-- Name: order order_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."order"
    ADD CONSTRAINT order_pkey PRIMARY KEY (id);


--
-- Name: order_promotion order_promotion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_promotion
    ADD CONSTRAINT order_promotion_pkey PRIMARY KEY (order_id, promotion_id);


--
-- Name: order_shipping_method_adjustment order_shipping_method_adjustment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_shipping_method_adjustment
    ADD CONSTRAINT order_shipping_method_adjustment_pkey PRIMARY KEY (id);


--
-- Name: order_shipping_method order_shipping_method_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_shipping_method
    ADD CONSTRAINT order_shipping_method_pkey PRIMARY KEY (id);


--
-- Name: order_shipping_method_tax_line order_shipping_method_tax_line_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_shipping_method_tax_line
    ADD CONSTRAINT order_shipping_method_tax_line_pkey PRIMARY KEY (id);


--
-- Name: order_shipping order_shipping_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_shipping
    ADD CONSTRAINT order_shipping_pkey PRIMARY KEY (id);


--
-- Name: order_summary order_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_summary
    ADD CONSTRAINT order_summary_pkey PRIMARY KEY (id);


--
-- Name: order_transaction order_transaction_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_transaction
    ADD CONSTRAINT order_transaction_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payment_collection_payment_providers payment_collection_payment_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_collection_payment_providers
    ADD CONSTRAINT payment_collection_payment_providers_pkey PRIMARY KEY (payment_collection_id, payment_provider_id);


--
-- Name: payment_collection payment_collection_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_collection
    ADD CONSTRAINT payment_collection_pkey PRIMARY KEY (id);


--
-- Name: payment payment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_pkey PRIMARY KEY (id);


--
-- Name: payment_provider payment_provider_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_provider
    ADD CONSTRAINT payment_provider_pkey PRIMARY KEY (id);


--
-- Name: payment_session payment_session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_session
    ADD CONSTRAINT payment_session_pkey PRIMARY KEY (id);


--
-- Name: price_list price_list_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_list
    ADD CONSTRAINT price_list_pkey PRIMARY KEY (id);


--
-- Name: price_list_rule price_list_rule_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_list_rule
    ADD CONSTRAINT price_list_rule_pkey PRIMARY KEY (id);


--
-- Name: price price_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price
    ADD CONSTRAINT price_pkey PRIMARY KEY (id);


--
-- Name: price_preference price_preference_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_preference
    ADD CONSTRAINT price_preference_pkey PRIMARY KEY (id);


--
-- Name: price_rule price_rule_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_rule
    ADD CONSTRAINT price_rule_pkey PRIMARY KEY (id);


--
-- Name: price_set price_set_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_set
    ADD CONSTRAINT price_set_pkey PRIMARY KEY (id);


--
-- Name: product_category product_category_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_category
    ADD CONSTRAINT product_category_pkey PRIMARY KEY (id);


--
-- Name: product_category_product product_category_product_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_category_product
    ADD CONSTRAINT product_category_product_pkey PRIMARY KEY (product_id, product_category_id);


--
-- Name: product_collection product_collection_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_collection
    ADD CONSTRAINT product_collection_pkey PRIMARY KEY (id);


--
-- Name: product_option product_option_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_option
    ADD CONSTRAINT product_option_pkey PRIMARY KEY (id);


--
-- Name: product_option_value product_option_value_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_option_value
    ADD CONSTRAINT product_option_value_pkey PRIMARY KEY (id);


--
-- Name: product product_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_pkey PRIMARY KEY (id);


--
-- Name: product_sales_channel product_sales_channel_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_sales_channel
    ADD CONSTRAINT product_sales_channel_pkey PRIMARY KEY (product_id, sales_channel_id);


--
-- Name: product_shipping_profile product_shipping_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_shipping_profile
    ADD CONSTRAINT product_shipping_profile_pkey PRIMARY KEY (product_id, shipping_profile_id);


--
-- Name: product_tag product_tag_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_tag
    ADD CONSTRAINT product_tag_pkey PRIMARY KEY (id);


--
-- Name: product_tags product_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_tags
    ADD CONSTRAINT product_tags_pkey PRIMARY KEY (product_id, product_tag_id);


--
-- Name: product_type product_type_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_type
    ADD CONSTRAINT product_type_pkey PRIMARY KEY (id);


--
-- Name: product_variant_inventory_item product_variant_inventory_item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variant_inventory_item
    ADD CONSTRAINT product_variant_inventory_item_pkey PRIMARY KEY (variant_id, inventory_item_id);


--
-- Name: product_variant_option product_variant_option_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variant_option
    ADD CONSTRAINT product_variant_option_pkey PRIMARY KEY (variant_id, option_value_id);


--
-- Name: product_variant product_variant_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variant
    ADD CONSTRAINT product_variant_pkey PRIMARY KEY (id);


--
-- Name: product_variant_price_set product_variant_price_set_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variant_price_set
    ADD CONSTRAINT product_variant_price_set_pkey PRIMARY KEY (variant_id, price_set_id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_slug_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_unique UNIQUE (slug);


--
-- Name: promotion_application_method promotion_application_method_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_application_method
    ADD CONSTRAINT promotion_application_method_pkey PRIMARY KEY (id);


--
-- Name: promotion_campaign_budget promotion_campaign_budget_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_campaign_budget
    ADD CONSTRAINT promotion_campaign_budget_pkey PRIMARY KEY (id);


--
-- Name: promotion_campaign promotion_campaign_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_campaign
    ADD CONSTRAINT promotion_campaign_pkey PRIMARY KEY (id);


--
-- Name: promotion promotion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion
    ADD CONSTRAINT promotion_pkey PRIMARY KEY (id);


--
-- Name: promotion_promotion_rule promotion_promotion_rule_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_promotion_rule
    ADD CONSTRAINT promotion_promotion_rule_pkey PRIMARY KEY (promotion_id, promotion_rule_id);


--
-- Name: promotion_rule promotion_rule_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_rule
    ADD CONSTRAINT promotion_rule_pkey PRIMARY KEY (id);


--
-- Name: promotion_rule_value promotion_rule_value_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_rule_value
    ADD CONSTRAINT promotion_rule_value_pkey PRIMARY KEY (id);


--
-- Name: provider_identity provider_identity_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.provider_identity
    ADD CONSTRAINT provider_identity_pkey PRIMARY KEY (id);


--
-- Name: publishable_api_key_sales_channel publishable_api_key_sales_channel_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publishable_api_key_sales_channel
    ADD CONSTRAINT publishable_api_key_sales_channel_pkey PRIMARY KEY (publishable_key_id, sales_channel_id);


--
-- Name: refund refund_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refund
    ADD CONSTRAINT refund_pkey PRIMARY KEY (id);


--
-- Name: refund_reason refund_reason_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refund_reason
    ADD CONSTRAINT refund_reason_pkey PRIMARY KEY (id);


--
-- Name: region_country region_country_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.region_country
    ADD CONSTRAINT region_country_pkey PRIMARY KEY (iso_2);


--
-- Name: region_payment_provider region_payment_provider_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.region_payment_provider
    ADD CONSTRAINT region_payment_provider_pkey PRIMARY KEY (region_id, payment_provider_id);


--
-- Name: region region_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.region
    ADD CONSTRAINT region_pkey PRIMARY KEY (id);


--
-- Name: reservation_item reservation_item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservation_item
    ADD CONSTRAINT reservation_item_pkey PRIMARY KEY (id);


--
-- Name: return_fulfillment return_fulfillment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_fulfillment
    ADD CONSTRAINT return_fulfillment_pkey PRIMARY KEY (return_id, fulfillment_id);


--
-- Name: return_item return_item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_item
    ADD CONSTRAINT return_item_pkey PRIMARY KEY (id);


--
-- Name: return return_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return
    ADD CONSTRAINT return_pkey PRIMARY KEY (id);


--
-- Name: return_reason return_reason_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_reason
    ADD CONSTRAINT return_reason_pkey PRIMARY KEY (id);


--
-- Name: sales_channel sales_channel_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_channel
    ADD CONSTRAINT sales_channel_pkey PRIMARY KEY (id);


--
-- Name: sales_channel_stock_location sales_channel_stock_location_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_channel_stock_location
    ADD CONSTRAINT sales_channel_stock_location_pkey PRIMARY KEY (sales_channel_id, stock_location_id);


--
-- Name: service_zone service_zone_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_zone
    ADD CONSTRAINT service_zone_pkey PRIMARY KEY (id);


--
-- Name: shipping_option shipping_option_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipping_option
    ADD CONSTRAINT shipping_option_pkey PRIMARY KEY (id);


--
-- Name: shipping_option_price_set shipping_option_price_set_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipping_option_price_set
    ADD CONSTRAINT shipping_option_price_set_pkey PRIMARY KEY (shipping_option_id, price_set_id);


--
-- Name: shipping_option_rule shipping_option_rule_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipping_option_rule
    ADD CONSTRAINT shipping_option_rule_pkey PRIMARY KEY (id);


--
-- Name: shipping_option_type shipping_option_type_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipping_option_type
    ADD CONSTRAINT shipping_option_type_pkey PRIMARY KEY (id);


--
-- Name: shipping_profile shipping_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipping_profile
    ADD CONSTRAINT shipping_profile_pkey PRIMARY KEY (id);


--
-- Name: stock_location_address stock_location_address_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_location_address
    ADD CONSTRAINT stock_location_address_pkey PRIMARY KEY (id);


--
-- Name: stock_location stock_location_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_location
    ADD CONSTRAINT stock_location_pkey PRIMARY KEY (id);


--
-- Name: store_currency store_currency_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_currency
    ADD CONSTRAINT store_currency_pkey PRIMARY KEY (id);


--
-- Name: store store_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store
    ADD CONSTRAINT store_pkey PRIMARY KEY (id);


--
-- Name: tax_provider tax_provider_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tax_provider
    ADD CONSTRAINT tax_provider_pkey PRIMARY KEY (id);


--
-- Name: tax_rate tax_rate_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tax_rate
    ADD CONSTRAINT tax_rate_pkey PRIMARY KEY (id);


--
-- Name: tax_rate_rule tax_rate_rule_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tax_rate_rule
    ADD CONSTRAINT tax_rate_rule_pkey PRIMARY KEY (id);


--
-- Name: tax_region tax_region_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tax_region
    ADD CONSTRAINT tax_region_pkey PRIMARY KEY (id);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: IDX_account_holder_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_account_holder_deleted_at" ON public.account_holder USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_account_holder_id_5cb3a0c0; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_account_holder_id_5cb3a0c0" ON public.customer_account_holder USING btree (account_holder_id);


--
-- Name: IDX_account_holder_provider_id_external_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_account_holder_provider_id_external_id_unique" ON public.account_holder USING btree (provider_id, external_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_adjustment_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_adjustment_item_id" ON public.cart_line_item_adjustment USING btree (item_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_adjustment_shipping_method_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_adjustment_shipping_method_id" ON public.cart_shipping_method_adjustment USING btree (shipping_method_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_api_key_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_api_key_deleted_at" ON public.api_key USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_api_key_token_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_api_key_token_unique" ON public.api_key USING btree (token);


--
-- Name: IDX_api_key_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_api_key_type" ON public.api_key USING btree (type);


--
-- Name: IDX_application_method_allocation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_application_method_allocation" ON public.promotion_application_method USING btree (allocation);


--
-- Name: IDX_application_method_target_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_application_method_target_type" ON public.promotion_application_method USING btree (target_type);


--
-- Name: IDX_application_method_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_application_method_type" ON public.promotion_application_method USING btree (type);


--
-- Name: IDX_auth_identity_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_auth_identity_deleted_at" ON public.auth_identity USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_campaign_budget_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_campaign_budget_type" ON public.promotion_campaign_budget USING btree (type);


--
-- Name: IDX_capture_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_capture_deleted_at" ON public.capture USING btree (deleted_at);


--
-- Name: IDX_capture_payment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_capture_payment_id" ON public.capture USING btree (payment_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_cart_address_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cart_address_deleted_at" ON public.cart_address USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_cart_billing_address_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cart_billing_address_id" ON public.cart USING btree (billing_address_id) WHERE ((deleted_at IS NULL) AND (billing_address_id IS NOT NULL));


--
-- Name: IDX_cart_currency_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cart_currency_code" ON public.cart USING btree (currency_code);


--
-- Name: IDX_cart_customer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cart_customer_id" ON public.cart USING btree (customer_id) WHERE ((deleted_at IS NULL) AND (customer_id IS NOT NULL));


--
-- Name: IDX_cart_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cart_deleted_at" ON public.cart USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_cart_id_-4a39f6c9; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cart_id_-4a39f6c9" ON public.cart_payment_collection USING btree (cart_id);


--
-- Name: IDX_cart_id_-71069c16; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cart_id_-71069c16" ON public.order_cart USING btree (cart_id);


--
-- Name: IDX_cart_id_-a9d4a70b; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cart_id_-a9d4a70b" ON public.cart_promotion USING btree (cart_id);


--
-- Name: IDX_cart_line_item_adjustment_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cart_line_item_adjustment_deleted_at" ON public.cart_line_item_adjustment USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_cart_line_item_adjustment_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cart_line_item_adjustment_item_id" ON public.cart_line_item_adjustment USING btree (item_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_cart_line_item_cart_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cart_line_item_cart_id" ON public.cart_line_item USING btree (cart_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_cart_line_item_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cart_line_item_deleted_at" ON public.cart_line_item USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_cart_line_item_tax_line_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cart_line_item_tax_line_deleted_at" ON public.cart_line_item_tax_line USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_cart_line_item_tax_line_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cart_line_item_tax_line_item_id" ON public.cart_line_item_tax_line USING btree (item_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_cart_region_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cart_region_id" ON public.cart USING btree (region_id) WHERE ((deleted_at IS NULL) AND (region_id IS NOT NULL));


--
-- Name: IDX_cart_sales_channel_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cart_sales_channel_id" ON public.cart USING btree (sales_channel_id) WHERE ((deleted_at IS NULL) AND (sales_channel_id IS NOT NULL));


--
-- Name: IDX_cart_shipping_address_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cart_shipping_address_id" ON public.cart USING btree (shipping_address_id) WHERE ((deleted_at IS NULL) AND (shipping_address_id IS NOT NULL));


--
-- Name: IDX_cart_shipping_method_adjustment_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cart_shipping_method_adjustment_deleted_at" ON public.cart_shipping_method_adjustment USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_cart_shipping_method_adjustment_shipping_method_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cart_shipping_method_adjustment_shipping_method_id" ON public.cart_shipping_method_adjustment USING btree (shipping_method_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_cart_shipping_method_cart_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cart_shipping_method_cart_id" ON public.cart_shipping_method USING btree (cart_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_cart_shipping_method_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cart_shipping_method_deleted_at" ON public.cart_shipping_method USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_cart_shipping_method_tax_line_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cart_shipping_method_tax_line_deleted_at" ON public.cart_shipping_method_tax_line USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_cart_shipping_method_tax_line_shipping_method_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cart_shipping_method_tax_line_shipping_method_id" ON public.cart_shipping_method_tax_line USING btree (shipping_method_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_category_handle_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_category_handle_unique" ON public.product_category USING btree (handle) WHERE (deleted_at IS NULL);


--
-- Name: IDX_collection_handle_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_collection_handle_unique" ON public.product_collection USING btree (handle) WHERE (deleted_at IS NULL);


--
-- Name: IDX_customer_address_customer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_customer_address_customer_id" ON public.customer_address USING btree (customer_id);


--
-- Name: IDX_customer_address_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_customer_address_deleted_at" ON public.customer_address USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_customer_address_unique_customer_billing; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_customer_address_unique_customer_billing" ON public.customer_address USING btree (customer_id) WHERE (is_default_billing = true);


--
-- Name: IDX_customer_address_unique_customer_shipping; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_customer_address_unique_customer_shipping" ON public.customer_address USING btree (customer_id) WHERE (is_default_shipping = true);


--
-- Name: IDX_customer_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_customer_deleted_at" ON public.customer USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_customer_email_has_account_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_customer_email_has_account_unique" ON public.customer USING btree (email, has_account) WHERE (deleted_at IS NULL);


--
-- Name: IDX_customer_group_customer_customer_group_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_customer_group_customer_customer_group_id" ON public.customer_group_customer USING btree (customer_group_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_customer_group_customer_customer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_customer_group_customer_customer_id" ON public.customer_group_customer USING btree (customer_id);


--
-- Name: IDX_customer_group_customer_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_customer_group_customer_deleted_at" ON public.customer_group_customer USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_customer_group_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_customer_group_deleted_at" ON public.customer_group USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_customer_group_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_customer_group_name" ON public.customer_group USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: IDX_customer_group_name_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_customer_group_name_unique" ON public.customer_group USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: IDX_customer_id_5cb3a0c0; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_customer_id_5cb3a0c0" ON public.customer_account_holder USING btree (customer_id);


--
-- Name: IDX_deleted_at_-1d67bae40; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_deleted_at_-1d67bae40" ON public.publishable_api_key_sales_channel USING btree (deleted_at);


--
-- Name: IDX_deleted_at_-1e5992737; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_deleted_at_-1e5992737" ON public.location_fulfillment_provider USING btree (deleted_at);


--
-- Name: IDX_deleted_at_-31ea43a; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_deleted_at_-31ea43a" ON public.return_fulfillment USING btree (deleted_at);


--
-- Name: IDX_deleted_at_-4a39f6c9; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_deleted_at_-4a39f6c9" ON public.cart_payment_collection USING btree (deleted_at);


--
-- Name: IDX_deleted_at_-71069c16; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_deleted_at_-71069c16" ON public.order_cart USING btree (deleted_at);


--
-- Name: IDX_deleted_at_-71518339; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_deleted_at_-71518339" ON public.order_promotion USING btree (deleted_at);


--
-- Name: IDX_deleted_at_-a9d4a70b; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_deleted_at_-a9d4a70b" ON public.cart_promotion USING btree (deleted_at);


--
-- Name: IDX_deleted_at_-e88adb96; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_deleted_at_-e88adb96" ON public.location_fulfillment_set USING btree (deleted_at);


--
-- Name: IDX_deleted_at_-e8d2543e; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_deleted_at_-e8d2543e" ON public.order_fulfillment USING btree (deleted_at);


--
-- Name: IDX_deleted_at_17a262437; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_deleted_at_17a262437" ON public.product_shipping_profile USING btree (deleted_at);


--
-- Name: IDX_deleted_at_17b4c4e35; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_deleted_at_17b4c4e35" ON public.product_variant_inventory_item USING btree (deleted_at);


--
-- Name: IDX_deleted_at_1c934dab0; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_deleted_at_1c934dab0" ON public.region_payment_provider USING btree (deleted_at);


--
-- Name: IDX_deleted_at_20b454295; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_deleted_at_20b454295" ON public.product_sales_channel USING btree (deleted_at);


--
-- Name: IDX_deleted_at_26d06f470; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_deleted_at_26d06f470" ON public.sales_channel_stock_location USING btree (deleted_at);


--
-- Name: IDX_deleted_at_52b23597; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_deleted_at_52b23597" ON public.product_variant_price_set USING btree (deleted_at);


--
-- Name: IDX_deleted_at_5cb3a0c0; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_deleted_at_5cb3a0c0" ON public.customer_account_holder USING btree (deleted_at);


--
-- Name: IDX_deleted_at_ba32fa9c; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_deleted_at_ba32fa9c" ON public.shipping_option_price_set USING btree (deleted_at);


--
-- Name: IDX_deleted_at_f42b9949; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_deleted_at_f42b9949" ON public.order_payment_collection USING btree (deleted_at);


--
-- Name: IDX_fulfillment_address_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_fulfillment_address_deleted_at" ON public.fulfillment_address USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_fulfillment_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_fulfillment_deleted_at" ON public.fulfillment USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_fulfillment_id_-31ea43a; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_fulfillment_id_-31ea43a" ON public.return_fulfillment USING btree (fulfillment_id);


--
-- Name: IDX_fulfillment_id_-e8d2543e; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_fulfillment_id_-e8d2543e" ON public.order_fulfillment USING btree (fulfillment_id);


--
-- Name: IDX_fulfillment_item_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_fulfillment_item_deleted_at" ON public.fulfillment_item USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_fulfillment_item_fulfillment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_fulfillment_item_fulfillment_id" ON public.fulfillment_item USING btree (fulfillment_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_fulfillment_item_inventory_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_fulfillment_item_inventory_item_id" ON public.fulfillment_item USING btree (inventory_item_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_fulfillment_item_line_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_fulfillment_item_line_item_id" ON public.fulfillment_item USING btree (line_item_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_fulfillment_label_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_fulfillment_label_deleted_at" ON public.fulfillment_label USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_fulfillment_label_fulfillment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_fulfillment_label_fulfillment_id" ON public.fulfillment_label USING btree (fulfillment_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_fulfillment_location_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_fulfillment_location_id" ON public.fulfillment USING btree (location_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_fulfillment_provider_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_fulfillment_provider_deleted_at" ON public.fulfillment_provider USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_fulfillment_provider_id_-1e5992737; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_fulfillment_provider_id_-1e5992737" ON public.location_fulfillment_provider USING btree (fulfillment_provider_id);


--
-- Name: IDX_fulfillment_set_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_fulfillment_set_deleted_at" ON public.fulfillment_set USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_fulfillment_set_id_-e88adb96; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_fulfillment_set_id_-e88adb96" ON public.location_fulfillment_set USING btree (fulfillment_set_id);


--
-- Name: IDX_fulfillment_set_name_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_fulfillment_set_name_unique" ON public.fulfillment_set USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: IDX_fulfillment_shipping_option_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_fulfillment_shipping_option_id" ON public.fulfillment USING btree (shipping_option_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_geo_zone_city; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_geo_zone_city" ON public.geo_zone USING btree (city) WHERE ((deleted_at IS NULL) AND (city IS NOT NULL));


--
-- Name: IDX_geo_zone_country_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_geo_zone_country_code" ON public.geo_zone USING btree (country_code) WHERE (deleted_at IS NULL);


--
-- Name: IDX_geo_zone_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_geo_zone_deleted_at" ON public.geo_zone USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_geo_zone_province_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_geo_zone_province_code" ON public.geo_zone USING btree (province_code) WHERE ((deleted_at IS NULL) AND (province_code IS NOT NULL));


--
-- Name: IDX_geo_zone_service_zone_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_geo_zone_service_zone_id" ON public.geo_zone USING btree (service_zone_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_id_-1d67bae40; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_id_-1d67bae40" ON public.publishable_api_key_sales_channel USING btree (id);


--
-- Name: IDX_id_-1e5992737; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_id_-1e5992737" ON public.location_fulfillment_provider USING btree (id);


--
-- Name: IDX_id_-31ea43a; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_id_-31ea43a" ON public.return_fulfillment USING btree (id);


--
-- Name: IDX_id_-4a39f6c9; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_id_-4a39f6c9" ON public.cart_payment_collection USING btree (id);


--
-- Name: IDX_id_-71069c16; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_id_-71069c16" ON public.order_cart USING btree (id);


--
-- Name: IDX_id_-71518339; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_id_-71518339" ON public.order_promotion USING btree (id);


--
-- Name: IDX_id_-a9d4a70b; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_id_-a9d4a70b" ON public.cart_promotion USING btree (id);


--
-- Name: IDX_id_-e88adb96; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_id_-e88adb96" ON public.location_fulfillment_set USING btree (id);


--
-- Name: IDX_id_-e8d2543e; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_id_-e8d2543e" ON public.order_fulfillment USING btree (id);


--
-- Name: IDX_id_17a262437; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_id_17a262437" ON public.product_shipping_profile USING btree (id);


--
-- Name: IDX_id_17b4c4e35; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_id_17b4c4e35" ON public.product_variant_inventory_item USING btree (id);


--
-- Name: IDX_id_1c934dab0; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_id_1c934dab0" ON public.region_payment_provider USING btree (id);


--
-- Name: IDX_id_20b454295; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_id_20b454295" ON public.product_sales_channel USING btree (id);


--
-- Name: IDX_id_26d06f470; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_id_26d06f470" ON public.sales_channel_stock_location USING btree (id);


--
-- Name: IDX_id_52b23597; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_id_52b23597" ON public.product_variant_price_set USING btree (id);


--
-- Name: IDX_id_5cb3a0c0; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_id_5cb3a0c0" ON public.customer_account_holder USING btree (id);


--
-- Name: IDX_id_ba32fa9c; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_id_ba32fa9c" ON public.shipping_option_price_set USING btree (id);


--
-- Name: IDX_id_f42b9949; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_id_f42b9949" ON public.order_payment_collection USING btree (id);


--
-- Name: IDX_image_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_image_deleted_at" ON public.image USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_inventory_item_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_inventory_item_deleted_at" ON public.inventory_item USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_inventory_item_id_17b4c4e35; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_inventory_item_id_17b4c4e35" ON public.product_variant_inventory_item USING btree (inventory_item_id);


--
-- Name: IDX_inventory_item_sku; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_inventory_item_sku" ON public.inventory_item USING btree (sku) WHERE (deleted_at IS NULL);


--
-- Name: IDX_inventory_level_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_inventory_level_deleted_at" ON public.inventory_level USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_inventory_level_inventory_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_inventory_level_inventory_item_id" ON public.inventory_level USING btree (inventory_item_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_inventory_level_item_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_inventory_level_item_location" ON public.inventory_level USING btree (inventory_item_id, location_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_inventory_level_location_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_inventory_level_location_id" ON public.inventory_level USING btree (location_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_inventory_level_location_id_inventory_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_inventory_level_location_id_inventory_item_id" ON public.inventory_level USING btree (inventory_item_id, location_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_invite_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_invite_deleted_at" ON public.invite USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_invite_email_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_invite_email_unique" ON public.invite USING btree (email) WHERE (deleted_at IS NULL);


--
-- Name: IDX_invite_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_invite_token" ON public.invite USING btree (token) WHERE (deleted_at IS NULL);


--
-- Name: IDX_line_item_adjustment_promotion_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_line_item_adjustment_promotion_id" ON public.cart_line_item_adjustment USING btree (promotion_id) WHERE ((deleted_at IS NULL) AND (promotion_id IS NOT NULL));


--
-- Name: IDX_line_item_cart_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_line_item_cart_id" ON public.cart_line_item USING btree (cart_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_line_item_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_line_item_product_id" ON public.cart_line_item USING btree (product_id) WHERE ((deleted_at IS NULL) AND (product_id IS NOT NULL));


--
-- Name: IDX_line_item_product_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_line_item_product_type_id" ON public.cart_line_item USING btree (product_type_id) WHERE ((deleted_at IS NULL) AND (product_type_id IS NOT NULL));


--
-- Name: IDX_line_item_tax_line_tax_rate_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_line_item_tax_line_tax_rate_id" ON public.cart_line_item_tax_line USING btree (tax_rate_id) WHERE ((deleted_at IS NULL) AND (tax_rate_id IS NOT NULL));


--
-- Name: IDX_line_item_variant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_line_item_variant_id" ON public.cart_line_item USING btree (variant_id) WHERE ((deleted_at IS NULL) AND (variant_id IS NOT NULL));


--
-- Name: IDX_notification_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_notification_deleted_at" ON public.notification USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_notification_idempotency_key_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_notification_idempotency_key_unique" ON public.notification USING btree (idempotency_key) WHERE (deleted_at IS NULL);


--
-- Name: IDX_notification_provider_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_notification_provider_deleted_at" ON public.notification_provider USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_notification_provider_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_notification_provider_id" ON public.notification USING btree (provider_id);


--
-- Name: IDX_notification_receiver_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_notification_receiver_id" ON public.notification USING btree (receiver_id);


--
-- Name: IDX_option_product_id_title_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_option_product_id_title_unique" ON public.product_option USING btree (product_id, title) WHERE (deleted_at IS NULL);


--
-- Name: IDX_option_value_option_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_option_value_option_id_unique" ON public.product_option_value USING btree (option_id, value) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_address_customer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_address_customer_id" ON public.order_address USING btree (customer_id);


--
-- Name: IDX_order_address_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_address_deleted_at" ON public.order_address USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_billing_address_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_billing_address_id" ON public."order" USING btree (billing_address_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_change_action_claim_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_change_action_claim_id" ON public.order_change_action USING btree (claim_id) WHERE ((claim_id IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: IDX_order_change_action_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_change_action_deleted_at" ON public.order_change_action USING btree (deleted_at);


--
-- Name: IDX_order_change_action_exchange_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_change_action_exchange_id" ON public.order_change_action USING btree (exchange_id) WHERE ((exchange_id IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: IDX_order_change_action_order_change_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_change_action_order_change_id" ON public.order_change_action USING btree (order_change_id);


--
-- Name: IDX_order_change_action_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_change_action_order_id" ON public.order_change_action USING btree (order_id);


--
-- Name: IDX_order_change_action_ordering; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_change_action_ordering" ON public.order_change_action USING btree (ordering);


--
-- Name: IDX_order_change_action_return_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_change_action_return_id" ON public.order_change_action USING btree (return_id) WHERE ((return_id IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: IDX_order_change_change_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_change_change_type" ON public.order_change USING btree (change_type);


--
-- Name: IDX_order_change_claim_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_change_claim_id" ON public.order_change USING btree (claim_id) WHERE ((claim_id IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: IDX_order_change_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_change_deleted_at" ON public.order_change USING btree (deleted_at);


--
-- Name: IDX_order_change_exchange_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_change_exchange_id" ON public.order_change USING btree (exchange_id) WHERE ((exchange_id IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: IDX_order_change_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_change_order_id" ON public.order_change USING btree (order_id);


--
-- Name: IDX_order_change_order_id_version; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_change_order_id_version" ON public.order_change USING btree (order_id, version);


--
-- Name: IDX_order_change_return_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_change_return_id" ON public.order_change USING btree (return_id) WHERE ((return_id IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: IDX_order_change_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_change_status" ON public.order_change USING btree (status);


--
-- Name: IDX_order_claim_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_claim_deleted_at" ON public.order_claim USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_claim_display_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_claim_display_id" ON public.order_claim USING btree (display_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_claim_item_claim_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_claim_item_claim_id" ON public.order_claim_item USING btree (claim_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_claim_item_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_claim_item_deleted_at" ON public.order_claim_item USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_claim_item_image_claim_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_claim_item_image_claim_item_id" ON public.order_claim_item_image USING btree (claim_item_id) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_order_claim_item_image_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_claim_item_image_deleted_at" ON public.order_claim_item_image USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_order_claim_item_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_claim_item_item_id" ON public.order_claim_item USING btree (item_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_claim_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_claim_order_id" ON public.order_claim USING btree (order_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_claim_return_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_claim_return_id" ON public.order_claim USING btree (return_id) WHERE ((return_id IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: IDX_order_credit_line_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_credit_line_deleted_at" ON public.order_credit_line USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_order_credit_line_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_credit_line_order_id" ON public.order_credit_line USING btree (order_id) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_order_currency_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_currency_code" ON public."order" USING btree (currency_code) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_customer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_customer_id" ON public."order" USING btree (customer_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_deleted_at" ON public."order" USING btree (deleted_at);


--
-- Name: IDX_order_display_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_display_id" ON public."order" USING btree (display_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_exchange_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_exchange_deleted_at" ON public.order_exchange USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_exchange_display_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_exchange_display_id" ON public.order_exchange USING btree (display_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_exchange_item_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_exchange_item_deleted_at" ON public.order_exchange_item USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_exchange_item_exchange_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_exchange_item_exchange_id" ON public.order_exchange_item USING btree (exchange_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_exchange_item_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_exchange_item_item_id" ON public.order_exchange_item USING btree (item_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_exchange_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_exchange_order_id" ON public.order_exchange USING btree (order_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_exchange_return_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_exchange_return_id" ON public.order_exchange USING btree (return_id) WHERE ((return_id IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: IDX_order_id_-71069c16; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_id_-71069c16" ON public.order_cart USING btree (order_id);


--
-- Name: IDX_order_id_-71518339; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_id_-71518339" ON public.order_promotion USING btree (order_id);


--
-- Name: IDX_order_id_-e8d2543e; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_id_-e8d2543e" ON public.order_fulfillment USING btree (order_id);


--
-- Name: IDX_order_id_f42b9949; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_id_f42b9949" ON public.order_payment_collection USING btree (order_id);


--
-- Name: IDX_order_is_draft_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_is_draft_order" ON public."order" USING btree (is_draft_order) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_item_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_item_deleted_at" ON public.order_item USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_order_item_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_item_item_id" ON public.order_item USING btree (item_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_item_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_item_order_id" ON public.order_item USING btree (order_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_item_order_id_version; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_item_order_id_version" ON public.order_item USING btree (order_id, version) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_line_item_adjustment_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_line_item_adjustment_item_id" ON public.order_line_item_adjustment USING btree (item_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_line_item_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_line_item_product_id" ON public.order_line_item USING btree (product_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_line_item_tax_line_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_line_item_tax_line_item_id" ON public.order_line_item_tax_line USING btree (item_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_line_item_variant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_line_item_variant_id" ON public.order_line_item USING btree (variant_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_region_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_region_id" ON public."order" USING btree (region_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_shipping_address_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_shipping_address_id" ON public."order" USING btree (shipping_address_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_shipping_claim_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_shipping_claim_id" ON public.order_shipping USING btree (claim_id) WHERE ((claim_id IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: IDX_order_shipping_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_shipping_deleted_at" ON public.order_shipping USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_order_shipping_exchange_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_shipping_exchange_id" ON public.order_shipping USING btree (exchange_id) WHERE ((exchange_id IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: IDX_order_shipping_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_shipping_item_id" ON public.order_shipping USING btree (shipping_method_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_shipping_method_adjustment_shipping_method_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_shipping_method_adjustment_shipping_method_id" ON public.order_shipping_method_adjustment USING btree (shipping_method_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_shipping_method_shipping_option_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_shipping_method_shipping_option_id" ON public.order_shipping_method USING btree (shipping_option_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_shipping_method_tax_line_shipping_method_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_shipping_method_tax_line_shipping_method_id" ON public.order_shipping_method_tax_line USING btree (shipping_method_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_shipping_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_shipping_order_id" ON public.order_shipping USING btree (order_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_shipping_order_id_version; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_shipping_order_id_version" ON public.order_shipping USING btree (order_id, version) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_shipping_return_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_shipping_return_id" ON public.order_shipping USING btree (return_id) WHERE ((return_id IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: IDX_order_summary_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_summary_deleted_at" ON public.order_summary USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_order_summary_order_id_version; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_summary_order_id_version" ON public.order_summary USING btree (order_id, version) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_transaction_claim_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_transaction_claim_id" ON public.order_transaction USING btree (claim_id) WHERE ((claim_id IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: IDX_order_transaction_currency_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_transaction_currency_code" ON public.order_transaction USING btree (currency_code) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_transaction_exchange_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_transaction_exchange_id" ON public.order_transaction USING btree (exchange_id) WHERE ((exchange_id IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: IDX_order_transaction_order_id_version; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_transaction_order_id_version" ON public.order_transaction USING btree (order_id, version) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_transaction_reference_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_transaction_reference_id" ON public.order_transaction USING btree (reference_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_order_transaction_return_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_order_transaction_return_id" ON public.order_transaction USING btree (return_id) WHERE ((return_id IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: IDX_payment_collection_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_payment_collection_deleted_at" ON public.payment_collection USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_payment_collection_id_-4a39f6c9; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_payment_collection_id_-4a39f6c9" ON public.cart_payment_collection USING btree (payment_collection_id);


--
-- Name: IDX_payment_collection_id_f42b9949; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_payment_collection_id_f42b9949" ON public.order_payment_collection USING btree (payment_collection_id);


--
-- Name: IDX_payment_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_payment_deleted_at" ON public.payment USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_payment_payment_collection_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_payment_payment_collection_id" ON public.payment USING btree (payment_collection_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_payment_payment_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_payment_payment_session_id" ON public.payment USING btree (payment_session_id);


--
-- Name: IDX_payment_payment_session_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_payment_payment_session_id_unique" ON public.payment USING btree (payment_session_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_payment_provider_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_payment_provider_deleted_at" ON public.payment_provider USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_payment_provider_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_payment_provider_id" ON public.payment USING btree (provider_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_payment_provider_id_1c934dab0; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_payment_provider_id_1c934dab0" ON public.region_payment_provider USING btree (payment_provider_id);


--
-- Name: IDX_payment_session_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_payment_session_deleted_at" ON public.payment_session USING btree (deleted_at);


--
-- Name: IDX_payment_session_payment_collection_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_payment_session_payment_collection_id" ON public.payment_session USING btree (payment_collection_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_price_currency_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_price_currency_code" ON public.price USING btree (currency_code) WHERE (deleted_at IS NULL);


--
-- Name: IDX_price_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_price_deleted_at" ON public.price USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_price_list_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_price_list_deleted_at" ON public.price_list USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_price_list_rule_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_price_list_rule_deleted_at" ON public.price_list_rule USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_price_list_rule_price_list_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_price_list_rule_price_list_id" ON public.price_list_rule USING btree (price_list_id) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_price_preference_attribute_value; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_price_preference_attribute_value" ON public.price_preference USING btree (attribute, value) WHERE (deleted_at IS NULL);


--
-- Name: IDX_price_preference_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_price_preference_deleted_at" ON public.price_preference USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_price_price_list_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_price_price_list_id" ON public.price USING btree (price_list_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_price_price_set_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_price_price_set_id" ON public.price USING btree (price_set_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_price_rule_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_price_rule_deleted_at" ON public.price_rule USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_price_rule_operator; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_price_rule_operator" ON public.price_rule USING btree (operator);


--
-- Name: IDX_price_rule_price_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_price_rule_price_id" ON public.price_rule USING btree (price_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_price_rule_price_id_attribute_operator_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_price_rule_price_id_attribute_operator_unique" ON public.price_rule USING btree (price_id, attribute, operator) WHERE (deleted_at IS NULL);


--
-- Name: IDX_price_set_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_price_set_deleted_at" ON public.price_set USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_price_set_id_52b23597; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_price_set_id_52b23597" ON public.product_variant_price_set USING btree (price_set_id);


--
-- Name: IDX_price_set_id_ba32fa9c; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_price_set_id_ba32fa9c" ON public.shipping_option_price_set USING btree (price_set_id);


--
-- Name: IDX_product_category_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_product_category_deleted_at" ON public.product_collection USING btree (deleted_at);


--
-- Name: IDX_product_category_parent_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_product_category_parent_category_id" ON public.product_category USING btree (parent_category_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_product_category_path; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_product_category_path" ON public.product_category USING btree (mpath) WHERE (deleted_at IS NULL);


--
-- Name: IDX_product_collection_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_product_collection_deleted_at" ON public.product_collection USING btree (deleted_at);


--
-- Name: IDX_product_collection_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_product_collection_id" ON public.product USING btree (collection_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_product_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_product_deleted_at" ON public.product USING btree (deleted_at);


--
-- Name: IDX_product_handle_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_product_handle_unique" ON public.product USING btree (handle) WHERE (deleted_at IS NULL);


--
-- Name: IDX_product_id_17a262437; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_product_id_17a262437" ON public.product_shipping_profile USING btree (product_id);


--
-- Name: IDX_product_id_20b454295; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_product_id_20b454295" ON public.product_sales_channel USING btree (product_id);


--
-- Name: IDX_product_image_url; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_product_image_url" ON public.image USING btree (url) WHERE (deleted_at IS NULL);


--
-- Name: IDX_product_option_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_product_option_deleted_at" ON public.product_option USING btree (deleted_at);


--
-- Name: IDX_product_option_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_product_option_product_id" ON public.product_option USING btree (product_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_product_option_value_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_product_option_value_deleted_at" ON public.product_option_value USING btree (deleted_at);


--
-- Name: IDX_product_option_value_option_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_product_option_value_option_id" ON public.product_option_value USING btree (option_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_product_tag_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_product_tag_deleted_at" ON public.product_tag USING btree (deleted_at);


--
-- Name: IDX_product_type_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_product_type_deleted_at" ON public.product_type USING btree (deleted_at);


--
-- Name: IDX_product_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_product_type_id" ON public.product USING btree (type_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_product_variant_barcode_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_product_variant_barcode_unique" ON public.product_variant USING btree (barcode) WHERE (deleted_at IS NULL);


--
-- Name: IDX_product_variant_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_product_variant_deleted_at" ON public.product_variant USING btree (deleted_at);


--
-- Name: IDX_product_variant_ean_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_product_variant_ean_unique" ON public.product_variant USING btree (ean) WHERE (deleted_at IS NULL);


--
-- Name: IDX_product_variant_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_product_variant_product_id" ON public.product_variant USING btree (product_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_product_variant_sku_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_product_variant_sku_unique" ON public.product_variant USING btree (sku) WHERE (deleted_at IS NULL);


--
-- Name: IDX_product_variant_upc_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_product_variant_upc_unique" ON public.product_variant USING btree (upc) WHERE (deleted_at IS NULL);


--
-- Name: IDX_promotion_application_method_currency_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_promotion_application_method_currency_code" ON public.promotion_application_method USING btree (currency_code) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_promotion_application_method_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_promotion_application_method_deleted_at" ON public.promotion_application_method USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_promotion_application_method_promotion_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_promotion_application_method_promotion_id_unique" ON public.promotion_application_method USING btree (promotion_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_promotion_campaign_budget_campaign_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_promotion_campaign_budget_campaign_id_unique" ON public.promotion_campaign_budget USING btree (campaign_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_promotion_campaign_budget_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_promotion_campaign_budget_deleted_at" ON public.promotion_campaign_budget USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_promotion_campaign_campaign_identifier_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_promotion_campaign_campaign_identifier_unique" ON public.promotion_campaign USING btree (campaign_identifier) WHERE (deleted_at IS NULL);


--
-- Name: IDX_promotion_campaign_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_promotion_campaign_deleted_at" ON public.promotion_campaign USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_promotion_campaign_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_promotion_campaign_id" ON public.promotion USING btree (campaign_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_promotion_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_promotion_code" ON public.promotion USING btree (code);


--
-- Name: IDX_promotion_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_promotion_deleted_at" ON public.promotion USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_promotion_id_-71518339; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_promotion_id_-71518339" ON public.order_promotion USING btree (promotion_id);


--
-- Name: IDX_promotion_id_-a9d4a70b; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_promotion_id_-a9d4a70b" ON public.cart_promotion USING btree (promotion_id);


--
-- Name: IDX_promotion_rule_attribute; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_promotion_rule_attribute" ON public.promotion_rule USING btree (attribute);


--
-- Name: IDX_promotion_rule_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_promotion_rule_deleted_at" ON public.promotion_rule USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_promotion_rule_operator; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_promotion_rule_operator" ON public.promotion_rule USING btree (operator);


--
-- Name: IDX_promotion_rule_value_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_promotion_rule_value_deleted_at" ON public.promotion_rule_value USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_promotion_rule_value_promotion_rule_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_promotion_rule_value_promotion_rule_id" ON public.promotion_rule_value USING btree (promotion_rule_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_promotion_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_promotion_status" ON public.promotion USING btree (status) WHERE (deleted_at IS NULL);


--
-- Name: IDX_promotion_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_promotion_type" ON public.promotion USING btree (type);


--
-- Name: IDX_provider_identity_auth_identity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_provider_identity_auth_identity_id" ON public.provider_identity USING btree (auth_identity_id);


--
-- Name: IDX_provider_identity_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_provider_identity_deleted_at" ON public.provider_identity USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_provider_identity_provider_entity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_provider_identity_provider_entity_id" ON public.provider_identity USING btree (entity_id, provider);


--
-- Name: IDX_publishable_key_id_-1d67bae40; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_publishable_key_id_-1d67bae40" ON public.publishable_api_key_sales_channel USING btree (publishable_key_id);


--
-- Name: IDX_refund_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_refund_deleted_at" ON public.refund USING btree (deleted_at);


--
-- Name: IDX_refund_payment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_refund_payment_id" ON public.refund USING btree (payment_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_refund_reason_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_refund_reason_deleted_at" ON public.refund_reason USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_refund_refund_reason_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_refund_refund_reason_id" ON public.refund USING btree (refund_reason_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_region_country_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_region_country_deleted_at" ON public.region_country USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_region_country_region_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_region_country_region_id" ON public.region_country USING btree (region_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_region_country_region_id_iso_2_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_region_country_region_id_iso_2_unique" ON public.region_country USING btree (region_id, iso_2);


--
-- Name: IDX_region_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_region_deleted_at" ON public.region USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_region_id_1c934dab0; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_region_id_1c934dab0" ON public.region_payment_provider USING btree (region_id);


--
-- Name: IDX_reservation_item_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_reservation_item_deleted_at" ON public.reservation_item USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_reservation_item_inventory_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_reservation_item_inventory_item_id" ON public.reservation_item USING btree (inventory_item_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_reservation_item_line_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_reservation_item_line_item_id" ON public.reservation_item USING btree (line_item_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_reservation_item_location_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_reservation_item_location_id" ON public.reservation_item USING btree (location_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_return_claim_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_return_claim_id" ON public.return USING btree (claim_id) WHERE ((claim_id IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: IDX_return_display_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_return_display_id" ON public.return USING btree (display_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_return_exchange_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_return_exchange_id" ON public.return USING btree (exchange_id) WHERE ((exchange_id IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: IDX_return_id_-31ea43a; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_return_id_-31ea43a" ON public.return_fulfillment USING btree (return_id);


--
-- Name: IDX_return_item_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_return_item_deleted_at" ON public.return_item USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_return_item_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_return_item_item_id" ON public.return_item USING btree (item_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_return_item_reason_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_return_item_reason_id" ON public.return_item USING btree (reason_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_return_item_return_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_return_item_return_id" ON public.return_item USING btree (return_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_return_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_return_order_id" ON public.return USING btree (order_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_return_reason_value; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_return_reason_value" ON public.return_reason USING btree (value) WHERE (deleted_at IS NULL);


--
-- Name: IDX_sales_channel_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_sales_channel_deleted_at" ON public.sales_channel USING btree (deleted_at);


--
-- Name: IDX_sales_channel_id_-1d67bae40; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_sales_channel_id_-1d67bae40" ON public.publishable_api_key_sales_channel USING btree (sales_channel_id);


--
-- Name: IDX_sales_channel_id_20b454295; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_sales_channel_id_20b454295" ON public.product_sales_channel USING btree (sales_channel_id);


--
-- Name: IDX_sales_channel_id_26d06f470; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_sales_channel_id_26d06f470" ON public.sales_channel_stock_location USING btree (sales_channel_id);


--
-- Name: IDX_service_zone_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_service_zone_deleted_at" ON public.service_zone USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_service_zone_fulfillment_set_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_service_zone_fulfillment_set_id" ON public.service_zone USING btree (fulfillment_set_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_service_zone_name_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_service_zone_name_unique" ON public.service_zone USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: IDX_shipping_method_adjustment_promotion_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_shipping_method_adjustment_promotion_id" ON public.cart_shipping_method_adjustment USING btree (promotion_id) WHERE ((deleted_at IS NULL) AND (promotion_id IS NOT NULL));


--
-- Name: IDX_shipping_method_cart_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_shipping_method_cart_id" ON public.cart_shipping_method USING btree (cart_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_shipping_method_option_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_shipping_method_option_id" ON public.cart_shipping_method USING btree (shipping_option_id) WHERE ((deleted_at IS NULL) AND (shipping_option_id IS NOT NULL));


--
-- Name: IDX_shipping_method_tax_line_tax_rate_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_shipping_method_tax_line_tax_rate_id" ON public.cart_shipping_method_tax_line USING btree (tax_rate_id) WHERE ((deleted_at IS NULL) AND (tax_rate_id IS NOT NULL));


--
-- Name: IDX_shipping_option_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_shipping_option_deleted_at" ON public.shipping_option USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_shipping_option_id_ba32fa9c; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_shipping_option_id_ba32fa9c" ON public.shipping_option_price_set USING btree (shipping_option_id);


--
-- Name: IDX_shipping_option_provider_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_shipping_option_provider_id" ON public.shipping_option USING btree (provider_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_shipping_option_rule_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_shipping_option_rule_deleted_at" ON public.shipping_option_rule USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_shipping_option_rule_shipping_option_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_shipping_option_rule_shipping_option_id" ON public.shipping_option_rule USING btree (shipping_option_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_shipping_option_service_zone_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_shipping_option_service_zone_id" ON public.shipping_option USING btree (service_zone_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_shipping_option_shipping_profile_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_shipping_option_shipping_profile_id" ON public.shipping_option USING btree (shipping_profile_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_shipping_option_type_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_shipping_option_type_deleted_at" ON public.shipping_option_type USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_shipping_profile_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_shipping_profile_deleted_at" ON public.shipping_profile USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_shipping_profile_id_17a262437; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_shipping_profile_id_17a262437" ON public.product_shipping_profile USING btree (shipping_profile_id);


--
-- Name: IDX_shipping_profile_name_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_shipping_profile_name_unique" ON public.shipping_profile USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: IDX_single_default_region; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_single_default_region" ON public.tax_rate USING btree (tax_region_id) WHERE ((is_default = true) AND (deleted_at IS NULL));


--
-- Name: IDX_stock_location_address_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_stock_location_address_deleted_at" ON public.stock_location_address USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_stock_location_address_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_stock_location_address_id_unique" ON public.stock_location USING btree (address_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_stock_location_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_stock_location_deleted_at" ON public.stock_location USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_stock_location_id_-1e5992737; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_stock_location_id_-1e5992737" ON public.location_fulfillment_provider USING btree (stock_location_id);


--
-- Name: IDX_stock_location_id_-e88adb96; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_stock_location_id_-e88adb96" ON public.location_fulfillment_set USING btree (stock_location_id);


--
-- Name: IDX_stock_location_id_26d06f470; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_stock_location_id_26d06f470" ON public.sales_channel_stock_location USING btree (stock_location_id);


--
-- Name: IDX_store_currency_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_store_currency_deleted_at" ON public.store_currency USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_store_currency_store_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_store_currency_store_id" ON public.store_currency USING btree (store_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_store_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_store_deleted_at" ON public.store USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_tag_value_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_tag_value_unique" ON public.product_tag USING btree (value) WHERE (deleted_at IS NULL);


--
-- Name: IDX_tax_line_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_tax_line_item_id" ON public.cart_line_item_tax_line USING btree (item_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_tax_line_shipping_method_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_tax_line_shipping_method_id" ON public.cart_shipping_method_tax_line USING btree (shipping_method_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_tax_provider_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_tax_provider_deleted_at" ON public.tax_provider USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_tax_rate_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_tax_rate_deleted_at" ON public.tax_rate USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_tax_rate_rule_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_tax_rate_rule_deleted_at" ON public.tax_rate_rule USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_tax_rate_rule_reference_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_tax_rate_rule_reference_id" ON public.tax_rate_rule USING btree (reference_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_tax_rate_rule_tax_rate_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_tax_rate_rule_tax_rate_id" ON public.tax_rate_rule USING btree (tax_rate_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_tax_rate_rule_unique_rate_reference; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_tax_rate_rule_unique_rate_reference" ON public.tax_rate_rule USING btree (tax_rate_id, reference_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_tax_rate_tax_region_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_tax_rate_tax_region_id" ON public.tax_rate USING btree (tax_region_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_tax_region_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_tax_region_deleted_at" ON public.tax_region USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_tax_region_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_tax_region_parent_id" ON public.tax_region USING btree (parent_id);


--
-- Name: IDX_tax_region_provider_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_tax_region_provider_id" ON public.tax_region USING btree (provider_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_tax_region_unique_country_nullable_province; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_tax_region_unique_country_nullable_province" ON public.tax_region USING btree (country_code) WHERE ((province_code IS NULL) AND (deleted_at IS NULL));


--
-- Name: IDX_tax_region_unique_country_province; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_tax_region_unique_country_province" ON public.tax_region USING btree (country_code, province_code) WHERE (deleted_at IS NULL);


--
-- Name: IDX_type_value_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_type_value_unique" ON public.product_type USING btree (value) WHERE (deleted_at IS NULL);


--
-- Name: IDX_user_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_user_deleted_at" ON public."user" USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: IDX_user_email_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_user_email_unique" ON public."user" USING btree (email) WHERE (deleted_at IS NULL);


--
-- Name: IDX_variant_id_17b4c4e35; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_variant_id_17b4c4e35" ON public.product_variant_inventory_item USING btree (variant_id);


--
-- Name: IDX_variant_id_52b23597; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_variant_id_52b23597" ON public.product_variant_price_set USING btree (variant_id);


--
-- Name: IDX_workflow_execution_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_workflow_execution_deleted_at" ON public.workflow_execution USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_workflow_execution_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_workflow_execution_id" ON public.workflow_execution USING btree (id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_workflow_execution_state; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_workflow_execution_state" ON public.workflow_execution USING btree (state) WHERE (deleted_at IS NULL);


--
-- Name: IDX_workflow_execution_transaction_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_workflow_execution_transaction_id" ON public.workflow_execution USING btree (transaction_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_workflow_execution_workflow_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_workflow_execution_workflow_id" ON public.workflow_execution USING btree (workflow_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_blog_posts_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blog_posts_slug ON public.blog_posts USING btree (slug);


--
-- Name: idx_order_payment_intent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_payment_intent_id ON public."order" USING btree (payment_intent_id);


--
-- Name: idx_products_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_category_id ON public.products USING btree (category_id);


--
-- Name: idx_products_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_slug ON public.products USING btree (slug);


--
-- Name: tax_rate_rule FK_tax_rate_rule_tax_rate_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tax_rate_rule
    ADD CONSTRAINT "FK_tax_rate_rule_tax_rate_id" FOREIGN KEY (tax_rate_id) REFERENCES public.tax_rate(id) ON DELETE CASCADE;


--
-- Name: tax_rate FK_tax_rate_tax_region_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tax_rate
    ADD CONSTRAINT "FK_tax_rate_tax_region_id" FOREIGN KEY (tax_region_id) REFERENCES public.tax_region(id) ON DELETE CASCADE;


--
-- Name: tax_region FK_tax_region_parent_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tax_region
    ADD CONSTRAINT "FK_tax_region_parent_id" FOREIGN KEY (parent_id) REFERENCES public.tax_region(id) ON DELETE CASCADE;


--
-- Name: tax_region FK_tax_region_provider_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tax_region
    ADD CONSTRAINT "FK_tax_region_provider_id" FOREIGN KEY (provider_id) REFERENCES public.tax_provider(id) ON DELETE SET NULL;


--
-- Name: application_method_buy_rules application_method_buy_rules_application_method_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_method_buy_rules
    ADD CONSTRAINT application_method_buy_rules_application_method_id_foreign FOREIGN KEY (application_method_id) REFERENCES public.promotion_application_method(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: application_method_buy_rules application_method_buy_rules_promotion_rule_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_method_buy_rules
    ADD CONSTRAINT application_method_buy_rules_promotion_rule_id_foreign FOREIGN KEY (promotion_rule_id) REFERENCES public.promotion_rule(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: application_method_target_rules application_method_target_rules_application_method_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_method_target_rules
    ADD CONSTRAINT application_method_target_rules_application_method_id_foreign FOREIGN KEY (application_method_id) REFERENCES public.promotion_application_method(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: application_method_target_rules application_method_target_rules_promotion_rule_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_method_target_rules
    ADD CONSTRAINT application_method_target_rules_promotion_rule_id_foreign FOREIGN KEY (promotion_rule_id) REFERENCES public.promotion_rule(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: blog_posts blog_posts_authorid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_authorid_fkey FOREIGN KEY (authorid) REFERENCES public.users(id);


--
-- Name: capture capture_payment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.capture
    ADD CONSTRAINT capture_payment_id_foreign FOREIGN KEY (payment_id) REFERENCES public.payment(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cart cart_billing_address_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_billing_address_id_foreign FOREIGN KEY (billing_address_id) REFERENCES public.cart_address(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cart_line_item_adjustment cart_line_item_adjustment_item_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_line_item_adjustment
    ADD CONSTRAINT cart_line_item_adjustment_item_id_foreign FOREIGN KEY (item_id) REFERENCES public.cart_line_item(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cart_line_item cart_line_item_cart_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_line_item
    ADD CONSTRAINT cart_line_item_cart_id_foreign FOREIGN KEY (cart_id) REFERENCES public.cart(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cart_line_item_tax_line cart_line_item_tax_line_item_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_line_item_tax_line
    ADD CONSTRAINT cart_line_item_tax_line_item_id_foreign FOREIGN KEY (item_id) REFERENCES public.cart_line_item(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cart cart_shipping_address_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_shipping_address_id_foreign FOREIGN KEY (shipping_address_id) REFERENCES public.cart_address(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cart_shipping_method_adjustment cart_shipping_method_adjustment_shipping_method_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_shipping_method_adjustment
    ADD CONSTRAINT cart_shipping_method_adjustment_shipping_method_id_foreign FOREIGN KEY (shipping_method_id) REFERENCES public.cart_shipping_method(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cart_shipping_method cart_shipping_method_cart_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_shipping_method
    ADD CONSTRAINT cart_shipping_method_cart_id_foreign FOREIGN KEY (cart_id) REFERENCES public.cart(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cart_shipping_method_tax_line cart_shipping_method_tax_line_shipping_method_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_shipping_method_tax_line
    ADD CONSTRAINT cart_shipping_method_tax_line_shipping_method_id_foreign FOREIGN KEY (shipping_method_id) REFERENCES public.cart_shipping_method(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_address customer_address_customer_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_address
    ADD CONSTRAINT customer_address_customer_id_foreign FOREIGN KEY (customer_id) REFERENCES public.customer(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_group_customer customer_group_customer_customer_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_group_customer
    ADD CONSTRAINT customer_group_customer_customer_group_id_foreign FOREIGN KEY (customer_group_id) REFERENCES public.customer_group(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_group_customer customer_group_customer_customer_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_group_customer
    ADD CONSTRAINT customer_group_customer_customer_id_foreign FOREIGN KEY (customer_id) REFERENCES public.customer(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: products fk_category; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_category FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: fulfillment fulfillment_delivery_address_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fulfillment
    ADD CONSTRAINT fulfillment_delivery_address_id_foreign FOREIGN KEY (delivery_address_id) REFERENCES public.fulfillment_address(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: fulfillment_item fulfillment_item_fulfillment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fulfillment_item
    ADD CONSTRAINT fulfillment_item_fulfillment_id_foreign FOREIGN KEY (fulfillment_id) REFERENCES public.fulfillment(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: fulfillment_label fulfillment_label_fulfillment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fulfillment_label
    ADD CONSTRAINT fulfillment_label_fulfillment_id_foreign FOREIGN KEY (fulfillment_id) REFERENCES public.fulfillment(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: fulfillment fulfillment_provider_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fulfillment
    ADD CONSTRAINT fulfillment_provider_id_foreign FOREIGN KEY (provider_id) REFERENCES public.fulfillment_provider(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: fulfillment fulfillment_shipping_option_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fulfillment
    ADD CONSTRAINT fulfillment_shipping_option_id_foreign FOREIGN KEY (shipping_option_id) REFERENCES public.shipping_option(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: geo_zone geo_zone_service_zone_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.geo_zone
    ADD CONSTRAINT geo_zone_service_zone_id_foreign FOREIGN KEY (service_zone_id) REFERENCES public.service_zone(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: image image_product_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image
    ADD CONSTRAINT image_product_id_foreign FOREIGN KEY (product_id) REFERENCES public.product(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: inventory_level inventory_level_inventory_item_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_level
    ADD CONSTRAINT inventory_level_inventory_item_id_foreign FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_item(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notification notification_provider_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_provider_id_foreign FOREIGN KEY (provider_id) REFERENCES public.notification_provider(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: order order_billing_address_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."order"
    ADD CONSTRAINT order_billing_address_id_foreign FOREIGN KEY (billing_address_id) REFERENCES public.order_address(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_change_action order_change_action_order_change_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_change_action
    ADD CONSTRAINT order_change_action_order_change_id_foreign FOREIGN KEY (order_change_id) REFERENCES public.order_change(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_change order_change_order_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_change
    ADD CONSTRAINT order_change_order_id_foreign FOREIGN KEY (order_id) REFERENCES public."order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_credit_line order_credit_line_order_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_credit_line
    ADD CONSTRAINT order_credit_line_order_id_foreign FOREIGN KEY (order_id) REFERENCES public."order"(id) ON UPDATE CASCADE;


--
-- Name: order_item order_item_item_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_item
    ADD CONSTRAINT order_item_item_id_foreign FOREIGN KEY (item_id) REFERENCES public.order_line_item(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_item order_item_order_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_item
    ADD CONSTRAINT order_item_order_id_foreign FOREIGN KEY (order_id) REFERENCES public."order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_line_item_adjustment order_line_item_adjustment_item_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_line_item_adjustment
    ADD CONSTRAINT order_line_item_adjustment_item_id_foreign FOREIGN KEY (item_id) REFERENCES public.order_line_item(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_line_item_tax_line order_line_item_tax_line_item_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_line_item_tax_line
    ADD CONSTRAINT order_line_item_tax_line_item_id_foreign FOREIGN KEY (item_id) REFERENCES public.order_line_item(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_line_item order_line_item_totals_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_line_item
    ADD CONSTRAINT order_line_item_totals_id_foreign FOREIGN KEY (totals_id) REFERENCES public.order_item(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order order_shipping_address_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."order"
    ADD CONSTRAINT order_shipping_address_id_foreign FOREIGN KEY (shipping_address_id) REFERENCES public.order_address(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_shipping_method_adjustment order_shipping_method_adjustment_shipping_method_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_shipping_method_adjustment
    ADD CONSTRAINT order_shipping_method_adjustment_shipping_method_id_foreign FOREIGN KEY (shipping_method_id) REFERENCES public.order_shipping_method(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_shipping_method_tax_line order_shipping_method_tax_line_shipping_method_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_shipping_method_tax_line
    ADD CONSTRAINT order_shipping_method_tax_line_shipping_method_id_foreign FOREIGN KEY (shipping_method_id) REFERENCES public.order_shipping_method(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_shipping order_shipping_order_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_shipping
    ADD CONSTRAINT order_shipping_order_id_foreign FOREIGN KEY (order_id) REFERENCES public."order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_transaction order_transaction_order_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_transaction
    ADD CONSTRAINT order_transaction_order_id_foreign FOREIGN KEY (order_id) REFERENCES public."order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: payment_collection_payment_providers payment_collection_payment_providers_payment_col_aa276_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_collection_payment_providers
    ADD CONSTRAINT payment_collection_payment_providers_payment_col_aa276_foreign FOREIGN KEY (payment_collection_id) REFERENCES public.payment_collection(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payment_collection_payment_providers payment_collection_payment_providers_payment_pro_2d555_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_collection_payment_providers
    ADD CONSTRAINT payment_collection_payment_providers_payment_pro_2d555_foreign FOREIGN KEY (payment_provider_id) REFERENCES public.payment_provider(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payment payment_payment_collection_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_payment_collection_id_foreign FOREIGN KEY (payment_collection_id) REFERENCES public.payment_collection(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payment_session payment_session_payment_collection_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_session
    ADD CONSTRAINT payment_session_payment_collection_id_foreign FOREIGN KEY (payment_collection_id) REFERENCES public.payment_collection(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: price_list_rule price_list_rule_price_list_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_list_rule
    ADD CONSTRAINT price_list_rule_price_list_id_foreign FOREIGN KEY (price_list_id) REFERENCES public.price_list(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: price price_price_list_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price
    ADD CONSTRAINT price_price_list_id_foreign FOREIGN KEY (price_list_id) REFERENCES public.price_list(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: price price_price_set_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price
    ADD CONSTRAINT price_price_set_id_foreign FOREIGN KEY (price_set_id) REFERENCES public.price_set(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: price_rule price_rule_price_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_rule
    ADD CONSTRAINT price_rule_price_id_foreign FOREIGN KEY (price_id) REFERENCES public.price(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_category product_category_parent_category_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_category
    ADD CONSTRAINT product_category_parent_category_id_foreign FOREIGN KEY (parent_category_id) REFERENCES public.product_category(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_category_product product_category_product_product_category_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_category_product
    ADD CONSTRAINT product_category_product_product_category_id_foreign FOREIGN KEY (product_category_id) REFERENCES public.product_category(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_category_product product_category_product_product_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_category_product
    ADD CONSTRAINT product_category_product_product_id_foreign FOREIGN KEY (product_id) REFERENCES public.product(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product product_collection_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_collection_id_foreign FOREIGN KEY (collection_id) REFERENCES public.product_collection(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: product_option product_option_product_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_option
    ADD CONSTRAINT product_option_product_id_foreign FOREIGN KEY (product_id) REFERENCES public.product(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_option_value product_option_value_option_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_option_value
    ADD CONSTRAINT product_option_value_option_id_foreign FOREIGN KEY (option_id) REFERENCES public.product_option(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_tags product_tags_product_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_tags
    ADD CONSTRAINT product_tags_product_id_foreign FOREIGN KEY (product_id) REFERENCES public.product(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_tags product_tags_product_tag_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_tags
    ADD CONSTRAINT product_tags_product_tag_id_foreign FOREIGN KEY (product_tag_id) REFERENCES public.product_tag(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product product_type_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_type_id_foreign FOREIGN KEY (type_id) REFERENCES public.product_type(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: product_variant_option product_variant_option_option_value_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variant_option
    ADD CONSTRAINT product_variant_option_option_value_id_foreign FOREIGN KEY (option_value_id) REFERENCES public.product_option_value(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_variant_option product_variant_option_variant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variant_option
    ADD CONSTRAINT product_variant_option_variant_id_foreign FOREIGN KEY (variant_id) REFERENCES public.product_variant(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_variant product_variant_product_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variant
    ADD CONSTRAINT product_variant_product_id_foreign FOREIGN KEY (product_id) REFERENCES public.product(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_application_method promotion_application_method_promotion_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_application_method
    ADD CONSTRAINT promotion_application_method_promotion_id_foreign FOREIGN KEY (promotion_id) REFERENCES public.promotion(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_campaign_budget promotion_campaign_budget_campaign_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_campaign_budget
    ADD CONSTRAINT promotion_campaign_budget_campaign_id_foreign FOREIGN KEY (campaign_id) REFERENCES public.promotion_campaign(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion promotion_campaign_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion
    ADD CONSTRAINT promotion_campaign_id_foreign FOREIGN KEY (campaign_id) REFERENCES public.promotion_campaign(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: promotion_promotion_rule promotion_promotion_rule_promotion_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_promotion_rule
    ADD CONSTRAINT promotion_promotion_rule_promotion_id_foreign FOREIGN KEY (promotion_id) REFERENCES public.promotion(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_promotion_rule promotion_promotion_rule_promotion_rule_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_promotion_rule
    ADD CONSTRAINT promotion_promotion_rule_promotion_rule_id_foreign FOREIGN KEY (promotion_rule_id) REFERENCES public.promotion_rule(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_rule_value promotion_rule_value_promotion_rule_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_rule_value
    ADD CONSTRAINT promotion_rule_value_promotion_rule_id_foreign FOREIGN KEY (promotion_rule_id) REFERENCES public.promotion_rule(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: provider_identity provider_identity_auth_identity_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.provider_identity
    ADD CONSTRAINT provider_identity_auth_identity_id_foreign FOREIGN KEY (auth_identity_id) REFERENCES public.auth_identity(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: refund refund_payment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refund
    ADD CONSTRAINT refund_payment_id_foreign FOREIGN KEY (payment_id) REFERENCES public.payment(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: region_country region_country_region_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.region_country
    ADD CONSTRAINT region_country_region_id_foreign FOREIGN KEY (region_id) REFERENCES public.region(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: reservation_item reservation_item_inventory_item_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservation_item
    ADD CONSTRAINT reservation_item_inventory_item_id_foreign FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_item(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: return_reason return_reason_parent_return_reason_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_reason
    ADD CONSTRAINT return_reason_parent_return_reason_id_foreign FOREIGN KEY (parent_return_reason_id) REFERENCES public.return_reason(id);


--
-- Name: service_zone service_zone_fulfillment_set_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_zone
    ADD CONSTRAINT service_zone_fulfillment_set_id_foreign FOREIGN KEY (fulfillment_set_id) REFERENCES public.fulfillment_set(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: shipping_option shipping_option_provider_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipping_option
    ADD CONSTRAINT shipping_option_provider_id_foreign FOREIGN KEY (provider_id) REFERENCES public.fulfillment_provider(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: shipping_option_rule shipping_option_rule_shipping_option_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipping_option_rule
    ADD CONSTRAINT shipping_option_rule_shipping_option_id_foreign FOREIGN KEY (shipping_option_id) REFERENCES public.shipping_option(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: shipping_option shipping_option_service_zone_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipping_option
    ADD CONSTRAINT shipping_option_service_zone_id_foreign FOREIGN KEY (service_zone_id) REFERENCES public.service_zone(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: shipping_option shipping_option_shipping_option_type_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipping_option
    ADD CONSTRAINT shipping_option_shipping_option_type_id_foreign FOREIGN KEY (shipping_option_type_id) REFERENCES public.shipping_option_type(id) ON UPDATE CASCADE;


--
-- Name: shipping_option shipping_option_shipping_profile_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipping_option
    ADD CONSTRAINT shipping_option_shipping_profile_id_foreign FOREIGN KEY (shipping_profile_id) REFERENCES public.shipping_profile(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: stock_location stock_location_address_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_location
    ADD CONSTRAINT stock_location_address_id_foreign FOREIGN KEY (address_id) REFERENCES public.stock_location_address(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: store_currency store_currency_store_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_currency
    ADD CONSTRAINT store_currency_store_id_foreign FOREIGN KEY (store_id) REFERENCES public.store(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO contentman;


--
-- Name: TABLE account_holder; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.account_holder TO contentman;


--
-- Name: TABLE api_key; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.api_key TO contentman;


--
-- Name: TABLE application_method_buy_rules; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.application_method_buy_rules TO contentman;


--
-- Name: TABLE application_method_target_rules; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.application_method_target_rules TO contentman;


--
-- Name: TABLE auth_identity; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.auth_identity TO contentman;


--
-- Name: TABLE blog_posts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.blog_posts TO contentman;


--
-- Name: SEQUENCE blog_posts_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.blog_posts_id_seq TO contentman;


--
-- Name: TABLE capture; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.capture TO contentman;


--
-- Name: TABLE cart; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.cart TO contentman;


--
-- Name: TABLE cart_address; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.cart_address TO contentman;


--
-- Name: TABLE cart_line_item; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.cart_line_item TO contentman;


--
-- Name: TABLE cart_line_item_adjustment; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.cart_line_item_adjustment TO contentman;


--
-- Name: TABLE cart_line_item_tax_line; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.cart_line_item_tax_line TO contentman;


--
-- Name: TABLE cart_payment_collection; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.cart_payment_collection TO contentman;


--
-- Name: TABLE cart_promotion; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.cart_promotion TO contentman;


--
-- Name: TABLE cart_shipping_method; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.cart_shipping_method TO contentman;


--
-- Name: TABLE cart_shipping_method_adjustment; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.cart_shipping_method_adjustment TO contentman;


--
-- Name: TABLE cart_shipping_method_tax_line; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.cart_shipping_method_tax_line TO contentman;


--
-- Name: TABLE categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.categories TO contentman;


--
-- Name: SEQUENCE categories_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.categories_id_seq TO contentman;


--
-- Name: TABLE currency; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.currency TO contentman;


--
-- Name: TABLE customer; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.customer TO contentman;


--
-- Name: TABLE customer_account_holder; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.customer_account_holder TO contentman;


--
-- Name: TABLE customer_address; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.customer_address TO contentman;


--
-- Name: TABLE customer_group; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.customer_group TO contentman;


--
-- Name: TABLE customer_group_customer; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.customer_group_customer TO contentman;


--
-- Name: TABLE fulfillment; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.fulfillment TO contentman;


--
-- Name: TABLE fulfillment_address; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.fulfillment_address TO contentman;


--
-- Name: TABLE fulfillment_item; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.fulfillment_item TO contentman;


--
-- Name: TABLE fulfillment_label; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.fulfillment_label TO contentman;


--
-- Name: TABLE fulfillment_provider; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.fulfillment_provider TO contentman;


--
-- Name: TABLE fulfillment_set; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.fulfillment_set TO contentman;


--
-- Name: TABLE geo_zone; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.geo_zone TO contentman;


--
-- Name: TABLE image; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.image TO contentman;


--
-- Name: TABLE inventory_item; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.inventory_item TO contentman;


--
-- Name: TABLE inventory_level; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.inventory_level TO contentman;


--
-- Name: TABLE invite; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.invite TO contentman;


--
-- Name: TABLE link_module_migrations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.link_module_migrations TO contentman;


--
-- Name: SEQUENCE link_module_migrations_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.link_module_migrations_id_seq TO contentman;


--
-- Name: TABLE location_fulfillment_provider; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.location_fulfillment_provider TO contentman;


--
-- Name: TABLE location_fulfillment_set; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.location_fulfillment_set TO contentman;


--
-- Name: TABLE mikro_orm_migrations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mikro_orm_migrations TO contentman;


--
-- Name: SEQUENCE mikro_orm_migrations_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.mikro_orm_migrations_id_seq TO contentman;


--
-- Name: TABLE notification; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notification TO contentman;


--
-- Name: TABLE notification_provider; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notification_provider TO contentman;


--
-- Name: TABLE "order"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public."order" TO contentman;


--
-- Name: TABLE order_address; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_address TO contentman;


--
-- Name: TABLE order_cart; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_cart TO contentman;


--
-- Name: TABLE order_change; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_change TO contentman;


--
-- Name: TABLE order_change_action; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_change_action TO contentman;


--
-- Name: SEQUENCE order_change_action_ordering_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.order_change_action_ordering_seq TO contentman;


--
-- Name: TABLE order_claim; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_claim TO contentman;


--
-- Name: SEQUENCE order_claim_display_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.order_claim_display_id_seq TO contentman;


--
-- Name: TABLE order_claim_item; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_claim_item TO contentman;


--
-- Name: TABLE order_claim_item_image; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_claim_item_image TO contentman;


--
-- Name: TABLE order_credit_line; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_credit_line TO contentman;


--
-- Name: SEQUENCE order_display_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.order_display_id_seq TO contentman;


--
-- Name: TABLE order_exchange; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_exchange TO contentman;


--
-- Name: SEQUENCE order_exchange_display_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.order_exchange_display_id_seq TO contentman;


--
-- Name: TABLE order_exchange_item; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_exchange_item TO contentman;


--
-- Name: TABLE order_fulfillment; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_fulfillment TO contentman;


--
-- Name: TABLE order_item; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_item TO contentman;


--
-- Name: TABLE order_line_item; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_line_item TO contentman;


--
-- Name: TABLE order_line_item_adjustment; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_line_item_adjustment TO contentman;


--
-- Name: TABLE order_line_item_tax_line; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_line_item_tax_line TO contentman;


--
-- Name: TABLE order_payment_collection; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_payment_collection TO contentman;


--
-- Name: TABLE order_promotion; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_promotion TO contentman;


--
-- Name: TABLE order_shipping; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_shipping TO contentman;


--
-- Name: TABLE order_shipping_method; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_shipping_method TO contentman;


--
-- Name: TABLE order_shipping_method_adjustment; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_shipping_method_adjustment TO contentman;


--
-- Name: TABLE order_shipping_method_tax_line; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_shipping_method_tax_line TO contentman;


--
-- Name: TABLE order_summary; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_summary TO contentman;


--
-- Name: TABLE order_transaction; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_transaction TO contentman;


--
-- Name: TABLE orders; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.orders TO contentman;


--
-- Name: SEQUENCE orders_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.orders_id_seq TO contentman;


--
-- Name: TABLE payment; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment TO contentman;


--
-- Name: TABLE payment_collection; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_collection TO contentman;


--
-- Name: TABLE payment_collection_payment_providers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_collection_payment_providers TO contentman;


--
-- Name: TABLE payment_provider; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_provider TO contentman;


--
-- Name: TABLE payment_session; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_session TO contentman;


--
-- Name: TABLE price; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.price TO contentman;


--
-- Name: TABLE price_list; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.price_list TO contentman;


--
-- Name: TABLE price_list_rule; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.price_list_rule TO contentman;


--
-- Name: TABLE price_preference; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.price_preference TO contentman;


--
-- Name: TABLE price_rule; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.price_rule TO contentman;


--
-- Name: TABLE price_set; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.price_set TO contentman;


--
-- Name: TABLE product; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.product TO contentman;


--
-- Name: TABLE product_category; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.product_category TO contentman;


--
-- Name: TABLE product_category_product; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.product_category_product TO contentman;


--
-- Name: TABLE product_collection; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.product_collection TO contentman;


--
-- Name: TABLE product_option; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.product_option TO contentman;


--
-- Name: TABLE product_option_value; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.product_option_value TO contentman;


--
-- Name: TABLE product_sales_channel; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.product_sales_channel TO contentman;


--
-- Name: TABLE product_shipping_profile; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.product_shipping_profile TO contentman;


--
-- Name: TABLE product_tag; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.product_tag TO contentman;


--
-- Name: TABLE product_tags; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.product_tags TO contentman;


--
-- Name: TABLE product_type; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.product_type TO contentman;


--
-- Name: TABLE product_variant; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.product_variant TO contentman;


--
-- Name: TABLE product_variant_inventory_item; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.product_variant_inventory_item TO contentman;


--
-- Name: TABLE product_variant_option; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.product_variant_option TO contentman;


--
-- Name: TABLE product_variant_price_set; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.product_variant_price_set TO contentman;


--
-- Name: TABLE products; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.products TO contentman;


--
-- Name: SEQUENCE products_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.products_id_seq TO contentman;


--
-- Name: TABLE promotion; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.promotion TO contentman;


--
-- Name: TABLE promotion_application_method; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.promotion_application_method TO contentman;


--
-- Name: TABLE promotion_campaign; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.promotion_campaign TO contentman;


--
-- Name: TABLE promotion_campaign_budget; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.promotion_campaign_budget TO contentman;


--
-- Name: TABLE promotion_promotion_rule; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.promotion_promotion_rule TO contentman;


--
-- Name: TABLE promotion_rule; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.promotion_rule TO contentman;


--
-- Name: TABLE promotion_rule_value; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.promotion_rule_value TO contentman;


--
-- Name: TABLE provider_identity; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.provider_identity TO contentman;


--
-- Name: TABLE publishable_api_key_sales_channel; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.publishable_api_key_sales_channel TO contentman;


--
-- Name: TABLE refund; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.refund TO contentman;


--
-- Name: TABLE refund_reason; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.refund_reason TO contentman;


--
-- Name: TABLE region; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.region TO contentman;


--
-- Name: TABLE region_country; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.region_country TO contentman;


--
-- Name: TABLE region_payment_provider; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.region_payment_provider TO contentman;


--
-- Name: TABLE reservation_item; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.reservation_item TO contentman;


--
-- Name: TABLE return; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.return TO contentman;


--
-- Name: SEQUENCE return_display_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.return_display_id_seq TO contentman;


--
-- Name: TABLE return_fulfillment; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.return_fulfillment TO contentman;


--
-- Name: TABLE return_item; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.return_item TO contentman;


--
-- Name: TABLE return_reason; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.return_reason TO contentman;


--
-- Name: TABLE sales_channel; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sales_channel TO contentman;


--
-- Name: TABLE sales_channel_stock_location; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sales_channel_stock_location TO contentman;


--
-- Name: TABLE service_zone; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.service_zone TO contentman;


--
-- Name: TABLE shipping_option; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.shipping_option TO contentman;


--
-- Name: TABLE shipping_option_price_set; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.shipping_option_price_set TO contentman;


--
-- Name: TABLE shipping_option_rule; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.shipping_option_rule TO contentman;


--
-- Name: TABLE shipping_option_type; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.shipping_option_type TO contentman;


--
-- Name: TABLE shipping_profile; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.shipping_profile TO contentman;


--
-- Name: TABLE stock_location; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.stock_location TO contentman;


--
-- Name: TABLE stock_location_address; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.stock_location_address TO contentman;


--
-- Name: TABLE store; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.store TO contentman;


--
-- Name: TABLE store_currency; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.store_currency TO contentman;


--
-- Name: TABLE tax_provider; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tax_provider TO contentman;


--
-- Name: TABLE tax_rate; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tax_rate TO contentman;


--
-- Name: TABLE tax_rate_rule; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tax_rate_rule TO contentman;


--
-- Name: TABLE tax_region; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tax_region TO contentman;


--
-- Name: TABLE "user"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public."user" TO contentman;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO contentman;


--
-- Name: SEQUENCE users_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.users_id_seq TO contentman;


--
-- Name: TABLE workflow_execution; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.workflow_execution TO contentman;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO contentman;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO contentman;


--
-- PostgreSQL database dump complete
--

