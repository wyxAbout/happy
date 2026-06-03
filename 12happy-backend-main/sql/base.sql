CREATE TABLE `users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '本地用户ID，主键（游戏数据用此ID关联）',
    `shimmer_user_id` VARCHAR(64) NOT NULL COMMENT 'Shimmer 平台用户唯一标识',
    `username` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '用户昵称',
    `avatar` VARCHAR(256) NOT NULL DEFAULT '' COMMENT '头像URL',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_shimmer_user_id` (`shimmer_user_id`)
) COMMENT='本地用户表（映射 Shimmer SSO 用户）';

CREATE TABLE `card_types` (
                              `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '卡种ID，主键',
                              `card_name` VARCHAR(32) NOT NULL COMMENT '卡牌名称，如：苹果卡',
                              `icon` VARCHAR(128) NOT NULL COMMENT '图标标识/图片路径',
                              `type_index` TINYINT UNSIGNED NOT NULL COMMENT '对应游戏图标索引(0-5)',
                              `is_enable` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用 1-启用 0-禁用',
                              `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                              PRIMARY KEY (`id`)
)  COMMENT='卡牌种类配置表';

CREATE TABLE `user_cards` (
                              `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '单张卡牌实例ID，主键',
                              `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID（关联已有用户表主键）',
                              `card_type_id` INT UNSIGNED NOT NULL COMMENT '卡种ID，关联card_types.id',
                              `source` VARCHAR(32) NOT NULL COMMENT '获取来源：game_drop-游戏掉落、trade-交换、exchange-兑换',
                              `obtained_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '获取时间',
                              PRIMARY KEY (`id`)
)  COMMENT='用户持有卡牌明细表';

INSERT INTO `card_types` (`card_name`, `icon`, `type_index`)
VALUES
    ('第1张卡片', '/victory_images/victory_01', 0),
    ('第2张卡片', '/victory_images/victory_02', 1),
    ('第3张卡片', '/victory_images/victory_03', 2),
    ('第4张卡片', '/victory_images/victory_04', 3),
    ('第5张卡片', '/victory_images/victory_05', 4),
    ('第6张卡片', '/victory_images/victory_06', 5),
    ('第7张卡片', '/victory_images/victory_07', 0),
    ('第8张卡片', '/victory_images/victory_08', 1),
    ('第9张卡片', '/victory_images/victory_09', 2),
    ('第10张卡片', '/victory_images/victory_10', 3),
    ('第11张卡片', '/victory_images/victory_11', 4),
    ('第12张卡片', '/victory_images/victory_12', 5),
    ('第13张卡片', '/victory_images/victory_13', 0),
    ('第14张卡片', '/victory_images/victory_14', 1),
    ('第15张卡片', '/victory_images/victory_15', 2),
    ('第16张卡片', '/victory_images/victory_16', 3),
    ('第17张卡片', '/victory_images/victory_17', 4),
    ('第18张卡片', '/victory_images/victory_18', 5),
    ('第19张卡片', '/victory_images/victory_19', 0),
    ('第20张卡片', '/victory_images/victory_20', 1),
    ('第21张卡片', '/victory_images/victory_21', 2),
    ('第22张卡片', '/victory_images/victory_22', 3),
    ('第23张卡片', '/victory_images/victory_23', 4),
    ('第24张卡片', '/victory_images/victory_24', 5);
INSERT INTO `user_cards`
(`user_id`, `card_type_id`, `source`)
VALUES
    (1, 1, 'game_drop'),
    (1, 3, 'game_drop'),
    (1, 2, 'game_drop'),
    (2, 6, 'game_drop');