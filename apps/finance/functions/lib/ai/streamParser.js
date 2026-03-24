"use strict";
/**
 * Stateful parser that buffers LLM output and strips <context_check>...</context_check> tags.
 *
 * Phases:
 * 1. BUFFERING: accumulating text, looking for <context_check>
 * 2. INSIDE_TAG: inside context_check, discarding content
 * 3. STREAMING: tag closed, forwarding remaining content
 *
 * Edge cases:
 * - Tag split across chunks: handled by buffering
 * - Malformed/unclosed tag: after 2000 chars inside tag, flush buffer as-is
 * - No tag at all: after 200 chars with no tag, forward everything directly
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamParser = void 0;
const OPEN_TAG = '<context_check>';
const CLOSE_TAG = '</context_check>';
const MAX_TAG_CONTENT = 2000;
// If no <context_check> tag found after this many chars, assume LLM skipped it
const NO_TAG_THRESHOLD = 200;
class StreamParser {
    constructor() {
        this.buffer = '';
        this.phase = 'buffering';
        this.tagContentLength = 0;
    }
    /**
     * Feed a chunk from the LLM stream.
     * Returns text that should be sent to the client (may be empty string).
     */
    push(chunk) {
        if (this.phase === 'streaming') {
            return chunk;
        }
        this.buffer += chunk;
        if (this.phase === 'buffering') {
            const openIdx = this.buffer.indexOf(OPEN_TAG);
            if (openIdx !== -1) {
                // Found opening tag — discard everything up to and including it
                this.buffer = this.buffer.slice(openIdx + OPEN_TAG.length);
                this.phase = 'inside_tag';
                this.tagContentLength = 0;
                return this.processInsideTag();
            }
            // If buffer exceeds threshold and no tag found, LLM likely skipped the tag.
            // Switch to streaming and flush the buffer so user sees content immediately.
            if (this.buffer.length > NO_TAG_THRESHOLD) {
                // Check if a partial opening tag might be at the buffer end
                // e.g. buffer ends with "<context_" which could become "<context_check>"
                for (let i = 1; i < OPEN_TAG.length; i++) {
                    if (this.buffer.endsWith(OPEN_TAG.slice(0, i))) {
                        // Potential partial match — flush everything before it, keep the tail
                        const safe = this.buffer.slice(0, this.buffer.length - i);
                        this.buffer = this.buffer.slice(this.buffer.length - i);
                        this.phase = 'streaming';
                        return safe;
                    }
                }
                // No partial match — flush everything
                const content = this.buffer;
                this.buffer = '';
                this.phase = 'streaming';
                console.warn('StreamParser: no context_check tag found, streaming directly');
                return content;
            }
            return '';
        }
        // phase === 'inside_tag'
        return this.processInsideTag();
    }
    processInsideTag() {
        const closeIdx = this.buffer.indexOf(CLOSE_TAG);
        if (closeIdx !== -1) {
            // Found closing tag — everything after it is the answer
            const afterTag = this.buffer.slice(closeIdx + CLOSE_TAG.length);
            this.buffer = '';
            this.phase = 'streaming';
            // Trim leading whitespace/newlines from the answer
            return afterTag.replace(/^\s*\n*/, '');
        }
        this.tagContentLength += this.buffer.length;
        this.buffer = '';
        // Safety: if tag content exceeds limit, assume malformed and start streaming
        if (this.tagContentLength > MAX_TAG_CONTENT) {
            this.phase = 'streaming';
            console.warn('StreamParser: context_check tag exceeded max length, flushing');
        }
        return '';
    }
    /** Call when the LLM stream ends. Returns any remaining buffered content. */
    flush() {
        const remaining = this.buffer;
        this.buffer = '';
        this.phase = 'streaming';
        return remaining;
    }
}
exports.StreamParser = StreamParser;
//# sourceMappingURL=streamParser.js.map