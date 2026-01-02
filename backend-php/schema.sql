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
  FOREIGN KEY (`marco_id`) REFERENCES `marcos`(`id`) ON DELETE CASCADE
);

-- Tabla para las fotos de cada marco
CREATE TABLE `fotos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `marco_id` INT NOT NULL,
  `url` VARCHAR(1024) NOT NULL,
  `media_type` VARCHAR(10) NOT NULL DEFAULT 'image',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`marco_id`) REFERENCES `marcos`(`id`) ON DELETE CASCADE,
  INDEX `idx_marco_id_created_at` (`marco_id`, `created_at` DESC)
);

-- Insertar un marco de ejemplo para empezar a trabajar
INSERT INTO `marcos` (`nombre`, `token_acceso`) VALUES ('Marco de Prueba', 'TOKEN_SEGURO_12345');

-- Insertar una configuración de ejemplo para el marco de prueba (ID = 1)
INSERT INTO `configuracion_marcos` (`marco_id`, `tiempo_transicion_seg`, `efecto_transicion`) VALUES (1, 15, 'Disolver');
