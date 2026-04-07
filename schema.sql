--
-- PostgreSQL database dump
--

\restrict dFUBjANbd864aDZgynvlEgORpIqz0IADCnh3ryQ6GAAD1LLpqMufE6Of2uJvaTh

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

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
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: campaign_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.campaign_status AS ENUM (
    'DRAFT',
    'PENDING',
    'ACTIVE',
    'REJECTED',
    'CLOSED'
);


ALTER TYPE public.campaign_status OWNER TO postgres;

--
-- Name: milestone_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.milestone_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public.milestone_status OWNER TO postgres;

--
-- Name: pledge_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.pledge_status AS ENUM (
    'PENDING',
    'SUCCESS',
    'FAILED'
);


ALTER TYPE public.pledge_status OWNER TO postgres;

--
-- Name: donation_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.donation_status AS ENUM (
    'PENDING',
    'PAID',
    'FAILED',
    'EXPIRED',
    'CANCELED'
);


ALTER TYPE public.donation_status OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'USER',
    'ADMIN'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- Name: trigger_set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = NOW();

    RETURN NEW;

END;

$$;


ALTER FUNCTION public.trigger_set_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    porteur_id uuid NOT NULL,
    title character varying(500) NOT NULL,
    description text NOT NULL,
    category character varying(100) NOT NULL,
    target_amount integer NOT NULL,
    status public.campaign_status DEFAULT 'DRAFT'::public.campaign_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    rewards jsonb DEFAULT '[]'::jsonb,
    image_url text,
    video_url text,
    story text,
    current_amount integer DEFAULT 0 NOT NULL,
    CONSTRAINT campaigns_target_amount_check CHECK ((target_amount > 0))
);


ALTER TABLE public.campaigns OWNER TO postgres;

--
-- Name: milestones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    title character varying(500) NOT NULL,
    proof_url text,
    status public.milestone_status DEFAULT 'PENDING'::public.milestone_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.milestones OWNER TO postgres;

--
-- Name: pledges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pledges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    donateur_id uuid NOT NULL,
    amount integer NOT NULL,
    status public.pledge_status DEFAULT 'PENDING'::public.pledge_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pledges_amount_check CHECK ((amount > 0))
);


ALTER TABLE public.pledges OWNER TO postgres;

--
-- Name: donations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.donations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    user_id uuid NOT NULL,
    provider character varying(30) DEFAULT 'konnect'::character varying NOT NULL,
    amount_millimes integer NOT NULL,
    currency_token character varying(10) DEFAULT 'TND'::character varying NOT NULL,
    status public.donation_status DEFAULT 'PENDING'::public.donation_status NOT NULL,
    provider_payment_ref text,
    provider_short_id text,
    provider_order_id text,
    provider_status character varying(80),
    provider_payload_init jsonb,
    provider_payload_details jsonb,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    paid_at timestamp with time zone,
    CONSTRAINT donations_amount_millimes_check CHECK ((amount_millimes > 0))
);


ALTER TABLE public.donations OWNER TO postgres;

--
-- Name: payment_webhook_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_webhook_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider character varying(30) NOT NULL,
    query_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    payload jsonb,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    processed boolean DEFAULT false NOT NULL,
    processing_error text
);


ALTER TABLE public.payment_webhook_events OWNER TO postgres;

--
-- Name: rewards; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rewards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    title character varying(500) NOT NULL,
    minimum_amount integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rewards_minimum_amount_check CHECK ((minimum_amount > 0))
);


ALTER TABLE public.rewards OWNER TO postgres;

--
-- Name: saved_campaigns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.saved_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    campaign_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.saved_campaigns OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text,
    role public.user_role DEFAULT 'USER'::public.user_role NOT NULL,
    bank_details text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    bio text DEFAULT ''::text,
    avatar text DEFAULT ''::text,
    google_id text,
    auth_provider character varying(20) DEFAULT 'local'::character varying,
    email_verified boolean DEFAULT false
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: milestones milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_pkey PRIMARY KEY (id);


--
-- Name: pledges pledges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pledges
    ADD CONSTRAINT pledges_pkey PRIMARY KEY (id);

--
-- Name: donations donations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT donations_pkey PRIMARY KEY (id);


--
-- Name: payment_webhook_events payment_webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_webhook_events
    ADD CONSTRAINT payment_webhook_events_pkey PRIMARY KEY (id);


--
-- Name: rewards rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rewards
    ADD CONSTRAINT rewards_pkey PRIMARY KEY (id);


