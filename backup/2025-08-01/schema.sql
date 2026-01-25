--
-- PostgreSQL database dump
--

-- Dumped from database version 15.13
-- Dumped by pg_dump version 15.13

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
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA drizzle;


ALTER SCHEMA drizzle OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: postgres
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


ALTER TABLE drizzle.__drizzle_migrations OWNER TO postgres;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: postgres
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE drizzle.__drizzle_migrations_id_seq OWNER TO postgres;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: postgres
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: ad_analytics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ad_analytics (
    id integer NOT NULL,
    campaign_id integer NOT NULL,
    user_id integer,
    session_id text,
    action text NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now(),
    user_agent text,
    ip_address text,
    referrer text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE public.ad_analytics OWNER TO postgres;

--
-- Name: ad_analytics_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ad_analytics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ad_analytics_id_seq OWNER TO postgres;

--
-- Name: ad_analytics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ad_analytics_id_seq OWNED BY public.ad_analytics.id;


--
-- Name: ad_campaigns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ad_campaigns (
    id integer NOT NULL,
    business_id integer NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    image_url text,
    click_url text,
    ad_type text NOT NULL,
    size text DEFAULT 'medium'::text NOT NULL,
    animation_type text DEFAULT 'static'::text NOT NULL,
    targeting_rules jsonb DEFAULT '{}'::jsonb NOT NULL,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    budget numeric(10,2) NOT NULL,
    spent numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    clicks integer DEFAULT 0,
    impressions integer DEFAULT 0,
    status text DEFAULT 'draft'::text NOT NULL,
    priority integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);


ALTER TABLE public.ad_campaigns OWNER TO postgres;

--
-- Name: ad_campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ad_campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ad_campaigns_id_seq OWNER TO postgres;

--
-- Name: ad_campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ad_campaigns_id_seq OWNED BY public.ad_campaigns.id;


--
-- Name: admin_announcements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_announcements (
    id integer NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    type text DEFAULT 'news'::text NOT NULL,
    icon text,
    color text DEFAULT 'blue'::text,
    scroll_speed integer DEFAULT 50,
    display_duration integer DEFAULT 10000,
    is_active boolean DEFAULT true,
    priority integer DEFAULT 1,
    template_id text DEFAULT 'default'::text,
    target_audience jsonb DEFAULT '{}'::jsonb NOT NULL,
    scheduled_at timestamp without time zone,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);


ALTER TABLE public.admin_announcements OWNER TO postgres;

--
-- Name: admin_announcements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_announcements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.admin_announcements_id_seq OWNER TO postgres;

--
-- Name: admin_announcements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_announcements_id_seq OWNED BY public.admin_announcements.id;


--
-- Name: advertisements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.advertisements (
    id integer NOT NULL,
    business_id integer NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    image_url text,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    type text NOT NULL,
    target_audience jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);


ALTER TABLE public.advertisements OWNER TO postgres;

--
-- Name: advertisements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.advertisements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.advertisements_id_seq OWNER TO postgres;

--
-- Name: advertisements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.advertisements_id_seq OWNED BY public.advertisements.id;


--
-- Name: ai_subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_subscriptions (
    id integer NOT NULL,
    email text NOT NULL,
    features text DEFAULT '[]'::text,
    notify_on_launch boolean DEFAULT true,
    subscribed boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.ai_subscriptions OWNER TO postgres;

--
-- Name: ai_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ai_subscriptions_id_seq OWNER TO postgres;

--
-- Name: ai_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_subscriptions_id_seq OWNED BY public.ai_subscriptions.id;


--
-- Name: booking_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.booking_notifications (
    id integer NOT NULL,
    business_id integer NOT NULL,
    booking_id integer NOT NULL,
    recipient_id integer NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    content text NOT NULL,
    scheduled_for timestamp without time zone,
    sent_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.booking_notifications OWNER TO postgres;

--
-- Name: booking_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.booking_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.booking_notifications_id_seq OWNER TO postgres;

--
-- Name: booking_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.booking_notifications_id_seq OWNED BY public.booking_notifications.id;


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bookings (
    id integer NOT NULL,
    service_id integer NOT NULL,
    customer_id integer NOT NULL,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);


ALTER TABLE public.bookings OWNER TO postgres;

--
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.bookings_id_seq OWNER TO postgres;

--
-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;


--
-- Name: businesses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.businesses (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name text NOT NULL,
    description text,
    industry_type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    logo text,
    gallery jsonb DEFAULT '[]'::jsonb,
    social_media jsonb DEFAULT '{}'::jsonb,
    contact_info jsonb DEFAULT '{}'::jsonb,
    operating_hours jsonb DEFAULT '{}'::jsonb,
    amenities jsonb DEFAULT '[]'::jsonb,
    onboarding_completed boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);


ALTER TABLE public.businesses OWNER TO postgres;

--
-- Name: businesses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.businesses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.businesses_id_seq OWNER TO postgres;

--
-- Name: businesses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.businesses_id_seq OWNED BY public.businesses.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    sender_id integer NOT NULL,
    receiver_id integer NOT NULL,
    booking_id integer,
    content text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.messages_id_seq OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: salon_services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.salon_services (
    id integer NOT NULL,
    business_id integer NOT NULL,
    name text NOT NULL,
    description text,
    duration integer NOT NULL,
    price numeric(10,2) NOT NULL,
    is_active boolean DEFAULT true,
    max_participants integer DEFAULT 1,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);


ALTER TABLE public.salon_services OWNER TO postgres;

--
-- Name: salon_services_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.salon_services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.salon_services_id_seq OWNER TO postgres;

--
-- Name: salon_services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.salon_services_id_seq OWNED BY public.salon_services.id;


--
-- Name: salon_staff; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.salon_staff (
    id integer NOT NULL,
    business_id integer NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    specialization text,
    status text DEFAULT 'active'::text NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);


ALTER TABLE public.salon_staff OWNER TO postgres;

--
-- Name: salon_staff_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.salon_staff_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.salon_staff_id_seq OWNER TO postgres;

--
-- Name: salon_staff_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.salon_staff_id_seq OWNED BY public.salon_staff.id;


--
-- Name: service_conflicts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_conflicts (
    id integer NOT NULL,
    business_id integer NOT NULL,
    service_id integer NOT NULL,
    conflicting_service_id integer NOT NULL,
    conflict_type text NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);


ALTER TABLE public.service_conflicts OWNER TO postgres;

--
-- Name: service_conflicts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.service_conflicts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.service_conflicts_id_seq OWNER TO postgres;

--
-- Name: service_conflicts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.service_conflicts_id_seq OWNED BY public.service_conflicts.id;


--
-- Name: service_slots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_slots (
    id integer NOT NULL,
    business_id integer NOT NULL,
    service_id integer NOT NULL,
    staff_id integer NOT NULL,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone NOT NULL,
    status text DEFAULT 'available'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);


ALTER TABLE public.service_slots OWNER TO postgres;

--
-- Name: service_slots_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.service_slots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.service_slots_id_seq OWNER TO postgres;

--
-- Name: service_slots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.service_slots_id_seq OWNED BY public.service_slots.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.services (
    id integer NOT NULL,
    business_id integer NOT NULL,
    name text NOT NULL,
    description text,
    duration integer NOT NULL,
    price numeric(10,2) NOT NULL,
    category text,
    is_active boolean DEFAULT true,
    max_participants integer DEFAULT 1,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);


ALTER TABLE public.services OWNER TO postgres;

--
-- Name: services_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.services_id_seq OWNER TO postgres;

--
-- Name: services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.services_id_seq OWNED BY public.services.id;


--
-- Name: shift_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shift_templates (
    id integer NOT NULL,
    business_id integer NOT NULL,
    name text NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    breaks jsonb DEFAULT '[]'::jsonb NOT NULL,
    break_duration integer,
    days_of_week jsonb DEFAULT '[]'::jsonb NOT NULL,
    color text DEFAULT '#000000'::text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);


ALTER TABLE public.shift_templates OWNER TO postgres;

--
-- Name: shift_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shift_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.shift_templates_id_seq OWNER TO postgres;

--
-- Name: shift_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shift_templates_id_seq OWNED BY public.shift_templates.id;


--
-- Name: staff_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.staff_schedules (
    id integer NOT NULL,
    staff_id integer NOT NULL,
    template_id integer NOT NULL,
    date timestamp without time zone NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    actual_start_time timestamp without time zone,
    actual_end_time timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);


ALTER TABLE public.staff_schedules OWNER TO postgres;

--
-- Name: staff_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.staff_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.staff_schedules_id_seq OWNER TO postgres;

--
-- Name: staff_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.staff_schedules_id_seq OWNED BY public.staff_schedules.id;


--
-- Name: staff_skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.staff_skills (
    id integer NOT NULL,
    staff_id integer NOT NULL,
    service_id integer NOT NULL,
    proficiency_level text DEFAULT 'junior'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);


ALTER TABLE public.staff_skills OWNER TO postgres;

--
-- Name: staff_skills_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.staff_skills_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.staff_skills_id_seq OWNER TO postgres;

--
-- Name: staff_skills_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.staff_skills_id_seq OWNED BY public.staff_skills.id;


--
-- Name: user_interests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_interests (
    id integer NOT NULL,
    user_id integer,
    session_id text,
    search_history jsonb DEFAULT '[]'::jsonb NOT NULL,
    category_views jsonb DEFAULT '{}'::jsonb NOT NULL,
    business_views jsonb DEFAULT '[]'::jsonb NOT NULL,
    location_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    device_info jsonb DEFAULT '{}'::jsonb NOT NULL,
    last_updated timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_interests OWNER TO postgres;

--
-- Name: user_interests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_interests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_interests_id_seq OWNER TO postgres;

--
-- Name: user_interests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_interests_id_seq OWNED BY public.user_interests.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    email text NOT NULL,
    role text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
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


ALTER TABLE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: waitlist_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.waitlist_entries (
    id integer NOT NULL,
    business_id integer NOT NULL,
    customer_id integer NOT NULL,
    service_id integer NOT NULL,
    preferred_staff_id integer,
    preferred_time_slots jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);


ALTER TABLE public.waitlist_entries OWNER TO postgres;

--
-- Name: waitlist_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.waitlist_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.waitlist_entries_id_seq OWNER TO postgres;

--
-- Name: waitlist_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.waitlist_entries_id_seq OWNED BY public.waitlist_entries.id;


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: postgres
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: ad_analytics id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_analytics ALTER COLUMN id SET DEFAULT nextval('public.ad_analytics_id_seq'::regclass);


--
-- Name: ad_campaigns id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_campaigns ALTER COLUMN id SET DEFAULT nextval('public.ad_campaigns_id_seq'::regclass);


--
-- Name: admin_announcements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_announcements ALTER COLUMN id SET DEFAULT nextval('public.admin_announcements_id_seq'::regclass);


--
-- Name: advertisements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.advertisements ALTER COLUMN id SET DEFAULT nextval('public.advertisements_id_seq'::regclass);


--
-- Name: ai_subscriptions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.ai_subscriptions_id_seq'::regclass);


--
-- Name: booking_notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_notifications ALTER COLUMN id SET DEFAULT nextval('public.booking_notifications_id_seq'::regclass);


--
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);


--
-- Name: businesses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.businesses ALTER COLUMN id SET DEFAULT nextval('public.businesses_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: salon_services id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salon_services ALTER COLUMN id SET DEFAULT nextval('public.salon_services_id_seq'::regclass);


--
-- Name: salon_staff id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salon_staff ALTER COLUMN id SET DEFAULT nextval('public.salon_staff_id_seq'::regclass);


--
-- Name: service_conflicts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_conflicts ALTER COLUMN id SET DEFAULT nextval('public.service_conflicts_id_seq'::regclass);


--
-- Name: service_slots id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_slots ALTER COLUMN id SET DEFAULT nextval('public.service_slots_id_seq'::regclass);


--
-- Name: services id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq'::regclass);


--
-- Name: shift_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_templates ALTER COLUMN id SET DEFAULT nextval('public.shift_templates_id_seq'::regclass);


--
-- Name: staff_schedules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_schedules ALTER COLUMN id SET DEFAULT nextval('public.staff_schedules_id_seq'::regclass);


--
-- Name: staff_skills id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_skills ALTER COLUMN id SET DEFAULT nextval('public.staff_skills_id_seq'::regclass);


--
-- Name: user_interests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_interests ALTER COLUMN id SET DEFAULT nextval('public.user_interests_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: waitlist_entries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waitlist_entries ALTER COLUMN id SET DEFAULT nextval('public.waitlist_entries_id_seq'::regclass);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: postgres
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: ad_analytics ad_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_analytics
    ADD CONSTRAINT ad_analytics_pkey PRIMARY KEY (id);


--
-- Name: ad_campaigns ad_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_campaigns
    ADD CONSTRAINT ad_campaigns_pkey PRIMARY KEY (id);


--
-- Name: admin_announcements admin_announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_announcements
    ADD CONSTRAINT admin_announcements_pkey PRIMARY KEY (id);


--
-- Name: advertisements advertisements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.advertisements
    ADD CONSTRAINT advertisements_pkey PRIMARY KEY (id);


--
-- Name: ai_subscriptions ai_subscriptions_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_subscriptions
    ADD CONSTRAINT ai_subscriptions_email_unique UNIQUE (email);


--
-- Name: ai_subscriptions ai_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_subscriptions
    ADD CONSTRAINT ai_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: booking_notifications booking_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_notifications
    ADD CONSTRAINT booking_notifications_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: businesses businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: salon_services salon_services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salon_services
    ADD CONSTRAINT salon_services_pkey PRIMARY KEY (id);


--
-- Name: salon_staff salon_staff_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salon_staff
    ADD CONSTRAINT salon_staff_pkey PRIMARY KEY (id);


--
-- Name: service_conflicts service_conflicts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_conflicts
    ADD CONSTRAINT service_conflicts_pkey PRIMARY KEY (id);


--
-- Name: service_slots service_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_slots
    ADD CONSTRAINT service_slots_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: shift_templates shift_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_templates
    ADD CONSTRAINT shift_templates_pkey PRIMARY KEY (id);


--
-- Name: staff_schedules staff_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_schedules
    ADD CONSTRAINT staff_schedules_pkey PRIMARY KEY (id);


--
-- Name: staff_skills staff_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_skills
    ADD CONSTRAINT staff_skills_pkey PRIMARY KEY (id);


--
-- Name: user_interests user_interests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_interests
    ADD CONSTRAINT user_interests_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: waitlist_entries waitlist_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waitlist_entries
    ADD CONSTRAINT waitlist_entries_pkey PRIMARY KEY (id);


--
-- Name: ad_analytics ad_analytics_campaign_id_ad_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_analytics
    ADD CONSTRAINT ad_analytics_campaign_id_ad_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.ad_campaigns(id) ON DELETE CASCADE;


--
-- Name: ad_analytics ad_analytics_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_analytics
    ADD CONSTRAINT ad_analytics_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: ad_campaigns ad_campaigns_business_id_businesses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_campaigns
    ADD CONSTRAINT ad_campaigns_business_id_businesses_id_fk FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: advertisements advertisements_business_id_businesses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.advertisements
    ADD CONSTRAINT advertisements_business_id_businesses_id_fk FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: booking_notifications booking_notifications_booking_id_bookings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_notifications
    ADD CONSTRAINT booking_notifications_booking_id_bookings_id_fk FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: booking_notifications booking_notifications_business_id_businesses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_notifications
    ADD CONSTRAINT booking_notifications_business_id_businesses_id_fk FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: booking_notifications booking_notifications_recipient_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_notifications
    ADD CONSTRAINT booking_notifications_recipient_id_users_id_fk FOREIGN KEY (recipient_id) REFERENCES public.users(id);


--
-- Name: bookings bookings_customer_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_customer_id_users_id_fk FOREIGN KEY (customer_id) REFERENCES public.users(id);


--
-- Name: bookings bookings_service_id_services_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_service_id_services_id_fk FOREIGN KEY (service_id) REFERENCES public.services(id);


--
-- Name: businesses businesses_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_booking_id_bookings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_booking_id_bookings_id_fk FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: messages messages_receiver_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_receiver_id_users_id_fk FOREIGN KEY (receiver_id) REFERENCES public.users(id);


--
-- Name: messages messages_sender_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_users_id_fk FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: salon_services salon_services_business_id_businesses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salon_services
    ADD CONSTRAINT salon_services_business_id_businesses_id_fk FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: salon_staff salon_staff_business_id_businesses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salon_staff
    ADD CONSTRAINT salon_staff_business_id_businesses_id_fk FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: service_conflicts service_conflicts_business_id_businesses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_conflicts
    ADD CONSTRAINT service_conflicts_business_id_businesses_id_fk FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: service_conflicts service_conflicts_conflicting_service_id_services_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_conflicts
    ADD CONSTRAINT service_conflicts_conflicting_service_id_services_id_fk FOREIGN KEY (conflicting_service_id) REFERENCES public.services(id);


--
-- Name: service_conflicts service_conflicts_service_id_services_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_conflicts
    ADD CONSTRAINT service_conflicts_service_id_services_id_fk FOREIGN KEY (service_id) REFERENCES public.services(id);


--
-- Name: service_slots service_slots_business_id_businesses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_slots
    ADD CONSTRAINT service_slots_business_id_businesses_id_fk FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: service_slots service_slots_service_id_services_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_slots
    ADD CONSTRAINT service_slots_service_id_services_id_fk FOREIGN KEY (service_id) REFERENCES public.services(id);


--
-- Name: service_slots service_slots_staff_id_salon_staff_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_slots
    ADD CONSTRAINT service_slots_staff_id_salon_staff_id_fk FOREIGN KEY (staff_id) REFERENCES public.salon_staff(id);


--
-- Name: services services_business_id_businesses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_business_id_businesses_id_fk FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: shift_templates shift_templates_business_id_businesses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_templates
    ADD CONSTRAINT shift_templates_business_id_businesses_id_fk FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: staff_schedules staff_schedules_staff_id_salon_staff_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_schedules
    ADD CONSTRAINT staff_schedules_staff_id_salon_staff_id_fk FOREIGN KEY (staff_id) REFERENCES public.salon_staff(id) ON DELETE CASCADE;


--
-- Name: staff_schedules staff_schedules_template_id_shift_templates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_schedules
    ADD CONSTRAINT staff_schedules_template_id_shift_templates_id_fk FOREIGN KEY (template_id) REFERENCES public.shift_templates(id);


--
-- Name: staff_skills staff_skills_service_id_salon_services_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_skills
    ADD CONSTRAINT staff_skills_service_id_salon_services_id_fk FOREIGN KEY (service_id) REFERENCES public.salon_services(id) ON DELETE CASCADE;


--
-- Name: staff_skills staff_skills_staff_id_salon_staff_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_skills
    ADD CONSTRAINT staff_skills_staff_id_salon_staff_id_fk FOREIGN KEY (staff_id) REFERENCES public.salon_staff(id) ON DELETE CASCADE;


--
-- Name: user_interests user_interests_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_interests
    ADD CONSTRAINT user_interests_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: waitlist_entries waitlist_entries_business_id_businesses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waitlist_entries
    ADD CONSTRAINT waitlist_entries_business_id_businesses_id_fk FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: waitlist_entries waitlist_entries_customer_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waitlist_entries
    ADD CONSTRAINT waitlist_entries_customer_id_users_id_fk FOREIGN KEY (customer_id) REFERENCES public.users(id);


--
-- Name: waitlist_entries waitlist_entries_preferred_staff_id_salon_staff_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waitlist_entries
    ADD CONSTRAINT waitlist_entries_preferred_staff_id_salon_staff_id_fk FOREIGN KEY (preferred_staff_id) REFERENCES public.salon_staff(id);


--
-- Name: waitlist_entries waitlist_entries_service_id_services_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waitlist_entries
    ADD CONSTRAINT waitlist_entries_service_id_services_id_fk FOREIGN KEY (service_id) REFERENCES public.services(id);


--
-- PostgreSQL database dump complete
--

