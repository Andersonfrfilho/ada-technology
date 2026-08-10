-- Busca fuzzy na base de conhecimento: o cliente escreve "quanto custa o bot de whats"
-- e precisa casar com "Plataforma de Atendimento WhatsApp".
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
