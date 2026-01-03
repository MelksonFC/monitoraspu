-- Adiciona campo compactmode à tabela usertablesettings
-- Execute este script no banco de dados PostgreSQL

ALTER TABLE dbo.usertablesettings 
ADD COLUMN compactmode BOOLEAN DEFAULT FALSE;

-- Comentário da coluna (opcional)
COMMENT ON COLUMN dbo.usertablesettings.compactmode IS 'Indica se o usuário prefere visualização compacta (true) ou extensa (false) da tabela';
