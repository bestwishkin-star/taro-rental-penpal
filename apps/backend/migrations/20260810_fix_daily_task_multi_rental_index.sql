USE taro_rental_penpal;

-- 任务配额按房屋计算；移除会阻止同一房主维护多套房屋的错误唯一索引。
SET @has_daily_task_owner_slot_index = (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'rental_daily_tasks'
    AND INDEX_NAME = 'uk_daily_task_owner_date_slot'
);
SET @drop_daily_task_owner_slot_index = IF(
  @has_daily_task_owner_slot_index > 0,
  'ALTER TABLE rental_daily_tasks DROP INDEX uk_daily_task_owner_date_slot',
  'DO 0'
);
PREPARE drop_daily_task_owner_slot_index_statement FROM @drop_daily_task_owner_slot_index;
EXECUTE drop_daily_task_owner_slot_index_statement;
DEALLOCATE PREPARE drop_daily_task_owner_slot_index_statement;
