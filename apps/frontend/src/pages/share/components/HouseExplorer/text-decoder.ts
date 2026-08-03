type DecoderInput = ArrayBuffer | ArrayBufferView;

function toBytes(input?: DecoderInput) {
  if (!input) return new Uint8Array();
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  return new Uint8Array(input);
}

class MiniProgramTextDecoder {
  decode(input?: DecoderInput) {
    const bytes = toBytes(input);
    let output = '';

    for (let index = 0; index < bytes.length;) {
      const first = bytes[index++];

      if (first < 0x80) {
        output += String.fromCharCode(first);
        continue;
      }

      if (first < 0xe0 && index < bytes.length) {
        const second = bytes[index++];
        output += String.fromCharCode(((first & 0x1f) << 6) | (second & 0x3f));
        continue;
      }

      if (first < 0xf0 && index + 1 < bytes.length) {
        const second = bytes[index++];
        const third = bytes[index++];
        output += String.fromCharCode(
          ((first & 0x0f) << 12) | ((second & 0x3f) << 6) | (third & 0x3f)
        );
        continue;
      }

      if (first < 0xf8 && index + 2 < bytes.length) {
        const second = bytes[index++];
        const third = bytes[index++];
        const fourth = bytes[index++];
        const codePoint =
          ((first & 0x07) << 18) |
          ((second & 0x3f) << 12) |
          ((third & 0x3f) << 6) |
          (fourth & 0x3f);
        const adjusted = codePoint - 0x10000;
        output += String.fromCharCode(0xd800 + (adjusted >> 10), 0xdc00 + (adjusted & 0x3ff));
        continue;
      }

      output += '\ufffd';
    }

    return output;
  }
}

export function ensureTextDecoder() {
  const runtime = globalThis as unknown as { TextDecoder?: unknown };
  if (typeof runtime.TextDecoder === 'function') return;
  runtime.TextDecoder = MiniProgramTextDecoder;
}