--
-- Name: saved_campaigns saved_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_campaigns
    ADD CONSTRAINT saved_campaigns_pkey PRIMARY KEY (id);


--
-- Name: saved_campaigns saved_campaigns_user_id_campaign_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_campaigns
    ADD CONSTRAINT saved_campaigns_user_id_campaign_id_key UNIQUE (user_id, campaign_id);


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
-- Name: idx_campaigns_porteur_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_campaigns_porteur_id ON public.campaigns USING btree (porteur_id);


--
-- Name: idx_campaigns_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_campaigns_status ON public.campaigns USING btree (status);


--
-- Name: idx_milestones_campaign_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_milestones_campaign_id ON public.milestones USING btree (campaign_id);


--
-- Name: idx_milestones_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_milestones_status ON public.milestones USING btree (status);


--
-- Name: idx_pledges_campaign_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pledges_campaign_id ON public.pledges USING btree (campaign_id);


--
-- Name: idx_pledges_donateur_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pledges_donateur_id ON public.pledges USING btree (donateur_id);


--
-- Name: idx_pledges_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pledges_status ON public.pledges USING btree (status);


--
-- Name: idx_donations_campaign_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_donations_campaign_id ON public.donations USING btree (campaign_id);


--
-- Name: idx_donations_provider_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_donations_provider_order_id ON public.donations USING btree (provider_order_id);


--
-- Name: idx_donations_provider_payment_ref; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_donations_provider_payment_ref ON public.donations USING btree (provider_payment_ref);


--
-- Name: idx_donations_provider_payment_ref_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_donations_provider_payment_ref_unique ON public.donations USING btree (provider_payment_ref) WHERE (provider_payment_ref IS NOT NULL);


--
-- Name: idx_donations_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_donations_status ON public.donations USING btree (status);


--
-- Name: idx_donations_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_donations_user_id ON public.donations USING btree (user_id);


--
-- Name: idx_payment_webhook_events_provider_received; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_webhook_events_provider_received ON public.payment_webhook_events USING btree (provider, received_at DESC);


--
-- Name: idx_rewards_campaign_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rewards_campaign_id ON public.rewards USING btree (campaign_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_google_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_users_google_id_unique ON public.users USING btree (google_id) WHERE (google_id IS NOT NULL);


--
-- Name: campaigns set_updated_at_campaigns; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_campaigns BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: milestones set_updated_at_milestones; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_milestones BEFORE UPDATE ON public.milestones FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: pledges set_updated_at_pledges; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_pledges BEFORE UPDATE ON public.pledges FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: donations set_updated_at_donations; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_donations BEFORE UPDATE ON public.donations FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: rewards set_updated_at_rewards; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_rewards BEFORE UPDATE ON public.rewards FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: users set_updated_at_users; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: campaigns fk_campaigns_porteur; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT fk_campaigns_porteur FOREIGN KEY (porteur_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: milestones fk_milestones_campaign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT fk_milestones_campaign FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pledges fk_pledges_campaign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pledges
    ADD CONSTRAINT fk_pledges_campaign FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pledges fk_pledges_donateur; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pledges
    ADD CONSTRAINT fk_pledges_donateur FOREIGN KEY (donateur_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: donations fk_donations_campaign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT fk_donations_campaign FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: donations fk_donations_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT fk_donations_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: rewards fk_rewards_campaign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rewards
    ADD CONSTRAINT fk_rewards_campaign FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: saved_campaigns saved_campaigns_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_campaigns
    ADD CONSTRAINT saved_campaigns_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: saved_campaigns saved_campaigns_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_campaigns
    ADD CONSTRAINT saved_campaigns_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: support_ticket_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.support_ticket_category AS ENUM (
    'GENERAL',
    'CAMPAIGN',
    'PAYMENT',
    'ACCOUNT',
    'TECHNICAL',
    'REPORT_ABUSE',
    'OTHER'
);


ALTER TYPE public.support_ticket_category OWNER TO postgres;

--
-- Name: support_ticket_priority; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.support_ticket_priority AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT'
);


ALTER TYPE public.support_ticket_priority OWNER TO postgres;

--
-- Name: support_ticket_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.support_ticket_status AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'WAITING_USER',
    'RESOLVED',
    'CLOSED'
);


ALTER TYPE public.support_ticket_status OWNER TO postgres;

--
-- Name: support_sender_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.support_sender_role AS ENUM (
    'USER',
    'ADMIN'
);


ALTER TYPE public.support_sender_role OWNER TO postgres;

--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(24) NOT NULL,
    user_id uuid NOT NULL,
    related_campaign_id uuid,
    title character varying(200) NOT NULL,
    category public.support_ticket_category DEFAULT 'GENERAL'::public.support_ticket_category NOT NULL,
    priority public.support_ticket_priority DEFAULT 'MEDIUM'::public.support_ticket_priority NOT NULL,
    status public.support_ticket_status DEFAULT 'OPEN'::public.support_ticket_status NOT NULL,
    assigned_admin_id uuid,
    last_message_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone,
    CONSTRAINT support_tickets_title_check CHECK ((char_length(TRIM(BOTH FROM title)) > 0))
);


