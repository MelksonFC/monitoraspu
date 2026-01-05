-- Adiciona campos compactmode e rowsperpage à tabela usertablesettings
-- Execute este script no banco de dados PostgreSQL

CREATE EXTENSION postgis WITH SCHEMA dbo;

-- Criação da tabela dbo.poligonosterreno
CREATE TABLE dbo.poligonosterreno (
	id serial4 NOT NULL,
	idimovel int4 NOT NULL,
	area dbo.geometry(polygon, 4326) NULL,
	usermodified int4 NOT NULL,
	usercreated int4 NOT NULL,
	datemodified timestamp NOT NULL,
	datecreated timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT poligonosterreno_pkey PRIMARY KEY (id)
);


-- dbo.poligonosterreno chaves estrangeiras

ALTER TABLE dbo.poligonosterreno ADD CONSTRAINT poligonosterreno_idimovel_fkey FOREIGN KEY (idimovel) REFERENCES dbo.imoveis(idimovel);
;

-- Adiciona campo compactmode
ALTER TABLE dbo.usertablesettings 
ADD COLUMN IF NOT EXISTS compactmode BOOLEAN DEFAULT FALSE;

-- Adiciona campo rowsperpage
ALTER TABLE dbo.usertablesettings 
ADD COLUMN IF NOT EXISTS rowsperpage INTEGER DEFAULT 50;

-- Comentários das colunas (opcional)
COMMENT ON COLUMN dbo.usertablesettings.compactmode IS 'Indica se o usuário prefere visualização compacta (true) ou extensa (false) da tabela';
COMMENT ON COLUMN dbo.usertablesettings.rowsperpage IS 'Quantidade de linhas por página na paginação da tabela';
