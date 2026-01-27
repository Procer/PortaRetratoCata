-- Tabla para los marcos (portarretratos)
CREATE TABLE `marcos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre` VARCHAR(255) NOT NULL,
  `token_acceso` VARCHAR(255) NOT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para la configuración de cada marco
CREATE TABLE `configuracion_marcos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `marco_id` INT NOT NULL,
  `tiempo_transicion_seg` INT NOT NULL DEFAULT 10,
  `efecto_transicion` VARCHAR(50) NOT NULL DEFAULT 'Disolver',
  `font_size_px` INT NOT NULL DEFAULT 16,
  `weather_city` VARCHAR(255) DEFAULT '',
  `weather_api_key` VARCHAR(255) DEFAULT '',
  `weather_font_size_px` INT NOT NULL DEFAULT 16,
  `forecast_morning_start` TIME DEFAULT NULL,
  `forecast_morning_end` TIME DEFAULT NULL,
  `forecast_evening_start` TIME DEFAULT NULL,
  `forecast_evening_end` TIME DEFAULT NULL,
  `weather_icon_size_px` INT NOT NULL DEFAULT 72, -- Nuevo campo para el tamaño del ícono del clima
  FOREIGN KEY (`marco_id`) REFERENCES `marcos`(`id`) ON DELETE CASCADE
);

-- Tabla para los álbumes de cada marco
CREATE TABLE `albums` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `marco_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`marco_id`) REFERENCES `marcos`(`id`) ON DELETE CASCADE,
  UNIQUE (`marco_id`, `name`) -- No puede haber dos álbumes con el mismo nombre en el mismo marco
);

-- Tabla para las fotos de cada marco
CREATE TABLE `fotos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `marco_id` INT NOT NULL,
  `album_id` INT, -- Nuevo campo para vincular a un álbum
  `url` VARCHAR(1024) NOT NULL,
  `media_type` VARCHAR(10) NOT NULL DEFAULT 'image',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`marco_id`) REFERENCES `marcos`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`album_id`) REFERENCES `albums`(`id`) ON DELETE SET NULL, -- Si se borra un álbum, los medios quedan sin álbum
  INDEX `idx_marco_id_created_at` (`marco_id`, `created_at` DESC)
);

-- Insertar un marco de ejemplo para empezar a trabajar
INSERT INTO `marcos` (`nombre`, `token_acceso`) VALUES ('Marco de Prueba', 'TOKEN_SEGURO_12345');

-- Insertar una configuración de ejemplo para el marco de prueba (ID = 1)
INSERT INTO `configuracion_marcos` (`marco_id`, `tiempo_transicion_seg`, `efecto_transicion`, `font_size_px`, `weather_city`, `weather_api_key`, `weather_font_size_px`) VALUES (1, 15, 'Disolver', 16, '', '', 16);

-- Insertar un álbum por defecto para el marco de prueba (ID = 1)
INSERT INTO `albums` (`marco_id`, `name`, `is_active`) VALUES (1, 'General', TRUE);