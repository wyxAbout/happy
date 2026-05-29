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
    ('第2张卡片', '/victory_images/victory_02', 0),
    ('第3张卡片', '/victory_images/victory_03', 0),
    ('第4张卡片', '/victory_images/victory_04', 0),
    ('第5张卡片', '/victory_images/victory_05', 0),
    ('第6张卡片', '/victory_images/victory_06', 0),
    ('第7张卡片', '/victory_images/victory_07', 0),
    ('第8张卡片', '/victory_images/victory_08', 0),
    ('第9张卡片', '/victory_images/victory_09', 0),
    ('第10张卡片', '/victory_images/victory_10', 0),
    ('第11张卡片', '/victory_images/victory_11', 0),
    ('第12张卡片', '/victory_images/victory_12', 0),
    ('第13张卡片', '/victory_images/victory_13', 0),
    ('第14张卡片', '/victory_images/victory_14', 0),
    ('第15张卡片', '/victory_images/victory_15', 0),
    ('第16张卡片', '/victory_images/victory_16', 0),
    ('第17张卡片', '/victory_images/victory_17', 0),
    ('第18张卡片', '/victory_images/victory_18', 0),
    ('第19张卡片', '/victory_images/victory_19', 0),
    ('第20张卡片', '/victory_images/victory_20', 0),
    ('第21张卡片', '/victory_images/victory_21', 0),
    ('第22张卡片', '/victory_images/victory_22', 0),
    ('第23张卡片', '/victory_images/victory_23', 0),
    ('第24张卡片', '/victory_images/victory_24', 0);