ALTER TABLE public.support_tickets OWNER TO postgres;

--
-- Name: support_ticket_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_ticket_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    sender_id uuid,
    sender_role public.support_sender_role NOT NULL,
    sender_name character varying(255) NOT NULL,
    message text NOT NULL,
    attachment_url text,
    attachment_name character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT support_ticket_messages_message_check CHECK (((char_length(TRIM(BOTH FROM message)) > 0) AND (char_length(message) <= 4000)))
);


ALTER TABLE public.support_ticket_messages OWNER TO postgres;

--
-- Name: support_ticket_internal_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_ticket_internal_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    admin_id uuid,
    admin_name character varying(255) NOT NULL,
    note text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT support_ticket_internal_notes_note_check CHECK (((char_length(TRIM(BOTH FROM note)) > 0) AND (char_length(note) <= 4000)))
);


ALTER TABLE public.support_ticket_internal_notes OWNER TO postgres;

--
-- Name: support_tickets support_tickets_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_code_key UNIQUE (code);

--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);

--
-- Name: support_ticket_messages support_ticket_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_ticket_messages
    ADD CONSTRAINT support_ticket_messages_pkey PRIMARY KEY (id);

--
-- Name: support_ticket_internal_notes support_ticket_internal_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_ticket_internal_notes
    ADD CONSTRAINT support_ticket_internal_notes_pkey PRIMARY KEY (id);

--
-- Name: idx_support_tickets_assigned_admin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_tickets_assigned_admin ON public.support_tickets USING btree (assigned_admin_id);

--
-- Name: idx_support_tickets_last_message_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_tickets_last_message_at ON public.support_tickets USING btree (last_message_at DESC);

--
-- Name: idx_support_tickets_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_tickets_status ON public.support_tickets USING btree (status);

--
-- Name: idx_support_tickets_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_tickets_user_id ON public.support_tickets USING btree (user_id, created_at DESC);

--
-- Name: idx_support_ticket_messages_ticket_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_ticket_messages_ticket_created ON public.support_ticket_messages USING btree (ticket_id, created_at);

--
-- Name: idx_support_ticket_internal_notes_ticket_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_ticket_internal_notes_ticket_created ON public.support_ticket_internal_notes USING btree (ticket_id, created_at DESC);

--
-- Name: support_tickets set_updated_at_support_tickets; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_support_tickets BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

--
-- Name: support_ticket_messages set_updated_at_support_ticket_messages; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_support_ticket_messages BEFORE UPDATE ON public.support_ticket_messages FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

--
-- Name: support_ticket_internal_notes set_updated_at_support_ticket_internal_notes; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_support_ticket_internal_notes BEFORE UPDATE ON public.support_ticket_internal_notes FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

--
-- Name: support_tickets fk_support_tickets_assigned_admin; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT fk_support_tickets_assigned_admin FOREIGN KEY (assigned_admin_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: support_tickets fk_support_tickets_campaign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT fk_support_tickets_campaign FOREIGN KEY (related_campaign_id) REFERENCES public.campaigns(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: support_tickets fk_support_tickets_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT fk_support_tickets_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: support_ticket_messages fk_support_ticket_messages_sender; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_ticket_messages
    ADD CONSTRAINT fk_support_ticket_messages_sender FOREIGN KEY (sender_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: support_ticket_messages fk_support_ticket_messages_ticket; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_ticket_messages
    ADD CONSTRAINT fk_support_ticket_messages_ticket FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: support_ticket_internal_notes fk_support_ticket_notes_admin; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_ticket_internal_notes
    ADD CONSTRAINT fk_support_ticket_notes_admin FOREIGN KEY (admin_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: support_ticket_internal_notes fk_support_ticket_notes_ticket; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_ticket_internal_notes
    ADD CONSTRAINT fk_support_ticket_notes_ticket FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict dFUBjANbd864aDZgynvlEgORpIqz0IADCnh3ryQ6GAAD1LLpqMufE6Of2uJvaTh

