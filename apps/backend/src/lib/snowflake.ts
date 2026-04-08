/**
 * Snowflake ID 生成器（单实例版本，worker ID 固定为 0）
 *
 * ID 结构（64 bit）：
 *   1  bit  符号位，始终为 0
 *  41  bits 时间戳（毫秒，相对自定义 epoch）
 *  10  bits worker ID（0~1023，此处固定为 0）
 *  12  bits 序列号（同一毫秒内最多 4096 个）
 */

const EPOCH = 1700000000000n; // 2023-11-15，自定义起始时间
const WORKER_ID = 0n;
const WORKER_SHIFT = 12n;
const TIMESTAMP_SHIFT = 22n;
const SEQUENCE_MASK = 0xfffn; // 12 bits

let sequence = 0n;
let lastTimestamp = -1n;

export function generateId(): string {
  let timestamp = BigInt(Date.now());

  if (timestamp === lastTimestamp) {
    sequence = (sequence + 1n) & SEQUENCE_MASK;
    if (sequence === 0n) {
      // 当前毫秒序列号耗尽，等待下一毫秒
      while (timestamp <= lastTimestamp) {
        timestamp = BigInt(Date.now());
      }
    }
  } else {
    sequence = 0n;
  }

  lastTimestamp = timestamp;

  const id = ((timestamp - EPOCH) << TIMESTAMP_SHIFT) | (WORKER_ID << WORKER_SHIFT) | sequence;
  return id.toString();
}
