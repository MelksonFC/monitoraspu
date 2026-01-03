-- Adiciona campos compactmode e rowsperpage à tabela usertablesettings
-- Execute este script no banco de dados PostgreSQL

-- Adiciona campo compactmode
ALTER TABLE dbo.usertablesettings 
ADD COLUMN IF NOT EXISTS compactmode BOOLEAN DEFAULT FALSE;

-- Adiciona campo rowsperpage
ALTER TABLE dbo.usertablesettings 
ADD COLUMN IF NOT EXISTS rowsperpage INTEGER DEFAULT 50;

-- Comentários das colunas (opcional)
COMMENT ON COLUMN dbo.usertablesettings.compactmode IS 'Indica se o usuário prefere visualização compacta (true) ou extensa (false) da tabela';
COMMENT ON COLUMN dbo.usertablesettings.rowsperpage IS 'Quantidade de linhas por página na paginação da tabela';
