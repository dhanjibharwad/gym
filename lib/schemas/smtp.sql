-- Table: public.smtp_configs

-- DROP TABLE IF EXISTS public.smtp_configs;

CREATE TABLE IF NOT EXISTS public.smtp_configs
(
    id SERIAL NOT NULL,
    company_id integer NOT NULL,
    host character varying(255) COLLATE pg_catalog."default" NOT NULL,
    port integer NOT NULL DEFAULT 587,
    secure boolean DEFAULT false,
    username character varying(255) COLLATE pg_catalog."default" NOT NULL,
    password character varying(255) COLLATE pg_catalog."default" NOT NULL,
    from_name character varying(255) COLLATE pg_catalog."default" DEFAULT 'Gym Management'::character varying,
    is_active boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT smtp_configs_pkey PRIMARY KEY (id),
    CONSTRAINT smtp_configs_company_id_fkey FOREIGN KEY (company_id)
        REFERENCES public.companies (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.smtp_configs
    OWNER to postgres;
-- Index: idx_smtp_configs_company

-- DROP INDEX IF EXISTS public.idx_smtp_configs_company;

CREATE INDEX IF NOT EXISTS idx_smtp_configs_company
    ON public.smtp_configs USING btree
    (company_id ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;