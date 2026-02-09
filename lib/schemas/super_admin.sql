-- Table: public.super_admins

-- DROP TABLE IF EXISTS public.super_admins;

CREATE TABLE IF NOT EXISTS public.super_admins
(
    id integer NOT NULL DEFAULT nextval('super_admins_id_seq'::regclass),
    email character varying(255) COLLATE pg_catalog."default" NOT NULL,
    password character varying(255) COLLATE pg_catalog."default" NOT NULL,
    name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    phone character varying(20) COLLATE pg_catalog."default",
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_login_at timestamp without time zone,
    CONSTRAINT super_admins_pkey PRIMARY KEY (id),
    CONSTRAINT super_admins_email_key UNIQUE (email)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.super_admins
    OWNER to postgres;