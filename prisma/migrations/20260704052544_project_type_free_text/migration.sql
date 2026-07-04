-- Тип проекта становится свободным текстом, чтобы студия могла завести свой
-- вариант (не только Сайт/Интернет-магазин/Лендинг/Поддержка/Другое).

ALTER TABLE "Project" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Project" ALTER COLUMN "type" TYPE TEXT USING ("type"::text);
ALTER TABLE "Project" ALTER COLUMN "type" SET DEFAULT 'Сайт';

-- Переводим уже существующие значения enum в читаемые русские подписи
UPDATE "Project" SET "type" = CASE "type"
  WHEN 'WEBSITE' THEN 'Сайт'
  WHEN 'ECOMMERCE' THEN 'Интернет-магазин'
  WHEN 'LANDING' THEN 'Лендинг'
  WHEN 'SUPPORT' THEN 'Поддержка'
  WHEN 'OTHER' THEN 'Другое'
  ELSE "type"
END;

DROP TYPE "ProjectType";
